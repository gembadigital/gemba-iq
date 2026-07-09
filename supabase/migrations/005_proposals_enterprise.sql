-- Enterprise quotation system
-- Apply after 004_crm.sql

alter table public.proposals
  add column if not exists contact_id text;

create index if not exists idx_proposals_contact_id
  on public.proposals (organization_id, contact_id)
  where contact_id is not null;

-- ---------------------------------------------------------------------------
-- Auto proposal numbering sequence (per organization)
-- ---------------------------------------------------------------------------

create table if not exists public.proposal_number_sequences (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  last_sequence integer not null default 0,
  updated_at timestamptz not null default now()
);

drop trigger if exists proposal_number_sequences_set_updated_at on public.proposal_number_sequences;
create trigger proposal_number_sequences_set_updated_at
  before update on public.proposal_number_sequences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Word / section templates
-- ---------------------------------------------------------------------------

create table if not exists public.proposal_templates (
  id text primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  template_type text not null default 'word' check (template_type in ('word', 'section')),
  content text not null default '',
  placeholders text[] not null default '{}',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_proposal_templates_organization_id
  on public.proposal_templates (organization_id);

drop trigger if exists proposal_templates_set_updated_at on public.proposal_templates;
create trigger proposal_templates_set_updated_at
  before update on public.proposal_templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Proposal timeline
-- ---------------------------------------------------------------------------

create table if not exists public.proposal_timeline_events (
  id text primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  proposal_id text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_proposal_timeline_proposal_id
  on public.proposal_timeline_events (organization_id, proposal_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Proposal audit log
-- ---------------------------------------------------------------------------

create table if not exists public.proposal_audit_logs (
  id text primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  proposal_id text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  action text not null,
  actor_name text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_proposal_audit_proposal_id
  on public.proposal_audit_logs (organization_id, proposal_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.proposal_number_sequences enable row level security;
alter table public.proposal_templates enable row level security;
alter table public.proposal_timeline_events enable row level security;
alter table public.proposal_audit_logs enable row level security;

drop policy if exists "proposal_sequences_select_org" on public.proposal_number_sequences;
create policy "proposal_sequences_select_org"
  on public.proposal_number_sequences for select
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "proposal_sequences_insert_org" on public.proposal_number_sequences;
create policy "proposal_sequences_insert_org"
  on public.proposal_number_sequences for insert
  with check (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "proposal_sequences_update_org" on public.proposal_number_sequences;
create policy "proposal_sequences_update_org"
  on public.proposal_number_sequences for update
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "proposal_templates_select_org" on public.proposal_templates;
create policy "proposal_templates_select_org"
  on public.proposal_templates for select
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "proposal_templates_insert_org" on public.proposal_templates;
create policy "proposal_templates_insert_org"
  on public.proposal_templates for insert
  with check (
    organization_id in (select public.get_user_organization_ids())
    and created_by = auth.uid()
  );

drop policy if exists "proposal_templates_update_org" on public.proposal_templates;
create policy "proposal_templates_update_org"
  on public.proposal_templates for update
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "proposal_templates_delete_org" on public.proposal_templates;
create policy "proposal_templates_delete_org"
  on public.proposal_templates for delete
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "proposal_timeline_select_org" on public.proposal_timeline_events;
create policy "proposal_timeline_select_org"
  on public.proposal_timeline_events for select
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "proposal_timeline_insert_org" on public.proposal_timeline_events;
create policy "proposal_timeline_insert_org"
  on public.proposal_timeline_events for insert
  with check (
    organization_id in (select public.get_user_organization_ids())
    and created_by = auth.uid()
  );

drop policy if exists "proposal_audit_select_org" on public.proposal_audit_logs;
create policy "proposal_audit_select_org"
  on public.proposal_audit_logs for select
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "proposal_audit_insert_org" on public.proposal_audit_logs;
create policy "proposal_audit_insert_org"
  on public.proposal_audit_logs for insert
  with check (
    organization_id in (select public.get_user_organization_ids())
    and created_by = auth.uid()
  );
