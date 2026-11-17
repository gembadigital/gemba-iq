// Calendar endpoints accept dates, never caller-selected mailbox addresses or URLs.
export function calendarError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

export function assertOwnCalendar(context) {
  const email = String(context.user?.email || "").trim().toLowerCase();
  const mailbox = String(context.mailbox?.mailbox_address || "").trim().toLowerCase();
  if (!email || !context.user?.email_confirmed_at || email !== mailbox) {
    throw calendarError("Takvim için bağlı posta adresi doğrulanmış giriş e-posta adresinizle aynı olmalıdır. Hesabım bölümünü kontrol edin.", 403);
  }
  return mailbox;
}

export function validateCalendarRange(start, end) {
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
  if (!iso.test(String(start)) || !iso.test(String(end))) throw calendarError("Saat dilimi içeren başlangıç ve bitiş tarihleri gereklidir.");
  const from = Date.parse(start), to = Date.parse(end);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || to - from > 62 * 86400000) {
    throw calendarError("Takvim aralığı 0–62 gün arasında olmalıdır.");
  }
  return { start, end };
}

export function validateAppointment(body) {
  const subject = String(body?.subject || "").trim();
  if (!subject || subject.length > 255) throw calendarError("Başlık 1–255 karakter olmalıdır.");
  const wallTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
  if (!wallTime.test(body?.start) || !wallTime.test(body?.end)) throw calendarError("Geçerli başlangıç ve bitiş saatleri gereklidir.");
  const { start, end } = validateCalendarRange(`${body.start}+03:00`, `${body.end}+03:00`);
  // Reject impossible dates (e.g. 30 February) instead of letting JS normalize them.
  for (const value of [start, end]) {
    if (new Date(Date.parse(value) + 3 * 3600000).toISOString().slice(0, 19) !== value.slice(0, 19)) throw calendarError("Geçersiz takvim tarihi.");
  }
  return { subject, start: body.start, end: body.end, timeZone: "Europe/Istanbul", location: String(body.location || "").slice(0, 500) };
}

export function assertSimpleAppointment(event) {
  if (!event.isOrganizer || event.isAllDay || event.type !== "singleInstance" || event.attendees?.length || event.isOnlineMeeting) {
    throw calendarError("Katılımcılı, tekrarlayan, çevrimiçi veya tüm gün etkinliklerini Outlook üzerinden düzenleyin.", 409);
  }
}
