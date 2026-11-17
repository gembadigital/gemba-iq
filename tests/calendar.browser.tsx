import React from 'react';
import { createRoot } from 'react-dom/client';
import CalendarView from '../src/components/CalendarView';
import { LanguageProvider } from '../src/lib/LanguageContext';
import { istanbulDateTime } from '../src/lib/calendarViewModel';

const day = istanbulDateTime(new Date()).slice(0, 10);
const query = new URLSearchParams(location.search);
const event = (id: string, subject: string, time = '07:00') => ({ id, subject, start: { dateTime: `${day}T${time}:00.0000000`, timeZone: 'UTC' }, end: { dateTime: `${day}T08:00:00.0000000`, timeZone: 'UTC' }, location: 'İstanbul', editable: true, isAllDay: false, webLink: 'https://outlook.office.com/calendar/item/test' });
(window as any).calendarFixture = { events: [event('linked', 'Uzun unvanlı müşteriyle üretim süreçleri ve operasyonel mükemmellik değerlendirme toplantısı'), event('private', 'Kişisel randevu')], connected: !query.has('disconnected'), failure: query.has('failure'), saveFailure: false, createCount: 0, updates: 0, deletes: 0, meetings: [{ id: 'meeting-1', date: day, time: '10:00', notes: 'CRM toplantı notu', graphEventId: 'linked' }] };
document.documentElement.classList.add('gemba-stitch-skin', 'saas-layout');
if (query.has('dark')) document.documentElement.classList.add('dark');
document.body.style.margin = '0';
createRoot(document.getElementById('root')!).render(<LanguageProvider><div style={{ padding: 16, maxWidth: 1200, margin: 'auto' }}><CalendarView /></div></LanguageProvider>);

const delay = (ms = 50) => new Promise(r => setTimeout(r, ms));
const wait = async (fn: () => boolean) => { for (let i = 0; i < 100; i++) { if (fn()) return; await delay(); } throw Error('UI condition timed out'); };
const results: { name: string; passed: boolean; error?: string }[] = [];
const expect = (value: unknown, message: string) => { if (!value) throw Error(message); };
const button = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent?.trim() === label)!;
const input = (index: number, value: string) => { const el = document.querySelectorAll<HTMLInputElement>('dialog input')[index]; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); };
async function run() {
  const check = async (name: string, fn: () => Promise<void>) => { try { await fn(); results.push({ name, passed: true }); } catch (e) { results.push({ name, passed: false, error: String(e) }); } };
  await wait(() => !!button('Randevu ekle') && !button('Randevu ekle').disabled);
  await check('Linked CRM record is deduplicated', async () => { expect(document.querySelectorAll('.crm-calendar-event').length === 2, 'Expected exactly 2 agenda entries'); });
  await check('Create appointment then reload from Outlook source', async () => {
    button('Randevu ekle').click(); await wait(() => !!document.querySelector('dialog[open] input'));
    const bounds = document.querySelector('dialog[open]')!.getBoundingClientRect(); expect(bounds.left >= 0 && bounds.right <= innerWidth + 1, 'Appointment dialog overflows viewport');
    input(0, 'Tarayıcı kayıt testi'); await delay();
    document.querySelector<HTMLFormElement>('dialog form')!.requestSubmit();
    await wait(() => (window as any).calendarFixture.createCount === 1 && !document.querySelector('dialog[open]'));
    await wait(() => document.querySelectorAll('.crm-calendar-event').length === 3);
    button('Eşitle').click(); await delay(100);
    expect(document.body.textContent?.includes('Tarayıcı kayıt testi'), 'New appointment lost after refresh');
  });
  await check('Edit appointment and retain updated title after sync', async () => {
    [...document.querySelectorAll<HTMLButtonElement>('.crm-calendar-event')].find(b => b.textContent?.includes('Tarayıcı kayıt testi'))!.click(); await delay(); button('Düzenle').click(); await delay(); input(0, 'Güncellenmiş randevu'); await delay(); document.querySelector<HTMLFormElement>('dialog form')!.requestSubmit(); await wait(() => (window as any).calendarFixture.updates === 1 && !document.querySelector('dialog[open]')); await wait(() => !!document.body.textContent?.includes('Güncellenmiş randevu'));
  });
  await check('Failed save keeps form values and does not show success', async () => {
    (window as any).calendarFixture.saveFailure = true; button('Randevu ekle').click(); await delay(); input(0, 'Korunacak içerik'); await delay(); document.querySelector<HTMLFormElement>('dialog form')!.requestSubmit(); await wait(() => !!document.querySelector('dialog [role=alert]')); expect(document.querySelector<HTMLInputElement>('dialog input')?.value === 'Korunacak içerik', 'Input disappeared'); expect(!!document.querySelector('dialog[open]'), 'Dialog closed on failure'); (window as any).calendarFixture.saveFailure = false; [...document.querySelectorAll<HTMLButtonElement>('dialog button')].find(b => b.textContent === 'Vazgeç')!.click(); await delay();
  });
  await check('Delete requires confirmation and removes remote record', async () => {
    [...document.querySelectorAll<HTMLButtonElement>('.crm-calendar-event')].find(b => b.textContent?.includes('Güncellenmiş randevu'))!.click(); await delay(); button('Sil').click(); await delay(); expect((window as any).calendarFixture.deletes === 0, 'Deleted before confirmation'); button('Silmeyi onayla').click(); await wait(() => (window as any).calendarFixture.deletes === 1 && !document.querySelector('dialog[open]')); await wait(() => document.querySelectorAll('.crm-calendar-event').length === 2);
  });
  await check('Month week day navigation and no page overflow', async () => {
    button('Hafta').click(); await delay(); expect(document.querySelectorAll('.crm-calendar-day').length === 7, 'Week should have 7 days'); button('Gün').click(); await delay(); expect(!document.querySelector('.crm-calendar-grid'), 'Day should show agenda'); button('Ay').click(); await delay(); expect(document.querySelectorAll('.crm-calendar-day').length === 42, 'Month should have 42 days'); expect(document.documentElement.scrollWidth <= innerWidth + 1, 'Page overflows horizontally');
  });
  const out = document.createElement('pre'); out.id = 'calendar-test-results'; out.textContent = JSON.stringify({ passed: results.filter(r => r.passed).length, total: results.length, results }, null, 2); document.body.append(out);
}
if (query.has('test')) run().catch(e => { const out = document.createElement('pre'); out.id = 'calendar-test-results'; out.textContent = String(e); document.body.append(out); });
