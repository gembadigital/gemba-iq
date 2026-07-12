-- Bootstrap ADMIN recovery after final ADMIN / USER RBAC migration.
-- Guarantees every organization with members has at least one ADMIN.

create or replace function public.ensure_organization_has_admin(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_owner_id boolean;
begin
  if p_organization_id is null then
    return;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'organizations'
      and column_name = 'owner_id'
  )
  into v_has_owner_id;

  -- If the schema has an organization owner, that member is always ADMIN.
  if v_has_owner_id then
    execute $sql$
      update public.organization_members om
      set role = 'ADMIN'
      from public.organizations o
      where o.id = om.organization_id
        and o.id = $1
        and o.owner_id = om.user_id
        and om.role <> 'ADMIN'
    $sql$
    using p_organization_id;
  end if;

  -- A single-member organization must always be administered by that member.
  update public.organization_members om
  set role = 'ADMIN'
  where om.organization_id = p_organization_id
    and om.role <> 'ADMIN'
    and (
      select count(*)
      from public.organization_members count_members
      where count_members.organization_id = p_organization_id
    ) = 1;

  -- If no ADMIN remains, promote the first created member.
  if exists (
    select 1
    from public.organization_members
    where organization_id = p_organization_id
  ) and not exists (
    select 1
    from public.organization_members
    where organization_id = p_organization_id
      and role = 'ADMIN'
  ) then
    update public.organization_members
    set role = 'ADMIN'
    where id = (
      select id
      from public.organization_members
      where organization_id = p_organization_id
      order by created_at asc, id asc
      limit 1
    );
  end if;
end;
$$;

-- Repair existing organizations immediately.
select public.ensure_organization_has_admin(o.id)
from public.organizations o
where exists (
  select 1
  from public.organization_members
  where organization_id = o.id
);

create or replace function public.enforce_organization_admin_invariant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
begin
  v_organization_id := coalesce(new.organization_id, old.organization_id);

  if pg_trigger_depth() <= 1 then
    perform public.ensure_organization_has_admin(v_organization_id);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists organization_members_admin_recovery on public.organization_members;
create trigger organization_members_admin_recovery
  after insert or update or delete on public.organization_members
  for each row execute function public.enforce_organization_admin_invariant();
