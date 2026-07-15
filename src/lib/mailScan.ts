import { getSupabase } from "./supabaseClient";

export interface ScannedMailMessage {
  id: string;
  subject: string;
  date: string;
  from: { address: string; name: string };
  to: { address: string; name: string }[];
  bodyPreview: string;
  folder: "Inbox" | "Sent Items";
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

// Scans a connected Organization or Personal mailbox (Inbox + Sent Items)
// through the server-side Microsoft Graph application connection. Requires
// the Azure app registration to have Mail.Read granted with admin consent.
export async function scanMailbox(
  source: "organization" | "personal",
  top = 50
): Promise<{ mailboxAddress: string; messages: ScannedMailMessage[] }> {
  const accessToken = await getAccessToken();
  const response = await fetch("/api/mail/scan", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ source, top }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Failed to scan mailbox.");
  }
  return payload;
}
