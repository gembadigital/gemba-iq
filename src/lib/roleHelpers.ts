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

export function toPersistedOrganizationRole(role: AppRole): AppRole {
  return role;
}

export function formatAppRole(role: unknown): string {
  return normalizeAppRole(role);
}
