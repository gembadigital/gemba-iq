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

export function getUserMailboxSessionKey(userId: string | null | undefined): string {
  return userId ? "organization_mailbox_session:disabled" : "organization_mailbox_session:anonymous";
}

export function getUserMailboxConnectionsKey(userId: string | null | undefined): string {
  return userId ? "organization_mailbox_connections:disabled" : "organization_mailbox_connections:anonymous";
}

export function loadUserMailboxSession(userId: string | null | undefined): MailboxSession | null {
  void userId;
  return null;
}

export function saveUserMailboxSession(
  userId: string | null | undefined,
  session: MailboxSession
): void {
  void userId;
  void session;
}

export function clearUserMailboxSession(userId: string | null | undefined): void {
  void userId;
}

export function loadUserMailboxConnections(userId: string | null | undefined): MailboxConnectionRecord[] {
  void userId;
  return [];
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
