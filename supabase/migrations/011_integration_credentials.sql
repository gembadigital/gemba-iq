-- OpenClaw (ve benzeri harici AI agent) entegrasyonu için API key altyapısı.
-- Apply after 010_document_folders.sql
--
-- Amaç: companies/contacts/deals/tasks tablolarının mevcut RLS politikalarına
-- HİÇ dokunmadan, harici bir servisin (OpenClaw AI Sales Manager) CRM
-- verisini okuyup yazabilmesini sağlayacak, kendi org'una ve kendi
-- yetkilerine (scope) kilitli, iptal edilebilir API key mekanizması kurmak.
--
-- Gerçek anahtar sadece oluşturulduğu an döner; veritabanında SADECE
-- SHA-256 hash'i saklanır (key_hash). Bu tablo hiçbir zaman service_role
-- key veya Supabase anon/publishable key yerine geçmez — sadece
-- api/organization/[...action].js içindeki integration-* action'larının
-- çağıranı tanıyıp organization_id + scope çözmesi için kullanılır.

create table if not exists public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  scopes text[] not null default '{}',
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users (id) on delete set null
);

create index if not exists idx_integration_credentials_organization_id
  on public.integration_credentials (organization_id);

-- key_hash zaten unique index üretiyor (kolon tanımında "unique"), ayrıca
-- aktif (iptal edilmemiş) anahtarları hızlı bulmak için kısmi indeks:
create index if not exists idx_integration_credentials_active_hash
  on public.integration_credentials (key_hash)
  where revoked_at is null;

-- ---------------------------------------------------------------------------
-- Basit istek günlüğü (opsiyonel gözlemlenebilirlik — hangi key ne zaman,
-- hangi action'ı, hangi organizasyon için çağırdı). Sorumlu bulma ve anahtar
-- kötüye kullanımını tespit etmek için.
-- ---------------------------------------------------------------------------

create table if not exists public.integration_request_log (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid not null references public.integration_credentials (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  action text not null,
  status_code integer not null,
  entity_type text,
  entity_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_integration_request_log_credential_id
  on public.integration_request_log (credential_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Bu iki tablo yalnızca uygulama içindeki ADMIN kullanıcıların (Yönetim
-- Merkezi > Entegrasyonlar ekranı, ileride) kendi organizasyonlarının
-- key'lerini görüp yönetebilmesi içindir. api/organization/[...action].js
-- içindeki integration-* handler'ları bu tabloyu SERVICE_ROLE_KEY ile
-- (adminClient) okuyacağı için bu RLS, OpenClaw'ın kendisini hiç
-- etkilemez — sadece normal uygulama kullanıcılarının bu tabloya
-- doğrudan Supabase client üzerinden erişimini kısıtlar.

alter table public.integration_credentials enable row level security;
alter table public.integration_request_log enable row level security;

drop policy if exists "integration_credentials_select_admin" on public.integration_credentials;
create policy "integration_credentials_select_admin"
  on public.integration_credentials for select
  using (public.user_can_manage_members(organization_id));

drop policy if exists "integration_credentials_write_admin" on public.integration_credentials;
create policy "integration_credentials_write_admin"
  on public.integration_credentials for all
  using (public.user_can_manage_members(organization_id))
  with check (public.user_can_manage_members(organization_id));

drop policy if exists "integration_request_log_select_admin" on public.integration_request_log;
create policy "integration_request_log_select_admin"
  on public.integration_request_log for select
  using (public.user_can_manage_members(organization_id));

-- Bu günlüğe insert sadece service_role (adminClient) ile, sunucu
-- tarafından yapılır — normal kullanıcı client'ları için insert/update/
-- delete policy'si kasıtlı olarak tanımlanmadı (varsayılan: reddedilir).
