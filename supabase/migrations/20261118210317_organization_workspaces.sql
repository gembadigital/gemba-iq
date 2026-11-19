-- Explicit workspaces; no customer data copied, no accounts invited here.
create table public.platform_superadmins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.platform_superadmins enable row level security;
revoke all on public.platform_superadmins from public, anon, authenticated;
grant all on public.platform_superadmins to service_role;

create or replace function public.is_platform_superadmin() returns boolean
language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from public.platform_superadmins where user_id=auth.uid());
$$;
revoke all on function public.is_platform_superadmin() from public,anon;
grant execute on function public.is_platform_superadmin() to authenticated,service_role;

create table public.organization_access_rules (
 organization_id uuid primary key references public.organizations(id) on delete cascade,
 email_domain text not null check(email_domain=lower(email_domain) and email_domain !~ '[@ /]'),
 ai_enabled boolean not null default false
);
alter table public.organization_access_rules enable row level security;
revoke all on public.organization_access_rules from public,anon,authenticated;
grant select on public.organization_access_rules to authenticated;
grant all on public.organization_access_rules to service_role;
create policy organization_access_rules_read on public.organization_access_rules for select to authenticated
 using(organization_id in (select public.get_user_organization_ids()));

create or replace function public.get_user_primary_organization_id() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare selected text; result uuid; membership_count int;
begin
 if auth.uid() is null then return null; end if;
 selected := nullif(current_setting('request.headers',true),'')::jsonb ->> 'x-organization-id';
 if selected is not null then
  if selected !~* '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' then raise exception 'Invalid organization' using errcode='42501'; end if;
  select organization_id into result from public.organization_members where user_id=auth.uid() and organization_id=selected::uuid;
  if result is null then raise exception 'Organization access denied' using errcode='42501'; end if;
  return result;
 end if;
 select count(*), (array_agg(organization_id order by created_at))[1] into membership_count,result from public.organization_members where user_id=auth.uid();
 if membership_count>1 then raise exception 'Select active organization' using errcode='42501'; end if;
 return result;
end; $$;
revoke all on function public.get_user_primary_organization_id() from public,anon;
grant execute on function public.get_user_primary_organization_id() to authenticated,service_role;

