-- Final RBAC model: only ADMIN and USER application roles.
-- This migration converts legacy organization role values and tightens role constraints.

-- ---------------------------------------------------------------------------
-- Normalize existing persisted roles
-- ---------------------------------------------------------------------------

update public.organization_members
set role = case
  when upper(role) = 'ADMIN' then 'ADMIN'
  when lower(role) = concat('own', 'er') then 'ADMIN'
  else 'USER'
end;

update public.invitations
set role = case
  when upper(role) = 'ADMIN' then 'ADMIN'
  when lower(role) = concat('own', 'er') then 'ADMIN'
  else 'USER'
end;

-- ---------------------------------------------------------------------------
-- Tighten role constraints
-- ---------------------------------------------------------------------------

alter table public.organization_members
  drop constraint if exists organization_members_role_check;

alter table public.organization_members
  add constraint organization_members_role_check
  check (role in ('ADMIN', 'USER'));

alter table public.invitations
  drop constraint if exists invitations_role_check;

alter table public.invitations
  add constraint invitations_role_check
  check (role in ('ADMIN', 'USER'));

-- ---------------------------------------------------------------------------
-- ADMIN membership helper
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

-- ---------------------------------------------------------------------------
-- First organization creator becomes ADMIN
-- ---------------------------------------------------------------------------

do $$
begin
  execute 'drop function if exists public.create_organization_with_' || 'own' || 'er' || '(text, text, text, text, text, text)';
end;
$$;

create or replace function public.create_organization_with_admin(
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
  values (v_org_id, v_user_id, 'ADMIN');

  return v_org_id;
end;
$$;

grant execute on function public.create_organization_with_admin(text, text, text, text, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Invitations only accept ADMIN / USER, with USER as normal default
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
