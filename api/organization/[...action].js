import { createClient } from "@supabase/supabase-js";
import {
  connectOrganizationMailbox,
  disconnectOrganizationMailbox,
  getOrganizationMailboxStatus,
  handleMailboxError,
  sendOrganizationMailboxTest,
} from "../../lib/server/organizationMailbox.js";
import {
  integrationCompanyCreate,
  integrationCompanySearch,
  integrationCompanyGet,
  integrationCompanyUpdate,
  integrationContactCreate,
  integrationContactSearch,
  integrationDealCreate,
  integrationDealUpdate,
  integrationDealSearch,
  integrationTaskCreate,
  integrationTaskUpdate,
  integrationTaskSearch,
  integrationMailSend,
  integrationLeadSearch,
  integrationOutreachCreate,
  integrationOutreachSearch,
  integrationOutreachUpdate,
  integrationOutreachSend,
  performOutreachSend,
} from "../../lib/server/integrationApi.js";

// Consolidated into a single Vercel catch-all route (covers
// /api/organization/mailbox, /api/organization/members/role,
// /api/organization/members/delete) to stay under the Hobby plan's 12
// Serverless Functions per deployment limit — each separate file under api/
// used to count as its own function. Frontend URLs are unchanged.

function getSupabaseConfig() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  return { supabaseUrl, anonKey, serviceKey };
}

function isAdminRole(role) {
  return String(role || "").trim() === "ADMIN";
}

function toPersistedRole(role) {
  return role === "ADMIN" ? "ADMIN" : "USER";
}

export async function mailboxHandler(request, response) {
  try {
    if (request.method === "GET") {
      return response.status(200).json(await getOrganizationMailboxStatus(request));
    }

    if (request.method === "DELETE") {
      return response.status(200).json(await disconnectOrganizationMailbox(request));
    }

    if (request.method === "POST") {
      const action = request.body?.action || "connect";
      if (action === "test") {
        return response.status(200).json(await sendOrganizationMailboxTest(request));
      }
      return response.status(200).json(await connectOrganizationMailbox(request, request.body));
    }

    response.setHeader("Allow", "GET, POST, DELETE");
    return response.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return handleMailboxError(response, error);
  }
}

export async function membersRoleHandler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = request.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return response.status(401).json({ error: "Unauthorized" });
  }

  const { supabaseUrl, anonKey, serviceKey } = getSupabaseConfig();
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return response.status(503).json({ error: "Supabase role management is not configured." });
  }

  const accessToken = authHeader.slice(7);
  const membershipId = String(request.body?.membershipId || "").trim();
  const requestedRole = String(request.body?.role || "").trim().toUpperCase();

  if (!membershipId || !["ADMIN", "USER"].includes(requestedRole)) {
    return response.status(400).json({ error: "Membership id and a valid role are required." });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return response.status(401).json({ error: "Unauthorized" });
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: targetMembership, error: targetError } = await adminClient
    .from("organization_members")
    .select("id, organization_id, user_id, role")
    .eq("id", membershipId)
    .maybeSingle();

  if (targetError) {
    return response.status(400).json({ error: targetError.message });
  }
  if (!targetMembership) {
    return response.status(404).json({ error: "Organization member not found." });
  }

  const { data: callerMembership, error: callerError } = await adminClient
    .from("organization_members")
    .select("id, role")
    .eq("organization_id", targetMembership.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (callerError) {
    return response.status(400).json({ error: callerError.message });
  }
  if (!callerMembership || !isAdminRole(callerMembership.role)) {
    return response.status(403).json({ error: "Only ADMIN can update user roles." });
  }
  if (targetMembership.user_id === user.id) {
    return response.status(400).json({ error: "You cannot change your own role." });
  }

  const { error: updateError } = await adminClient
    .from("organization_members")
    .update({ role: toPersistedRole(requestedRole) })
    .eq("id", membershipId);

  if (updateError) {
    return response.status(400).json({ error: updateError.message });
  }

  return response.status(200).json({ success: true, role: requestedRole });
}

