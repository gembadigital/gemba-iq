import { getMicrosoftGraphAccessToken } from "./microsoftGraphMailService.js";
import { assertSimpleAppointment, calendarError, validateCalendarRange } from "./calendarValidation.js";

async function calendarRequest(url, options = {}) {
  const token = await getMicrosoftGraphAccessToken();
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(12000), headers: {
    Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: 'outlook.timezone="UTC"', ...options.headers,
  } });
  if (!response.ok) {
    const error = await parseGraphError(response);
    throw calendarError(response.status === 403 ? "Outlook takvim izni eksik. Microsoft 365 uygulamasında Calendars.ReadWrite izni ve yönetici onayı gereklidir." : error.message, response.status);
  }
  return response.status === 204 ? null : response.json();
}

function calendarRoot(mailboxAddress) {
  return `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailboxAddress)}`;
}

export async function listMicrosoftGraphCalendarEvents({ mailboxAddress, start, end }) {
  validateCalendarRange(start, end);
  const root = calendarRoot(mailboxAddress);
  const query = new URLSearchParams({ startDateTime: start, endDateTime: end, '$top': '200',
    '$select': 'id,subject,start,end,location,isAllDay,isCancelled,isOrganizer,type,attendees,isOnlineMeeting,webLink', '$orderby': 'start/dateTime' });
  let next = `${root}/calendarView?${query}`;
  const events = [];
  for (let page = 0; next && page < 10; page++) {
    const url = new URL(next);
    const expected = new URL(`${root}/calendarView`);
    if (url.origin !== expected.origin || decodeURIComponent(url.pathname) !== decodeURIComponent(expected.pathname)) throw calendarError("Geçersiz Outlook sayfalama bağlantısı.", 502);
    const payload = await calendarRequest(url.href);
    for (const e of payload.value || []) {
      if (!e.isCancelled) events.push({ id: e.id, subject: e.subject || "(Başlıksız)",
        start: e.start, end: e.end, location: e.location?.displayName || "", isAllDay: !!e.isAllDay,
        editable: !!e.isOrganizer && !e.isAllDay && e.type === 'singleInstance' && !e.attendees?.length && !e.isOnlineMeeting,
        webLink: e.webLink || "" });
    }
    next = payload['@odata.nextLink'] || "";
  }
  if (next) throw calendarError("Bu aralıkta çok fazla etkinlik var. Hafta veya gün görünümünü seçin.", 422);
  return events;
}

export async function updateMicrosoftGraphAppointment({ mailboxAddress, eventId, appointment = undefined, remove = false }) {
  if (!eventId || typeof eventId !== 'string' || eventId.length > 2048) throw calendarError("Geçerli etkinlik kimliği gereklidir.");
  const url = `${calendarRoot(mailboxAddress)}/events/${encodeURIComponent(eventId)}`;
  const event = await calendarRequest(`${url}?$select=id,isOrganizer,isAllDay,type,attendees,isOnlineMeeting`);
  assertSimpleAppointment(event);
  if (remove) return calendarRequest(url, { method: 'DELETE' });
  // Deliberately leave the body/attendees/online meeting information untouched.
  return calendarRequest(url, { method: 'PATCH', body: JSON.stringify({ subject: appointment.subject,
    start: { dateTime: appointment.start, timeZone: appointment.timeZone },
    end: { dateTime: appointment.end, timeZone: appointment.timeZone }, location: { displayName: appointment.location } }) });
}

// Outlook Calendar (Microsoft Graph) support, built on top of the same
// app-only client-credentials token already used for mail (see
// microsoftGraphMailService.js). Reusing that token means no new Azure app
// registration or per-user OAuth consent screen is needed — but the Azure
// app registration DOES need the application permission
// "Calendars.ReadWrite" granted with admin consent (in addition to the
// Mail.Send / Mail.Read permissions already granted there). That is a
// one-time, manual Azure Portal step outside of this codebase.

function createServiceError(message, status = 500, details = undefined) {
  const error = new Error(message);
  error.status = status;
  if (details) error.details = details;
  return error;
}

function logGraphCalendar(level, message, metadata = {}) {
  const payload = { service: "microsoft-graph-calendar", message, ...metadata };
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
}

async function parseGraphError(response) {
  const text = await response.text();
  try {
    const payload = JSON.parse(text);
    return {
      message: payload.error?.message || payload.error_description || payload.error || text,
      details: payload,
    };
  } catch {
    return { message: text || "Microsoft Graph calendar request failed.", details: text };
  }
}

function normalizeAttendees(value) {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  return list
    .map((item) => {
      if (typeof item === "string") return item.trim();
      return String(item?.email || item?.address || item?.emailAddress?.address || "").trim();
    })
    .filter(Boolean)
    .map((address) => ({ emailAddress: { address }, type: "required" }));
}

// Creates an event on {mailboxAddress}'s Outlook calendar.
export async function createMicrosoftGraphCalendarEvent({
  mailboxAddress,
  subject,
  body = "",
  start,
  end,
  timeZone = "Europe/Istanbul",
  location = "",
  attendees = [],
  transactionId,
}) {
  const sender = String(mailboxAddress || "").trim();
  if (!sender) {
    throw createServiceError("Mailbox address is required.", 400);
  }
  if (!subject || !start || !end) {
    throw createServiceError("Event subject, start and end are required.", 400);
  }

  const accessToken = await getMicrosoftGraphAccessToken();
  const endpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/events`;

  const event = {
    subject,
    body: { contentType: "HTML", content: body || "" },
    start: { dateTime: start, timeZone },
    end: { dateTime: end, timeZone },
    ...(location ? { location: { displayName: location } } : {}),
    attendees: normalizeAttendees(attendees),
    ...(transactionId ? { transactionId } : {}),
  };

  logGraphCalendar("info", "Creating Microsoft Graph calendar event.", { sender });

  const response = await fetch(endpoint, {
    method: "POST",
    signal: AbortSignal.timeout(12000),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    const graphError = await parseGraphError(response);
    logGraphCalendar("error", "Microsoft Graph create event failed.", {
      sender,
      status: response.status,
      error: graphError.message,
    });
    throw createServiceError(graphError.message, response.status || 502, graphError.details);
  }

  const payload = await response.json();
  logGraphCalendar("info", "Microsoft Graph calendar event created.", { sender, eventId: payload.id });
  return { id: payload.id, webLink: payload.webLink || "" };
}

// Deletes a previously created event — used when a meeting log entry is
// deleted from the CRM, so the Outlook calendar doesn't end up with stale
// entries. 404 (already gone) is treated as success.
export async function deleteMicrosoftGraphCalendarEvent({ mailboxAddress, eventId }) {
  const sender = String(mailboxAddress || "").trim();
  if (!sender || !eventId) {
    return { success: false };
  }

  const accessToken = await getMicrosoftGraphAccessToken();
  const endpoint = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/events/${encodeURIComponent(eventId)}`;

  const response = await fetch(endpoint, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok && response.status !== 404) {
    const graphError = await parseGraphError(response);
    logGraphCalendar("error", "Microsoft Graph delete event failed.", {
      sender,
      eventId,
      status: response.status,
      error: graphError.message,
    });
    throw createServiceError(graphError.message, response.status || 502, graphError.details);
  }

  logGraphCalendar("info", "Microsoft Graph calendar event deleted.", { sender, eventId });
  return { success: true };
}
