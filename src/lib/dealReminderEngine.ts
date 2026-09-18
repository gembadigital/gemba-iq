// Fırsat Yönetimi (Deal Management) — aşama bazlı hatırlatma motoru.
//
// Kullanıcı talebi: "Fırsat yönetiminde her bir aşamada hatırlatma özelliği
// olmalı ve bu özellik kullanıcılara mail atmalı... bu hatırlatmalar her bir
// fırsat aşamasında hatırlatma süresi ve frekansı elle kurulmalıdır."
//
// TasksView.tsx'teki mevcut görev hatırlatma/eskalasyon motoruyla AYNI temel
// mekanizmayı kullanır (aynı gerçek posta kutusu bağlantısı — bkz.
// notificationMailer.ts —, aynı TaskNotification deposu, dolayısıyla aynı
// üst menü zil ikonu) ama görevlerden bağımsız, doğrudan fırsat/aşama
// verisine dayanır: bir fırsat, kendi aşamasının yapılandırılmış "eşik günü"
// kadar süredir o aşamada bekliyorsa ilk hatırlatma, ardından yapılandırılmış
// "frekans" gün aralığıyla tekrarlanan hatırlatmalar üretir.
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

export interface DealStageReminderRule {
  enabled: boolean;
  // Fırsat bu aşamaya girdikten kaç gün sonra ilk hatırlatma gönderilsin.
  thresholdDays: number;
  // İlk hatırlatmadan sonra kaç günde bir tekrarlansın (0/boş = tekrarlama, sadece bir kez).
  frequencyDays: number;
}

export type DealStageReminderSettings = Record<string, DealStageReminderRule>;

const DEAL_STAGE_REMINDER_SETTINGS_KEY = "crm_deal_stage_reminder_settings";

export function getDealStageReminderSettings(): DealStageReminderSettings {
  return CrmDb.getKv<DealStageReminderSettings>(DEAL_STAGE_REMINDER_SETTINGS_KEY, {});
}

export function saveDealStageReminderSettings(settings: DealStageReminderSettings): void {
  CrmDb.setKv(DEAL_STAGE_REMINDER_SETTINGS_KEY, settings);
}

// stageHistory tarihleri toLocaleDateString("tr-TR") ile "gg.aa.yyyy"
// formatında saklanıyor (bkz. DealManagementView.tsx handleDealDropOnStage).
function parseTrDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);
  if (!day || !month || !year) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

// Fırsatın MEVCUT aşamasına en son ne zaman girdiğini stageHistory'den okur.
// stageHistory yoksa/eşleşmiyorsa null döner — bu durumda hatırlatma
// gönderilmez (yanlış bir tarihle spam yapmaktansa hiç göndermemek tercih
// edilir; bkz. handleDealDropOnStage'in her aşama değişiminde bir kayıt
// eklediği — sadece çok eski/CSV ile içe aktarılmış kayıtlarda eksik olabilir).
export function getStageEntryDate(deal: Deal): Date | null {
  const entries = (deal.stageHistory || []).filter((h) => h.stage === deal.stage);
  if (entries.length === 0) return null;
  return parseTrDate(entries[entries.length - 1].date);
}

export function getDaysInCurrentStage(deal: Deal, now: Date = new Date()): number | null {
  const enteredAt = getStageEntryDate(deal);
  if (!enteredAt) return null;
  return daysBetween(enteredAt, now);
}

// Sunucu tarafı bir zamanlayıcı (cron) yok — bu tarama sadece uygulama bir
// tarayıcı sekmesinde açıkken (App.tsx'teki periyodik döngü ile) çalışır.
// Bu yüzden "tam eşik gününde" bir eşleşme aramak yerine (kullanıcı o gün
// uygulamayı hiç açmamışsa hatırlatma tamamen kaçırılırdı), bildirim
// GEÇMİŞİNE bakarak "yakalama" mantığı kullanılıyor: bu aşamaya girdikten
// sonra hiç hatırlatma gönderilmemişse ve eşik gün aşılmışsa hemen gönder;
// daha önce gönderilmişse son gönderimden bu yana geçen gün frekansı
// karşılıyorsa tekrar gönder.
function shouldFireNow(
  deal: Deal,
  rule: DealStageReminderRule,
  enteredAt: Date,
  daysInStage: number,
  existingNotifications: TaskNotification[],
  now: Date
): boolean {
  if (daysInStage < rule.thresholdDays) return false;

  const priorReminders = existingNotifications.filter(
    (n) => n.type === "deal_stage_stale" && n.dealId === deal.id && new Date(n.createdAt) >= enteredAt
  );
  if (priorReminders.length === 0) return true;

  if (!rule.frequencyDays || rule.frequencyDays <= 0) return false; // "sadece bir kez" ve zaten gönderilmiş

  const lastReminder = priorReminders.reduce((latest, n) => (n.createdAt > latest.createdAt ? n : latest));
  const daysSinceLast = daysBetween(new Date(lastReminder.createdAt), now);
  return daysSinceLast >= rule.frequencyDays;
}