// Fully deletes a user from the system (Supabase Auth account), not just from
// this organization. Only an ADMIN of the same organization may do this, and
// only for other users (never themselves). Deleting the auth user cascades
// (via "on delete cascade" foreign keys) to their profile, organization
// membership(s), and any other per-user rows (e.g. mailbox connections) —
// this removes them from every organization they belong to, not just the
// caller's. This is intentionally irreversible.
export async function membersDeleteHandler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = request.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return response.status(401).json({ error: "Unauthorized" });
  }

  const { supabaseUrl, anonKey, serviceKey } = getSupabaseConfig();
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return response.status(503).json({ error: "Supabase user management is not configured." });
  }

  const accessToken = authHeader.slice(7);
  const membershipId = String(request.body?.membershipId || "").trim();

  if (!membershipId) {
    return response.status(400).json({ error: "Membership id is required." });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return response.status(401).json({ error: "Unauthorized" });
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: targetMembership, error: targetError } = await adminClient
    .from("organization_members")
    .select("id, organization_id, user_id, role")
    .eq("id", membershipId)
    .maybeSingle();

  if (targetError) {
    return response.status(400).json({ error: targetError.message });
  }
  if (!targetMembership) {
    return response.status(404).json({ error: "Organization member not found." });
  }

  const { data: callerMembership, error: callerError } = await adminClient
    .from("organization_members")
    .select("id, role")
    .eq("organization_id", targetMembership.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (callerError) {
    return response.status(400).json({ error: callerError.message });
  }
  if (!callerMembership || !isAdminRole(callerMembership.role)) {
    return response.status(403).json({ error: "Only ADMIN can remove users." });
  }
  if (targetMembership.user_id === user.id) {
    return response.status(400).json({ error: "You cannot delete your own account." });
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetMembership.user_id);

  if (deleteError) {
    return response.status(400).json({ error: deleteError.message });
  }

  return response.status(200).json({ success: true });
}

// Panelden (oturum açmış CRM kullanıcısı) tetiklenen gönderim. OpenClaw'ın
// entegrasyon API key'ini HİÇ kullanmaz — bilinçli olarak farklı bir kimlik
// doğrulama yolu (Supabase kullanıcı oturumu) üzerinden çalışır, böylece
// OpenClaw'ın entegrasyon key'ine outreach:send scope'u verilmese bile
// panelden insan onaylı gönderim her zaman mümkün olur (bkz.
// docs/openclaw-integration.md §6 güvenlik notu ve gorev6-panel-ekrani-SPEC.md §3).
// İş mantığının kendisi lib/server/integrationApi.js'deki
// performOutreachSend() ile paylaşılıyor — kod tekrarı yok.
export async function outreachSendInternalHandler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = request.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return response.status(401).json({ error: "Unauthorized" });
  }

  const { supabaseUrl, anonKey, serviceKey } = getSupabaseConfig();
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return response.status(503).json({ error: "Outreach sending is not configured." });
  }

  const id = String(request.body?.id || "").trim();
  if (!id) {
    return response.status(400).json({ error: "'id' is required." });
  }

  const accessToken = authHeader.slice(7);
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return response.status(401).json({ error: "Unauthorized" });
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: membership, error: membershipError } = await adminClient
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return response.status(400).json({ error: membershipError.message });
  }
  if (!membership?.organization_id) {
    return response.status(400).json({ error: "No active organization found." });
  }

  try {
    const result = await performOutreachSend(adminClient, membership.organization_id, id);
    return response.status(200).json({ sent: true, sender: result.sender, timestamp: result.timestamp });
  } catch (error) {
    return response.status(error.status || 500).json({ error: error.message || "Mail send failed." });
  }
}

// "Repo değerlendirmesi" görevi: umuterturk/email-verifier (MIT lisans,
// https://github.com/umuterturk/email-verifier) — kullanıcı onayıyla, kendi
// altyapımıza bir kopyasını kurmak yerine yazarın ücretsiz genel API'sini
// (rapid-email-verifier.fly.dev) kullanmayı tercih ettik. Bu üçüncü taraf
// bağımlılığı bilerek kabul edildi: kesinti/SLA riski bize ait değil, veri
// (sadece e-posta adresleri, başka hiçbir alan) o servise gidiyor. Bu proxy
// action'ı olmadan istemci tarayıcısından doğrudan çağrı CORS'a takılabilir
// ve rastgele internet kullanıcılarının Gemba IQ'yu üçüncü taraf servise
// ücretsiz bir vekil (proxy) olarak kötüye kullanmasını önlemek için oturum
// doğrulaması zorunlu tutuluyor — Gemba'nın kendi Supabase kullanıcı
// oturumu dışında hiçbir çağrıya izin verilmiyor.
const EMAIL_VERIFIER_BATCH_URL = "https://rapid-email-verifier.fly.dev/api/validate/batch";
const EMAIL_VERIFIER_MAX_BATCH = 100; // upstream servisin kendi sınırı

