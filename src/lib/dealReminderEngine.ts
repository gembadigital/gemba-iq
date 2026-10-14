// Fırsat Yönetimi (Deal Management) — aşama bazlı hatırlatma motoru (İSTEMCİ tarafı).
//
// Kullanıcı talebi: "Fırsat yönetiminde her bir aşamada hatırlatma özelliği
// olmalı ve bu özellik kullanıcılara mail atmalı... bu hatırlatmalar her bir
// fırsat aşamasında hatırlatma süresi ve frekansı elle kurulmalıdır."
//
// GÜNCELLEME (sunucu cron'u eklendi — bkz. lib/server/dealReminderCron.js):
// Bu dosya artık TEK hatırlatma yolu değil. Asıl (idempotent, DB-garantili,
// kullanıcı uygulamayı açmasa bile çalışan) tarama artık GÜNDE BİR KEZ
// sunucuda (Vercel cron) çalışıyor ve deal_stage_reminder_log tablosuna
// yazıyor (bkz. supabase/migrations/014_deal_stage_reminder_log.sql). Bu
// istemci motoru, sunucu cron'u üretimde doğrulanana kadar bir GEÇİŞ
// KATMANI olarak (crm_deal_stage_reminder_client_scan_enabled bayrağıyla,
// varsayılan AÇIK) hâlâ çalışıyor — kullanıcı sunucu tarafını doğruladıktan
// sonra bu bayrağı kapatıp bu motoru devre dışı bırakabilir. İki motor da
// aktifken AYNI gün için mükerrer e-posta riski YOKTUR (sunucu tarafı DB
// unique kısıtı ikinci denemeyi sessizce engeller), ama zil ikonunda aynı
// durağan fırsat için İKİ ayrı bildirim görünebilir (biri bu dosyadan/
// taskNotifications'tan, biri sunucudan/deal_stage_reminder_log'dan) —
// bayrak kapatılana kadar kabul edilen, geçici bir çakışma.
//
// Hesaplama mantığı (gün sayısı, "yakalama" kuralı, e-posta şablonu)
// kopyala-yapıştır yerine lib/dealReminderShared.js'den içe aktarılıyor —
// sunucudaki cron ile TAM AYNI sonucu üretmesi garanti edilsin diye.
//
// "Kaybedildi" fırsatlar için tekrar-temas hatırlatması ZATEN mevcuttu
// (bkz. DealManagementView.tsx handleLossReasonConfirm → CrmDb.upsertTask
// ile gerçek bir görev oluşturuyor, bu görev de zaten TasksView'ın mevcut
// due/overdue motoru üzerinden hem mail hem zil bildirimi üretiyor) — o
// akışa dokunulmadı, bu dosya sadece "hâlâ açık bir aşamada bekleyen"
// fırsatları kapsıyor.
import { CrmDb } from "./CrmDb";
import type { Deal } from "../components/DealManagementView";
import { isLostStage, isWonStage } from "../components/SalesDashboardView";
import type { TaskNotification } from "../components/TasksView";
import type { OrganizationDirectoryMember } from "../types/organization";
import {
  resolveMemberEmail,
  dispatchNotificationEmail,
  type MailSenderSource,
} from "./notificationMailer";
import { getSupabase } from "./supabaseClient";
import {
  istanbulDateParts,
  getStageEntryDateParts,
  daysBetweenParts,
  shouldFireNow as shouldFireNowShared,
  formatDealLabel,
  buildReminderEmail,
} from "../../lib/dealReminderShared.js";

export interface DealStageReminderRule {
  enabled: boolean;
  // Fırsat bu aşamaya girdikten kaç gün sonra ilk hatırlatma gönderilsin.
  thresholdDays: number;
  // İlk hatırlatmadan sonra kaç günde bir tekrarlansın (0/boş = tekrarlama, sadece bir kez).
  frequencyDays: number;
}

export type DealStageReminderSettings = Record<string, DealStageReminderRule>;

const DEAL_STAGE_REMINDER_SETTINGS_KEY = "crm_deal_stage_reminder_settings";

// Geçiş bayrağı: sunucu cron'u (lib/server/dealReminderCron.js) doğrulanana
// kadar istemci taramasının da çalışıp çalışmayacağını kontrol eder.
// Varsayılan true (bayrak hiç ayarlanmamışsa, mevcut davranış korunur).
const CLIENT_SCAN_ENABLED_KEY = "crm_deal_stage_reminder_client_scan_enabled";

export function getDealStageReminderSettings(): DealStageReminderSettings {
  return CrmDb.getKv<DealStageReminderSettings>(DEAL_STAGE_REMINDER_SETTINGS_KEY, {});
}

export function saveDealStageReminderSettings(settings: DealStageReminderSettings): void {
  CrmDb.setKv(DEAL_STAGE_REMINDER_SETTINGS_KEY, settings);
}

export function isClientScanEnabled(): boolean {
  return CrmDb.getKv<boolean>(CLIENT_SCAN_ENABLED_KEY, true);
}

export function setClientScanEnabled(enabled: boolean): void {
  CrmDb.setKv(CLIENT_SCAN_ENABLED_KEY, enabled);
}

export function getDaysInCurrentStage(deal: Deal, now: Date = new Date()): number | null {
  const enteredAt = getStageEntryDateParts(deal);
  if (!enteredAt) return null;
  return daysBetweenParts(enteredAt, istanbulDateParts(now));
}

export interface DealReminderScanResult {
  created: TaskNotification[];
}

