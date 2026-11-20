export type AppRole = "ADMIN" | "USER";

export const APP_ROLES: AppRole[] = ["ADMIN", "USER"];

/** Normalizes persisted role values into the only roles the application supports. */
export function normalizeAppRole(role: unknown): AppRole {
  const value = String(role ?? "").trim();
  return value === "ADMIN" ? "ADMIN" : "USER";
}

export function isAdminRole(role: unknown): boolean {
  return normalizeAppRole(role) === "ADMIN";
}

export function getAppRole(role: unknown): AppRole {
  return normalizeAppRole(role);
}

export function toPersistedOrganizationRole(role: unknown): AppRole {
  return normalizeAppRole(role);
}

export function formatAppRole(role: unknown): string {
  return normalizeAppRole(role);
}

/** Platform access is separate from assignable organization membership roles. */
export type AccessRole = "SUPER_ADMIN" | AppRole;

// Used only to protect the owner row in the UI. Authorization stays in Supabase.
export const PLATFORM_OWNER_USER_ID = "9f80a07d-1286-48f8-b9e3-0dee7529f0bf";

export function getAccessRole(role: unknown, verifiedSuperadmin: boolean): AccessRole {
  return verifiedSuperadmin ? "SUPER_ADMIN" : normalizeAppRole(role);
}

export function formatAccessRole(role: AccessRole): string {
  return role === "SUPER_ADMIN" ? "Super Admin" : formatAppRole(role);
}

export function canManageMemberRow(isAdmin: boolean, actorId: string | undefined, targetId: string): boolean {
  return isAdmin && !!actorId && actorId !== targetId && targetId !== PLATFORM_OWNER_USER_ID;
}

/** Shared infrastructure panels are never part of organization-admin access. */
export function resolveAdminPanel(tab: string | undefined, isSuperadmin: boolean): string {
  const requested = tab || "organization";
  return !isSuperadmin && ["datahub", "systemhealth"].includes(requested) ? "organization" : requested;
}
