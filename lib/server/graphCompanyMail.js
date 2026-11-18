import { getMicrosoftGraphAccessToken } from './microsoftGraphMailService.js';
import { mailError } from './companyMailMatching.js';
const fields = 'id,internetMessageId,conversationId,subject,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,isDraft,hasAttachments,webLink';
async function graph(url, options = {}) {
  const token = await getMicrosoftGraphAccessToken();
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000), headers: {
    Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'IdType="ImmutableId", outlook.body-content-type="text"', ...options.headers,
  } });
  if (!response.ok) throw mailError(response.status === 403 ? 'Microsoft Mail.Read uygulama izni ve yönetici onayı gereklidir.' : `Outlook okuma işlemi başarısız (${response.status}). Tekrar deneyin.`, response.status);
  return response.json();
}
export function validateMailPageUrl(link, mailbox) {
  const url = new URL(link), root = new URL(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}/messages`);
  if (url.origin !== root.origin || decodeURIComponent(url.pathname) !== decodeURIComponent(root.pathname)) throw mailError('Geçersiz Outlook sayfalama adresi.', 502);
  return url.href;
}
export async function searchCompanyMailPage({ mailbox, emails, since, until, nextLink }) {
  const root = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}/messages`;
  const date = value => { const d = new Date(value); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`; };
  // Exchange search uses calendar dates. Widen by a day for mailbox timezone
  // differences; exact instants are checked before any body is fetched/saved.
  const firstDay = date(Date.parse(since) - 86400000), lastDay = date(Date.parse(until) + 86400000);
  const search = `(${emails.map(e => `participants:${e}`).join(' OR ')}) AND ((received>=${firstDay} AND received<=${lastDay}) OR (sent>=${firstDay} AND sent<=${lastDay}))`;
  const url = nextLink || `${root}?${new URLSearchParams({ '$search': `"${search}"`, '$select': fields, '$top': '20' })}`;
  const data = await graph(validateMailPageUrl(url, mailbox));
  if (!Array.isArray(data.value)) throw mailError('Outlook geçersiz posta listesi döndürdü.', 502);
  if (data['@odata.nextLink']) validateMailPageUrl(data['@odata.nextLink'], mailbox);
  return { messages: data.value, nextLink: data['@odata.nextLink'] || null };
}
export async function getMatchedMailBodies(mailbox, ids) {
  if (!ids.length) return [];
  if (ids.length > 20) throw mailError('Bir istekte en fazla 20 ileti işlenebilir.');
  const data = await graph('https://graph.microsoft.com/v1.0/$batch', { method: 'POST', body: JSON.stringify({ requests: ids.map((id, index) => ({
    id: String(index), method: 'GET', url: `/users/${encodeURIComponent(mailbox)}/messages/${encodeURIComponent(id)}?$select=${fields},body,bodyPreview`,
    headers: { Prefer: 'IdType="ImmutableId", outlook.body-content-type="text"' },
  })) }) });
  if (data.responses?.length !== ids.length || new Set(data.responses.map(r => r.id)).size !== ids.length || data.responses.some(r => !/^\d+$/.test(r.id) || !ids[Number(r.id)] || (r.status !== 404 && (r.status !== 200 || r.body?.id !== ids[Number(r.id)])))) throw mailError('Bazı iletilerin içeriği alınamadı. Eşitleme tamamlanmadı; tekrar deneyin.', 502);
  return data.responses.filter(r => r.status === 200).map(r => r.body);
}
