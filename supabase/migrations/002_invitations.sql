-- Organization invitation system
-- Apply after 001_organizations.sql

-- ---------------------------------------------------------------------------
-- Extend profiles for login tracking
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists last_login_at timestamptz;

-- ---------------------------------------------------------------------------
-- Normalize organization member roles
-- ---------------------------------------------------------------------------

alter table public.organization_members
  drop constraint if exists organization_members_role_check;

alter table public.organization_members
  add constraint organization_members_role_check
  check (role in ('ADMIN', 'USER'));

-- ---------------------------------------------------------------------------
-- Invitations table
-- ---------------------------------------------------------------------------

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  invited_email text not null,
  role text not null check (role in ('ADMIN', 'USER')),
  invited_by uuid not null references auth.users (id) on delete cascade,
  token uuid not null default gen_random_uuid() unique,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create index if not exists idx_invitations_organization_id
  on public.invitations (organization_id);

create index if not exists idx_invitations_token
  on public.invitations (token);

create unique index if not exists idx_invitations_pending_email
  on public.invitations (organization_id, lower(invited_email))
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.user_can_manage_members(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = p_organization_id
      and user_id = auth.uid()
      and role = 'ADMIN'
  );
$$;

create or replace function public.get_user_primary_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.organization_members
  where user_id = auth.uid()
  order by created_at asc
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Invitation preview (public via token)
-- ---------------------------------------------------------------------------

