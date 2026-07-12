import type { MailboxSession } from "../types";

export interface MailboxConnectionRecord {
  id: string;
  mailboxAddress: string;
  displayName: string;
  provider: "Microsoft 365" | "Outlook" | "Exchange Online" | "Gmail" | "Google Workspace" | "IMAP" | "SMTP";
  status: "Connected" | "Expired" | "Error" | "Sandbox";
  connectedAt: string;
  defaultMailbox: boolean;
}

const LEGACY_MAILBOX_SESSION_KEY = "m365_mailbox_session";

function sanitizeStoragePart(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "_");
}

export function getUserMailboxSessionKey(userId: string | null | undefined): string {
  return userId
    ? `m365_mailbox_session:${sanitizeStoragePart(userId)}`
    : LEGACY_MAILBOX_SESSION_KEY;
}

export function getUserMailboxConnectionsKey(userId: string | null | undefined): string {
  return userId
    ? `mailbox_connections:${sanitizeStoragePart(userId)}`
    : "mailbox_connections:anonymous";
}

export function loadUserMailboxSession(userId: string | null | undefined): MailboxSession | null {
  try {
    const userKey = getUserMailboxSessionKey(userId);
    const savedSession = localStorage.getItem(userKey) || localStorage.getItem(LEGACY_MAILBOX_SESSION_KEY);
    return savedSession ? (JSON.parse(savedSession) as MailboxSession) : null;
  } catch {
    return null;
  }
}

export function saveUserMailboxSession(
  userId: string | null | undefined,
  session: MailboxSession
): void {
  localStorage.setItem(getUserMailboxSessionKey(userId), JSON.stringify(session));
  localStorage.setItem(getUserMailboxConnectionsKey(userId), JSON.stringify([sessionToConnection(session)]));
}

export function clearUserMailboxSession(userId: string | null | undefined): void {
  localStorage.removeItem(getUserMailboxSessionKey(userId));
}

export function loadUserMailboxConnections(userId: string | null | undefined): MailboxConnectionRecord[] {
  try {
    const saved = localStorage.getItem(getUserMailboxConnectionsKey(userId));
    return saved ? (JSON.parse(saved) as MailboxConnectionRecord[]) : [];
  } catch {
    return [];
  }
}

export function sessionToConnection(session: MailboxSession): MailboxConnectionRecord {
  return {
    id: session.userPrincipalName || session.mail || "default-mailbox",
    mailboxAddress: session.mail,
    displayName: session.displayName,
    provider: "Microsoft 365",
    status: session.isSandbox ? "Sandbox" : "Connected",
    connectedAt: new Date().toISOString(),
    defaultMailbox: true,
  };
}
