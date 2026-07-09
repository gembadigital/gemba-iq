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

  const email = String(request.body?.email || "").trim().toLowerCase();
  const role = String(request.body?.role || "").trim().toLowerCase();

  if (!email || !role) {
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

  const { data: invitation, error: invitationError } = await userClient.rpc(
    "create_organization_invitation",
    {
      p_email: email,
      p_role: role,
    }
  );

  if (invitationError) {
    return response.status(400).json({ error: invitationError.message });
  }

  const origin = request.headers.origin || appUrl || "http://localhost:3000";
  const inviteLink = `${origin}/join?token=${invitation.token}`;

  if (!serviceKey) {
    return response.status(200).json({
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

    if (alreadyRegistered) {
      return response.status(200).json({
        invitation,
        inviteLink,
        emailSent: false,
        message:
          "User already has an account. Share the invitation link or ask them to sign in with the invited email.",
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
