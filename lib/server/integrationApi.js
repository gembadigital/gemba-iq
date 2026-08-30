import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import {
  getStoredMailbox,
  getMailboxStatus,
  sendGraphMailWithMailbox,
} from "./organizationMailbox.js";

// OpenClaw (ve benzeri harici AI agent) entegrasyonu için CRM CRUD
// katmanı. Bu dosya api/organization/[...action].js tarafından import
// edilir — Vercel Hobby planındaki 12 Serverless Functions sınırını
// aşmamak için (bkz. o dosyanın başındaki yorum) yeni bir api/*.js
// dosyası AÇILMADI, mevcut catch-all'a yeni action'lar eklendi.
//
// Güvenlik modeli:
//  - OpenClaw asla SUPABASE_SERVICE_ROLE_KEY görmez. Sadece kendisine
//    özel, tek yönlü hash'lenmiş bir API key görür (Authorization: Bearer
//    gembaiq_live_...).
//  - Anahtar her istekte integration_credentials tablosunda hash'i
//    üzerinden aranır, organization_id ve scopes buradan çözülür.
//  - Gerçek DB işlemi service_role client (adminClient) ile yapılır, ama
//    her sorguya elle organization_id filtresi eklenerek companies/
//    contacts/deals/tasks tablolarındaki RLS politikalarıyla AYNI
//    izolasyon burada da uygulanır — RLS'in kendisi hiç değişmedi.

function getSupabaseConfig() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return { supabaseUrl, serviceKey };
}

function getAdminClient() {
  const { supabaseUrl, serviceKey } = getSupabaseConfig();
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// --- Türkçe karakter/case-insensitive normalize -----------------------------
// src/lib/CrmDb.ts içindeki normalizeTrKey() ile BİREBİR aynı harita ve
// mantık — duplicate kontrolünün frontend ile tutarlı çalışması için.
const TR_CHAR_FOLD_MAP = {
  ç: "c", Ç: "c",
  ğ: "g", Ğ: "g",
  ı: "i", I: "i", İ: "i", i: "i",
  ö: "o", Ö: "o",
  ş: "s", Ş: "s",
  ü: "u", Ü: "u",
};

export function normalizeTrKey(input) {
  return (input || "")
    .split("")
    .map((ch) => TR_CHAR_FOLD_MAP[ch] ?? ch.toLowerCase())
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeWebsite(url) {
  if (!url) return "";
  return String(url)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^0-9]/g, "");
}

// --- API key üretimi / doğrulama --------------------------------------------

const KEY_PREFIX = "gembaiq_live_";

export function generateIntegrationKey() {
  const raw = KEY_PREFIX + crypto.randomBytes(32).toString("hex");
  return { raw, hash: hashKey(raw), prefix: raw.slice(0, 20) };
}

function hashKey(rawKey) {
  return crypto.createHash("sha256").update(rawKey, "utf8").digest("hex");
}

export async function authenticateIntegrationRequest(request) {
  const authHeader = request.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { error: { status: 401, body: { error: "Unauthorized: missing Bearer API key." } } };
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey.startsWith(KEY_PREFIX)) {
    return { error: { status: 401, body: { error: "Unauthorized: invalid API key format." } } };
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return { error: { status: 503, body: { error: "Integration API is not configured." } } };
  }

  const { data: credential, error } = await adminClient
    .from("integration_credentials")
    .select("id, organization_id, name, scopes, created_by, revoked_at")
    .eq("key_hash", hashKey(rawKey))
    .maybeSingle();

  if (error) {
    return { error: { status: 500, body: { error: error.message } } };
  }
  if (!credential || credential.revoked_at) {
    return { error: { status: 401, body: { error: "Unauthorized: invalid or revoked API key." } } };
  }

  // Best-effort — son kullanım zamanını güncelle, hata olursa isteği bloklama.
  adminClient
    .from("integration_credentials")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", credential.id)
    .then(
      () => {},
      () => {}
    );

  return { credential, adminClient };
}

export function hasScope(credential, scope) {
  const scopes = credential.scopes || [];
  return scopes.includes("*") || scopes.includes(scope);
}

async function logRequest(adminClient, credential, action, statusCode, entityType, entityId) {
  try {
    await adminClient.from("integration_request_log").insert({
      credential_id: credential.id,
      organization_id: credential.organization_id,
      action,
      status_code: statusCode,
      entity_type: entityType || null,
      entity_id: entityId || null,
    });
  } catch (_e) {
    // Günlükleme hiçbir zaman gerçek API yanıtını engellememeli.
  }
}

