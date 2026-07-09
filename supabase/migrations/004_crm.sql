-- CRM core entities (multi-tenant)
-- Apply after 003_documents.sql

-- ---------------------------------------------------------------------------
-- Companies
-- ---------------------------------------------------------------------------

create table if not exists public.companies (
  id text primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);

create index if not exists idx_companies_organization_id
  on public.companies (organization_id);

-- ---------------------------------------------------------------------------
-- Contacts
-- ---------------------------------------------------------------------------

create table if not exists public.contacts (
  id text primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_id text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);

create index if not exists idx_contacts_organization_id
  on public.contacts (organization_id);

create index if not exists idx_contacts_company_id
  on public.contacts (organization_id, company_id);

-- ---------------------------------------------------------------------------
-- Deals
-- ---------------------------------------------------------------------------

create table if not exists public.deals (
  id text primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_id text,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);

create index if not exists idx_deals_organization_id
  on public.deals (organization_id);

create index if not exists idx_deals_company_id
  on public.deals (organization_id, company_id)
  where company_id is not null;

-- ---------------------------------------------------------------------------
-- Proposals
-- ---------------------------------------------------------------------------

create table if not exists public.proposals (
  id text primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_id text not null,
  deal_id text,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);

create index if not exists idx_proposals_organization_id
  on public.proposals (organization_id);

create index if not exists idx_proposals_company_id
  on public.proposals (organization_id, company_id);

create index if not exists idx_proposals_deal_id
  on public.proposals (organization_id, deal_id)
  where deal_id is not null;

-- ---------------------------------------------------------------------------
-- Tasks
-- ---------------------------------------------------------------------------

create table if not exists public.tasks (
  id text primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_id text,
  deal_id text,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);

create index if not exists idx_tasks_organization_id
  on public.tasks (organization_id);

create index if not exists idx_tasks_company_id
  on public.tasks (organization_id, company_id)
  where company_id is not null;

create index if not exists idx_tasks_deal_id
  on public.tasks (organization_id, deal_id)
  where deal_id is not null;

-- ---------------------------------------------------------------------------
-- Updated-at triggers
-- ---------------------------------------------------------------------------

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

drop trigger if exists contacts_set_updated_at on public.contacts;
create trigger contacts_set_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

drop trigger if exists deals_set_updated_at on public.deals;
create trigger deals_set_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

drop trigger if exists proposals_set_updated_at on public.proposals;
create trigger proposals_set_updated_at
  before update on public.proposals
  for each row execute function public.set_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.companies enable row level security;
alter table public.contacts enable row level security;
alter table public.deals enable row level security;
alter table public.proposals enable row level security;
alter table public.tasks enable row level security;

drop policy if exists "companies_select_org" on public.companies;
create policy "companies_select_org"
  on public.companies for select
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "companies_insert_org" on public.companies;
create policy "companies_insert_org"
  on public.companies for insert
  with check (
    organization_id in (select public.get_user_organization_ids())
    and created_by = auth.uid()
  );

drop policy if exists "companies_update_org" on public.companies;
create policy "companies_update_org"
  on public.companies for update
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "companies_delete_org" on public.companies;
create policy "companies_delete_org"
  on public.companies for delete
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "contacts_select_org" on public.contacts;
create policy "contacts_select_org"
  on public.contacts for select
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "contacts_insert_org" on public.contacts;
create policy "contacts_insert_org"
  on public.contacts for insert
  with check (
    organization_id in (select public.get_user_organization_ids())
    and created_by = auth.uid()
  );

drop policy if exists "contacts_update_org" on public.contacts;
create policy "contacts_update_org"
  on public.contacts for update
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "contacts_delete_org" on public.contacts;
create policy "contacts_delete_org"
  on public.contacts for delete
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "deals_select_org" on public.deals;
create policy "deals_select_org"
  on public.deals for select
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "deals_insert_org" on public.deals;
create policy "deals_insert_org"
  on public.deals for insert
  with check (
    organization_id in (select public.get_user_organization_ids())
    and created_by = auth.uid()
  );

drop policy if exists "deals_update_org" on public.deals;
create policy "deals_update_org"
  on public.deals for update
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "deals_delete_org" on public.deals;
create policy "deals_delete_org"
  on public.deals for delete
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "proposals_select_org" on public.proposals;
create policy "proposals_select_org"
  on public.proposals for select
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "proposals_insert_org" on public.proposals;
create policy "proposals_insert_org"
  on public.proposals for insert
  with check (
    organization_id in (select public.get_user_organization_ids())
    and created_by = auth.uid()
  );

drop policy if exists "proposals_update_org" on public.proposals;
create policy "proposals_update_org"
  on public.proposals for update
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "proposals_delete_org" on public.proposals;
create policy "proposals_delete_org"
  on public.proposals for delete
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "tasks_select_org" on public.tasks;
create policy "tasks_select_org"
  on public.tasks for select
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "tasks_insert_org" on public.tasks;
create policy "tasks_insert_org"
  on public.tasks for insert
  with check (
    organization_id in (select public.get_user_organization_ids())
    and created_by = auth.uid()
  );

drop policy if exists "tasks_update_org" on public.tasks;
create policy "tasks_update_org"
  on public.tasks for update
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "tasks_delete_org" on public.tasks;
create policy "tasks_delete_org"
  on public.tasks for delete
  using (organization_id in (select public.get_user_organization_ids()));