-- Superadmin is a protected platform assignment, never an invitable organization role.
create or replace function public.user_can_manage_members(p_organization_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and p_organization_id=public.get_user_primary_organization_id()
 and exists(select 1 from public.organization_members where organization_id=p_organization_id and user_id=auth.uid() and role='ADMIN');
$$;
revoke all on function public.user_can_manage_members(uuid) from public,anon;
grant execute on function public.user_can_manage_members(uuid) to authenticated,service_role;

-- Trigger-only internal repair must not be callable as an unauthenticated RPC.
revoke all on function public.ensure_organization_has_admin(uuid) from public,anon,authenticated;

create or replace function public.storage_path_belongs_to_user_org(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and object_name like public.get_user_primary_organization_id()::text || '/%';
$$;
revoke all on function public.storage_path_belongs_to_user_org(text) from public,anon;
grant execute on function public.storage_path_belongs_to_user_org(text) to authenticated,service_role;

-- Narrow business reads/writes to the selected workspace even for superadmin.
do $$ declare t text; begin
 foreach t in array array['companies','contacts','deals','tasks','proposals','documents','document_folders','proposal_templates','proposal_audit_logs','proposal_timeline_events','proposal_number_sequences','outreach_drafts','deal_stage_reminder_log','company_email_messages'] loop
  execute format('create policy workspace_boundary on public.%I as restrictive for all to authenticated using (organization_id=public.get_user_primary_organization_id()) with check (organization_id=public.get_user_primary_organization_id())',t);
 end loop;
 -- RLS does not protect TRUNCATE. Remove inherited schema default privileges.
 for t in select tablename from pg_tables where schemaname='public' loop
  execute format('revoke truncate, trigger, references on public.%I from anon,authenticated',t);
 end loop;
end $$;

create or replace function public.enforce_workspace_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare domain text; identity_email text; refs jsonb; item record; ref_org uuid;
begin
 if tg_op='UPDATE' and new.organization_id is distinct from old.organization_id then
  raise exception 'Records cannot be moved between organizations' using errcode='42501';
 end if;
 if tg_table_name='organization_members' then
  select email into identity_email from auth.users where id=new.user_id;
  if not exists(select 1 from public.platform_superadmins where user_id=new.user_id) then
   if exists(select 1 from public.organization_members where user_id=new.user_id and organization_id<>new.organization_id) then
    raise exception 'Only superadmins may belong to multiple organizations' using errcode='42501';
   end if;
   select email_domain into domain from public.organization_access_rules where organization_id=new.organization_id;
   if domain is not null and split_part(lower(identity_email),'@',2)<>domain then raise exception 'User email domain does not match organization' using errcode='42501'; end if;
  end if;
 elsif tg_table_name='invitations' then
  select email_domain into domain from public.organization_access_rules where organization_id=new.organization_id;
  if domain is not null and split_part(lower(new.invited_email),'@',2)<>domain then raise exception 'Invitation email domain does not match organization' using errcode='42501'; end if;
 else
  refs:=to_jsonb(new);
  for item in select * from (values ('company_id','companies'),('contact_id','contacts'),('deal_id','deals'),('proposal_id','proposals'),('folder_id','document_folders'),('parent_folder_id','document_folders')) v(col,tbl) loop
   if nullif(refs->>item.col,'') is not null and (tg_op='INSERT' or (to_jsonb(old)->>item.col) is distinct from (refs->>item.col)) then
    execute format('select organization_id from public.%I where id::text=$1',item.tbl) into ref_org using refs->>item.col;
    if ref_org is distinct from new.organization_id then raise exception 'Related record belongs to another organization or does not exist' using errcode='42501'; end if;
   end if;
  end loop;
  if tg_table_name='documents' then
   if new.storage_path not like new.organization_id::text || '/%' then raise exception 'Document path does not match organization' using errcode='42501'; end if;
  end if;
 end if;
 return new;
end $$;
revoke all on function public.enforce_workspace_identity() from public,anon,authenticated;
do $$ declare t text; begin
 foreach t in array array['organization_members','invitations','companies','contacts','deals','tasks','proposals','documents','document_folders','proposal_templates','organization_settings','company_email_messages','company_email_sync_state'] loop
  execute format('create trigger enforce_workspace_identity before insert or update on public.%I for each row execute function public.enforce_workspace_identity()',t);
 end loop;
end $$;

CREATE OR REPLACE FUNCTION public.accept_organization_invitation(p_token uuid, p_full_name text DEFAULT NULL::text, p_job_title text DEFAULT NULL::text, p_phone text DEFAULT NULL::text, p_country text DEFAULT NULL::text, p_language text DEFAULT 'TR'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  ) and not public.is_platform_superadmin() then
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
$function$;


-- Organization admins remove organization membership; never delete a global Auth account.
create or replace function public.manage_organization_member(p_membership_id uuid,p_role text default null,p_remove boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare target public.organization_members%rowtype; org uuid;
begin
 org:=public.get_user_primary_organization_id();
 if not coalesce(public.user_can_manage_members(org),false) then raise exception 'Only ADMIN can manage users' using errcode='42501'; end if;
 perform 1 from public.organizations where id=org for update;
 select * into target from public.organization_members where id=p_membership_id and organization_id=org for update;
 if not found then raise exception 'Member not found in active organization' using errcode='42501'; end if;
 if target.user_id=auth.uid() or exists(select 1 from public.platform_superadmins where user_id=target.user_id) then raise exception 'This account cannot be changed' using errcode='42501'; end if;
 if target.role='ADMIN' and (p_remove or p_role='USER') and (select count(*) from public.organization_members where organization_id=org and role='ADMIN')<=1 then raise exception 'The last administrator cannot be removed'; end if;
 if p_remove then
  delete from public.organization_members where id=target.id;
 else
  if p_role not in ('ADMIN','USER') or p_role is null then raise exception 'Invalid organization role'; end if;
  update public.organization_members set role=p_role where id=target.id;
 end if;
 return jsonb_build_object('success',true);
end $$;
revoke all on function public.manage_organization_member(uuid,text,boolean) from public,anon;
grant execute on function public.manage_organization_member(uuid,text,boolean) to authenticated;
