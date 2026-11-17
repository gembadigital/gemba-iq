import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Plus, RefreshCw, X } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { CrmDb } from '../lib/CrmDb';
import { fetchPersonalMailbox } from '../lib/personalMailbox';
import { fetchPersonalCalendarEvents, savePersonalCalendarAppointment, removePersonalCalendarAppointment } from '../lib/personalCalendar';
import { addCalendarDays, calendarDays, istanbulDateTime, itemsForDay, normalizeOutlookEvent, type CalendarItem, type CalendarMode } from '../lib/calendarViewModel';
import type { CompanyMeeting } from './company-tabs/CompanyMeetingsTab';
import '../styles/calendar.css';

export default function CalendarView() {
  const { lang } = useLanguage();
  const tr = lang === 'TR';
  const text = (turkish: string, english: string) => tr ? turkish : english;
  const today = istanbulDateTime(new Date()).slice(0, 10);
  const [day, setDay] = useState(today);
  const [mode, setMode] = useState<CalendarMode>('month');
  const [events, setEvents] = useState<CalendarItem[]>([]);
  const [mailbox, setMailbox] = useState('');
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncedAt, setSyncedAt] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [source, setSource] = useState('all');
  const [revision, setRevision] = useState(0);
  const [details, setDetails] = useState<CalendarItem | null>(null);
  const [form, setForm] = useState<{ subject: string; start: string; end: string; location: string; transactionId: string; eventId?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const days = useMemo(() => calendarDays(day, mode), [day, mode]);
  const rangeStart = days[0], rangeEnd = addCalendarDays(days[days.length - 1], 1);
  const locale = tr ? 'tr-TR' : 'en-GB';
  const formatDay = (value: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) => new Date(`${value}T12:00:00Z`).toLocaleDateString(locale, { ...options, timeZone: 'Europe/Istanbul' });

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setEvents([]); setSyncedAt(''); setRevision(n => n + 1);
    (async () => {
      try {
        const status = await fetchPersonalMailbox();
        if (controller.signal.aborted) return;
        setMailbox(status.mailbox_address || ''); setConnected(status.status === 'Connected');
        if (status.status !== 'Connected') return;
        const result = await fetchPersonalCalendarEvents(`${rangeStart}T00:00:00+03:00`, `${rangeEnd}T00:00:00+03:00`, controller.signal);
        if (controller.signal.aborted) return;
        setEvents(result.events.map(normalizeOutlookEvent)); setSyncedAt(result.syncedAt);
      } catch (e) {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Outlook takvimi yüklenemedi.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [rangeStart, rangeEnd, refresh]);

  // Personal Outlook data stays in memory; it is never copied into org-shared KV.
  const meetings = useMemo(() => CrmDb.getCompanies().flatMap(company =>
    CrmDb.getKv<CompanyMeeting[]>(`crm_company_meetings_${company.id}`, []).map(meeting => {
      const start = `${meeting.date}T${meeting.time || '10:00'}`;
      return { id: `crm:${company.id}:${meeting.id}`, subject: company.name, start,
        end: istanbulDateTime(new Date(Date.parse(`${start}:00+03:00`) + 3600000)),
        source: 'crm', editable: false, allDay: false, location: '', notes: meeting.notes, graphId: meeting.graphEventId } as CalendarItem & { graphId?: string };
    })), [revision]);
  const items = useMemo(() => {
    const ids = new Set(events.map(e => e.id));
    const linked = new Map(meetings.filter(m => m.graphId).map(m => [m.graphId, m]));
    const outlook = events.map(event => { const meeting = linked.get(event.id); return meeting ? { ...event, editable: false, notes: meeting.notes, crmLinked: true } : event; });
    return [...outlook, ...meetings.filter(m => source === 'crm' || !m.graphId || !ids.has(m.graphId))].filter(e => source === 'all' || e.source === source);
  }, [events, meetings, source]);
  const selectedItems = itemsForDay(items, day);

  const closeDialog = useCallback(() => {
    if (saving) return;
    setForm(null); setDetails(null); setDeleteConfirm(false); setFormError('');
  }, [saving]);
  const open = !!form || !!details;
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.open) {
      openerRef.current = document.activeElement as HTMLElement;
      dialog.showModal();
    } else if (!open && dialog?.open) { dialog.close(); openerRef.current?.focus(); }
  }, [open]);

  const navigate = (direction: number) => {
    if (mode === 'month') {
      const date = new Date(`${day.slice(0, 7)}-01T12:00:00Z`);
      date.setUTCMonth(date.getUTCMonth() + direction); setDay(date.toISOString().slice(0, 10));
    } else setDay(addCalendarDays(day, direction * (mode === 'week' ? 7 : 1)));
  };
  const newAppointment = () => {
    setNotice(''); setFormError(''); setDetails(null);
    setForm({ subject: '', start: `${day}T10:00`, end: `${day}T11:00`, location: '', transactionId: crypto.randomUUID() });
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!form || saving) return;
    if (form.end <= form.start) { setFormError(text('Bitiş, başlangıçtan sonra olmalıdır.', 'End must be after start.')); return; }
    setSaving(true); setFormError('');
    try {
      await savePersonalCalendarAppointment({ ...form, start: `${form.start}:00`, end: `${form.end}:00` });
      setForm(null); setDetails(null); setNotice(text('Randevu Outlook’a kaydedildi.', 'Appointment saved to Outlook.')); setRefresh(n => n + 1);
    } catch (e) { setFormError(e instanceof Error ? e.message : text('Kayıt başarısız.', 'Save failed.')); }
    finally { setSaving(false); }
  };
  const remove = async () => {
    if (!details?.editable || saving) return;
    setSaving(true); setFormError('');
    try { await removePersonalCalendarAppointment(details.id); setDetails(null); setDeleteConfirm(false); setNotice(text('Randevu Outlook’tan silindi.', 'Appointment deleted from Outlook.')); setRefresh(n => n + 1); }
    catch (e) { setFormError(e instanceof Error ? e.message : text('Silinemedi.', 'Delete failed.')); }
    finally { setSaving(false); }
  };
  const safeLink = (url?: string) => { try { const parsed = new URL(url || ''); return parsed.protocol === 'https:' && /(^|\.)outlook\.(office\.com|office365\.com|live\.com)$/.test(parsed.hostname) ? parsed.href : ''; } catch { return ''; } };

  return <section data-crm-screen="CalendarView" className="crm-page-section crm-calendar">
    <header data-crm-header="" className="crm-page-header">
      <div><h1 data-crm-heading="page">{text('Takvim', 'Calendar')}</h1><p className="crm-calendar-muted">{text('Outlook randevularınız ve müşteri toplantıları tek yerde.', 'Your Outlook appointments and CRM meetings in one place.')}</p></div>
      <div className="crm-page-actions"><button type="button" onClick={() => setRefresh(n => n + 1)} disabled={loading || saving}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} />{text('Eşitle', 'Sync')}</button><button type="button" className="crm-calendar-primary" onClick={newAppointment} disabled={!connected || loading}><Plus size={16} />{text('Randevu ekle', 'New appointment')}</button></div>
    </header>
    <div className="crm-calendar-status" role="status">{mailbox || text('Outlook bağlı değil', 'Outlook disconnected')}<span>· {text('Türkiye saati (UTC+3)', 'Istanbul time (UTC+3)')}</span>{syncedAt && <span>· {text('Son eşitleme', 'Last synced')}: {istanbulDateTime(new Date(syncedAt)).slice(11)}</span>}{loading && <span>· {text('Yükleniyor…', 'Loading…')}</span>}</div>
    {!connected && !loading && <p className="crm-calendar-banner">{text('Outlook randevularını görmek ve eklemek için Ayarlar → Hesabım → Kişisel Posta Kutusu bölümünden kendi Microsoft 365 adresinizi bağlayın. Müşteri toplantıları aşağıda görüntülenir.', 'Connect your own Microsoft 365 address in Settings → My Account → Personal Mailbox to view and create Outlook appointments. CRM meetings are shown below.')}</p>}
    {error && <p role="alert" className="crm-calendar-banner crm-calendar-error">{error} {text('Outlook verileri yüklenmedi; yalnızca CRM kayıtları gösteriliyor.', 'Outlook data could not be loaded; only CRM records are shown.')}</p>}
    {notice && <p role="status" className="crm-calendar-banner">{notice}</p>}
    <div data-crm-card="padded" className="crm-panel">
      <div className="crm-calendar-toolbar">
        <div className="crm-calendar-navigation"><button type="button" aria-label={text('Önceki dönem', 'Previous period')} onClick={() => navigate(-1)}><ChevronLeft size={18} /></button><button type="button" onClick={() => setDay(today)}>{text('Bugün', 'Today')}</button><button type="button" aria-label={text('Sonraki dönem', 'Next period')} onClick={() => navigate(1)}><ChevronRight size={18} /></button></div>
        <h2 aria-live="polite">{formatDay(day, mode === 'month' ? { month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long', year: 'numeric' })}</h2>
        <div className="crm-calendar-views" aria-label={text('Takvim görünümü', 'Calendar view')}>{(['month', 'week', 'day'] as const).map(value => <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)}>{value === 'month' ? text('Ay', 'Month') : value === 'week' ? text('Hafta', 'Week') : text('Gün', 'Day')}</button>)}</div>
      </div>
      <div className="crm-calendar-filter"><label>{text('Göster', 'Show')} <select aria-label={text('Etkinlik kaynağı', 'Event source')} value={source} onChange={e => setSource(e.target.value)}><option value="all">{text('Tümü', 'All')}</option><option value="outlook">Outlook</option><option value="crm">{text('Müşteri toplantıları', 'CRM meetings')}</option></select></label><span className="crm-calendar-muted">{text('Ekran açıldığında ve Eşitle ile güncellenir.', 'Updated on opening and with Sync.')}</span></div>
      {mode !== 'day' && <div className={`crm-calendar-grid ${mode === 'week' ? 'crm-calendar-week' : ''}`} aria-label={text('Takvim günleri', 'Calendar days')}>
        {days.slice(0, 7).map(date => <div key={`label-${date}`} className="crm-calendar-weekday">{formatDay(date, { weekday: 'short' })}</div>)}
        {days.map(date => { const entries = itemsForDay(items, date); return <button type="button" key={date} className="crm-calendar-day" data-selected={date === day} data-today={date === today} data-outside={date.slice(0, 7) !== day.slice(0, 7)} aria-pressed={date === day} aria-label={`${formatDay(date)} · ${entries.length} ${text('etkinlik', 'events')}`} onClick={() => setDay(date)}><span className="crm-calendar-date">{Number(date.slice(8))}</span>{entries.slice(0, 2).map(item => <span key={item.id} className={`crm-calendar-chip crm-calendar-${item.source}`}>{item.allDay ? '' : `${item.start.slice(11)} `}{item.subject}</span>)}{entries.length > 2 && <span className="crm-calendar-count">+{entries.length - 2}</span>}{entries.length > 0 && <span className="crm-calendar-mobile-count">{entries.length}</span>}</button>; })}
      </div>}
    </div>
    <div data-crm-card="padded" className="crm-panel crm-calendar-agenda"><h2>{formatDay(day)} <span className="crm-calendar-muted">· {selectedItems.length} {text('etkinlik', 'events')}</span></h2>
      {selectedItems.length === 0 ? <div className="crm-calendar-empty"><CalendarDays size={28} /><p>{text('Bu güne ait kayıt yok.', 'No events for this day.')}</p></div> : selectedItems.map(item => <button type="button" key={item.id} className="crm-calendar-event" onClick={() => { setDetails(item); setFormError(''); setDeleteConfirm(false); }}><span className="crm-calendar-time">{item.allDay ? text('Tüm gün', 'All day') : item.start.slice(0, 10) < day ? text('Devam ediyor', 'Continues') : item.start.slice(11)}</span><span className="crm-calendar-event-title"><strong>{item.subject}</strong><span>{item.location || (item.source === 'crm' ? text('Müşteri kartı toplantı kaydı', 'CRM meeting record') : 'Outlook')}</span></span><span className={`crm-calendar-tag crm-calendar-${item.source}`}>{item.source === 'crm' ? 'CRM' : 'Outlook'}</span></button>)}
    </div>
    <dialog ref={dialogRef} className="crm-calendar-dialog" aria-labelledby="calendar-dialog-title" onCancel={e => { e.preventDefault(); closeDialog(); }}>
      <header><h2 id="calendar-dialog-title">{form ? form.eventId ? text('Randevuyu düzenle', 'Edit appointment') : text('Yeni randevu', 'New appointment') : text('Etkinlik ayrıntıları', 'Event details')}</h2><button type="button" aria-label={text('Kapat', 'Close')} onClick={closeDialog} disabled={saving}><X size={18} /></button></header>
      {form ? <form onSubmit={save} id="calendar-appointment-form" className="crm-calendar-form"><label>{text('Başlık', 'Title')}<input autoFocus data-crm-field="control" required maxLength={255} value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></label><div className="crm-calendar-form-dates"><label>{text('Başlangıç', 'Start')}<input data-crm-field="control" required type="datetime-local" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} /></label><label>{text('Bitiş', 'End')}<input data-crm-field="control" required type="datetime-local" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} /></label></div><label>{text('Konum', 'Location')}<input data-crm-field="control" maxLength={500} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></label><p className="crm-calendar-muted">{text('Türkiye saati. Randevu kendi Outlook takviminize kaydedilir; katılımcı daveti gönderilmez.', 'Istanbul time. Saved to your own Outlook calendar; no attendee invitations are sent.')}</p></form> : details && <div className="crm-calendar-detail"><h3>{details.subject}</h3><p>{formatDay(details.start.slice(0, 10))} · {details.allDay ? text('Tüm gün', 'All day') : `${details.start.slice(11)} – ${formatDay(details.end.slice(0, 10))} ${details.end.slice(11)}`}</p>{details.location && <p>{details.location}</p>}{details.notes && <p className="crm-calendar-notes">{details.notes}</p>}{(details.source === 'crm' || details.crmLinked) && <p className="crm-calendar-muted">{text('Bu kayıt müşteri kartının Toplantılar sekmesinden yönetilir.', 'Manage this record from the customer card Meetings tab.')}</p>}{details.source === 'outlook' && !details.crmLinked && !details.editable && <p className="crm-calendar-muted">{text('Bu etkinliğin katılımcı veya tekrar düzenini Outlook üzerinden yönetin.', 'Manage this event and its attendees or recurrence in Outlook.')}</p>}{safeLink(details.webLink) && <a href={safeLink(details.webLink)} target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> {text('Outlook’ta aç', 'Open in Outlook')}</a>}</div>}
      {formError && <p role="alert" className="crm-calendar-error crm-calendar-detail">{formError}</p>}
      {deleteConfirm && <p role="alert" className="crm-calendar-detail">{text('Bu randevu Outlook takviminizden silinecek. Onaylıyor musunuz?', 'This appointment will be deleted from Outlook. Confirm?')}</p>}
      <footer><button type="button" onClick={closeDialog} disabled={saving}>{text('Vazgeç', 'Cancel')}</button>{form ? <button type="submit" form="calendar-appointment-form" className="crm-calendar-primary" disabled={saving}>{saving ? text('Kaydediliyor…', 'Saving…') : text('Outlook’a kaydet', 'Save to Outlook')}</button> : details?.editable && <><button type="button" disabled={saving} onClick={() => deleteConfirm ? remove() : setDeleteConfirm(true)}>{saving ? text('İşleniyor…', 'Working…') : deleteConfirm ? text('Silmeyi onayla', 'Confirm deletion') : text('Sil', 'Delete')}</button><button type="button" disabled={saving} onClick={() => { setForm({ subject: details.subject, start: details.start, end: details.end, location: details.location, eventId: details.id, transactionId: crypto.randomUUID() }); setDeleteConfirm(false); }}>{text('Düzenle', 'Edit')}</button></>}</footer>
    </dialog>
  </section>;
}
