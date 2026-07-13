import type { MailboxSession } from "../types";
import { getSupabase } from "./supabaseClient";

export type OrganizationMailboxStatus = "Connected" | "Expired" | "Disconnected";

export interface OrganizationMailbox {
  status: OrganizationMailboxStatus;
  tenant_id: string;
  tenant_name: string;
  mailbox_email: string;
  organizationMailbox?: string;
  sender_name: string;
  connected_by: string;
  connected_at: string;
  expires_at: string;
  error?: string;
}

async function getAccessToken(): Promise<string> {
  const client = getSupabase();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session?.access_token) {
    throw new Error("You must be signed in.");
  }
  return session.access_token;
}

function toSession(mailbox: OrganizationMailbox): MailboxSession | null {
  if (mailbox.status === "Disconnected") return null;
  return {
    isConnected: mailbox.status === "Connected",
    isSandbox: false,
    displayName: mailbox.sender_name || "Organization Mailbox",
    mail: mailbox.mailbox_email,
    userPrincipalName: mailbox.mailbox_email,
    accessToken: "",
  };
}

export async function fetchOrganizationMailbox(): Promise<{
  mailbox: OrganizationMailbox;
  session: MailboxSession | null;
}> {
  const accessToken = await getAccessToken();
  const response = await fetch("/api/organization/mailbox", {
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const mailbox = await response.json();
  if (!response.ok) {
    throw new Error(mailbox.error || "Failed to load organization mailbox.");
  }
  return { mailbox, session: toSession(mailbox) };
}

export async function connectOrganizationMailbox(organizationMailbox: string): Promise<{
  mailbox: OrganizationMailbox;
  session: MailboxSession | null;
}> {
  const accessToken = await getAccessToken();
  const response = await fetch("/api/organization/mailbox", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action: "connect", organizationMailbox }),
  });
  const mailbox = await response.json();
  if (!response.ok) {
    throw new Error(mailbox.error || "Failed to connect organization mailbox.");
  }
  return { mailbox, session: toSession(mailbox) };
}

export async function disconnectOrganizationMailbox(): Promise<OrganizationMailbox> {
  const accessToken = await getAccessToken();
  const response = await fetch("/api/organization/mailbox", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const mailbox = await response.json();
  if (!response.ok) {
    throw new Error(mailbox.error || "Failed to disconnect organization mailbox.");
  }
  return mailbox;
}

export async function testOrganizationMailbox(): Promise<{ success: true; recipient: string }> {
  const accessToken = await getAccessToken();
  const response = await fetch("/api/organization/mailbox", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action: "test" }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Failed to test organization mailbox.");
  }
  return payload;
}
