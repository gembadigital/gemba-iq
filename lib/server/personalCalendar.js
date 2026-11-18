import { getPersonalMailboxForRequest } from "./personalMailbox.js";
import {
  createMicrosoftGraphCalendarEvent,
  deleteMicrosoftGraphCalendarEvent,
  listMicrosoftGraphCalendarEvents,
  updateMicrosoftGraphAppointment,
} from "./microsoftGraphCalendarService.js";
import { assertOwnCalendar, calendarError, validateAppointment, validateCalendarRange } from "./calendarValidation.js";
import { getCalendarOwners, selectCalendarOwners, assertCalendarWriteOwner } from './teamCalendarAccess.js';

export async function listPersonalCalendarEvents(request, query) {
  validateCalendarRange(query.start, query.end);
  const context = await getPersonalMailboxForRequest(request);
  const owners = await getCalendarOwners(context);
  const selected = selectCalendarOwners(owners, query.owner || 'self');
  const results = await Promise.allSettled(selected.map(async owner => {
    if (!owner.available) throw calendarError('Posta kutusu bağlantısı doğrulanamadı.');
    const events = await listMicrosoftGraphCalendarEvents({ mailboxAddress: owner.mailboxAddress, start: query.start, end: query.end, summaryOnly: !owner.isOwn });
    return events.map(event => ({ ...event, ownerId: owner.userId, ownerName: owner.ownerName, colorIndex: owner.colorIndex, isOwn: owner.isOwn }));
  }));
  const events = [], warnings = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') events.push(...result.value);
    else warnings.push(`${selected[index].ownerName}: ${result.reason?.message || 'Takvim okunamadı.'}`);
  });
  return { events, warnings, calendars: owners.map(({ mailboxAddress, ...owner }) => owner),
    mailbox: context.mailbox?.mailbox_address || '', syncedAt: warnings.length ? '' : new Date().toISOString() };
}

export async function savePersonalCalendarAppointment(request, body) {
  const context = await getPersonalMailboxForRequest(request, { requireConnected: true });
  assertCalendarWriteOwner(context, body);
  const mailboxAddress = assertOwnCalendar(context);
  const appointment = validateAppointment(body);
  if (body.eventId) {
    await updateMicrosoftGraphAppointment({ mailboxAddress, eventId: body.eventId, appointment });
    return { success: true, eventId: body.eventId };
  }
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(body.transactionId || '')) throw calendarError("Kayıt işlem kimliği gereklidir.");
  const result = await createMicrosoftGraphCalendarEvent({ mailboxAddress, ...appointment, transactionId: body.transactionId });
  return { success: true, eventId: result.id, webLink: result.webLink };
}

export async function removePersonalCalendarAppointment(request, body) {
  const context = await getPersonalMailboxForRequest(request, { requireConnected: true });
  assertCalendarWriteOwner(context, body);
  const mailboxAddress = assertOwnCalendar(context);
  await updateMicrosoftGraphAppointment({ mailboxAddress, eventId: body.eventId, remove: true });
  return { success: true };
}

// Outlook Calendar sync scoped to the signed-in user's own connected
// Personal Mailbox (src/components/UserAccountSettings.tsx already lets a
// user connect "their own Microsoft 365 mailbox" for sending proposal
// email — this reuses that exact same connection/address for calendar
// events, so there's no separate "connect calendar" step). Kullanıcı
// isteği: "kullanıcının email hesabı ile takvime bağlama... şirketlerle
// yapılan toplantılar burada kayıt altına alınsın" — push-only: a meeting
// logged in the CRM's Company > Toplantılar tab is created as an event on
// the logging user's own Outlook calendar.
export async function createPersonalCalendarEvent(request, body) {
  const context = await getPersonalMailboxForRequest(request, { requireConnected: true });
  assertCalendarWriteOwner(context, body);
  assertOwnCalendar(context);

  const subject = String(body?.subject || "").trim();
  const start = body?.start;
  const end = body?.end;
  if (!subject || !start || !end) {
    const error = new Error("Event subject, start and end are required.");
    error.status = 400;
    throw error;
  }

  const result = await createMicrosoftGraphCalendarEvent({
    mailboxAddress: context.mailbox.mailbox_address,
    subject,
    body: body?.body || "",
    start,
    end,
    timeZone: body?.timeZone || "Europe/Istanbul",
    location: body?.location || "",
    attendees: body?.attendees || [],
  });

  return {
    success: true,
    eventId: result.id,
    webLink: result.webLink,
    mailbox: context.mailbox.mailbox_address,
  };
}

export async function deletePersonalCalendarEvent(request, eventId) {
  const context = await getPersonalMailboxForRequest(request, { requireConnected: true });
  assertOwnCalendar(context);
  await deleteMicrosoftGraphCalendarEvent({
    mailboxAddress: context.mailbox.mailbox_address,
    eventId,
  });
  return { success: true };
}

export async function handlePersonalCalendarError(response, error) {
  const status = error.status || 500;
  return response.status(status).json({
    error: error.message || "Calendar request failed.",
    details: error.details || undefined,
  });
}