// Ortak giriş: auth + method + scope kontrolünü tek yerde yapar.
async function guard(request, response, { method, scope }) {
  if (request.method !== method) {
    response.setHeader("Allow", method);
    response.status(405).json({ error: "Method not allowed" });
    return null;
  }

  const auth = await authenticateIntegrationRequest(request);
  if (auth.error) {
    response.status(auth.error.status).json(auth.error.body);
    return null;
  }

  if (!hasScope(auth.credential, scope)) {
    response.status(403).json({ error: `This API key does not have the '${scope}' scope.` });
    return null;
  }

  return auth;
}

function newId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

// =============================================================================
// COMPANIES
// =============================================================================

export async function integrationCompanyCreate(request, response) {
  const auth = await guard(request, response, { method: "POST", scope: "companies:write" });
  if (!auth) return;
  const { credential, adminClient } = auth;

  const body = request.body || {};
  const name = String(body.name || "").trim();
  if (!name) {
    return response.status(400).json({ error: "'name' is required." });
  }

  const { data: existingRows, error: fetchError } = await adminClient
    .from("companies")
    .select("id, data")
    .eq("organization_id", credential.organization_id);

  if (fetchError) {
    return response.status(500).json({ error: fetchError.message });
  }

  const normalizedIncomingName = normalizeTrKey(name);
  const incomingWebsite = normalizeWebsite(body.website);

  const duplicate = (existingRows || [])
    .filter((row) => row.id !== "__org_auxiliary__")
    .find((row) => {
      const existingData = row.data || {};
      if (incomingWebsite && normalizeWebsite(existingData.website) === incomingWebsite) return true;
      return normalizeTrKey(existingData.name) === normalizedIncomingName;
    });

  if (duplicate && !body.upsert) {
    await logRequest(adminClient, credential, "integration-company-create", 409, "company", duplicate.id);
    const matchedOn =
      incomingWebsite && normalizeWebsite(duplicate.data?.website) === incomingWebsite ? "website" : "name";
    return response.status(409).json({
      created: false,
      matchedOn,
      existing: { id: duplicate.id, ...duplicate.data },
    });
  }

  const companyId = duplicate ? duplicate.id : newId("company");
  const prior = duplicate ? duplicate.data || {} : {};

  const companyData = {
    ...prior,
    id: companyId,
    name,
    phone: body.phone ?? prior.phone ?? "",
    website: body.website ?? prior.website ?? "",
    customerStatus: body.customerStatus ?? prior.customerStatus ?? "Lead",
    industry: body.industry ?? prior.industry ?? "",
    sector: body.sector ?? prior.sector,
    employeeCount: body.employeeCount ?? prior.employeeCount,
    annualRevenue: body.annualRevenue ?? prior.annualRevenue,
    annualRevenueCurrency: body.annualRevenueCurrency ?? prior.annualRevenueCurrency,
    accountOwner: body.accountOwner ?? prior.accountOwner ?? credential.name,
    billingAddress: body.billingAddress ?? prior.billingAddress,
    billingCity: body.billingCity ?? prior.billingCity,
    billingDistrict: body.billingDistrict ?? prior.billingDistrict,
    billingCountry: body.billingCountry ?? prior.billingCountry,
    billingPostalCode: body.billingPostalCode ?? prior.billingPostalCode,
    shift: body.shift ?? prior.shift ?? "1 Shift",
    productionType: body.productionType ?? prior.productionType,
    squareMeter: body.squareMeter ?? prior.squareMeter,
    productionCapacity: body.productionCapacity ?? prior.productionCapacity,
    isoCertifications: body.isoCertifications ?? prior.isoCertifications,
    digitalInfrastructure: body.digitalInfrastructure ?? prior.digitalInfrastructure ?? "",
    description: body.description ?? prior.description,
    subIndustry: body.subIndustry ?? prior.subIndustry,
    lifecycleStage: body.lifecycleStage ?? prior.lifecycleStage,
    integrationSource: "openclaw",
    integrationCredentialId: credential.id,
  };

  const { error: upsertError } = await adminClient.from("companies").upsert(
    {
      id: companyId,
      organization_id: credential.organization_id,
      created_by: credential.created_by,
      data: companyData,
    },
    { onConflict: "id" }
  );

  if (upsertError) {
    return response.status(500).json({ error: upsertError.message });
  }

  await logRequest(
    adminClient,
    credential,
    "integration-company-create",
    duplicate ? 200 : 201,
    "company",
    companyId
  );

  return response
    .status(duplicate ? 200 : 201)
    .json({ created: !duplicate, updated: !!duplicate, id: companyId, data: companyData });
}

