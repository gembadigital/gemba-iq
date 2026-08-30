// "Yeniden Temas (Re-engagement)" onay kuyruğu — panel (oturum açmış CRM
// kullanıcısı) tarafı. OpenClaw'ın kendi entegrasyon API key'ini hiç
// kullanmaz; normal Supabase kullanıcı oturumu + RLS (organization_id
// izolasyonu) üzerinden çalışır — bkz. supabase/migrations/012_outreach_drafts.sql.
//
// Gerçek gönderim (approveAndSendOutreachDraft) SADECE
// /api/organization/outreach-send-internal route'una gider — bu route
// entegrasyon API key'i GEREKTİRMEZ, sadece kullanıcının kendi Supabase
// oturum token'ını ister (bkz. api/organization/[...action].js
// outreachSendInternalHandler). Böylece OpenClaw'ın entegrasyon key'ine
// outreach:send scope'u hiç verilmese bile, panelden insan onaylı gönderim
// her zaman çalışır (bkz. docs/openclaw-integration.md §6 güvenlik notu).
import { getSupabase } from "./supabaseClient";
import { getActiveOrganizationId } from "./tenantStorage";

export type OutreachStatus = "pending" | "approved" | "sent" | "rejected";
export type OutreachSource = "deal-scan" | "lead-scan" | "manual-telegram" | "manual-panel";

export interface OutreachRecipient {
  name: string;
  email: string;
  leadProfileId?: string;
}

export interface OutreachDraft {
  id: string;
  companyId?: string | null;
  dealId?: string;
  leadProfileIds?: string[];
  recipients: OutreachRecipient[];
  subject: string;
  bodyHtml: string;
  source: OutreachSource;
  status: OutreachStatus;
  approvedBy?: string;
  approvedAt?: string;
  sentAt?: string;
  rejectedReason?: string;
  integrationSource?: "openclaw";
  integrationCredentialId?: string;
  createdAt?: string;
}

function requireClient() {
  const client = getSupabase();
  if (!client) throw new Error("Supabase is not configured.");
  return client;
}

function requireOrgId(): string {
  const organizationId = getActiveOrganizationId();
  if (!organizationId) throw new Error("No active organization selected.");
  return organizationId;
}

async function getAccessToken(): Promise<string> {
  const client = requireClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session?.access_token) throw new Error("You must be signed in.");
  return session.access_token;
}

export async function fetchOutreachDrafts(): Promise<OutreachDraft[]> {
  const client = requireClient();
  const organizationId = requireOrgId();
  const { data, error } = await client
    .from("outreach_drafts")
    .select("id, company_id, created_at, data")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((row: { id: string; company_id: string | null; created_at: string; data: Partial<OutreachDraft> }) => ({
    ...(row.data as OutreachDraft),
    id: row.id,
    companyId: row.company_id,
    createdAt: row.created_at,
  }));
}

export async function createOutreachDraft(input: {
  companyId?: string | null;
  dealId?: string;
  leadProfileIds?: string[];
  recipients: OutreachRecipient[];
  subject: string;
  bodyHtml: string;
  source?: OutreachSource;
}): Promise<OutreachDraft> {
  const client = requireClient();
  const organizationId = requireOrgId();
  const {
    data: { user },
  } = await client.auth.getUser();

  const id = `outreach-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const data: OutreachDraft = {
    id,
    recipients: input.recipients,
    subject: input.subject,
    bodyHtml: input.bodyHtml,
    source: input.source || "manual-panel",
    status: "pending",
    dealId: input.dealId,
    leadProfileIds: input.leadProfileIds,
    companyId: input.companyId || null,
  };

  const { error } = await client.from("outreach_drafts").insert({
    id,
    organization_id: organizationId,
    company_id: input.companyId || null,
    created_by: user?.id || null,
    data,
  });
  if (error) throw new Error(error.message);
  return data;
}

async function patchOutreachDraft(
  id: string,
  patch: Partial<Pick<OutreachDraft, "status" | "approvedBy" | "approvedAt" | "rejectedReason" | "subject" | "bodyHtml" | "sentAt">>
): Promise<OutreachDraft> {
  const client = requireClient();
  const organizationId = requireOrgId();

  const { data: row, error: fetchError } = await client
    .from("outreach_drafts")
    .select("data")
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!row) throw new Error("Outreach draft not found.");

  const merged: OutreachDraft = { ...(row.data as OutreachDraft), ...patch, id };
  const { error } = await client
    .from("outreach_drafts")
    .update({ data: merged })
    .eq("organization_id", organizationId)
    .eq("id", id);
  if (error) throw new Error(error.message);
  return merged;
}

export async function updateOutreachDraftContent(id: string, subject: string, bodyHtml: string): Promise<OutreachDraft> {
  return patchOutreachDraft(id, { subject, bodyHtml });
}

export async function rejectOutreachDraft(id: string, reason: string): Promise<OutreachDraft> {
  return patchOutreachDraft(id, { status: "rejected", rejectedReason: reason });
}

// Panelin "Gönder" butonunun teknik akışı (bkz. gorev6-panel-ekrani-SPEC.md §3):
// 1) status'u "approved" yap (kendi Supabase oturumu, RLS'ye tabi).
// 2) /api/organization/outreach-send-internal'ı çağır — bu, oturum
//    token'ıyla çalışan, entegrasyon key'i gerektirmeyen ayrı bir route.
export async function approveAndSendOutreachDraft(
  id: string,
  approvedByName: string
): Promise<{ sent: true; sender: string; timestamp: string }> {
  await patchOutreachDraft(id, {
    status: "approved",
    approvedBy: approvedByName,
    approvedAt: new Date().toISOString(),
  });

  const accessToken = await getAccessToken();
  const response = await fetch("/api/organization/outreach-send-internal", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ id }),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Mail could not be sent.");
  }
  return result;
}
