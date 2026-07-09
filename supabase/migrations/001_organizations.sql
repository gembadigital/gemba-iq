-- Multi-tenant organization foundation
-- Apply in Supabase SQL Editor or via Supabase CLI

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  country text,
  language text not null default 'TR',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  job_title text,
  phone text,
  country text,
  language text not null default 'TR',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists idx_organization_members_user_id
  on public.organization_members (user_id);

create index if not exists idx_organization_members_org_id
  on public.organization_members (organization_id);

-- ---------------------------------------------------------------------------
-- Updated-at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helper: organization ids for current user
-- ---------------------------------------------------------------------------

create or replace function public.get_user_organization_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.organization_members
  where user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Onboarding RPC: create org + profile + owner membership
-- ---------------------------------------------------------------------------

create or replace function public.create_organization_with_owner(
  p_full_name text,
  p_company_name text,
  p_job_title text,
  p_phone text,
  p_country text,
  p_language text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_slug text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (
    select 1 from public.organization_members where user_id = v_user_id
  ) then
    raise exception 'User already belongs to an organization';
  end if;

  if coalesce(trim(p_company_name), '') = '' then
    raise exception 'Company name is required';
  end if;

  v_slug := lower(regexp_replace(trim(p_company_name), '[^a-zA-Z0-9]+', '-', 'g'))
    || '-'
    || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  insert into public.organizations (name, slug, country, language, phone)
  values (trim(p_company_name), v_slug, nullif(trim(p_country), ''), coalesce(nullif(trim(p_language), ''), 'TR'), nullif(trim(p_phone), ''))
  returning id into v_org_id;

  insert into public.profiles (id, full_name, job_title, phone, country, language)
  values (
    v_user_id,
    nullif(trim(p_full_name), ''),
    nullif(trim(p_job_title), ''),
    nullif(trim(p_phone), ''),
    nullif(trim(p_country), ''),
    coalesce(nullif(trim(p_language), ''), 'TR')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    job_title = excluded.job_title,
    phone = excluded.phone,
    country = excluded.country,
    language = excluded.language,
    updated_at = now();

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org_id, v_user_id, 'owner');

  return v_org_id;
end;
$$;

grant execute on function public.create_organization_with_owner(text, text, text, text, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;

-- Profiles: own row only
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- Organizations: members can read their orgs
drop policy if exists "organizations_select_member" on public.organizations;
create policy "organizations_select_member"
  on public.organizations for select
  using (id in (select public.get_user_organization_ids()));

-- Organization members: members can read membership in their orgs
drop policy if exists "organization_members_select_member" on public.organization_members;
create policy "organization_members_select_member"
  on public.organization_members for select
  using (organization_id in (select public.get_user_organization_ids()));

-- ---------------------------------------------------------------------------
-- Future module template (uncomment when tables are created)
-- ---------------------------------------------------------------------------
-- alter table public.companies add column if not exists organization_id uuid references public.organizations(id);
-- create index if not exists idx_companies_organization_id on public.companies (organization_id);
-- alter table public.companies enable row level security;
-- create policy "companies_org_scope" on public.companies
--   for all using (organization_id in (select public.get_user_organization_ids()));
