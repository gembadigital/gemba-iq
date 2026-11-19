import { organizationFetch } from './organizationFetch';
import { getSupabase } from './supabaseClient';

export interface ArchivedCompanyMail {
  id: string; company_id: string; mailbox_address: string; sender: string; recipients: string[]; cc: string[];
  subject: string; message_date: string; body_preview: string; body_limited: boolean; is_incoming: boolean;
  has_attachments: boolean; web_link: string; internet_message_id?: string;
}
async function request(mode: string, body: Record<string, unknown>, signal?: AbortSignal) {
  const client = getSupabase();
  const { data: { session } } = client ? await client.auth.getSession() : { data: { session: null } };
  if (!session?.access_token) throw new Error('E-posta arşivi için oturum açmanız gerekiyor.');
  const response = await organizationFetch('/api/mail/scan', { method: 'POST', cache: 'no-store', signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ mode, ...body }) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'E-posta işlemi tamamlanamadı.');
  return result;
}
export async function fetchCompanyMailPage(companyId: string, page = 0, signal?: AbortSignal): Promise<{ messages: ArchivedCompanyMail[]; hasMore: boolean; state: { completed_at?: string; capped?: boolean } | null }> {
  return request('company-read', { companyId, page }, signal);
}
export async function syncCompanyMailPage(companyId: string, force = false, signal?: AbortSignal, approvedContactHash?: string): Promise<{ imported: number; matched: number; more: boolean; done: boolean; capped?: boolean; completedAt?: string; needsApproval?: boolean; contactEmails?: string[]; contactHash?: string }> {
  return request('company-sync', { companyId, force, approvedContactHash }, signal);
}
export async function fetchCompanyMailDetail(companyId: string, messageId: string, signal?: AbortSignal): Promise<{ id: string; body_text: string; body_limited: boolean }> {
  return request('company-detail', { companyId, messageId }, signal);
}
