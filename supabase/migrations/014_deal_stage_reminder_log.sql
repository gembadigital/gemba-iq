-- Fırsat aşama hatırlatma motorunu tarayıcıdan sunucu cron'una taşıma.
-- Apply after 013_fix_invalid_deal_pipeline.sql
--
-- Kullanıcı talebi: "src/lib/dealReminderEngine.ts içindeki
-- scanDealStageReminders() şu an SADECE bir kullanıcı uygulamayı
-- tarayıcıda açıkken çalışıyor... Hedef: tarama günde bir kez sunucuda,
-- tek seferde ve idempotent çalışsın; aynı hatırlatma iki kez gitmesin."
--
-- Bu tablo, günlük cron taramasının ÜRETTİĞİ hatırlatma kayıtlarını
-- tutar (mevcut companies/contacts/deals/proposals/tasks desenindeki gibi
-- değil — burada `data jsonb` yok, çünkü bu tablo CRM verisi değil, bir
-- İŞLEM GÜNLÜĞÜ/kuyruğu; her sütun kendi başına anlamlı).
--
-- Mükerrer gönderim koruması İKİ seviyede:
-- 1) unique(organization_id, deal_id, stage, reminder_date) — aynı fırsat/
--    aşama/gün için ikinci bir satır insert edilemez (Vercel'in kendi
--    dokümanı da cron çağrılarının bazen birden fazla tetiklenebileceğini,
--    bu yüzden idempotent tasarım gerektiğini belirtiyor).
-- 2) Sunucu kodu "önce satırı rezerve et (status='pending' ile insert),
--    insert başarılıysa mail gönder, sonucu güncelle" sırasını izler —
--    iki eşzamanlı cron çalışması (teorik olarak, Vercel aynı anda ikinci
--    bir örnek tetiklerse) aynı satırı İKİ KEZ rezerve edemez.

create table if not exists public.deal_stage_reminder_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  deal_id text not null,
  stage text not null,
  -- Europe/Istanbul takvim günü (bkz. lib/dealReminderShared.js
  -- istanbulDateParts) — UTC timestamp DEĞİL, çünkü unique kısıt takvim
  -- günü bazında çalışmalı (sunucu UTC'de çalışıyor, İstanbul UTC+3).
  reminder_date date not null,
  recipient_email text,
  subject text,
  -- "pending" = rezerve edildi, mail gönderimi henüz denenmedi (çok kısa
  -- ömürlü bir ara durum — insert ve mail gönderimi aynı istek içinde).
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  error_note text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, deal_id, stage, reminder_date)
);

create index if not exists idx_deal_stage_reminder_log_organization_id
  on public.deal_stage_reminder_log (organization_id, created_at desc);

-- Zil ikonu sorgusu (bkz. App.tsx) bu kombinasyonla filtreler: kendi
-- organizasyonu + kendi e-postası + son N gün — küçük, hedefli bir sorgu
-- olsun diye (egress fix'inin ruhuna uygun, tüm log'u çekmeden).
create index if not exists idx_deal_stage_reminder_log_recipient
  on public.deal_stage_reminder_log (recipient_email, created_at desc);

-- Her fırsat+aşama için "bu aşamaya girdikten sonra en son ne zaman
-- hatırlatma gönderildi" sorgusunu hızlandırır (shouldFireNow'un
-- priorReminderDateParts hesaplaması için sunucu tarafından kullanılır).
create index if not exists idx_deal_stage_reminder_log_deal_stage
  on public.deal_stage_reminder_log (deal_id, stage, reminder_date desc);

drop trigger if exists deal_stage_reminder_log_set_updated_at on public.deal_stage_reminder_log;
create trigger deal_stage_reminder_log_set_updated_at
  before update on public.deal_stage_reminder_log
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- 004_crm.sql'deki companies/deals vb. ile AYNI "org üyesi okuyabilir"
-- deseni (get_user_organization_ids()) — zil ikonu bu tabloyu normal
-- kullanıcı oturumuyla (anon/authenticated client) okuyacak. Insert/update
-- için KASITLI OLARAK hiçbir policy tanımlanmadı (varsayılan: reddedilir)
-- — bu tabloya yazma SADECE service_role (sunucudaki cron handler,
-- adminClient) ile yapılır, 011_integration_credentials.sql'deki
-- integration_request_log ile aynı yaklaşım.

alter table public.deal_stage_reminder_log enable row level security;

drop policy if exists "deal_stage_reminder_log_select_org" on public.deal_stage_reminder_log;
create policy "deal_stage_reminder_log_select_org"
  on public.deal_stage_reminder_log for select
  using (organization_id in (select public.get_user_organization_ids()));

-- Kullanıcı kendi bildirimini "okundu" işaretleyebilsin diye tek bir
-- UPDATE policy'si — SADECE is_read sütununu değiştirmeye izin verir
-- (WITH CHECK, organization_id/deal_id/stage/status gibi diğer alanların
-- kendi org'u dışına taşınmasını veya durumun manipüle edilmesini
-- engellemez, çünkü Postgres RLS UPDATE policy'leri sütun bazlı kısıtlama
-- yapamaz — bu yüzden uygulama tarafında (istemci) SADECE is_read
-- gönderilecek şekilde disiplinli olunmalı; gerçek bir sütun-seviyesi
-- garanti istenirse ayrı bir RPC fonksiyonu gerekir, bu migration'ın
-- kapsamı dışında).
drop policy if exists "deal_stage_reminder_log_update_own_read_state" on public.deal_stage_reminder_log;
create policy "deal_stage_reminder_log_update_own_read_state"
  on public.deal_stage_reminder_log for update
  using (
    organization_id in (select public.get_user_organization_ids())
    and recipient_email = (select email from auth.users where id = auth.uid())
  )
  with check (
    organization_id in (select public.get_user_organization_ids())
    and recipient_email = (select email from auth.users where id = auth.uid())
  );
