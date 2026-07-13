-- Settings scope architecture: organization-wide configuration and organization mailbox support.

create table if not exists public.organization_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  organization_info jsonb not null default '{}'::jsonb,
  api_keys jsonb not null default '{}'::jsonb,
  ai_providers jsonb not null default '{}'::jsonb,
  azure_application jsonb not null default '{}'::jsonb,
  microsoft_graph_application jsonb not null default '{}'::jsonb,
  supabase_configuration jsonb not null default '{}'::jsonb,
  security_settings jsonb not null default '{}'::jsonb,
  system_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_mailbox_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mailbox_address text not null,
  provider text not null default 'Microsoft 365',
  status text not null default 'Connected'
    check (status in ('Connected', 'Expired', 'Error', 'Sandbox')),
  connected_at timestamptz not null default now(),
  default_mailbox boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, mailbox_address)
);

create unique index if not exists idx_user_mailbox_connections_one_default
  on public.user_mailbox_connections (user_id)
  where default_mailbox;

create table if not exists public.organization_shared_mailboxes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  mailbox_address text not null,
  display_name text,
  provider text not null default 'Microsoft 365',
  status text not null default 'Draft'
    check (status in ('Draft', 'Ready', 'Disabled')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, mailbox_address)
);

create table if not exists public.organization_shared_mailbox_assignments (
  shared_mailbox_id uuid not null references public.organization_shared_mailboxes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  can_send boolean not null default false,
  can_read boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (shared_mailbox_id, user_id)
);

alter table public.organization_settings enable row level security;
alter table public.user_mailbox_connections enable row level security;
alter table public.organization_shared_mailboxes enable row level security;
alter table public.organization_shared_mailbox_assignments enable row level security;

drop policy if exists "organization_settings_select_member" on public.organization_settings;
create policy "organization_settings_select_member"
  on public.organization_settings for select
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "organization_settings_admin_write" on public.organization_settings;
create policy "organization_settings_admin_write"
  on public.organization_settings for all
  using (public.user_can_manage_members(organization_id))
  with check (public.user_can_manage_members(organization_id));

drop policy if exists "user_mailbox_connections_select_own" on public.user_mailbox_connections;
create policy "user_mailbox_connections_select_own"
  on public.user_mailbox_connections for select
  using (user_id = auth.uid());

drop policy if exists "user_mailbox_connections_insert_own" on public.user_mailbox_connections;
create policy "user_mailbox_connections_insert_own"
  on public.user_mailbox_connections for insert
  with check (user_id = auth.uid());

drop policy if exists "user_mailbox_connections_update_own" on public.user_mailbox_connections;
create policy "user_mailbox_connections_update_own"
  on public.user_mailbox_connections for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "user_mailbox_connections_delete_own" on public.user_mailbox_connections;
create policy "user_mailbox_connections_delete_own"
  on public.user_mailbox_connections for delete
  using (user_id = auth.uid());

drop policy if exists "shared_mailboxes_select_member" on public.organization_shared_mailboxes;
create policy "shared_mailboxes_select_member"
  on public.organization_shared_mailboxes for select
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "shared_mailboxes_admin_write" on public.organization_shared_mailboxes;
create policy "shared_mailboxes_admin_write"
  on public.organization_shared_mailboxes for all
  using (public.user_can_manage_members(organization_id))
  with check (public.user_can_manage_members(organization_id));

drop policy if exists "shared_mailbox_assignments_select_assigned_or_admin" on public.organization_shared_mailbox_assignments;
create policy "shared_mailbox_assignments_select_assigned_or_admin"
  on public.organization_shared_mailbox_assignments for select
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.organization_shared_mailboxes mailbox
      where mailbox.id = shared_mailbox_id
        and public.user_can_manage_members(mailbox.organization_id)
    )
  );

drop policy if exists "shared_mailbox_assignments_admin_write" on public.organization_shared_mailbox_assignments;
create policy "shared_mailbox_assignments_admin_write"
  on public.organization_shared_mailbox_assignments for all
  using (
    exists (
      select 1
      from public.organization_shared_mailboxes mailbox
      where mailbox.id = shared_mailbox_id
        and public.user_can_manage_members(mailbox.organization_id)
    )
  )
  with check (
    exists (
      select 1
      from public.organization_shared_mailboxes mailbox
      where mailbox.id = shared_mailbox_id
        and public.user_can_manage_members(mailbox.organization_id)
    )
  );
