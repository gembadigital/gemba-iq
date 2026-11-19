import { assertMicrosoftOrganizationAccess } from './organizationAccess.js';
import { getRequestContext } from './organizationMailbox.js';
import { contactEmailSet, contactHash, matchCompanyMessage, assertOwnMailConnection, storedText, mailError } from './companyMailMatching.js';
import { searchCompanyMailPage, getMatchedMailBodies } from './graphCompanyMail.js';

const archiveFields = 'id,company_id,mailbox_user_id,mailbox_address,internet_message_id,conversation_id,sender,recipients,cc,subject,message_date,body_preview,body_limited,is_incoming,has_attachments,web_link,imported_at';
const scope = (query, context, companyId) => query.eq('organization_id', context.organizationId).eq('company_id', companyId);
function check(result, message) { if (result.error) throw mailError(message, 503); return result.data; }

async function companyContext(request) {
  const context = await getRequestContext(request);
  const companyId = request.body?.companyId;
  if (typeof companyId !== 'string' || !companyId || companyId.length > 255 || companyId === '__org_auxiliary__') throw mailError('Geçerli şirket kimliği gereklidir.');
  const company = await context.adminClient.from('companies').select('id').eq('organization_id', context.organizationId).eq('id', companyId).maybeSingle();
  check(company, 'Şirket erişimi doğrulanamadı.');
  if (!company.data) throw mailError('Şirket bulunamadı veya erişim yetkiniz yok.', 404);
  return { context, companyId };
}

export async function readCompanyCorrespondence(request) {
  const { context, companyId } = await companyContext(request);
  const page = Math.min(20000, Math.max(0, Number(request.body?.page) || 0));
  if (!Number.isInteger(page)) throw mailError('Geçersiz sayfa.');
  const data = check(await scope(context.adminClient.from('company_email_messages').select(archiveFields), context, companyId)
    .order('message_date', { ascending: false }).order('id', { ascending: false }).range(page * 50, page * 50 + 50), 'Şirket e-posta arşivi okunamadı.');
  const state = check(await scope(context.adminClient.from('company_email_sync_state').select('completed_at,capped'), context, companyId)
    .eq('mailbox_user_id', context.user.id).maybeSingle(), 'E-posta eşitleme durumu okunamadı.');
  return { messages: (data || []).slice(0, 50).map(row => ({ ...row, web_link: row.mailbox_user_id === context.user.id ? row.web_link : '' })), hasMore: data?.length > 50, state };
}

export async function readCompanyMailDetail(request) {
  const { context, companyId } = await companyContext(request);
  const messageId = request.body?.messageId;
  if (typeof messageId !== 'string' || !/^[a-f0-9-]{36}$/i.test(messageId)) throw mailError('Geçerli ileti kimliği gereklidir.');
  const row = check(await scope(context.adminClient.from('company_email_messages').select('id,body_text,body_limited'), context, companyId).eq('id', messageId).maybeSingle(), 'İleti içeriği okunamadı.');
  if (!row) throw mailError('İleti bulunamadı.', 404);
  return row;
}