function formatDealLabel(deal: Deal): string {
  return deal.dealName || deal.companyName || "Fırsat";
}

function buildEmail(deal: Deal, daysInStage: number): { subject: string; bodyHtml: string } {
  const label = formatDealLabel(deal);
  const subject = `Hatırlatma: "${label}" fırsatı ${daysInStage} gündür "${deal.stage}" aşamasında bekliyor`;
  const bodyHtml = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #FDE7E9; border-radius: 8px; background-color: #ffffff; color: #323130;">
      <h2 style="font-size: 16px; color: #0078D4; margin-top: 0;">Fırsat Aşama Hatırlatması</h2>
      <p style="font-size: 14px; line-height: 1.6;"><b>${label}</b> (${deal.companyName || "-"}) fırsatı, <b>${daysInStage} gündür</b> <b>"${deal.stage}"</b> aşamasında bekliyor.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
        <tr><td style="padding: 4px 0; color: #605e5c;">Fırsat</td><td style="padding: 4px 0; font-weight: 600;">${label}</td></tr>
        <tr><td style="padding: 4px 0; color: #605e5c;">Firma</td><td style="padding: 4px 0; font-weight: 600;">${deal.companyName || "-"}</td></tr>
        <tr><td style="padding: 4px 0; color: #605e5c;">Aşama</td><td style="padding: 4px 0; font-weight: 600;">${deal.stage}</td></tr>
        <tr><td style="padding: 4px 0; color: #605e5c;">Aşamada geçen süre</td><td style="padding: 4px 0; font-weight: 600; color: #a80000;">${daysInStage} gün</td></tr>
        <tr><td style="padding: 4px 0; color: #605e5c;">Fırsat değeri</td><td style="padding: 4px 0; font-weight: 600;">${deal.opportunityValue ? deal.opportunityValue.toLocaleString("tr-TR") : "-"}</td></tr>
      </table>
      <p style="font-size: 13px; color: #605e5c;">Bu fırsatı Gemba IQ &gt; Fırsat Yönetimi'nden inceleyip sonraki aksiyonu belirleyin.</p>
    </div>
  `;
  return { subject, bodyHtml };
}

export interface DealReminderScanResult {
  created: TaskNotification[];
}

// Ana tarama fonksiyonu — App.tsx tarafından periyodik olarak (görev
// hatırlatma motorunun 3 dakikalık senkronizasyon döngüsüyle birlikte)
// çağrılır. Yeni bildirimleri hem CrmDb'ye (zil ikonu için) kalıcı olarak
// yazar hem de gerçek e-postalarını gönderir.
export async function scanDealStageReminders(params: {
  orgMembers: OrganizationDirectoryMember[];
  mailSenderSource: MailSenderSource;
}): Promise<DealReminderScanResult> {
  const settings = getDealStageReminderSettings();
  if (Object.keys(settings).length === 0) return { created: [] };

  const deals = CrmDb.getDeals();
  const existingNotifications = CrmDb.getTaskNotifications();

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  // Aynı gün içindeki tekrarlanan tarama turlarının (3 dakikada bir) aynı
  // hatırlatmayı defalarca üretmesini engeller — TasksView'ın triggerKey
  // desenindeki gibi.
  const existingTriggerKeys = new Set(existingNotifications.map((n) => n.triggerKey));
  const toCreate: TaskNotification[] = [];

  for (const deal of deals) {
    if (isWonStage(deal.stage) || isLostStage(deal.stage)) continue;
    const rule = settings[deal.stage];
    if (!rule || !rule.enabled) continue;

    const enteredAt = getStageEntryDate(deal);
    if (!enteredAt) continue;
    const daysInStage = daysBetween(enteredAt, now);
    if (!shouldFireNow(deal, rule, enteredAt, daysInStage, existingNotifications, now)) continue;

    const triggerKey = `deal-stage-${deal.id}-${deal.stage}-${todayIso}`;
    if (existingTriggerKeys.has(triggerKey)) continue;

    const recipientEmail = resolveMemberEmail(deal.owner, undefined, params.orgMembers);
    const { subject, bodyHtml } = buildEmail(deal, daysInStage);

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
