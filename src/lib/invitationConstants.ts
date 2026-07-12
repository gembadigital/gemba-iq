import { APP_ROLES, formatAppRole, isAdminRole, type AppRole } from "./roleHelpers";

export type OrganizationRole = AppRole;

export type InvitationStatus = "pending" | "accepted" | "expired" | "cancelled";

export const INVITABLE_ROLES: AppRole[] = ["USER"];

export const ORGANIZATION_ROLES: AppRole[] = APP_ROLES;

export function canInviteUsers(role: OrganizationRole | null | undefined): boolean {
  return isAdminRole(role);
}

export function formatOrganizationRole(role: OrganizationRole, lang: "TR" | "EN" = "EN"): string {
  return formatAppRole(role);
}

export const PENDING_INVITATION_TOKEN_KEY = "pending_invitation_token";

export function setPendingInvitationToken(token: string): void {
  try {
    sessionStorage.setItem(PENDING_INVITATION_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function getPendingInvitationToken(): string | null {
  try {
    return sessionStorage.getItem(PENDING_INVITATION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearPendingInvitationToken(): void {
  try {
    sessionStorage.removeItem(PENDING_INVITATION_TOKEN_KEY);
  } catch {
    // ignore
  }
}
