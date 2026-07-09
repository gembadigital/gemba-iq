import { getSupabase } from "./supabaseClient";
import type {
  AcceptInvitationData,
  CreatedInvitationResult,
  InvitationPreview,
  OrganizationDirectory,
} from "../types/organization";

async function requireClient() {
  const client = getSupabase();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }
  return client;
}

async function getAccessToken(): Promise<string> {
  const client = await requireClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session?.access_token) {
    throw new Error("You must be signed in to perform this action.");
  }
  return session.access_token;
}

export async function fetchOrganizationDirectory(): Promise<OrganizationDirectory> {
  const client = await requireClient();
  const { data, error } = await client.rpc("list_organization_directory");
  if (error) {
    throw new Error(error.message);
  }
  return (data as OrganizationDirectory) ?? { members: [], invitations: [] };
}

export async function getInvitationPreview(token: string): Promise<InvitationPreview> {
  const client = await requireClient();
  const { data, error } = await client.rpc("get_invitation_preview", { p_token: token });
  if (error) {
    throw new Error(error.message);
  }
  return data as InvitationPreview;
}

export async function createOrganizationInvitation(
  email: string,
  role: string
): Promise<CreatedInvitationResult> {
  const client = await requireClient();
  const { data, error } = await client.rpc("create_organization_invitation", {
    p_email: email.trim(),
    p_role: role,
  });
  if (error) {
    throw new Error(error.message);
  }
  return data as CreatedInvitationResult;
}

export async function sendInvitationEmail(
  email: string,
  role: string
): Promise<{
  invitation: CreatedInvitationResult;
  inviteLink: string;
  emailSent: boolean;
  message?: string;
}> {
  const accessToken = await getAccessToken();
  const response = await fetch("/api/invitations/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ email: email.trim(), role }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Failed to send invitation email.");
  }

  return payload;
}

export async function cancelOrganizationInvitation(invitationId: string): Promise<void> {
  const client = await requireClient();
  const { error } = await client.rpc("cancel_organization_invitation", {
    p_invitation_id: invitationId,
  });
  if (error) {
    throw new Error(error.message);
  }
}

export async function acceptOrganizationInvitation(
  token: string,
  data: AcceptInvitationData = {}
): Promise<string> {
  const client = await requireClient();
  const { data: orgId, error } = await client.rpc("accept_organization_invitation", {
    p_token: token,
    p_full_name: data.fullName?.trim() || null,
    p_job_title: data.jobTitle?.trim() || null,
    p_phone: data.phone?.trim() || null,
    p_country: data.country?.trim() || null,
    p_language: data.language || "TR",
  });
  if (error) {
    throw new Error(error.message);
  }
  return orgId as string;
}

export async function recordProfileLogin(): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  await client.rpc("record_profile_login");
}