create or replace function public.get_invitation_preview(p_token uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  select
    i.id,
    i.invited_email,
    i.role,
    i.status,
    i.expires_at,
    o.name as organization_name
  into v_row
  from public.invitations i
  join public.organizations o on o.id = i.organization_id
  where i.token = p_token;

  if not found then
    raise exception 'Invitation not found';
  end if;

  return json_build_object(
    'id', v_row.id,
    'invited_email', v_row.invited_email,
    'role', v_row.role,
    'status', v_row.status,
    'expires_at', v_row.expires_at,
    'organization_name', v_row.organization_name,
    'is_expired', v_row.expires_at < now() or v_row.status <> 'pending'
  );
end;
$$;

grant execute on function public.get_invitation_preview(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Create invitation (ADMIN only)
-- ---------------------------------------------------------------------------

create or replace function public.create_organization_invitation(
  p_email text,
  p_role text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_invitation public.invitations%rowtype;
  v_email text := lower(trim(p_email));
  v_role text := upper(trim(p_role));
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_email = '' then
    raise exception 'Email is required';
  end if;

  if v_role not in ('ADMIN', 'USER') then
    raise exception 'Invalid invitation role';
  end if;

  v_org_id := public.get_user_primary_organization_id();
  if v_org_id is null then
    raise exception 'You are not a member of any organization';
  end if;

  if not public.user_can_manage_members(v_org_id) then
    raise exception 'Only ADMIN can invite users';
  end if;

  if exists (
    select 1
    from public.organization_members om
    join auth.users au on au.id = om.user_id
    where om.organization_id = v_org_id
      and lower(au.email) = v_email
  ) then
    raise exception 'User is already a member of this organization';
  end if;

  update public.invitations
  set status = 'cancelled'
  where organization_id = v_org_id
    and lower(invited_email) = v_email
    and status = 'pending';

  insert into public.invitations (
    organization_id,
    invited_email,
    role,
    invited_by
  )
  values (v_org_id, v_email, v_role, v_user_id)
  returning * into v_invitation;

  return json_build_object(
    'id', v_invitation.id,
    'token', v_invitation.token,
    'invited_email', v_invitation.invited_email,
    'role', v_invitation.role,
    'status', v_invitation.status,
    'expires_at', v_invitation.expires_at,
    'organization_id', v_invitation.organization_id
  );
end;
$$;

grant execute on function public.create_organization_invitation(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Accept invitation
-- ---------------------------------------------------------------------------

create or replace function public.accept_organization_invitation(
  p_token uuid,
  p_full_name text default null,
  p_job_title text default null,
  p_phone text default null,
  p_country text default null,
  p_language text default 'TR'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invitation public.invitations%rowtype;
  v_auth_email text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_invitation
  from public.invitations
  where token = p_token
  for update;

  if not found then
    raise exception 'Invitation not found';
  end if;

  if v_invitation.status <> 'pending' then
    raise exception 'Invitation is no longer valid';
  end if;

  if v_invitation.expires_at < now() then
    update public.invitations set status = 'expired' where id = v_invitation.id;
    raise exception 'Invitation has expired';
  end if;

  select lower(email) into v_auth_email
  from auth.users
  where id = v_user_id;

  if v_auth_email is distinct from lower(v_invitation.invited_email) then
    raise exception 'Signed-in email does not match the invitation';
  end if;

  if exists (
    select 1 from public.organization_members where user_id = v_user_id
  ) then
    raise exception 'User already belongs to an organization';
  end if;

  insert into public.profiles (id, full_name, job_title, phone, country, language, last_login_at)
  values (
    v_user_id,
    nullif(trim(p_full_name), ''),
    nullif(trim(p_job_title), ''),
    nullif(trim(p_phone), ''),
    nullif(trim(p_country), ''),
    coalesce(nullif(trim(p_language), ''), 'TR'),
    now()
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, profiles.full_name),
    job_title = coalesce(excluded.job_title, profiles.job_title),
    phone = coalesce(excluded.phone, profiles.phone),
    country = coalesce(excluded.country, profiles.country),
    language = coalesce(excluded.language, profiles.language),
    last_login_at = now(),
    updated_at = now();

  insert into public.organization_members (organization_id, user_id, role)
  values (v_invitation.organization_id, v_user_id, v_invitation.role);

  update public.invitations
  set status = 'accepted'
  where id = v_invitation.id;

  return v_invitation.organization_id;
end;
$$;

grant execute on function public.accept_organization_invitation(uuid, text, text, text, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Cancel invitation
-- ---------------------------------------------------------------------------

create or replace function public.cancel_organization_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_invitation
  from public.invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'Invitation not found';
  end if;

  if not public.user_can_manage_members(v_invitation.organization_id) then
    raise exception 'Only ADMIN can cancel invitations';
  end if;

  if v_invitation.status <> 'pending' then
    raise exception 'Only pending invitations can be cancelled';
  end if;

  update public.invitations
  set status = 'cancelled'
  where id = p_invitation_id;
end;
$$;

grant execute on function public.cancel_organization_invitation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Organization directory (members + pending invitations)
-- ---------------------------------------------------------------------------

create or replace function public.list_organization_directory()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_org_id := public.get_user_primary_organization_id();
  if v_org_id is null then
    raise exception 'You are not a member of any organization';
  end if;

  return json_build_object(
    'members', coalesce((
      select json_agg(row_to_json(entry) order by entry.joined_at asc)
      from (
        select
          om.id as membership_id,
          om.user_id,
          om.role,
          om.created_at as joined_at,
          p.full_name,
          p.job_title,
          au.email,
          coalesce(p.last_login_at, au.last_sign_in_at) as last_login,
          'active'::text as status
        from public.organization_members om
        left join public.profiles p on p.id = om.user_id
        left join auth.users au on au.id = om.user_id
        where om.organization_id = v_org_id
      ) entry
    ), '[]'::json),
    'invitations', coalesce((
      select json_agg(row_to_json(entry) order by entry.created_at desc)
      from (
        select
          i.id,
          i.invited_email,
          i.role,
          i.status,
          i.created_at,
          i.expires_at,
          i.invited_by,
          p.full_name as invited_by_name
        from public.invitations i
        left join public.profiles p on p.id = i.invited_by
        where i.organization_id = v_org_id
          and i.status = 'pending'
          and i.expires_at >= now()
      ) entry
    ), '[]'::json)
  );
end;
$$;

grant execute on function public.list_organization_directory() to authenticated;

-- ---------------------------------------------------------------------------
-- Record profile login timestamp
-- ---------------------------------------------------------------------------

create or replace function public.record_profile_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  update public.profiles
  set last_login_at = now(), updated_at = now()
  where id = auth.uid();
end;
$$;

grant execute on function public.record_profile_login() to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security: invitations
-- ---------------------------------------------------------------------------

alter table public.invitations enable row level security;

drop policy if exists "invitations_select_org_member" on public.invitations;
create policy "invitations_select_org_member"
  on public.invitations for select
  using (organization_id in (select public.get_user_organization_ids()));

-- ---------------------------------------------------------------------------
-- Profiles: allow org members to read teammate profiles
-- ---------------------------------------------------------------------------

drop policy if exists "profiles_select_org_members" on public.profiles;
create policy "profiles_select_org_members"
  on public.profiles for select
  using (
    id in (
      select om.user_id
      from public.organization_members om
      where om.organization_id in (select public.get_user_organization_ids())
    )
  );
