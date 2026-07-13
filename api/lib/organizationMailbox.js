import { createClient } from "@supabase/supabase-js";

export function getSupabaseConfig() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return { supabaseUrl, anonKey, serviceKey };
}

export function getMicrosoftConfig() {
  return {
    clientId: process.env.MICROSOFT_CLIENT_ID || "",
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
  };
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return {};
    const padded = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");
    return JSON.parse(Buffer.from(padded, "base64url").toString("utf8"));
  } catch {
    return {};
  }
}

function getBearerToken(request) {
  const authHeader = request.headers.authorization || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
}

export function getMailboxStatus(mailbox) {
  if (!mailbox?.access_token || !mailbox?.refresh_token || !mailbox?.mailbox_email) {
    return "Disconnected";
  }
  if (mailbox.expires_at && new Date(mailbox.expires_at).getTime() <= Date.now()) {
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
    mailbox_email: mailbox?.mailbox_email || "",
    sender_name: mailbox?.sender_name || "",
    connected_by: mailbox?.connected_by || "",
    connected_at: mailbox?.connected_at || "",
    expires_at: mailbox?.expires_at || "",
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

async function fetchGraphMe(accessToken) {
  const response = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Microsoft Graph profile validation failed.");
  }
  return response.json();
}

export async function refreshOrganizationMailbox(adminClient, organizationId, mailbox) {
  if (!mailbox?.refresh_token) return mailbox;
  if (mailbox.expires_at && new Date(mailbox.expires_at).getTime() > Date.now() + 60_000) {
    return mailbox;
  }

  const { clientId, clientSecret } = getMicrosoftConfig();
  if (!clientId || !clientSecret) {
    throw new Error("Microsoft OAuth application is not configured.");
  }

  const tenantId = mailbox.tenant_id || "common";
  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: mailbox.refresh_token,
      grant_type: "refresh_token",
      scope: "offline_access user.read mail.send mail.readwrite",
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || "Microsoft token refresh failed.");
  }

  const refreshed = {
    ...mailbox,
    access_token: payload.access_token,
    refresh_token: payload.refresh_token || mailbox.refresh_token,
    expires_at: new Date(Date.now() + Number(payload.expires_in || 3600) * 1000).toISOString(),
  };
  await writeMailbox(adminClient, organizationId, refreshed);
  return refreshed;
}

export async function getOrganizationMailboxForRequest(request, { requireConnected = false } = {}) {
  const context = await getRequestContext(request);
  let mailbox = await getStoredMailbox(context.adminClient, context.organizationId);
  if (mailbox && getMailboxStatus(mailbox) === "Expired") {
    mailbox = await refreshOrganizationMailbox(context.adminClient, context.organizationId, mailbox);
  }
  if (requireConnected && getMailboxStatus(mailbox) !== "Connected") {
    const error = new Error("Organization Microsoft 365 mailbox is not connected.");
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

  const tokenPayload = decodeJwtPayload(body?.tokens?.access_token || "");
  const graphUser = body?.user?.mail || body?.user?.userPrincipalName
    ? body.user
    : await fetchGraphMe(body?.tokens?.access_token || "");
  const mailboxEmail = graphUser.mail || graphUser.userPrincipalName || "";
  const mailbox = {
    tenant_id: tokenPayload.tid || body?.tenant_id || "common",
    tenant_name: tokenPayload.iss || mailboxEmail.split("@")[1] || "Microsoft 365",
    mailbox_email: mailboxEmail,
    sender_name: graphUser.displayName || mailboxEmail,
    access_token: body?.tokens?.access_token || "",
    refresh_token: body?.tokens?.refresh_token || body?.refresh_token || "",
    expires_at: new Date(Date.now() + Number(body?.tokens?.expires_in || 3600) * 1000).toISOString(),
    connected_by: context.user.id,
    connected_at: new Date().toISOString(),
  };

  if (!mailbox.mailbox_email || !mailbox.access_token || !mailbox.refresh_token) {
    const error = new Error("Microsoft 365 mailbox connection requires access and refresh tokens.");
    error.status = 400;
    throw error;
  }

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
  const freshMailbox = await refreshOrganizationMailbox(adminClient, organizationId, mailbox);
  const endpoint = draft ? "https://graph.microsoft.com/v1.0/me/messages" : "https://graph.microsoft.com/v1.0/me/sendMail";
  const message = {
    subject: mail.subject,
    body: { contentType: "HTML", content: mail.body },
    toRecipients: [{ emailAddress: { address: mail.recipient } }],
    attachments: (mail.attachments || []).map((att) => ({
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: att.name,
      contentType: att.type || "application/octet-stream",
      contentBytes: att.contentBytes,
    })),
  };
  const graphPayload = draft ? message : { message, saveToSentItems: "true" };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${freshMailbox.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(graphPayload),
  });
  if (!response.ok) {
    const text = await response.text();
    let details = text;
    try {
      details = JSON.parse(text).error?.message || text;
    } catch {}
    throw new Error(details || "Microsoft Graph mail delivery failed.");
  }
  return draft ? response.json() : { success: true };
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
  return response.status(status).json({ error: error.message || "Organization mailbox request failed." });
}
