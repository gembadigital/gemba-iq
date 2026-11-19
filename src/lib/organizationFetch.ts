import { getSupabase } from './supabaseClient';
import { getActiveOrganizationId } from './tenantStorage';

/** Attach workspace context only to our relative API routes, never third parties. */
export async function organizationFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof input !== 'string' || !input.startsWith('/api/')) return fetch(input, init);
  const headers = new Headers(init?.headers);
  const orgId = getActiveOrganizationId();
  if (orgId) headers.set('X-Organization-Id', orgId);
  if (!headers.has('Authorization')) {
    const session = await getSupabase()?.auth.getSession();
    if (session?.data.session?.access_token) headers.set('Authorization', `Bearer ${session.data.session.access_token}`);
  }
  return fetch(input, { ...init, headers });
}
