import { createClient } from "@supabase/supabase-js";

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

export default async function handler(request, response) {
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