export async function emailVerifyBatchHandler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = request.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return response.status(401).json({ error: "Unauthorized" });
  }

  const { supabaseUrl, anonKey } = getSupabaseConfig();
  if (!supabaseUrl || !anonKey) {
    return response.status(503).json({ error: "Email verification is not configured." });
  }

  const emails = Array.isArray(request.body?.emails)
    ? request.body.emails.map((e) => String(e || "").trim()).filter(Boolean)
    : [];

  if (emails.length === 0) {
    return response.status(400).json({ error: "'emails' (non-empty array) is required." });
  }
  if (emails.length > EMAIL_VERIFIER_MAX_BATCH) {
    return response.status(400).json({
      error: `A maximum of ${EMAIL_VERIFIER_MAX_BATCH} emails can be verified per request.`,
    });
  }

  const accessToken = authHeader.slice(7);
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return response.status(401).json({ error: "Unauthorized" });
  }

  try {
    const upstreamResponse = await fetch(EMAIL_VERIFIER_BATCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails }),
    });

    if (!upstreamResponse.ok) {
      return response
        .status(502)
        .json({ error: `Email verification service returned ${upstreamResponse.status}.` });
    }

    const data = await upstreamResponse.json();
    return response.status(200).json(data);
  } catch (error) {
    return response.status(502).json({ error: error.message || "Email verification service unreachable." });
  }
}

export default async function handler(request, response) {
  // Vercel's zero-config file-system routing for [...bracket] dynamic
  // functions only auto-populates req.query for Next.js projects. This is a
  // Vite project, so the explicit rewrites in vercel.json set ?action=...
  // themselves (see "/api/organization/mailbox" etc.) — action arrives as a
  // plain string, not an array of path segments.
  const action = Array.isArray(request.query?.action) ? request.query.action[0] : request.query?.action;

  if (action === "mailbox") return mailboxHandler(request, response);
  if (action === "members-role") return membersRoleHandler(request, response);
  if (action === "members-delete") return membersDeleteHandler(request, response);

  // OpenClaw (harici AI agent) entegrasyon uç noktaları. Bunlar Supabase
  // Auth oturumu değil, kendi Bearer API key mekanizmasını kullanır — bkz.
  // lib/server/integrationApi.js. Mevcut mailbox/members action'larıyla
  // hiçbir paylaşımlı state yok.
  if (action === "integration-company-create") return integrationCompanyCreate(request, response);
  if (action === "integration-company-search") return integrationCompanySearch(request, response);
  if (action === "integration-company-get") return integrationCompanyGet(request, response);
  if (action === "integration-company-update") return integrationCompanyUpdate(request, response);
  if (action === "integration-contact-create") return integrationContactCreate(request, response);
  if (action === "integration-contact-search") return integrationContactSearch(request, response);
  if (action === "integration-deal-create") return integrationDealCreate(request, response);
  if (action === "integration-deal-update") return integrationDealUpdate(request, response);
  if (action === "integration-deal-search") return integrationDealSearch(request, response);
  if (action === "integration-task-create") return integrationTaskCreate(request, response);
  if (action === "integration-task-update") return integrationTaskUpdate(request, response);
  if (action === "integration-task-search") return integrationTaskSearch(request, response);
  if (action === "integration-mail-send") return integrationMailSend(request, response);
  if (action === "integration-lead-search") return integrationLeadSearch(request, response);
  if (action === "integration-outreach-create") return integrationOutreachCreate(request, response);
  if (action === "integration-outreach-search") return integrationOutreachSearch(request, response);
  if (action === "integration-outreach-update") return integrationOutreachUpdate(request, response);
  if (action === "integration-outreach-send") return integrationOutreachSend(request, response);
  if (action === "outreach-send-internal") return outreachSendInternalHandler(request, response);
  if (action === "email-verify-batch") return emailVerifyBatchHandler(request, response);

  return response.status(404).json({ error: "Unknown organization endpoint." });
}