export async function syncCompanyCorrespondence(request) {
  const { context, companyId } = await companyContext(request);
  await assertMicrosoftOrganizationAccess(context);
  if (request.body?.ownerId && request.body.ownerId !== context.user.id) throw mailError('Yalnızca kendi posta kutunuzu eşitleyebilirsiniz.', 403);
  const connection = check(await context.adminClient.from('user_mailbox_connections').select('mailbox_address,status').eq('user_id', context.user.id).eq('default_mailbox', true).maybeSingle(), 'Posta kutusu bağlantısı okunamadı.');
  const mailbox = assertOwnMailConnection(context.user, connection);
  const contacts = check(await context.adminClient.from('contacts').select('data').eq('organization_id', context.organizationId).eq('company_id', companyId), 'Şirket kişileri okunamadı.');
  const emails = contactEmailSet(contacts || []).filter(email => email !== mailbox);
  if (!emails.length) throw mailError('Önce bu şirketin İletişim Kişileri sekmesine geçerli müşteri e-posta adreslerini ekleyin.');
  if (emails.length > 100) throw mailError('Bu şirkette 100 üzerinde kişi adresi var. Eşitleme kapsamını daraltmak için destek gerekiyor.');
  const hash = contactHash([mailbox, ...emails]), now = new Date().toISOString();
  const stateTable = () => context.adminClient.from('company_email_sync_state');
  const stateQuery = query => scope(query, context, companyId).eq('mailbox_user_id', context.user.id);
  let state = check(await stateQuery(stateTable().select('*')).maybeSingle(), 'Eşitleme durumu okunamadı.');
  if ((!state || state.contact_hash !== hash) && (request.body?.force !== true || request.body?.approvedContactHash !== hash)) {
    return { imported: 0, matched: 0, more: false, done: false, needsApproval: true, contactEmails: emails, contactHash: hash };
  }
  if (!state) {
    check(await context.adminClient.from('company_email_sync_state').upsert({ organization_id: context.organizationId, company_id: companyId, mailbox_user_id: context.user.id, contact_hash: hash,
      range_start: new Date(Date.now() - 90 * 86400000).toISOString(), range_end: now }, { onConflict: 'organization_id,company_id,mailbox_user_id', ignoreDuplicates: true }), 'Eşitleme başlatılamadı.');
    state = check(await stateQuery(stateTable().select('*')).maybeSingle(), 'Eşitleme durumu okunamadı.');
  }
  if (state.contact_hash === hash && state.completed_at && Date.now() - Date.parse(state.completed_at) < 300000 && !request.body?.force) {
    return { imported: 0, matched: 0, more: false, done: true, skipped: true, completedAt: state.completed_at, contactEmails: emails, contactHash: hash };
  }
  if (state.capped && state.contact_hash === hash && !request.body?.force) return { imported: 0, matched: 0, more: false, done: false, capped: true, contactEmails: emails, contactHash: hash };
  if (state.contact_hash !== hash || state.completed_at || state.capped) {
    const since = state.contact_hash === hash && state.completed_at
      ? Math.max(Date.now() - 90 * 86400000, Date.parse(state.completed_at) - 2 * 86400000) : Date.now() - 90 * 86400000;
    const rows = check(await stateQuery(stateTable().update({ contact_hash: hash, range_start: new Date(since).toISOString(), range_end: now, next_link: null, scanned_count: 0, capped: false, completed_at: null, updated_at: now })).eq('updated_at', state.updated_at).select('*'), 'Eşitleme başlatılamadı.');
    if (rows?.length !== 1) throw mailError('Başka bir eşitleme çalışıyor. Sayfayı yenileyip tekrar deneyin.', 409);
    state = rows[0];
  }
  const page = await searchCompanyMailPage({ mailbox, emails, since: state.range_start, until: state.range_end, nextLink: state.next_link });
  const metadata = page.messages.filter(message => matchCompanyMessage(message, emails, mailbox, state.range_start, state.range_end));
  const existing = metadata.length ? check(await scope(context.adminClient.from('company_email_messages').select('graph_id'), context, companyId).eq('mailbox_user_id', context.user.id).in('graph_id', metadata.map(m => m.id)), 'Önceki ileti kayıtları doğrulanamadı.') : [];
  const known = new Set((existing || []).map(row => row.graph_id));
  const bodies = await getMatchedMailBodies(mailbox, metadata.filter(m => !known.has(m.id)).map(m => m.id));
  const requested = new Set(metadata.filter(m => !known.has(m.id)).map(m => m.id));
  const rows = bodies.flatMap(message => {
    if (!requested.has(message.id)) throw mailError('Outlook beklenmeyen ileti kimliği döndürdü.', 502);
    const match = matchCompanyMessage(message, emails, mailbox, state.range_start, state.range_end);
    if (!match) return [];
    return [{ organization_id: context.organizationId, company_id: companyId, mailbox_user_id: context.user.id, mailbox_address: mailbox,
      graph_id: message.id, internet_message_id: message.internetMessageId || null, conversation_id: message.conversationId || null,
      subject: String(message.subject || '').slice(0, 2000), ...match, ...storedText(message), has_attachments: !!message.hasAttachments, web_link: String(message.webLink || '') }];
  });
  const inserted = rows.length ? check(await context.adminClient.from('company_email_messages').upsert(rows, { onConflict: 'organization_id,company_id,mailbox_user_id,graph_id', ignoreDuplicates: true }).select('id'), 'İletiler veritabanına kaydedilemedi; eşitleme tamamlanmadı.') : [];
  const scanned = state.scanned_count + page.messages.length;
  const capped = !page.nextLink && scanned >= 1000;
  const completedAt = !page.nextLink && !capped ? new Date().toISOString() : null;
  const saved = check(await stateQuery(stateTable().update({ next_link: page.nextLink, scanned_count: scanned, completed_at: completedAt, capped, updated_at: new Date().toISOString() })).eq('updated_at', state.updated_at).select('updated_at'), 'Eşitleme ilerlemesi kaydedilemedi.');
  if (saved?.length !== 1) throw mailError('Başka bir eşitleme ilerledi. Kaydedilen iletiler korunuyor; tekrar deneyin.', 409);
  return { imported: inserted?.length || 0, matched: metadata.length, more: !!page.nextLink, done: !!completedAt, capped, completedAt, contactEmails: emails, contactHash: hash };
}

export async function companyCorrespondenceHandler(request, response) {
  response.setHeader('Cache-Control', 'private, no-store');
  try {
    const mode = request.body?.mode;
    const result = mode === 'company-read' ? await readCompanyCorrespondence(request) : mode === 'company-detail' ? await readCompanyMailDetail(request) : mode === 'company-sync' ? await syncCompanyCorrespondence(request) : null;
    if (!result) throw mailError('Geçersiz şirket e-posta işlemi.');
    return response.status(200).json(result);
  } catch (error) { return response.status(error.status || 500).json({ error: error.message || 'Şirket e-posta işlemi tamamlanamadı.' }); }
}
