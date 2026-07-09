export type OrganizationRole =
  | "owner"
  | "admin"
  | "manager"
  | "sales"
  | "consultant"
  | "viewer";

export type InvitationStatus = "pending" | "accepted" | "expired" | "cancelled";

export const INVITABLE_ROLES: OrganizationRole[] = [
  "admin",
  "manager",
  "sales",
  "consultant",
  "viewer",
];

export const ORGANIZATION_ROLES: OrganizationRole[] = [
  "owner",
  ...INVITABLE_ROLES,
];

export function canInviteUsers(role: OrganizationRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

export function formatOrganizationRole(role: OrganizationRole, lang: "TR" | "EN" = "EN"): string {
  const labels: Record<OrganizationRole, { TR: string; EN: string }> = {
    owner: { TR: "Sahip", EN: "Owner" },
    admin: { TR: "Yönetici", EN: "Admin" },
    manager: { TR: "Müdür", EN: "Manager" },
    sales: { TR: "Satış", EN: "Sales" },
    consultant: { TR: "Danışman", EN: "Consultant" },
    viewer: { TR: "İzleyici", EN: "Viewer" },
  };
  return labels[role][lang];
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