export async function integrationCompanySearch(request, response) {
  const auth = await guard(request, response, { method: "GET", scope: "companies:read" });
  if (!auth) return;
  const { credential, adminClient } = auth;

  const q = String(request.query?.q || "").trim();
  const website = String(request.query?.website || "").trim();
  const limit = Math.min(parseInt(request.query?.limit, 10) || 20, 100);

  const { data: rows, error } = await adminClient
    .from("companies")
    .select("id, data")
    .eq("organization_id", credential.organization_id);

  if (error) {
    return response.status(500).json({ error: error.message });
  }

  const normalizedQ = normalizeTrKey(q);
  const normalizedWebsite = normalizeWebsite(website);

  const results = (rows || [])
    .filter((row) => row.id !== "__org_auxiliary__")
    .filter((row) => {
      const data = row.data || {};
      if (normalizedWebsite) return normalizeWebsite(data.website) === normalizedWebsite;
      if (!normalizedQ) return true;
      return normalizeTrKey(data.name).includes(normalizedQ);
    })
    .slice(0, limit)
    .map((row) => ({ id: row.id, ...row.data }));

  await logRequest(adminClient, credential, "integration-company-search", 200, "company", null);

  return response.status(200).json({ results, count: results.length });
}

export async function integrationCompanyGet(request, response) {
  const auth = await guard(request, response, { method: "GET", scope: "companies:read" });
  if (!auth) return;
  const { credential, adminClient } = auth;

  const id = String(request.query?.id || "").trim();
  if (!id) return response.status(400).json({ error: "'id' query parameter is required." });

  const { data: row, error } = await adminClient
    .from("companies")
    .select("id, data")
    .eq("organization_id", credential.organization_id)
    .eq("id", id)
    .maybeSingle();

  if (error) return response.status(500).json({ error: error.message });
  if (!row) return response.status(404).json({ error: "Company not found." });

  await logRequest(adminClient, credential, "integration-company-get", 200, "company", id);

  return response.status(200).json({ id: row.id, ...row.data });
}

export async function integrationCompanyUpdate(request, response) {
  const auth = await guard(request, response, { method: "PATCH", scope: "companies:write" });
  if (!auth) return;
  const { credential, adminClient } = auth;

  const id = String(request.query?.id || "").trim();
  if (!id) return response.status(400).json({ error: "'id' query parameter is required." });

  const { data: row, error: fetchError } = await adminClient
    .from("companies")
    .select("id, data")
    .eq("organization_id", credential.organization_id)
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return response.status(500).json({ error: fetchError.message });
  if (!row) return response.status(404).json({ error: "Company not found." });

  const body = request.body || {};
  const merged = { ...row.data, ...body, id };

  const { error: updateError } = await adminClient
    .from("companies")
    .update({ data: merged })
    .eq("organization_id", credential.organization_id)
    .eq("id", id);

  if (updateError) return response.status(500).json({ error: updateError.message });

  await logRequest(adminClient, credential, "integration-company-update", 200, "company", id);

  return response.status(200).json({ updated: true, id, data: merged });
}

// =============================================================================
// CONTACTS
// =============================================================================

export async function integrationContactCreate(request, response) {
  const auth = await guard(request, response, { method: "POST", scope: "contacts:write" });
  if (!auth) return;
  const { credential, adminClient } = auth;

  const body = request.body || {};
  const companyId = String(body.companyId || "").trim();
  const firstName = String(body.firstName || "").trim();
  const lastName = String(body.lastName || "").trim();

  if (!companyId) return response.status(400).json({ error: "'companyId' is required." });
  if (!firstName) return response.status(400).json({ error: "'firstName' is required." });

  const { data: companyRow, error: companyError } = await adminClient
    .from("companies")
    .select("id")
    .eq("organization_id", credential.organization_id)
    .eq("id", companyId)
    .maybeSingle();

  if (companyError) return response.status(500).json({ error: companyError.message });
  if (!companyRow) {
    return response.status(400).json({ error: `No company found with id '${companyId}' in this organization.` });
  }

  const { data: existingRows, error: fetchError } = await adminClient
    .from("contacts")
    .select("id, data")
    .eq("organization_id", credential.organization_id)
    .eq("company_id", companyId);

  if (fetchError) return response.status(500).json({ error: fetchError.message });

  const incomingEmail = normalizeEmail(body.email);
  const incomingPhone = normalizePhone(body.phone);

  const duplicate = (existingRows || []).find((row) => {
    const data = row.data || {};
    if (incomingEmail && normalizeEmail(data.email) === incomingEmail) return true;
    if (!incomingEmail && incomingPhone && normalizePhone(data.phone) === incomingPhone) return true;
    return false;
  });

  if (duplicate && !body.upsert) {
    await logRequest(adminClient, credential, "integration-contact-create", 409, "contact", duplicate.id);
    return response.status(409).json({
      created: false,
      matchedOn: incomingEmail ? "email" : "phone",
      existing: { id: duplicate.id, ...duplicate.data },
    });
  }

  const contactId = duplicate ? duplicate.id : newId("contact");
  const prior = duplicate ? duplicate.data || {} : {};

  const contactData = {
    ...prior,
    id: contactId,
    companyId,
    firstName,
    lastName: lastName || prior.lastName || "",
    email: body.email ?? prior.email ?? "",
    phone: body.phone ?? prior.phone ?? "",
    department: body.department ?? prior.department ?? "",
    leadStatus: body.leadStatus ?? prior.leadStatus ?? "New",
    leadSegment: body.leadSegment ?? prior.leadSegment ?? "",
    isPrimary: body.isPrimary ?? prior.isPrimary ?? false,
    createdAt: prior.createdAt || new Date().toISOString(),
    integrationSource: "openclaw",
    integrationCredentialId: credential.id,
  };

  const { error: upsertError } = await adminClient.from("contacts").upsert(
    {
      id: contactId,
      organization_id: credential.organization_id,
      company_id: companyId,
      created_by: credential.created_by,
      data: contactData,
    },
    { onConflict: "id" }
  );

  if (upsertError) return response.status(500).json({ error: upsertError.message });

  await logRequest(
    adminClient,
    credential,
    "integration-contact-create",
    duplicate ? 200 : 201,
    "contact",
    contactId
  );

  return response
    .status(duplicate ? 200 : 201)
    .json({ created: !duplicate, updated: !!duplicate, id: contactId, data: contactData });
}

