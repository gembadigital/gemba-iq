import { getSupabase } from "./supabaseClient";

export interface CreateCalendarEventInput {
  subject: string;
  body?: string;
  start: string; // ISO datetime, no timezone suffix (Graph applies timeZone separately)
  end: string; // ISO datetime
  timeZone?: string;
  location?: string;
  attendees?: string[];
}

export interface CreateCalendarEventResult {
  success: true;
  eventId: string;
  webLink: string;
  mailbox: string;
}

export interface OutlookCalendarEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location: string;
  isAllDay: boolean;
  editable: boolean;
  webLink: string;
  ownerId?: string;
  ownerName?: string;
  isOwn?: boolean;
  colorIndex?: number;
}

export interface CalendarOwner { userId: string; ownerName: string; isOwn: boolean; colorIndex: number; available: boolean }

async function calendarFetch(path: string, body?: Record<string, unknown>, signal?: AbortSignal) {
  const token = await getAccessToken();
  const response = await fetch(`/api/user/mailbox${path}`, {
    method: body ? 'POST' : 'GET', cache: 'no-store', signal,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Outlook takvim isteği tamamlanamadı.');
  return data;
}

export async function fetchPersonalCalendarEvents(start: string, end: string, signal?: AbortSignal, owner = 'all'): Promise<{ events: OutlookCalendarEvent[]; mailbox: string; syncedAt: string; calendars: CalendarOwner[]; warnings: string[] }> {
  return calendarFetch(`?${new URLSearchParams({ action: 'calendar-list', start, end, owner })}`, undefined, signal);
}

export async function savePersonalCalendarAppointment(input: { subject: string; start: string; end: string; location: string; transactionId: string; eventId?: string }): Promise<{ success: true; eventId: string }> {
  return calendarFetch('', { action: 'calendar-save', ...input });
}

export async function removePersonalCalendarAppointment(eventId: string): Promise<void> {
  await calendarFetch('', { action: 'calendar-remove', eventId });
}

async function getAccessToken(): Promise<string> {
  const client = getSupabase();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session?.access_token) {
    throw new Error("You must be signed in.");
  }
  return session.access_token;
}

// Creates an event on the signed-in user's connected Personal Mailbox's
// Outlook calendar (see src/lib/personalMailbox.ts — same connection, no
// separate "connect calendar" step). Throws if no Personal Mailbox is
// connected yet, or if the Azure app registration is missing the
// Calendars.ReadWrite permission — callers should treat this as best-effort
// and not block the underlying CRM action (e.g. saving a meeting log) on it.
//
// Routed through /api/user/mailbox (action: "calendar-create") instead of
// its own /api/user/calendar endpoint — Vercel's Hobby plan caps a
// deployment at 12 Serverless Functions, and this project was already at
// that cap, so a standalone calendar route made the deploy fail with
// "exceeded_serverless_functions_per_deployment". See api/user/mailbox.js.
export async function createPersonalCalendarEvent(
  input: CreateCalendarEventInput
): Promise<CreateCalendarEventResult> {
  const accessToken = await getAccessToken();
  const response = await fetch("/api/user/mailbox", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action: "calendar-create", ...input }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Failed to create Outlook calendar event.");
  }
  return payload;
}

export async function deletePersonalCalendarEvent(eventId: string): Promise<void> {
  const accessToken = await getAccessToken();
  const response = await fetch(`/api/user/mailbox?eventId=${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Failed to delete Outlook calendar event.");
  }
}
