const ACTIVE_ORG_STORAGE_KEY = "active_organization_id";
const ACTIVE_ACTOR_NAME_KEY = "active_actor_name";
const ACTIVE_ACTOR_EMAIL_KEY = "active_actor_email";

export function getActiveOrganizationId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ORG_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setActiveOrganizationContext(orgId: string, actorName: string, actorEmail: string): void {
  try {
    localStorage.setItem(ACTIVE_ORG_STORAGE_KEY, orgId);
    localStorage.setItem(ACTIVE_ACTOR_NAME_KEY, actorName);
    localStorage.setItem(ACTIVE_ACTOR_EMAIL_KEY, actorEmail);
  } catch {
    // ignore
  }
}

export function tenantStorageKey(baseKey: string): string {
  const orgId = getActiveOrganizationId();
  return orgId ? `org:${orgId}:${baseKey}` : baseKey;
}

export function getTenantActorName(): string {
  try {
    return localStorage.getItem(ACTIVE_ACTOR_NAME_KEY) || "User";
  } catch {
    return "User";
  }
}

export function getTenantActorEmail(): string {
  try {
    return localStorage.getItem(ACTIVE_ACTOR_EMAIL_KEY) || "";
  } catch {
    return "";
  }
}

export function resolveOrganizationId(explicit?: string): string {
  return explicit || getActiveOrganizationId() || "local";
}