export async function integrationContactSearch(request, response) {
  const auth = await guard(request, response, { method: "GET", scope: "contacts:read" });
  if (!auth) return;
  const { credential, adminClient } = auth;

  const companyId = String(request.query?.company_id || "").trim();
  const email = String(request.query?.email || "").trim();

  let query = adminClient.from("contacts").select("id, data").eq("organization_id", credential.organization_id);
  if (companyId) query = query.eq("company_id", companyId);

  const { data: rows, error } = await query;
  if (error) return response.status(500).json({ error: error.message });

  const normalizedEmail = normalizeEmail(email);
  const results = (rows || [])
    .filter((row) => !normalizedEmail || normalizeEmail(row.data?.email) === normalizedEmail)
    .map((row) => ({ id: row.id, ...row.data }));

  await logRequest(adminClient, credential, "integration-contact-search", 200, "contact", null);

  return response.status(200).json({ results, count: results.length });
}

// =============================================================================
// DEALS
// =============================================================================

export async function integrationDealCreate(request, response) {
  const auth = await guard(request, response, { method: "POST", scope: "deals:write" });
  if (!auth) return;
  const { credential, adminClient } = auth;

  const body = request.body || {};
  const companyId = String(body.companyId || "").trim();
  const dealName = String(body.dealName || body.companyName || "").trim();

  if (!companyId) return response.status(400).json({ error: "'companyId' is required." });
  if (!dealName) return response.status(400).json({ error: "'dealName' is required." });

  const { data: companyRow, error: companyError } = await adminClient
    .from("companies")
    .select("id, data")
    .eq("organization_id", credential.organization_id)
    .eq("id", companyId)
    .maybeSingle();

  if (companyError) return response.status(500).json({ error: companyError.message });
  if (!companyRow) {
    return response.status(400).json({ error: `No company found with id '${companyId}' in this organization.` });
  }

  const dealId = newId("deal");
  const dealData = {
    id: dealId,
    companyId,
    dealName,
    companyName: body.companyName || companyRow.data?.name || "",
    contactPerson: body.contactPerson || "",
    contactEmail: body.contactEmail,
    contactPhone: body.contactPhone,
    opportunityValue: Number(body.opportunityValue) || 0,
    expectedCloseDate: body.expectedCloseDate || "",
    opportunityScore: Number(body.opportunityScore) || 0,
    winProbability: Number(body.winProbability) || 0,
    currentStageDuration: 0,
    priority: ["Low", "Medium", "High"].includes(body.priority) ? body.priority : "Medium",
    industry: body.industry || companyRow.data?.industry || "",
    opexScore: Number(body.opexScore) || 0,
    stage: body.stage || "Yeni",
    owner: body.owner || credential.name,
    pipeline: body.pipeline || "Sales Pipeline Standard",
    description: body.description || "",
    leadSource: body.leadSource || "OpenClaw",
    integrationSource: "openclaw",
    integrationCredentialId: credential.id,
  };

  const { error: insertError } = await adminClient.from("deals").insert({
    id: dealId,
    organization_id: credential.organization_id,
    company_id: companyId,
    created_by: credential.created_by,
    data: dealData,
  });

  if (insertError) return response.status(500).json({ error: insertError.message });

  await logRequest(adminClient, credential, "integration-deal-create", 201, "deal", dealId);

  return response.status(201).json({ created: true, id: dealId, data: dealData });
}