// Ana tarama fonksiyonu — App.tsx tarafından periyodik olarak çağrılır,
// SADECE isClientScanEnabled() true ise (App.tsx bu kontrolü kendisi yapar).
// Yeni bildirimleri hem CrmDb'ye (zil ikonu için) kalıcı olarak yazar hem de
// gerçek e-postalarını gönderir.
export async function scanDealStageReminders(params: {
  orgMembers: OrganizationDirectoryMember[];
  mailSenderSource: MailSenderSource;
}): Promise<DealReminderScanResult> {
  const settings = getDealStageReminderSettings();
  if (Object.keys(settings).length === 0) return { created: [] };

  const deals = CrmDb.getDeals();
  const existingNotifications = CrmDb.getTaskNotifications();

  const now = new Date();
  const nowParts = istanbulDateParts(now);
  const todayIso = `${nowParts.year}-${String(nowParts.month).padStart(2, "0")}-${String(nowParts.day).padStart(2, "0")}`;
  // Aynı gün içindeki tekrarlanan tarama turlarının (3 dakikada bir) aynı
  // hatırlatmayı defalarca üretmesini engeller — TasksView'ın triggerKey
  // desenindeki gibi.
  const existingTriggerKeys = new Set(existingNotifications.map((n) => n.triggerKey));
  const toCreate: TaskNotification[] = [];

  for (const deal of deals) {
    if (isWonStage(deal.stage) || isLostStage(deal.stage)) continue;
    const rule = settings[deal.stage];
    if (!rule || !rule.enabled) continue;

    const enteredAt = getStageEntryDateParts(deal);
    if (!enteredAt) continue;
    const daysInStage = daysBetweenParts(enteredAt, nowParts);

    const priorReminderDateParts = existingNotifications
      .filter((n) => n.type === "deal_stage_stale" && n.dealId === deal.id && new Date(n.createdAt) >= new Date(Date.UTC(enteredAt.year, enteredAt.month - 1, enteredAt.day)))
      .map((n) => istanbulDateParts(new Date(n.createdAt)));

    if (!shouldFireNowShared(rule, enteredAt, daysInStage, priorReminderDateParts, nowParts)) continue;

    const triggerKey = `deal-stage-${deal.id}-${deal.stage}-${todayIso}`;
    if (existingTriggerKeys.has(triggerKey)) continue;

    const recipientEmail = resolveMemberEmail(deal.owner, undefined, params.orgMembers);
    const { subject, bodyHtml } = buildReminderEmail(deal, daysInStage);

    toCreate.push({
      id: `notif-${triggerKey}`,
      dealId: deal.id,
      taskTitle: formatDealLabel(deal),
      type: "deal_stage_stale",
      recipientName: deal.owner || "Fırsat Sahibi",
      recipientRole: "Deal Owner",
      recipientEmail,
      subject,
      bodyHtml,
      createdAt: now.toISOString(),
      isRead: false,
      status: "skipped",
      triggerKey,
    });
  }

  if (toCreate.length === 0) return { created: [] };

  const sent: TaskNotification[] = [];
  for (const notif of toCreate) {
    // eslint-disable-next-line no-await-in-loop
    const result = await dispatchNotificationEmail(notif, params.mailSenderSource);
    sent.push({ ...notif, ...result });
  }

  CrmDb.saveTaskNotifications([...existingNotifications, ...sent]);

  return { created: sent };
}

// ---------------------------------------------------------------------------
// Sunucu cron'unun ürettiği hatırlatmaları (deal_stage_reminder_log) üst
// menü zil ikonunda göstermek için — App.tsx'in buildBellNotifications'ı
// sadece taskNotifications'ı (bu dosyanın KENDİ ürettiklerini) biliyordu;
// artık asıl kaynak sunucu olduğundan zil bu tabloyu da okumalı. Egress
// fix'inin ruhuna uygun KÜÇÜK, hedefli bir sorgu (sadece kendi e-postası +
// son 30 gün + limit), RLS (deal_stage_reminder_log_select_org policy) zaten
// organizasyon sınırını koruyor.
export interface ServerDealStageReminder {
  id: string;
  dealId: string;
  stage: string;
  subject: string;
  status: "pending" | "sent" | "failed" | "skipped";
  errorNote: string | null;
  isRead: boolean;
  createdAt: string;
}

export async function fetchServerDealStageReminders(
  recipientEmail: string,
  sinceDaysAgo = 30
): Promise<ServerDealStageReminder[]> {
  const client = getSupabase();
  if (!client || !recipientEmail) return [];
  const sinceIso = new Date(Date.now() - sinceDaysAgo * 86400000).toISOString();
  const { data, error } = await client
    .from("deal_stage_reminder_log")
    .select("id, deal_id, stage, subject, status, error_note, is_read, created_at")
    .eq("recipient_email", recipientEmail)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(25);
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    dealId: row.deal_id,
    stage: row.stage,
    subject: row.subject || "",
    status: row.status,
    errorNote: row.error_note,
    isRead: row.is_read,
    createdAt: row.created_at,
  }));
}

export async function markServerDealStageReminderRead(id: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;
  await client.from("deal_stage_reminder_log").update({ is_read: true }).eq("id", id);
}

export async function markAllServerDealStageRemindersRead(recipientEmail: string): Promise<void> {
  const client = getSupabase();
  if (!client || !recipientEmail) return;
  await client
    .from("deal_stage_reminder_log")
    .update({ is_read: true })
    .eq("recipient_email", recipientEmail)
    .eq("is_read", false);
}
