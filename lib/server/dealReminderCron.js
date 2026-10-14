// Fırsat aşama hatırlatma motoru — SUNUCU (günlük Vercel cron) tarafı.
//
// Kullanıcı talebi: istemci-tabanlı tarama (src/lib/dealReminderEngine.ts)
// yerine günde bir kez, sunucuda, idempotent çalışan bir tarama. Bkz.
// supabase/migrations/014_deal_stage_reminder_log.sql (DB-garantili
// mükerrer gönderim koruması) ve vercel.json (crons girdisi, günde 1 kez —
// Vercel Hobby plan limiti).
//
// Hesaplama mantığı (gün sayısı, "yakalama" kuralı, e-posta şablonu)
// lib/dealReminderShared.js'den içe aktarılıyor — istemci motoruyla TAM
// AYNI sonucu üretmesi garanti edilsin diye (kopyala-yapıştır yok).
//
// __org_auxiliary__ blob'u SADECE OKUNUR (crm_deal_stage_reminder_settings
// ayarları için) — bu dosya o satıra HİÇBİR ZAMAN yazmaz; birden fazla
// istemcinin last-write-wins ile o satırı ezme riskini bu yüzden hiç
// taşımıyor.
import { createClient } from "@supabase/supabase-js";
import {
  getStoredMailbox,
  getMailboxStatus,
  sendGraphMailWithMailbox,
} from "./organizationMailbox.js";
import {
  istanbulDateParts,
  datePartsToIso,
  getStageEntryDateParts,
  daysBetweenParts,
  shouldFireNow,
  buildReminderEmail,
  isWonStageName,
  isLostStageName,
} from "../dealReminderShared.js";

function getSupabaseConfig() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return { supabaseUrl, serviceKey };
}

function getAdminClient() {
  const { supabaseUrl, serviceKey } = getSupabaseConfig();
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// İstemci tarafı resolveMemberEmail (notificationMailer.ts), organizasyon
// dizinini bir RPC'den (list_organization_directory) alıyor — o RPC
// auth.uid() olmadan (service_role/cron) çalışmayı REDDEDİYOR ("Not
// authenticated" exception), bu yüzden burada tekrar kullanılamaz. Aynı
// eşlemeyi (organization_members + profiles + auth.users) adminClient ile
// doğrudan üretiyoruz — RLS'e hiç dokunmadan, sadece okuma.
async function resolveOrgMembersWithEmail(adminClient, organizationId) {
  const { data: members, error } = await adminClient
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);

  const userIds = (members || []).map((m) => m.user_id);
  if (userIds.length === 0) return [];

  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);
  if (profilesError) throw new Error(profilesError.message);
  const nameById = new Map((profiles || []).map((p) => [p.id, p.full_name]));

  const results = [];
  for (const userId of userIds) {
    // eslint-disable-next-line no-await-in-loop
    const { data: userRes } = await adminClient.auth.admin.getUserById(userId);
    results.push({
      fullName: nameById.get(userId) || null,
      email: userRes?.user?.email || "",
    });
  }
  return results;
}

function resolveEmailByOwnerName(ownerName, members) {
  if (!ownerName) return "";
  const member = members.find((m) => (m.fullName?.trim() || m.email) === ownerName);
  return member?.email || "";
}

async function getDealStageReminderSettings(adminClient, organizationId) {
  const { data: row, error } = await adminClient
    .from("companies")
    .select("data")
    .eq("organization_id", organizationId)
    .eq("id", "__org_auxiliary__")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return row?.data?.kvStore?.crm_deal_stage_reminder_settings || {};
}