export async function integrationDealUpdate(request, response) {
  const auth = await guard(request, response, { method: "PATCH", scope: "deals:write" });
  if (!auth) return;
  const { credential, adminClient } = auth;

  const id = String(request.query?.id || "").trim();
  if (!id) return response.status(400).json({ error: "'id' query parameter is required." });

  const { data: row, error: fetchError } = await adminClient
    .from("deals")
    .select("id, data")
    .eq("organization_id", credential.organization_id)
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return response.status(500).json({ error: fetchError.message });
  if (!row) return response.status(404).json({ error: "Deal not found." });

  const body = request.body || {};
  const merged = { ...row.data, ...body, id };

  const { error: updateError } = await adminClient
    .from("deals")
    .update({ data: merged })
    .eq("organization_id", credential.organization_id)
    .eq("id", id);

  if (updateError) return response.status(500).json({ error: updateError.message });

  await logRequest(adminClient, credential, "integration-deal-update", 200, "deal", id);

  return response.status(200).json({ updated: true, id, data: merged });
}

export async function integrationDealSearch(request, response) {
  const auth = await guard(request, response, { method: "GET", scope: "deals:read" });
  if (!auth) return;
  const { credential, adminClient } = auth;

  const companyId = String(request.query?.company_id || "").trim();
  const stage = String(request.query?.stage || "").trim();

  let query = adminClient.from("deals").select("id, data").eq("organization_id", credential.organization_id);
  if (companyId) query = query.eq("company_id", companyId);

  const { data: rows, error } = await query;
  if (error) return response.status(500).json({ error: error.message });

  const results = (rows || [])
    .filter((row) => !stage || row.data?.stage === stage)
    .map((row) => ({ id: row.id, ...row.data }));

  await logRequest(adminClient, credential, "integration-deal-search", 200, "deal", null);

  return response.status(200).json({ results, count: results.length });
}

// =============================================================================
// TASKS
// =============================================================================

export async function integrationTaskCreate(request, response) {
  const auth = await guard(request, response, { method: "POST", scope: "tasks:write" });
  if (!auth) return;
  const { credential, adminClient } = auth;

  const body = request.body || {};
  const title = String(body.title || "").trim();
  if (!title) return response.status(400).json({ error: "'title' is required." });

  const companyId = body.companyId ? String(body.companyId).trim() : null;
  const dealId = body.dealId ? String(body.dealId).trim() : null;

  if (companyId) {
    const { data: companyRow, error: companyError } = await adminClient
      .from("companies")
      .select("id")
      .eq("organization_id", credential.organization_id)
      .eq("id", companyId)
      .maybeSingle();
    if (companyError) return response.status(500).json({ error: companyError.message });
    if (!companyRow) {
      return response.status(400).json({ error: `No company found with id '${companyId}' in this organization.` });
    }
  }

  const taskId = newId("task");
  const taskData = {
    id: taskId,
    title,
    description: body.description || "",
    status: body.status || "todo",
    assignee: body.assignee || "",
    assigneeEmail: body.assigneeEmail,
    dueDate: body.dueDate || "",
    priority: ["Low", "Medium", "High"].includes(body.priority) ? body.priority : "Medium",
    companyId: companyId || undefined,
    dealId: dealId || undefined,
    integrationSource: "openclaw",
    integrationCredentialId: credential.id,
  };

  const { error: insertError } = await adminClient.from("tasks").insert({
    id: taskId,
    organization_id: credential.organization_id,
    company_id: companyId,
    deal_id: dealId,
    created_by: credential.created_by,
    data: taskData,
  });

  if (insertError) return response.status(500).json({ error: insertError.message });

  await logRequest(adminClient, credential, "integration-task-create", 201, "task", taskId);

  return response.status(201).json({ created: true, id: taskId, data: taskData });
}

export async function integrationTaskUpdate(request, response) {
  const auth = await guard(request, response, { method: "PATCH", scope: "tasks:write" });
  if (!auth) return;
  const { credential, adminClient } = auth;

  const id = String(request.query?.id || "").trim();
  if (!id) return response.status(400).json({ error: "'id' query parameter is required." });

  const { data: row, error: fetchError } = await adminClient
    .from("tasks")
    .select("id, data")
    .eq("organization_id", credential.organization_id)
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return response.status(500).json({ error: fetchError.message });
  if (!row) return response.status(404).json({ error: "Task not found." });

  const body = request.body || {};
  const merged = { ...row.data, ...body, id };

  const { error: updateError } = await adminClient
    .from("tasks")
    .update({ data: merged })
    .eq("organization_id", credential.organization_id)
    .eq("id", id);

  if (updateError) return response.status(500).json({ error: updateError.message });

  await logRequest(adminClient, credential, "integration-task-update", 200, "task", id);

  return response.status(200).json({ updated: true, id, data: merged });
}

