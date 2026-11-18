import type { OutlookCalendarEvent } from './personalCalendar';

export type CalendarMode = 'month' | 'week' | 'day';
export interface CalendarItem {
  id: string; subject: string; start: string; end: string; location: string;
  source: 'outlook' | 'crm'; editable: boolean; allDay: boolean; webLink?: string; notes?: string; crmLinked?: boolean;
  ownerId?: string; ownerName?: string; isOwn?: boolean; colorIndex?: number; graphEventId?: string;
}

// A single explicit display timezone avoids browser/host timezone and DST shifts.
export function istanbulDateTime(date: Date): string {
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const value = (type: string) => parts.find(p => p.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`;
}

export function addCalendarDays(day: string, amount: number): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) + amount * 86400000).toISOString().slice(0, 10);
}

export function calendarDays(day: string, mode: CalendarMode): string[] {
  if (mode === 'day') return [day];
  const first = mode === 'month' ? `${day.slice(0, 7)}-01` : day;
  const weekday = new Date(`${first}T12:00:00Z`).getUTCDay();
  const monday = addCalendarDays(first, -((weekday + 6) % 7));
  return Array.from({ length: mode === 'month' ? 42 : 7 }, (_, i) => addCalendarDays(monday, i));
}

export function normalizeOutlookEvent(event: OutlookCalendarEvent): CalendarItem {
  const instant = (value: string) => new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`);
  return { id: event.isOwn === false ? `${event.ownerId}:${event.id}` : event.id, graphEventId: event.id, subject: event.subject, start: istanbulDateTime(instant(event.start.dateTime)),
    end: istanbulDateTime(instant(event.end.dateTime)),
    location: event.location, source: 'outlook', editable: event.isOwn !== false && event.editable, allDay: event.isAllDay, webLink: event.webLink,
    ownerId: event.ownerId, ownerName: event.ownerName, isOwn: event.isOwn, colorIndex: event.colorIndex };
}

export function itemsForDay(items: CalendarItem[], day: string): CalendarItem[] {
  return items.filter(item => item.start < `${addCalendarDays(day, 1)}T00:00` && item.end > `${day}T00:00`).sort((a, b) => a.start.localeCompare(b.start));
}
