import { createClient } from "@supabase/supabase-js";
import {
  isMicrosoftGraphConfigured,
  sendMicrosoftGraphMail,
} from "./microsoftGraphMailService.js";
import { getSupabaseConfig } from "./organizationMailbox.js";

// Personal Mailbox — each user connects their own Microsoft 365 address.
// Reuses the same tenant-wide Azure application (client credentials / Mail.Send
// application permission) that Organization Mailbox already uses, so no new
// Azure app registration or OAuth consent flow is required. This mirrors
// organizationMailbox.js but scopes storage to the signed-in user via
// user_mailbox_connections (schema already defined in
// supabase/migrations/008_settings_scope_architecture.sql).

function getBearerToken(request) {
  const authHeader = request.headers.authorization || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
}

export function getPersonalMailboxStatusValue(mailbox) {
  if (!mailbox?.mailbox_address) {
    return "Disconnected";
  }
  if (!isMicrosoftGraphConfigured()) {
    return "Expired";
  }
  return "Connected";
}

function publicPersonalMailbox(mailbox) {
  const status = getPersonalMailboxStatusValue(mailbox);
  return {
    status,
    mailbox_address: mailbox?.mailbox_address || "",
    provider: mailbox?.provider || "Microsoft 365",
    connected_at: mailbox?.connected_at || "",
    error:
      status === "Expired"
        ? "Azure application credentials are missing or incomplete."
        : "",
  };
}

async function getUserContext(request) {
  const accessToken = getBearerToken(request);
  const { supabaseUrl, anonKey, serviceKey } = getSupabaseConfig();
  if (!supabaseUrl || !anonKey || !serviceKey) {
    throw new Error("Supabase personal mailbox is not configured.");
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

  return { adminClient, user };
}

async function getStoredPersonalMailbox(adminClient, userId) {
  const { data, error } = await adminClient
    .from("user_mailbox_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("default_mailbox", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data || null;
}

export async function getPersonalMailboxForRequest(request, { requireConnected = false } = {}) {
  const context = await getUserContext(request);
  const mailbox = await getStoredPersonalMailbox(context.adminClient, context.user.id);
  if (requireConnected && getPersonalMailboxStatusValue(mailbox) !== "Connected") {
    const error = new Error(
      mailbox
        ? "Personal Microsoft 365 mailbox is configured, but Azure application credentials are incomplete."
        : "Personal Microsoft 365 mailbox is not connected."
    );
    error.status = 400;
    throw error;
  }
  return { ...context, mailbox };
}

export async function getPersonalMailboxStatus(request) {
  const context = await getPersonalMailboxForRequest(request);
  return publicPersonalMailbox(context.mailbox);
}

export async function connectPersonalMailbox(request, body) {
  const context = await getUserContext(request);

  const mailboxAddress = String(body?.mailboxAddress || body?.mailbox_address || "")
    .trim()
    .toLowerCase();
  if (!mailboxAddress || !mailboxAddress.includes("@")) {
    const error = new Error("A valid mailbox address is required.");
    error.status = 400;
    throw error;
  }

  // Mirrors Organization Mailbox: one active mailbox per user. Replace any
  // previously connected address instead of accumulating rows.
  const { error: deleteError } = await context.adminClient
    .from("user_mailbox_connections")
    .delete()
    .eq("user_id", context.user.id);
  if (deleteError) throw new Error(deleteError.message);

  const { data, error: insertError } = await context.adminClient
    .from("user_mailbox_connections")
    .insert({
      user_id: context.user.id,
      mailbox_address: mailboxAddress,
      provider: "Microsoft 365",
      status: "Connected",
      default_mailbox: true,
      connected_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (insertError) throw new Error(insertError.message);

  return publicPersonalMailbox(data);
}

export async function disconnectPersonalMailbox(request) {
  const context = await getUserContext(request);
  const { error } = await context.adminClient
    .from("user_mailbox_connections")
    .delete()
    .eq("user_id", context.user.id);
  if (error) throw new Error(error.message);
  return publicPersonalMailbox(null);
}

export async function sendGraphMailWithPersonalMailbox(mailbox, mail) {
  return sendMicrosoftGraphMail({
    organizationMailbox: mailbox?.mailbox_address,
    to: mail.to || mail.recipients || mail.recipient,
    cc: mail.cc || [],
    bcc: mail.bcc || [],
    subject: mail.subject,
    html: mail.html || mail.body,
    attachments: mail.attachments || [],
  });
}

export async function sendPersonalMailboxTest(request) {
  const context = await getPersonalMailboxForRequest(request, { requireConnected: true });
  await sendGraphMailWithPersonalMailbox(context.mailbox, {
    recipient: context.user.email,
    subject: "Gemba IQ personal mailbox test",
    body: "<p>Your personal Microsoft 365 mailbox connection is working.</p>",
    attachments: [],
  });
  return { success: true, recipient: context.user.email };
}

export async function handlePersonalMailboxError(response, error) {
  const status = error.status || 500;
  return response.status(status).json({
    error: error.message || "Personal mailbox request failed.",
    details: error.details || undefined,
  });
}