export async function integrationTaskSearch(request, response) {
  const auth = await guard(request, response, { method: "GET", scope: "tasks:read" });
  if (!auth) return;
  const { credential, adminClient } = auth;

  const companyId = String(request.query?.company_id || "").trim();
  const dealId = String(request.query?.deal_id || "").trim();
  const status = String(request.query?.status || "").trim();
  const assignee = String(request.query?.assignee || "").trim();

  let query = adminClient.from("tasks").select("id, data").eq("organization_id", credential.organization_id);
  if (companyId) query = query.eq("company_id", companyId);
  if (dealId) query = query.eq("deal_id", dealId);

  const { data: rows, error } = await query;
  if (error) return response.status(500).json({ error: error.message });

  const results = (rows || [])
    .filter((row) => !status || row.data?.status === status)
    .filter((row) => !assignee || row.data?.assignee === assignee)
    .map((row) => ({ id: row.id, ...row.data }));

  await logRequest(adminClient, credential, "integration-task-search", 200, "task", null);

  return response.status(200).json({ results, count: results.length });
}

// =============================================================================
// MAIL (organization mailbox — Microsoft Graph)
// =============================================================================

export async function integrationMailSend(request, response) {
  const auth = await guard(request, response, { method: "POST", scope: "mail:send" });
  if (!auth) return;
  const { credential, adminClient } = auth;

  const body = request.body || {};
  const to = body.to || body.recipient || body.recipients;
  const subject = String(body.subject || "").trim();
  const html = body.html || body.body || "";

  if (!to || (Array.isArray(to) && to.length === 0)) {
    return response.status(400).json({ error: "'to' is required." });
  }
  if (!subject) {
    return response.status(400).json({ error: "'subject' is required." });
  }
  if (!html) {
    return response.status(400).json({ error: "'html' (or 'body') is required." });
  }

  const mailbox = await getStoredMailbox(adminClient, credential.organization_id);
  if (getMailboxStatus(mailbox) !== "Connected") {
    await logRequest(adminClient, credential, "integration-mail-send", 400, "mail", null);
    return response.status(400).json({
      error: mailbox
        ? "Organization Microsoft 365 mailbox is configured, but Azure application credentials are incomplete."
        : "Organization Microsoft 365 mailbox is not connected.",
    });
  }

  try {
    await sendGraphMailWithMailbox(adminClient, credential.organization_id, mailbox, {
      to,
      cc: body.cc || [],
      bcc: body.bcc || [],
      subject,
      html,
      attachments: body.attachments || [],
    });
  } catch (error) {
    await logRequest(adminClient, credential, "integration-mail-send", error.status || 500, "mail", null);
    return response.status(error.status || 500).json({ error: error.message || "Mail could not be sent." });
  }

  await logRequest(adminClient, credential, "integration-mail-send", 200, "mail", null);

  return response.status(200).json({
    sent: true,
    from: mailbox.organizationMailbox || mailbox.mailbox_email || "",
    to,
    subject,
  });
}

// =============================================================================
// AUXILIARY ROW HELPERS (companies tablosundaki __org_auxiliary__ satırı)
// =============================================================================
// Aday Profilleri / Etkinlikler, src/lib/crmSupabaseService.ts'deki
// persistAuxiliary() tarafından, organizasyon başına "companies" tablosunda
// bu sabit id'ye sahip özel bir satırda (data jsonb) saklanıyor. Bu sabit,
// crmSupabaseService.ts'deki AUXILIARY_COMPANY_ID ile BİREBİR aynı
// tutulmalı — biri değişirse diğeri de değişmeli.
const AUXILIARY_COMPANY_ID = "__org_auxiliary__";

async function getAuxiliaryRow(adminClient, organizationId) {
  const { data: row, error } = await adminClient
    .from("companies")
    .select("id, data")
    .eq("organization_id", organizationId)
    .eq("id", AUXILIARY_COMPANY_ID)
    .maybeSingle();
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
  return row?.data || {};
}

async function saveAuxiliaryRow(adminClient, organizationId, auxiliaryData) {
  const { error } = await adminClient
    .from("companies")
    .update({ data: auxiliaryData })
    .eq("organization_id", organizationId)
    .eq("id", AUXILIARY_COMPANY_ID);
  if (error) throw Object.assign(new Error(error.message), { status: 500 });
}

// =============================================================================
// LEAD PROFILES (Aday Profilleri) — sadece okuma
// =============================================================================

