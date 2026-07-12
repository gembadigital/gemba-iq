import type { OrganizationRole } from "./invitationConstants";

export type AppRole = "ADMIN" | "USER";

const ADMIN_ROLES: OrganizationRole[] = ["owner", "admin"];

/** Maps organization_members.role to application ADMIN tier. */
export function isAppAdmin(role: OrganizationRole | null | undefined): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}

/** Resolves the two-tier app role from organization_members.role. */
export function getAppRole(role: OrganizationRole | null | undefined): AppRole {
  return isAppAdmin(role) ? "ADMIN" : "USER";
}
