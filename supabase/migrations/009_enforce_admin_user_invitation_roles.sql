-- Enforce final ADMIN / USER role model across invitation flow.
-- Replaces any previously deployed invitation RPC or role constraint that still
-- expects legacy lowercase roles.

alter table public.organization_members
  drop constraint if exists organization_members_role_check;

alter table public.invitations
  drop constraint if exists invitations_role_check;

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

alter table public.organization_members
  add constraint organization_members_role_check
  check (role in ('ADMIN', 'USER'));

alter table public.invitations
  add constraint invitations_role_check
  check (role in ('ADMIN', 'USER'));

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
  v_member_role text;
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

  v_member_role := case
    when upper(v_invitation.role) = 'ADMIN' then 'ADMIN'
    else 'USER'
  end;

  if v_invitation.role <> v_member_role then
    update public.invitations
    set role = v_member_role
    where id = v_invitation.id;
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
  values (v_invitation.organization_id, v_user_id, v_member_role);

  update public.invitations
  set status = 'accepted'
  where id = v_invitation.id;

  return v_invitation.organization_id;
end;
$$;

grant execute on function public.accept_organization_invitation(uuid, text, text, text, text, text)
  to authenticated;