export async function integrationLeadSearch(request, response) {
  const auth = await guard(request, response, { method: "GET", scope: "leads:read" });
  if (!auth) return;
  const { credential, adminClient } = auth;

  const segmentParam = String(request.query?.segment || "").trim();
  const wantedSegments = segmentParam
    ? segmentParam.split(",").map((s) => normalizeTrKey(s.trim())).filter(Boolean)
    : [];
  const companyFilter = normalizeTrKey(String(request.query?.company || "").trim());

  let auxiliary;
  try {
    auxiliary = await getAuxiliaryRow(adminClient, credential.organization_id);
  } catch (err) {
    return response.status(err.status || 500).json({ error: err.message });
  }

  const leadProfiles = auxiliary?.kvStore?.crm_lead_profiles || [];
  const results = leadProfiles.filter((lead) => {
    if (wantedSegments.length > 0) {
      const seg = normalizeTrKey(String(lead.leadSegment || ""));
      if (!wantedSegments.includes(seg)) return false;
    }
    if (companyFilter) {
      const company = normalizeTrKey(String(lead.company || ""));
      if (!company.includes(companyFilter)) return false;
    }
    return true;
  });

  await logRequest(adminClient, credential, "integration-lead-search", 200, "lead", null);
  return response.status(200).json({ results, count: results.length });
}

// =============================================================================
// OUTREACH (Yeniden Temas onay kuyruğu)
// =============================================================================

export async function integrationOutreachCreate(request, response) {
  const auth = await guard(request, response, { method: "POST", scope: "outreach:write" });
  if (!auth) return;
  const { credential, adminClient } = auth;

  const body = request.body || {};
  const recipients = Array.isArray(body.recipients) ? body.recipients : [];
  const subject = String(body.subject || "").trim();
  const bodyHtml = body.bodyHtml || body.html;

  if (recipients.length === 0) return response.status(400).json({ error: "'recipients' (non-empty array) is required." });
  if (!subject) return response.status(400).json({ error: "'subject' is required." });
  if (!bodyHtml) return response.status(400).json({ error: "'bodyHtml' is required." });

  const companyId = body.companyId ? String(body.companyId).trim() : null;
  const dealId = body.dealId ? String(body.dealId).trim() : null;

  const draftId = newId("outreach");
  const draftData = {
    id: draftId,
    recipients,
    subject,
    bodyHtml,
    source: body.source || "manual-panel",
    status: "pending",
    dealId: dealId || undefined,
    leadProfileIds: Array.isArray(body.leadProfileIds) ? body.leadProfileIds : undefined,
    integrationSource: "openclaw",
    integrationCredentialId: credential.id,
  };

  const { error: insertError } = await adminClient.from("outreach_drafts").insert({
    id: draftId,
    organization_id: credential.organization_id,
    company_id: companyId,
    data: draftData,
  });

  if (insertError) return response.status(500).json({ error: insertError.message });

  await logRequest(adminClient, credential, "integration-outreach-create", 201, "outreach", draftId);
  return response.status(201).json({ created: true, id: draftId, data: draftData });
}

export async function integrationOutreachSearch(request, response) {
  const auth = await guard(request, response, { method: "GET", scope: "outreach:read" });
  if (!auth) return;
  const { credential, adminClient } = auth;

  const status = String(request.query?.status || "").trim();
  const companyId = String(request.query?.company_id || "").trim();

  let query = adminClient.from("outreach_drafts").select("id, data").eq("organization_id", credential.organization_id);
  if (companyId) query = query.eq("company_id", companyId);

  const { data: rows, error } = await query;
  if (error) return response.status(500).json({ error: error.message });

  const results = (rows || [])
    .filter((row) => !status || row.data?.status === status)
    .map((row) => ({ id: row.id, ...row.data }));

  await logRequest(adminClient, credential, "integration-outreach-search", 200, "outreach", null);
  return response.status(200).json({ results, count: results.length });
}

export async function integrationOutreachUpdate(request, response) {
  const auth = await guard(request, response, { method: "PATCH", scope: "outreach:write" });
  if (!auth) return;
  const { credential, adminClient } = auth;

  const id = String(request.query?.id || "").trim();
  if (!id) return response.status(400).json({ error: "'id' query parameter is required." });

  const { data: row, error: fetchError } = await adminClient
    .from("outreach_drafts")
    .select("id, data")
    .eq("organization_id", credential.organization_id)
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return response.status(500).json({ error: fetchError.message });
  if (!row) return response.status(404).json({ error: "Outreach draft not found." });

  const body = request.body || {};
  const merged = { ...row.data, ...body, id };

  const { error: updateError } = await adminClient
    .from("outreach_drafts")
    .update({ data: merged })
    .eq("organization_id", credential.organization_id)
    .eq("id", id);

  if (updateError) return response.status(500).json({ error: updateError.message });

  await logRequest(adminClient, credential, "integration-outreach-update", 200, "outreach", id);
  return response.status(200).json({ updated: true, id, data: merged });
}

