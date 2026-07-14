import { getSupabase } from "./supabaseClient";

export type PersonalMailboxStatus = "Connected" | "Expired" | "Disconnected";

export interface PersonalMailbox {
  status: PersonalMailboxStatus;
  mailbox_address: string;
  provider: string;
  connected_at: string;
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

export async function fetchPersonalMailbox(): Promise<PersonalMailbox> {
  const accessToken = await getAccessToken();
  const response = await fetch("/api/user/mailbox", {
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const mailbox = await response.json();
  if (!response.ok) {
    throw new Error(mailbox.error || "Failed to load personal mailbox.");
  }
  return mailbox;
}

export async function connectPersonalMailbox(mailboxAddress: string): Promise<PersonalMailbox> {
  const accessToken = await getAccessToken();
  const response = await fetch("/api/user/mailbox", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action: "connect", mailboxAddress }),
  });
  const mailbox = await response.json();
  if (!response.ok) {
    throw new Error(mailbox.error || "Failed to connect personal mailbox.");
  }
  return mailbox;
}

export async function disconnectPersonalMailbox(): Promise<PersonalMailbox> {
  const accessToken = await getAccessToken();
  const response = await fetch("/api/user/mailbox", {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const mailbox = await response.json();
  if (!response.ok) {
    throw new Error(mailbox.error || "Failed to disconnect personal mailbox.");
  }
  return mailbox;
}

export async function testPersonalMailbox(): Promise<{ success: true; recipient: string }> {
  const accessToken = await getAccessToken();
  const response = await fetch("/api/user/mailbox", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action: "test" }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Failed to test personal mailbox.");
  }
  return payload;
}
