import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, ChevronDown, ChevronUp, ExternalLink, Paperclip } from 'lucide-react';
import { useLanguage } from '../../lib/LanguageContext';
import { fetchCompanyMailPage, syncCompanyMailPage, fetchCompanyMailDetail, type ArchivedCompanyMail } from '../../lib/companyCorrespondence';

export default function CompanyOutlookArchive({ companyId }: { companyId: string }) {
  const { lang } = useLanguage();
  const tr = lang === 'TR';
  const text = (a: string, b: string) => tr ? a : b;
  const [messages, setMessages] = useState<ArchivedCompanyMail[]>([]);
  const [busy, setBusy] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [contactEmails, setContactEmails] = useState<string[]>([]);
  const [contactScope, setContactScope] = useState('');
  const [lastSync, setLastSync] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [expanded, setExpanded] = useState('');
  const [details, setDetails] = useState<Record<string, { body_text: string; body_limited: boolean }>>({});
  const [loadingDetail, setLoadingDetail] = useState('');
  const controller = useRef<AbortController | null>(null);
  const syncing = useRef(false);
  const formatDate = (value: string) => new Date(value).toLocaleString(tr ? 'tr-TR' : 'en-GB', { timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short' });

  async function load(signal: AbortSignal, nextPage = 0) {
    const result = await fetchCompanyMailPage(companyId, nextPage, signal);
    if (signal.aborted) return;
    setMessages(previous => nextPage === 0 ? result.messages : [...new Map([...previous, ...result.messages].map(m => [m.id, m])).values()]);
    setHasMore(result.hasMore); setPage(nextPage); setLastSync(result.state?.completed_at || '');
  }
  async function sync(force: boolean, signal: AbortSignal) {
    if (syncing.current || signal.aborted) return;
    syncing.current = true; setBusy(true); setError(''); setNotice('');
    let imported = 0, matched = 0;
    try {
      let more = true, result;
      for (let batch = 0; more && batch < 60 && !signal.aborted; batch++) {
        result = await syncCompanyMailPage(companyId, force && batch === 0, signal, contactScope);
        if (signal.aborted) return;
        imported += result.imported; matched += result.matched; more = result.more;
        if (result.contactEmails) setContactEmails(result.contactEmails);
        if (result.contactHash) setContactScope(result.contactHash);
        setNotice(text(`${imported} yeni ileti kaydedildi · ${matched} eşleşme incelendi…`, `${imported} new messages saved · ${matched} matches checked…`));
      }
      if (signal.aborted) return;
      await load(signal);
      if (signal.aborted) return;
      if (more || result?.capped) setError(text('Tarama sınırına ulaşıldı; aktarımın tamamlandığı doğrulanamadı. Kaydedilen yazışmalar korunuyor. Kapsamı daraltmak için destek gerekiyor.', 'Scan limit reached; import could not be confirmed complete. Saved messages are preserved. A narrower scope is required.'));
      setNotice(result?.needsApproval ? text('Kişi adreslerini kontrol edip ilk aktarım için Outlook’u eşitle düğmesine basın. Kişi listesi değiştiğinde eşleştirmeyi yeniden başlatmanız gerekir.', 'Review the contact addresses and click Sync Outlook to start the import. Contact list changes require starting sync again.') : result?.done ? text(`${imported} yeni ileti kaydedildi. Eşitleme tamamlandı.`, `${imported} new messages saved. Sync complete.`) : '');
    } catch (e) {
      if (!signal.aborted) { setError(e instanceof Error ? e.message : text('Eşitleme başarısız.', 'Sync failed.')); setNotice(''); try { await load(signal); } catch { /* Preserve already displayed archive on failure. */ } }
    } finally { syncing.current = false; if (!signal.aborted) setBusy(false); }
  }
  useEffect(() => {
    const active = new AbortController(); controller.current = active;
    setMessages([]); setDetails({}); setExpanded(''); setLastSync(''); setBusy(true); setError(''); setNotice('');
    (async () => {
      try { await load(active.signal); if (!active.signal.aborted) await sync(false, active.signal); }
      catch (e) { if (!active.signal.aborted) { setError(e instanceof Error ? e.message : 'Arşiv yüklenemedi.'); setBusy(false); } }
    })();
    return () => { active.abort(); };
  }, [companyId]);

  async function toggle(message: ArchivedCompanyMail) {
    if (expanded === message.id) { setExpanded(''); return; }
    setExpanded(message.id); if (details[message.id]) return;
    const signal = controller.current?.signal;
    setLoadingDetail(message.id);
    try { const detail = await fetchCompanyMailDetail(companyId, message.id, signal); if (!signal?.aborted) setDetails(previous => ({ ...previous, [message.id]: detail })); }
    catch (e) { if (!signal?.aborted) setError(e instanceof Error ? e.message : 'İleti açılamadı.'); }
    finally { if (!signal?.aborted) setLoadingDetail(''); }
  }
  async function more() {
    if (!controller.current || loadingMore) return;
    setLoadingMore(true); setError('');
    try { await load(controller.current.signal, page + 1); } catch (e) { if (!controller.current.signal.aborted) setError(e instanceof Error ? e.message : 'Arşiv yüklenemedi.'); }
    finally { if (!controller.current?.signal.aborted) setLoadingMore(false); }
  }
  const safeLink = (value: string) => { try { const url = new URL(value); return url.protocol === 'https:' && /(^|\.)outlook\.(office\.com|office365\.com|live\.com)$/.test(url.hostname) ? url.href : ''; } catch { return ''; } };

  return <section data-crm-screen="CompanyOutlookArchive" data-crm-stack="" className="min-w-0 space-y-4" aria-label={text('Outlook yazışma arşivi', 'Outlook correspondence archive')}>
    <div data-crm-card="padded" className="min-w-0 space-y-3">
      <div data-crm-toolbar="" className="flex flex-wrap items-center justify-between gap-3"><h4 data-crm-heading="section">{text('Outlook yazışma arşivi', 'Outlook correspondence archive')}</h4><button data-crm-button="" type="button" disabled={busy} onClick={() => controller.current && sync(!!contactScope, controller.current.signal)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 disabled:opacity-50"><RefreshCw size={15} className={busy ? 'animate-spin' : ''} />{busy ? text('Eşitleniyor…', 'Syncing…') : text('Outlook’u eşitle', 'Sync Outlook')}</button></div>
      <p className="text-xs text-slate-500">{text('İlk aktarım: son 90 gün. İletişim Kişileri’ndeki tam e-posta adresleriyle eşleşen gelen ve gönderilen yazışmalar saklanır. Aktarılan kayıtları organizasyonunuzun üyeleri görebilir.', 'First import: last 90 days. Incoming and sent correspondence matching exact contact email addresses is saved and visible to members of your organization.')}</p>
      <p className="text-xs text-slate-500">{text('Sekme açılınca veya Eşitle ile güncellenir. Her kullanıcı kendi posta kutusunu eşitler. Ek dosyaların içeriği Outlook’ta kalır.', 'Updated on opening this tab or with Sync. Each user syncs their own mailbox. Attachment files remain in Outlook.')}</p>
      {contactEmails.length > 0 && <p className="text-xs text-slate-500" style={{overflowWrap:'anywhere'}}>{text('Eşleşme adresleri', 'Matching addresses')}: {contactEmails.join(', ')}</p>}
      {lastSync && <p className="text-xs text-slate-500">{text('Son eşitlemeniz', 'Your last sync')}: {formatDate(lastSync)}</p>}
      {notice && <p role="status" className="text-xs text-emerald-700 dark:text-emerald-300">{notice}</p>}
      {error && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300" style={{ overflowWrap: 'anywhere' }}>{error}</p>}
    </div>
    {messages.length === 0 && !busy && <p className="px-4 py-6 text-center text-xs text-slate-500">{text('Bu şirket için aktarılmış Outlook yazışması yok.', 'No Outlook correspondence imported for this company.')}</p>}
    {messages.map(message => <article key={message.id} data-crm-card="padded" className="min-w-0 space-y-3" style={{ overflowWrap: 'anywhere' }}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span data-crm-email="">{message.is_incoming ? text('Gelen', 'Incoming') : text('Gönderilen', 'Sent')} · {message.mailbox_address}</span><time dateTime={message.message_date}>{formatDate(message.message_date)}</time></div>
      <button data-crm-button="" type="button" aria-expanded={expanded === message.id} onClick={() => toggle(message)} className="flex w-full min-w-0 items-start justify-between gap-3 text-left"><strong className="min-w-0 text-sm font-semibold">{message.subject || text('(Konusuz)', '(No subject)')}</strong>{expanded === message.id ? <ChevronUp size={16} className="shrink-0" /> : <ChevronDown size={16} className="shrink-0" />}</button>
      <p className="text-xs text-slate-500">{text('Kimden', 'From')}: {message.sender}<br />{text('Kime', 'To')}: {message.recipients.join(', ')}{message.cc.length > 0 && <><br />CC: {message.cc.join(', ')}</>}</p>
      <p className="whitespace-pre-wrap text-xs leading-relaxed">{expanded === message.id ? loadingDetail === message.id ? text('İçerik yükleniyor…', 'Loading content…') : details[message.id]?.body_text ?? message.body_preview : message.body_preview}</p>
      {expanded === message.id && details[message.id]?.body_limited && <p className="text-xs text-amber-700 dark:text-amber-300">{text('Bu iletinin sınırlı metin kopyası saklandı; tam içerik Outlook’tadır.', 'A limited text copy was saved; full content remains in Outlook.')}</p>}
      {message.has_attachments && <p className="flex items-center gap-1 text-xs text-slate-500"><Paperclip size={13} />{text('Ek içeriyor · ek dosyalar Outlook’ta', 'Has attachments · files in Outlook')}</p>}
      {safeLink(message.web_link) && <a className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-300" target="_blank" rel="noopener noreferrer" href={safeLink(message.web_link)}><ExternalLink size={13} />{text('Outlook’ta aç', 'Open in Outlook')}</a>}
    </article>)}
    {hasMore && <button data-crm-button="" type="button" disabled={loadingMore || busy} onClick={more} className="rounded-lg border border-slate-200 px-4 py-2 text-xs">{loadingMore ? text('Yükleniyor…', 'Loading…') : text('Önceki yazışmaları yükle', 'Load older correspondence')}</button>}
  </section>;
}
