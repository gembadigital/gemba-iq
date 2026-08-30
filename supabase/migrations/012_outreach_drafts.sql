-- Yeniden Temas (Re-engagement) özelliği için taslak/onay kuyruğu.
-- Apply after 011_integration_credentials.sql
--
-- Amaç: OpenClaw AI Sales Manager'ın (veya panelden elle) hazırladığı
-- "yeniden temas" mail taslaklarını, gerçekten gönderilmeden önce insan
-- onayı bekleyecek şekilde saklamak. Var olan companies/contacts/deals/
-- tasks tablolarının deseniyle birebir aynı: text id, organization_id,
-- created_by, created_at/updated_at, data jsonb.
--
-- `data` jsonb içinde saklanan alanlar (uygulama tarafında zorunlu tutulur,
-- veritabanı seviyesinde şema zorlanmaz — diğer CRM tablolarıyla aynı
-- yaklaşım):
--   recipients: [{ name, email, leadProfileId? }]
--   subject: string
--   bodyHtml: string
--   source: "deal-scan" | "lead-scan" | "manual-telegram" | "manual-panel"
--   status: "pending" | "approved" | "sent" | "rejected"
--   dealId?: string          -- kaynak bir Fırsat ise
--   leadProfileIds?: string[] -- kaynak Aday Profilleri ise
--   approvedBy?: string
--   approvedAt?: string (ISO)
--   sentAt?: string (ISO)
--   rejectedReason?: string
--   integrationSource?: "openclaw"
--   integrationCredentialId?: uuid

create table if not exists public.outreach_drafts (
  id text primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_id text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);

create index if not exists idx_outreach_drafts_organization_id
  on public.outreach_drafts (organization_id);

create index if not exists idx_outreach_drafts_company_id
  on public.outreach_drafts (organization_id, company_id)
  where company_id is not null;

-- Bekleyen taslakları hızlı listelemek için (panel ekranı ve dedup
-- kontrolü bu status değerini sık sık filtreleyecek).
create index if not exists idx_outreach_drafts_status
  on public.outreach_drafts (organization_id, ((data->>'status')));

drop trigger if exists outreach_drafts_set_updated_at on public.outreach_drafts;
create trigger outreach_drafts_set_updated_at
  before update on public.outreach_drafts
  for each row execute function public.set_updated_at();

alter table public.outreach_drafts enable row level security;

-- created_by nullable tutuldu çünkü OpenClaw entegrasyonu (service_role /
-- adminClient) bir auth.users satırı olmadan da taslak oluşturabilmeli;
-- entegrasyon yazmaları zaten RLS'yi atlayan adminClient ile yapılıyor
-- (bkz. lib/server/integrationApi.js guard()), bu politikalar sadece
-- normal uygulama kullanıcılarının kendi Supabase client'ları üzerinden
-- erişimini kapsar.

drop policy if exists "outreach_drafts_select_org" on public.outreach_drafts;
create policy "outreach_drafts_select_org"
  on public.outreach_drafts for select
  using (organization_id in (select public.get_user_organization_ids()));

-- Not: created_by burada auth.uid() ile eşleşmesi ZORUNLU tutulmadı
-- (diğer tablolardaki gibi) çünkü panelden "listeye ekle" gibi bazı
-- eylemler ileride sistem/otomasyon adına da (created_by null) satır
-- ekleyebilir; organizasyon izolasyonu tek başına yeterli güvenlik
-- sınırı sağlıyor.
drop policy if exists "outreach_drafts_insert_org" on public.outreach_drafts;
create policy "outreach_drafts_insert_org"
  on public.outreach_drafts for insert
  with check (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "outreach_drafts_update_org" on public.outreach_drafts;
create policy "outreach_drafts_update_org"
  on public.outreach_drafts for update
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "outreach_drafts_delete_org" on public.outreach_drafts;
create policy "outreach_drafts_delete_org"
  on public.outreach_drafts for delete
  using (organization_id in (select public.get_user_organization_ids()));
