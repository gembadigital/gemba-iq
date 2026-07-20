import { getPersonalMailboxForRequest } from "./personalMailbox.js";
import {
  createMicrosoftGraphCalendarEvent,
  deleteMicrosoftGraphCalendarEvent,
} from "./microsoftGraphCalendarService.js";

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
