import assert from 'node:assert/strict';
import { assertOwnCalendar, assertSimpleAppointment, validateAppointment, validateCalendarRange } from '../lib/server/calendarValidation.js';
import { listMicrosoftGraphCalendarEvents, updateMicrosoftGraphAppointment } from '../lib/server/microsoftGraphCalendarService.js';
import { calendarDays, itemsForDay, normalizeOutlookEvent, istanbulDateTime } from '../src/lib/calendarViewModel';
import handler from '../api/user/mailbox.js';
let passed = 0;
const check = (label: string, fn: () => void) => { fn(); passed++; console.log(`PASS ${label}`); };
const own = { user: { email: 'owner@example.test', email_confirmed_at: '2026-01-01' }, mailbox: { mailbox_address: 'OWNER@example.test' } };
check('Only verified matching mailbox allowed', () => {
  assert.equal(assertOwnCalendar(own), 'owner@example.test');
  assert.throws(() => assertOwnCalendar({ ...own, mailbox: { mailbox_address: 'other@example.test' } }), /doğrulanmış/);
  assert.throws(() => assertOwnCalendar({ ...own, user: { email: 'owner@example.test' } }), /doğrulanmış/);
});
check('Range rejects missing offset, reversed and oversized requests', () => {
  validateCalendarRange('2026-11-01T00:00:00+03:00', '2026-12-13T00:00:00+03:00');
  for (const [start, end] of [['2026-11-01T00:00:00', '2026-11-02T00:00:00Z'], ['2026-11-02T00:00:00Z', '2026-11-01T00:00:00Z'], ['2026-01-01T00:00:00Z', '2026-12-01T00:00:00Z']]) assert.throws(() => validateCalendarRange(start, end));
});
check('Appointment validation rejects impossible dates and omits attendees/body', () => {
  assert.throws(() => validateAppointment({ subject: 'x', start: '2026-02-30T10:00:00', end: '2026-03-02T11:00:00' }));
  const result = validateAppointment({ subject: ' Test ', start: '2026-11-17T10:00:00', end: '2026-11-17T11:00:00', attendees: ['x@example.test'], body: 'ignore' });
  assert.equal(result.subject, 'Test'); assert.equal(result.timeZone, 'Europe/Istanbul'); assert.equal('attendees' in result, false);
});
check('Meeting and recurrence edits blocked server side', () => {
  const simple = { isOrganizer: true, type: 'singleInstance', attendees: [] };
  assertSimpleAppointment(simple);
  for (const change of [{ type: 'occurrence' }, { isOrganizer: false }, { isAllDay: true }, { attendees: [{}] }, { isOnlineMeeting: true }]) assert.throws(() => assertSimpleAppointment({ ...simple, ...change }));
});
check('Month spans 42 days from Monday across year boundary', () => {
  const days = calendarDays('2027-01-01', 'month'); assert.equal(days.length, 42); assert.equal(days[0], '2026-12-28');
  assert.deepEqual(calendarDays('2026-11-22', 'week'), ['2026-11-16','2026-11-17','2026-11-18','2026-11-19','2026-11-20','2026-11-21','2026-11-22']);
});
check('UTC timestamps and all-day boundaries use Istanbul correctly', () => {
  assert.equal(istanbulDateTime(new Date('2026-11-17T07:30:00Z')), '2026-11-17T10:30');
  const item = normalizeOutlookEvent({ id: '1', subject: 'all day', start: { dateTime: '2026-11-16T21:00:00.0000000', timeZone: 'UTC' }, end: { dateTime: '2026-11-17T21:00:00.0000000', timeZone: 'UTC' }, isAllDay: true, editable: false, location: '', webLink: '' });
  assert.equal(item.start, '2026-11-17T00:00'); assert.equal(itemsForDay([item], '2026-11-16').length, 0); assert.equal(itemsForDay([item], '2026-11-17').length, 1); assert.equal(itemsForDay([item], '2026-11-18').length, 0);
});
const originalFetch = globalThis.fetch;
const calls: { url: string; init: RequestInit }[] = [];
let responses: any[] = [];
globalThis.fetch = async (input, init = {}) => { calls.push({ url: String(input), init }); const next = responses.shift(); if (!next) throw Error('Unexpected request (real network prohibited)'); return new Response(next.status === 204 ? null : JSON.stringify(next.body), { status: next.status || 200 }); };
try {
  const root = 'https://graph.microsoft.com/v1.0/users/owner%40example.test/calendarView';
  responses = [{ body: { value: [{ id: '1', subject: 'One', start: {}, end: {} }], '@odata.nextLink': `${root}?$skiptoken=page2` } }, { body: { value: [{ id: '2', subject: 'Two', start: {}, end: {} }, { id: '3', isCancelled: true }] } }];
  const listed = await listMicrosoftGraphCalendarEvents({ mailboxAddress: 'owner@example.test', start: '2026-11-01T00:00:00+03:00', end: '2026-12-01T00:00:00+03:00' });
  check('Pagination returns complete list and omits cancelled events', () => assert.deepEqual(listed.map(e => e.id), ['1','2']));
  responses = [{ body: { value: [], '@odata.nextLink': 'https://evil.example.test/steal' } }];
  await assert.rejects(() => listMicrosoftGraphCalendarEvents({ mailboxAddress: 'owner@example.test', start: '2026-11-01T00:00:00Z', end: '2026-12-01T00:00:00Z' }), /sayfalama/); passed++; console.log('PASS Untrusted pagination URL rejected before fetch');
  responses = [{ body: { error: { message: 'Denied' } }, status: 403 }];
  await assert.rejects(() => listMicrosoftGraphCalendarEvents({ mailboxAddress: 'owner@example.test', start: '2026-11-01T00:00:00Z', end: '2026-12-01T00:00:00Z' }), /Calendars.ReadWrite/); passed++; console.log('PASS Permission failure never looks like an empty successful calendar');
  responses = [{ body: { isOrganizer: true, type: 'singleInstance', attendees: [] } }, { body: { id: '1' } }];
  await updateMicrosoftGraphAppointment({ mailboxAddress: 'owner@example.test', eventId: '1', appointment: validateAppointment({ subject: 'Edit', start: '2026-11-17T10:00:00', end: '2026-11-17T11:00:00' }) });
  check('Patch preserves body/Teams information and never adds attendees', () => { const body = JSON.parse(String(calls.at(-1)?.init.body)); assert.deepEqual(Object.keys(body).sort(), ['end','location','start','subject']); });
  responses = [{ body: { isOrganizer: true, type: 'occurrence', attendees: [] } }];
  await assert.rejects(() => updateMicrosoftGraphAppointment({ mailboxAddress: 'owner@example.test', eventId: '1', remove: true }), /tekrarlayan/); passed++; console.log('PASS Delete rechecks appointment eligibility');
  // The route is bundled with only its authentication/mailbox adapter mocked.
  (globalThis as any).calendarTestContext = own;
  responses = [{ body: { value: [] } }];
  const response: any = { statusCode: 0, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(s) { this.statusCode = s; return this; }, json(v) { this.data = v; return this; } };
  await handler({ method: 'GET', query: { action: 'calendar-list', start: '2026-11-01T00:00:00Z', end: '2026-12-01T00:00:00Z' } }, response);
  check('Existing mailbox route dispatches calendar GET with no-store', () => { assert.equal(response.statusCode, 200); assert.deepEqual(response.data.events, []); assert.equal(response.headers['Cache-Control'], 'private, no-store'); });
  responses = [{ body: { id: 'created-id', webLink: '' } }];
  await handler({ method: 'POST', body: { action: 'calendar-save', subject: 'Own appointment', start: '2026-11-17T10:00:00', end: '2026-11-17T11:00:00', transactionId: '12345678-1234-1234-1234-123456789012', attendees: ['ignored@example.test'] } }, response);
  check('Create has stable retry transaction ID and never sends invitations', () => { const payload = JSON.parse(String(calls.at(-1)?.init.body)); assert.equal(response.statusCode, 200); assert.equal(payload.transactionId, '12345678-1234-1234-1234-123456789012'); assert.deepEqual(payload.attendees, []); assert.equal(payload.start.timeZone, 'Europe/Istanbul'); });
  (globalThis as any).calendarTestContext = { ...own, mailbox: { mailbox_address: 'other@example.test' } };
  await handler({ method: 'POST', body: { action: 'calendar-save', subject: 'x' } }, response);
  check('Cross-mailbox route write blocked before any Graph request', () => assert.equal(response.statusCode, 403));
} finally { globalThis.fetch = originalFetch; }
console.log(`${passed} calendar checks passed; no live mailbox read or writes.`);
