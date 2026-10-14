// Fırsat aşama hatırlatma motorunun İSTEMCİ (src/lib/dealReminderEngine.ts)
// VE SUNUCU (lib/server/dealReminderCron.js, günlük cron) tarafında AYNI
// şekilde çalışması gereken saf (framework/CrmDb/TaskNotification'dan
// bağımsız) hesaplama mantığı. Kasıtlı olarak düz JS (TypeScript değil) —
// hem Vite (istemci bundle'ı) hem çıplak Node (Vercel serverless, derleme
// adımı yok) bu dosyayı doğrudan, değişiklik yapmadan import edebilsin.
//
// Kullanıcı talebi: "mantığı kopyala-yapıştır yerine mümkünse ortak bir
// modüle çıkar" — iki motorun farklı/tutarsız davranması istenmiyor.

// stageHistory tarihleri toLocaleDateString("tr-TR") ile "gg.aa.yyyy"
// formatında, saat dilimi bilgisi OLMADAN saklanıyor (bkz.
// DealManagementView.tsx handleDealDropOnStage). Kırılgan bir ayrıştırma —
// gerçek çözüm stageHistory'ye bir ISO timestamp alanı eklemek olurdu, ama
// bu mevcut veriyi geriye dönük migrate etmeyi gerektirir ve bu görevin
// kapsamı dışında.
export function parseTrDateParts(value) {
  if (!value) return null;
  const parts = String(value).split(".");
  if (parts.length !== 3) return null;
  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);
  if (!day || !month || !year) return null;
  return { year, month, day };
}

// "Bugün"ü her zaman Europe/Istanbul takvim gününe göre hesaplar — hem
// istemci (tarayıcı yerel saati genelde zaten İstanbul'dur, ama bu garanti
// değil) hem sunucu (Vercel fonksiyonları UTC'de çalışır) için TEK, tutarlı
// bir "bugün" tanımı. Sunucu gece yarısına yakın UTC saatlerinde çalışırsa
// (İstanbul UTC+3) bu olmadan 1 günlük kayma riski olurdu.
export function istanbulDateParts(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [{ value: year }, , { value: month }, , { value: day }] = formatter.formatToParts(now);
  return { year: Number(year), month: Number(month), day: Number(day) };
}

export function datePartsToUtcMidnight(parts) {
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

export function daysBetweenParts(fromParts, toParts) {
  return Math.round((datePartsToUtcMidnight(toParts) - datePartsToUtcMidnight(fromParts)) / 86400000);
}

export function datePartsToIso(parts) {
  const mm = String(parts.month).padStart(2, "0");
  const dd = String(parts.day).padStart(2, "0");
  return `${parts.year}-${mm}-${dd}`;
}

// Fırsatın MEVCUT aşamasına en son ne zaman girdiğini stageHistory'den okur.
// stageHistory yoksa/eşleşmiyorsa null döner — bu durumda hatırlatma
// gönderilmez (yanlış bir tarihle spam yapmaktansa hiç göndermemek tercih
// edilir; sadece çok eski/CSV ile içe aktarılmış kayıtlarda eksik olabilir).
export function getStageEntryDateParts(deal) {
  const entries = (deal.stageHistory || []).filter((h) => h.stage === deal.stage);
  if (entries.length === 0) return null;
  return parseTrDateParts(entries[entries.length - 1].date);
}

export function getDaysInCurrentStage(deal, now = new Date()) {
  const enteredAt = getStageEntryDateParts(deal);
  if (!enteredAt) return null;
  return daysBetweenParts(enteredAt, istanbulDateParts(now));
}

// Sunucu tarafı bir zamanlayıcı (cron, günde bir kez) olsa da, bu fonksiyon
// bilerek "tam eşik gününde" bir eşleşme aramak yerine PRIOR hatırlatma
// tarihlerine bakan bir yakalama mantığı kullanır: cron bir gün atlarsa
// (hata, deploy, vs.) bir sonraki çalışmada hatırlatma kaçmadan gönderilir.
//
// priorReminderDateParts: bu fırsat+aşama için, enteredAtParts'tan SONRA
// gönderilmiş geçmiş hatırlatmaların tarih parçaları (çağıran taraf kendi
// deposundan — istemci: TaskNotification[], sunucu: deal_stage_reminder_log
// satırları — bu listeyi hazırlayıp verir; bu fonksiyon o depoyu bilmez).
export function shouldFireNow(rule, enteredAtParts, daysInStage, priorReminderDateParts, nowParts) {
  if (daysInStage < rule.thresholdDays) return false;
  if (priorReminderDateParts.length === 0) return true;
  if (!rule.frequencyDays || rule.frequencyDays <= 0) return false; // "sadece bir kez" ve zaten gönderilmiş

  const lastReminder = priorReminderDateParts.reduce((latest, p) =>
    datePartsToUtcMidnight(p) > datePartsToUtcMidnight(latest) ? p : latest
  );
  const daysSinceLast = daysBetweenParts(lastReminder, nowParts);
  return daysSinceLast >= rule.frequencyDays;
}

export function formatDealLabel(deal) {
  return deal.dealName || deal.companyName || "Fırsat";
}

export function buildReminderEmail(deal, daysInStage) {
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

// SalesDashboardView.tsx'teki isWonStage/isLostStage ile BİREBİR aynı alt
// dize kontrolleri (o dosya bir React bileşeni/.tsx olduğu için sunucu
// (çıplak Node, JSX/TS derlemesi yok) onu import edemez — bu yüzden aynı iki
// saf fonksiyon burada bilerek birebir kopyalandı, string kontrolleri
// kasıtlı olarak SENKRON tutulmalı: biri değişirse diğeri de değişmeli).
export function isWonStageName(stage) {
  const s = String(stage || "").toLowerCase();
  return s === "won" || s.includes("kazan");
}

export function isLostStageName(stage) {
  const s = String(stage || "").toLowerCase();
  return s === "lost" || s.includes("kaybed") || s.includes("kayıp") || s.includes("kayip");
}
