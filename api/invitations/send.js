import { createClient } from "@supabase/supabase-js";

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
  const { supabaseUrl, anonKey, serviceKey, appUrl } = getSupabaseConfig();

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

  if (!serviceKey) {
    return response.status(invitationToken ? 503 : 200).json({
      invitation,
      inviteLink,
      emailSent: false,
      message:
        "Invitation created. Configure SUPABASE_SERVICE_ROLE_KEY to send Supabase Auth invitation emails automatically.",
    });
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: inviteLink,
    data: {
      full_name: fullName || null,
      invitation_token: invitation.token,
      organization_id: invitation.organization_id,
      invited_role: invitation.role,
    },
  });

  if (inviteError) {
    const message = inviteError.message.toLowerCase();
    const alreadyRegistered =
      message.includes("already registered") ||
      message.includes("already exists") ||
      message.includes("user already");
    const invalidAuthRole = message.includes("invalid role");

    if (alreadyRegistered || invalidAuthRole) {
      return response.status(200).json({
        invitation,
        inviteLink,
        emailSent: false,
        message: alreadyRegistered
          ? "User already has an account. Share the invitation link or ask them to sign in with the invited email."
          : "Invitation created. Email delivery is not available; share the invitation link manually.",
      });
    }

    return response.status(400).json({ error: inviteError.message });
  }

  return response.status(200).json({
    invitation,
    inviteLink,
    emailSent: true,
  });
}
