import { createClient } from "@supabase/supabase-js";
import {
  connectOrganizationMailbox,
  disconnectOrganizationMailbox,
  getOrganizationMailboxStatus,
  handleMailboxError,
  sendOrganizationMailboxTest,
} from "../../lib/server/organizationMailbox.js";

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

export default async function handler(request, response) {
  const segments = Array.isArray(request.query?.action)
    ? request.query.action
    : [request.query?.action].filter(Boolean);

  if (segments[0] === "mailbox") return mailboxHandler(request, response);
  if (segments[0] === "members" && segments[1] === "role") return membersRoleHandler(request, response);
  if (segments[0] === "members" && segments[1] === "delete") return membersDeleteHandler(request, response);
  return response.status(404).json({ error: "Unknown organization endpoint." });
}
