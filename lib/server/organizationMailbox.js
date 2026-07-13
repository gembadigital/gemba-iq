import { createClient } from "@supabase/supabase-js";
import {
  isMicrosoftGraphConfigured,
  sendMicrosoftGraphMail,
} from "./microsoftGraphMailService.js";

export function getSupabaseConfig() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return { supabaseUrl, anonKey, serviceKey };
}

function getBearerToken(request) {
  const authHeader = request.headers.authorization || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
}

export function getMailboxStatus(mailbox) {
  if (!mailbox?.organizationMailbox && !mailbox?.mailbox_email) {
    return "Disconnected";
  }
  if (!isMicrosoftGraphConfigured()) {
    return "Expired";
  }
  return "Connected";
}

function publicMailbox(mailbox) {
  const status = getMailboxStatus(mailbox);
  return {
    status,
    tenant_id: mailbox?.tenant_id || "",
    tenant_name: mailbox?.tenant_name || "",
    mailbox_email: mailbox?.organizationMailbox || mailbox?.mailbox_email || "",
    organizationMailbox: mailbox?.organizationMailbox || mailbox?.mailbox_email || "",
    sender_name: mailbox?.sender_name || "",
    connected_by: mailbox?.connected_by || "",
    connected_at: mailbox?.connected_at || "",
    expires_at: mailbox?.expires_at || "",
    error:
      status === "Expired"
        ? "Azure application credentials are missing or incomplete."
        : "",
  };
}

export async function getRequestContext(request) {
  const accessToken = getBearerToken(request);
  const { supabaseUrl, anonKey, serviceKey } = getSupabaseConfig();
  if (!supabaseUrl || !anonKey || !serviceKey) {
    throw new Error("Supabase organization mailbox is not configured.");
  }
  if (!accessToken) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }

  const { data: membership, error: membershipError } = await adminClient
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) throw new Error(membershipError.message);
  if (!membership?.organization_id) {
    const error = new Error("No active organization found.");
    error.status = 400;
    throw error;
  }

  return {
    adminClient,
    user,
    organizationId: membership.organization_id,
    isAdmin: membership.role === "ADMIN",
  };
}

async function readSettings(adminClient, organizationId) {
  const { data, error } = await adminClient
    .from("organization_settings")
    .select("organization_id, microsoft_graph_application")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data || { organization_id: organizationId, microsoft_graph_application: {} };
}

async function writeMailbox(adminClient, organizationId, mailbox) {
  const settings = await readSettings(adminClient, organizationId);
  const microsoftGraphApplication = {
    ...(settings.microsoft_graph_application || {}),
    organization_mailbox: mailbox,
    shared_mailboxes_future: (settings.microsoft_graph_application || {}).shared_mailboxes_future || [],
  };

  const { error } = await adminClient
    .from("organization_settings")
    .upsert({
      organization_id: organizationId,
      microsoft_graph_application: microsoftGraphApplication,
      updated_at: new Date().toISOString(),
    });
  if (error) throw new Error(error.message);
}

export async function getStoredMailbox(adminClient, organizationId) {
  const settings = await readSettings(adminClient, organizationId);
  return settings.microsoft_graph_application?.organization_mailbox || null;
}

export async function getOrganizationMailboxForRequest(request, { requireConnected = false } = {}) {
  const context = await getRequestContext(request);
  const mailbox = await getStoredMailbox(context.adminClient, context.organizationId);
  if (requireConnected && getMailboxStatus(mailbox) !== "Connected") {
    const error = new Error(
      mailbox
        ? "Organization Microsoft 365 mailbox is configured, but Azure application credentials are incomplete."
        : "Organization Microsoft 365 mailbox is not connected."
    );
    error.status = 400;
    throw error;
  }
  return { ...context, mailbox };
}

export async function connectOrganizationMailbox(request, body) {
  const context = await getRequestContext(request);
  if (!context.isAdmin) {
    const error = new Error("Only ADMIN can connect Microsoft 365.");
    error.status = 403;
    throw error;
  }

  const mailboxEmail = String(
    body?.organizationMailbox || body?.mailbox_email || body?.mailboxEmail || ""
  ).trim().toLowerCase();
  if (!mailboxEmail || !mailboxEmail.includes("@")) {
    const error = new Error("A valid organization mailbox address is required.");
    error.status = 400;
    throw error;
  }

  const mailbox = {
    organizationMailbox: mailboxEmail,
    tenant_id: process.env.AZURE_TENANT_ID || "",
    tenant_name: mailboxEmail.split("@")[1] || "Microsoft 365",
    mailbox_email: mailboxEmail,
    sender_name: body?.sender_name || mailboxEmail,
    provider: "Microsoft 365",
    auth_type: "client_credentials",
    connected_by: context.user.id,
    connected_at: new Date().toISOString(),
  };

  await writeMailbox(context.adminClient, context.organizationId, mailbox);
  return publicMailbox(mailbox);
}

export async function disconnectOrganizationMailbox(request) {
  const context = await getRequestContext(request);
  if (!context.isAdmin) {
    const error = new Error("Only ADMIN can disconnect Microsoft 365.");
    error.status = 403;
    throw error;
  }
  await writeMailbox(context.adminClient, context.organizationId, null);
  return publicMailbox(null);
}

export async function getOrganizationMailboxStatus(request) {
  const context = await getOrganizationMailboxForRequest(request);
  return publicMailbox(context.mailbox);
}

export async function sendGraphMailWithMailbox(adminClient, organizationId, mailbox, mail, { draft = false } = {}) {
  void adminClient;
  void organizationId;
  if (draft) {
    const error = new Error("Draft creation is not supported by Phase 1 Organization Mailbox Mail.Send integration.");
    error.status = 501;
    throw error;
  }
  return sendMicrosoftGraphMail({
    organizationMailbox: mailbox?.organizationMailbox || mailbox?.mailbox_email,
    to: mail.to || mail.recipients || mail.recipient,
    cc: mail.cc || [],
    bcc: mail.bcc || [],
    subject: mail.subject,
    html: mail.html || mail.body,
    attachments: mail.attachments || [],
  });
}

export async function sendOrganizationMailboxTest(request) {
  const context = await getOrganizationMailboxForRequest(request, { requireConnected: true });
  if (!context.isAdmin) {
    const error = new Error("Only ADMIN can test Microsoft 365.");
    error.status = 403;
    throw error;
  }
  await sendGraphMailWithMailbox(
    context.adminClient,
    context.organizationId,
    context.mailbox,
    {
      recipient: context.user.email,
      subject: "Gemba IQ organization mailbox test",
      body: "<p>Your organization Microsoft 365 mailbox connection is working.</p>",
      attachments: [],
    }
  );
  return { success: true, recipient: context.user.email };
}

export async function handleMailboxError(response, error) {
  const status = error.status || 500;
  return response.status(status).json({
    error: error.message || "Organization mailbox request failed.",
    details: error.details || undefined,
  });
}
