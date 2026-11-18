import { createHash } from 'node:crypto';

export function mailError(message, status = 400) { return Object.assign(new Error(message), { status }); }
export function normalizeContactEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return email.length <= 254 && /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email) ? email : '';
}
export function contactEmailSet(contacts) {
  return [...new Set(contacts.map(c => normalizeContactEmail(c.data?.email)).filter(Boolean))].sort();
}
export function contactHash(emails) { return createHash('sha256').update(JSON.stringify(emails)).digest('hex'); }
export function messageAddresses(message) {
  return { sender: normalizeContactEmail(message.from?.emailAddress?.address),
    to: (message.toRecipients || []).map(r => normalizeContactEmail(r.emailAddress?.address)).filter(Boolean),
    cc: (message.ccRecipients || []).map(r => normalizeContactEmail(r.emailAddress?.address)).filter(Boolean) };
}
export function matchCompanyMessage(message, contacts, mailbox, since, until) {
  if (message.isDraft || !message.id) return null;
  const { sender, to, cc } = messageAddresses(message);
  const incoming = sender !== mailbox;
  const participants = incoming ? [sender] : [...to, ...cc];
  const matches = participants.filter(address => contacts.includes(address) && address !== mailbox);
  const date = incoming ? message.receivedDateTime : message.sentDateTime;
  const instant = Date.parse(date);
  if (!matches.length || !Number.isFinite(instant) || instant < Date.parse(since) || instant > Date.parse(until)) return null;
  return { sender, recipients: to, cc, is_incoming: incoming, message_date: date, matched_contacts: [...new Set(matches)] };
}
export function assertOwnMailConnection(user, mailbox) {
  const address = normalizeContactEmail(mailbox?.mailbox_address);
  if (!user?.email_confirmed_at || !address || address !== normalizeContactEmail(user.email) || mailbox.status !== 'Connected') {
    throw mailError('Kendi doğrulanmış giriş e-posta adresinizle eşleşen kişisel Microsoft 365 posta kutusunu bağlayın.', 403);
  }
  return address;
}
export function storedText(message) {
  const text = String(message.body?.contentType || '').toLowerCase() === 'text' ? String(message.body?.content || '') : String(message.bodyPreview || '');
  // Bound bytes, not characters: Turkish and emoji can use several bytes.
  let bounded = text;
  if (Buffer.byteLength(bounded, 'utf8') > 250000) bounded = Buffer.from(bounded, 'utf8').subarray(0, 249996).toString('utf8');
  return { body_text: bounded, body_preview: bounded.slice(0, 300), body_limited: bounded !== text || String(message.body?.contentType || '').toLowerCase() !== 'text' };
}
