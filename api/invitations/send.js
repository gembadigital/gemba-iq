import { createClient } from "@supabase/supabase-js";
import {
  getOrganizationMailboxForRequest,
  sendGraphMailWithMailbox,
} from "../lib/organizationMailbox.js";

function getSupabaseConfig() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");

  return { supabaseUrl, anonKey, serviceKey, appUrl };
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = request.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return response.status(401).json({ error: "Unauthorized" });
  }

  const accessToken = authHeader.slice(7);
  const { supabaseUrl, anonKey, appUrl } = getSupabaseConfig();

  if (!supabaseUrl || !anonKey) {
    return response.status(503).json({ error: "Supabase is not configured." });
  }

  const invitationToken = String(request.body?.invitationToken || "").trim();
  const requestedEmail = String(request.body?.email || "").trim().toLowerCase();
  const requestedRole = String(request.body?.role || "USER").trim().toUpperCase();
  const fullName = String(request.body?.fullName || "").trim();

  if (!invitationToken && (!requestedEmail || !["ADMIN", "USER"].includes(requestedRole))) {
    return response.status(400).json({ error: "Email and role are required." });
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

  let invitation;

  if (invitationToken) {
    const { data: existingInvitation, error: existingInvitationError } = await userClient
      .from("invitations")
      .select("id, token, invited_email, role, status, expires_at, organization_id")
      .eq("token", invitationToken)
      .maybeSingle();

    if (existingInvitationError) {
      return response.status(400).json({ error: existingInvitationError.message });
    }

    if (!existingInvitation) {
      return response.status(404).json({ error: "Invitation not found." });
    }

    if (existingInvitation.status !== "pending" || new Date(existingInvitation.expires_at) < new Date()) {
      return response.status(400).json({ error: "Invitation is no longer valid." });
    }

    invitation = existingInvitation;
  } else {
    const { data: createdInvitation, error: invitationError } = await userClient.rpc(
      "create_organization_invitation",
      {
        p_email: requestedEmail,
        p_role: requestedRole,
      }
    );

    if (invitationError) {
      return response.status(400).json({ error: invitationError.message });
    }

    invitation = createdInvitation;
  }

  const origin = request.headers.origin || appUrl || "http://localhost:3000";
  const inviteLink = `${origin}/join?token=${invitation.token}`;
  const email = String(invitation.invited_email || "").trim().toLowerCase();

  try {
    const context = await getOrganizationMailboxForRequest(request, { requireConnected: true });
    await sendGraphMailWithMailbox(context.adminClient, context.organizationId, context.mailbox, {
      recipient: email,
      subject: "You're invited to join Gemba IQ",
      body: `
        <p>Hello${fullName ? ` ${fullName}` : ""},</p>
        <p>You have been invited to join an organization in Gemba IQ.</p>
        <p><a href="${inviteLink}">Accept your invitation</a></p>
        <p>If the button does not work, copy this link into your browser:<br>${inviteLink}</p>
      `,
      attachments: [],
    });
  } catch (mailError) {
    return response.status(200).json({
      invitation,
      inviteLink,
      emailSent: false,
      message:
        mailError.message || "Invitation created. Connect the organization Microsoft 365 mailbox to send email automatically.",
    });
  }

  return response.status(200).json({
    invitation,
    inviteLink,
    emailSent: true,
  });
}