export async function dealStageReminderScanHandler(request, response) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.authorization || "";
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return response.status(401).json({ error: "Unauthorized" });
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return response.status(500).json({ error: "Supabase is not configured." });
  }

  const dryRun = String(request.query?.dryRun || "") === "1";

  const { data: orgs, error: orgsError } = await adminClient.from("organizations").select("id");
  if (orgsError) return response.status(500).json({ error: orgsError.message });

  const nowParts = istanbulDateParts(new Date());
  const todayIso = datePartsToIso(nowParts);
  const results = [];

  for (const org of orgs || []) {
    // eslint-disable-next-line no-await-in-loop
    const settings = await getDealStageReminderSettings(adminClient, org.id);
    if (Object.keys(settings).length === 0) continue;

    // eslint-disable-next-line no-await-in-loop
    const { data: dealRows, error: dealsError } = await adminClient
      .from("deals")
      .select("id, data")
      .eq("organization_id", org.id);
    if (dealsError) {
      results.push({ organizationId: org.id, error: dealsError.message });
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const mailbox = await getStoredMailbox(adminClient, org.id);
    const mailboxConnected = getMailboxStatus(mailbox) === "Connected";
    let orgMembers = null; // lazy: sadece gönderilecek bir hatırlatma bulunursa yüklenir

    for (const row of dealRows || []) {
      const deal = { id: row.id, ...row.data };
      if (isWonStageName(deal.stage) || isLostStageName(deal.stage)) continue;

      const rule = settings[deal.stage];
      if (!rule || !rule.enabled) continue;

      const enteredAt = getStageEntryDateParts(deal);
      if (!enteredAt) continue;
      const daysInStage = daysBetweenParts(enteredAt, nowParts);

      // eslint-disable-next-line no-await-in-loop
      const { data: priorRows, error: priorError } = await adminClient
        .from("deal_stage_reminder_log")
        .select("reminder_date")
        .eq("organization_id", org.id)
        .eq("deal_id", deal.id)
        .eq("stage", deal.stage)
        .gte("reminder_date", datePartsToIso(enteredAt));
      if (priorError) {
        results.push({ organizationId: org.id, dealId: deal.id, error: priorError.message });
        continue;
      }
      const priorReminderDateParts = (priorRows || []).map((r) => {
        const [year, month, day] = r.reminder_date.split("-").map(Number);
        return { year, month, day };
      });

      if (!shouldFireNow(rule, enteredAt, daysInStage, priorReminderDateParts, nowParts)) continue;

      if (!orgMembers) {
        // eslint-disable-next-line no-await-in-loop
        orgMembers = await resolveOrgMembersWithEmail(adminClient, org.id);
      }
      const recipientEmail = resolveEmailByOwnerName(deal.owner, orgMembers);
      const { subject, bodyHtml } = buildReminderEmail(deal, daysInStage);

      if (dryRun) {
        results.push({
          organizationId: org.id,
          dealId: deal.id,
          stage: deal.stage,
          daysInStage,
          recipientEmail,
          subject,
          wouldSend: true,
        });
        continue;
      }

      // Önce satırı rezerve et — unique(organization_id, deal_id, stage,
      // reminder_date) ikinci bir mükerrer çalışmayı burada engeller.
      // eslint-disable-next-line no-await-in-loop
      const { data: reserved, error: reserveError } = await adminClient
        .from("deal_stage_reminder_log")
        .insert({
          organization_id: org.id,
          deal_id: deal.id,
          stage: deal.stage,
          reminder_date: todayIso,
          recipient_email: recipientEmail,
          subject,
          status: "pending",
        })
        .select("id")
        .single();

      if (reserveError) {
        // 23505 = unique_violation — başka bir çalışma (mükerrer tetikleme,
        // bkz. Vercel'in kendi "cron delivery can invoke more than once"
        // notu) bu satırı zaten rezerve etmiş. Beklenen durum, hata değil.
        if (reserveError.code !== "23505") {
          results.push({ organizationId: org.id, dealId: deal.id, error: reserveError.message });
        }
        continue;
      }

      let status = "skipped";
      let errorNote = null;
      if (!recipientEmail || !recipientEmail.includes("@")) {
        errorNote = "Fırsat sahibi için gerçek bir e-posta adresi çözülemedi.";
      } else if (!mailboxConnected) {
        status = "failed";
        errorNote = "Kurumsal (Organization) posta kutusu bağlı değil.";
      } else {
        try {
          // eslint-disable-next-line no-await-in-loop
          await sendGraphMailWithMailbox(adminClient, org.id, mailbox, {
            to: recipientEmail,
            subject,
            html: bodyHtml,
          });
          status = "sent";
        } catch (err) {
          status = "failed";
          errorNote = err instanceof Error ? err.message : String(err);
        }
      }

      // eslint-disable-next-line no-await-in-loop
      await adminClient
        .from("deal_stage_reminder_log")
        .update({ status, error_note: errorNote })
        .eq("id", reserved.id);

      results.push({ organizationId: org.id, dealId: deal.id, stage: deal.stage, daysInStage, recipientEmail, status });
    }
  }

  return response.status(200).json({ dryRun, processed: results.length, results });
}