// Gerçek gönderim mantığı — hem OpenClaw'ın kendi entegrasyon key'i
// (integrationOutreachSend) hem de panelin oturum-bazlı, entegrasyon key'i
// GEREKTİRMEYEN /api/organization/outreach-send-internal route'u (bkz.
// api/organization/[...action].js) tarafından paylaşılıyor — iki farklı
// kimlik doğrulama yolundan da AYNI iş mantığı çalışsın, kod tekrarı
// olmasın diye tek yerde tutuluyor (bkz. gorev6-panel-ekrani-SPEC.md §3).
export async function performOutreachSend(adminClient, organizationId, id) {
  const { data: row, error: fetchError } = await adminClient
    .from("outreach_drafts")
    .select("id, company_id, data")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();

  if (fetchError) throw Object.assign(new Error(fetchError.message), { status: 500 });
  if (!row) throw Object.assign(new Error("Outreach draft not found."), { status: 404 });

  const draft = row.data;
  if (draft.status !== "approved") {
    throw Object.assign(
      new Error(`Draft status is '${draft.status}', expected 'approved'. Approve it first via PATCH /outreach/update.`),
      { status: 409 }
    );
  }

  const mailbox = await getStoredMailbox(adminClient, organizationId);
  if (getMailboxStatus(mailbox) !== "Connected") {
    throw Object.assign(
      new Error(
        mailbox
          ? "Organization Microsoft 365 mailbox is configured, but Azure application credentials are incomplete."
          : "Organization Microsoft 365 mailbox is not connected."
      ),
      { status: 400 }
    );
  }

  const sendResult = await sendGraphMailWithMailbox(adminClient, organizationId, mailbox, {
    to: draft.recipients.map((r) => r.email),
    cc: [],
    bcc: [],
    subject: draft.subject,
    html: draft.bodyHtml,
    attachments: [],
  });

  const sentAt = sendResult.timestamp || new Date().toISOString();
  const updatedDraft = { ...draft, status: "sent", sentAt };

  const { error: updateError } = await adminClient
    .from("outreach_drafts")
    .update({ data: updatedDraft })
    .eq("organization_id", organizationId)
    .eq("id", id);
  if (updateError) throw Object.assign(new Error(updateError.message), { status: 500 });

  // Fırsat kaynaklıysa lastContactDate'i güncelle (stage'e dokunulmaz —
  // "Won dışı + 2 ay" kriteri lastContactDate'e bakıyor, tarihin
  // güncellenmesi 2 aylık sayacı kendiliğinden sıfırlar).
  if (draft.dealId) {
    const { data: dealRow } = await adminClient
      .from("deals")
      .select("id, data")
      .eq("organization_id", organizationId)
      .eq("id", draft.dealId)
      .maybeSingle();
    if (dealRow) {
      const mergedDeal = { ...dealRow.data, lastContactDate: sentAt };
      await adminClient
        .from("deals")
        .update({ data: mergedDeal })
        .eq("organization_id", organizationId)
        .eq("id", draft.dealId);
    }
  }

  // Etkinlik (activity) kaydı — companies tablosundaki auxiliary satırının
  // data.activities dizisine ekleniyor (bkz. dosya başındaki not).
  if (row.company_id) {
    try {
      const auxiliary = await getAuxiliaryRow(adminClient, organizationId);
      const activities = Array.isArray(auxiliary.activities) ? auxiliary.activities : [];
      activities.unshift({
        id: `act-${Date.now()}`,
        companyId: row.company_id,
        dealId: draft.dealId || undefined,
        type: "email",
        title: "Yeniden temas maili gönderildi",
        description: `Konu: ${draft.subject} — Alıcı(lar): ${draft.recipients.map((r) => r.email).join(", ")}`,
        date: sentAt,
        user: draft.approvedBy || "Gemba IQ",
      });
      await saveAuxiliaryRow(adminClient, organizationId, { ...auxiliary, activities });
    } catch (_e) {
      // Etkinlik kaydı başarısız olsa bile mail zaten gönderildi —
      // yanıtı buna bağlı olarak başarısız saymıyoruz, sadece sessizce
      // geçiyoruz (mail:send'deki logRequest deseniyle aynı felsefe).
    }
  }

  return { sent: true, sender: sendResult.sender, timestamp: sentAt, id, data: updatedDraft };
}

export async function integrationOutreachSend(request, response) {
  const auth = await guard(request, response, { method: "POST", scope: "outreach:send" });
  if (!auth) return;
  const { credential, adminClient } = auth;

  const id = String(request.query?.id || "").trim();
  if (!id) return response.status(400).json({ error: "'id' query parameter is required." });

  try {
    const result = await performOutreachSend(adminClient, credential.organization_id, id);
    await logRequest(adminClient, credential, "integration-outreach-send", 200, "outreach", id);
    return response.status(200).json({ sent: true, sender: result.sender, timestamp: result.timestamp });
  } catch (error) {
    const status = error.status || 500;
    await logRequest(adminClient, credential, "integration-outreach-send", status, "outreach", id);
    return response.status(status).json({ error: error.message || "Mail send failed." });
  }
}
