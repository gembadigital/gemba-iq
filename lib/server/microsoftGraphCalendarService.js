import { getMicrosoftGraphAccessToken } from "./microsoftGraphMailService.js";

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
  };

  logGraphCalendar("info", "Creating Microsoft Graph calendar event.", { sender, subject });

  const response = await fetch(endpoint, {
    method: "POST",
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
