-- User-owned provider secrets. Plaintext lives only in Vault's protected view.
create table public.user_provider_credentials (
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 provider text not null check(provider in ('gemini','tavily')),
 secret_id uuid not null unique,
 last_four text not null,
 updated_at timestamptz not null default now(),
 validated_at timestamptz,
 primary key(organization_id,user_id,provider)
);
alter table public.user_provider_credentials enable row level security;
revoke all on public.user_provider_credentials from public,anon,authenticated;
grant all on public.user_provider_credentials to service_role;
create policy user_provider_credentials_server_only on public.user_provider_credentials for all to authenticated using(false) with check(false);

create function public.write_user_provider_secret(p_organization_id uuid,p_user_id uuid,p_provider text,p_key text) returns void
language plpgsql security definer set search_path='' as $$
declare sid uuid;
begin
 if p_provider not in ('gemini','tavily') or p_provider is null then raise exception 'Invalid provider'; end if;
 if not exists(select 1 from public.organization_members where organization_id=p_organization_id and user_id=p_user_id) then raise exception 'Membership required' using errcode='42501'; end if;
 if p_key is not null and (length(p_key)<20 or length(p_key)>512 or p_key~'[[:space:][:cntrl:]]') then raise exception 'Invalid provider key'; end if;
 perform pg_advisory_xact_lock(hashtext(p_organization_id::text||p_user_id::text||p_provider));
 select secret_id into sid from public.user_provider_credentials where organization_id=p_organization_id and user_id=p_user_id and provider=p_provider for update;
 if p_key is null then
  delete from public.user_provider_credentials where organization_id=p_organization_id and user_id=p_user_id and provider=p_provider;
  if sid is not null then delete from vault.secrets where id=sid; end if;
  return;
 end if;
 if sid is null then
  select vault.create_secret(p_key,'gemba-user-api:'||p_organization_id::text||':'||p_user_id::text||':'||p_provider,'User-owned provider credential') into sid;
  insert into public.user_provider_credentials(organization_id,user_id,provider,secret_id,last_four) values(p_organization_id,p_user_id,p_provider,sid,right(p_key,4));
 else
  perform vault.update_secret(sid,p_key);
  update public.user_provider_credentials set last_four=right(p_key,4),updated_at=now(),validated_at=null where organization_id=p_organization_id and user_id=p_user_id and provider=p_provider;
 end if;
end $$;
revoke all on function public.write_user_provider_secret(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.write_user_provider_secret(uuid,uuid,text,text) to service_role;

create function public.read_user_provider_secrets(p_organization_id uuid,p_user_id uuid)
returns table(provider text,api_key text,updated_at timestamptz)
language sql stable security definer set search_path='' as $$
 select c.provider,s.decrypted_secret,c.updated_at from public.user_provider_credentials c join vault.decrypted_secrets s on s.id=c.secret_id
 where c.organization_id=p_organization_id and c.user_id=p_user_id
 and exists(select 1 from public.organization_members m where m.organization_id=p_organization_id and m.user_id=p_user_id);
$$;
revoke all on function public.read_user_provider_secrets(uuid,uuid) from public,anon,authenticated;
grant execute on function public.read_user_provider_secrets(uuid,uuid) to service_role;

create index user_provider_credentials_user_idx on public.user_provider_credentials(user_id);
create function public.cleanup_user_provider_secret() returns trigger
language plpgsql security definer set search_path='' as $$ begin delete from vault.secrets where id=old.secret_id; return old; end $$;
revoke all on function public.cleanup_user_provider_secret() from public,anon,authenticated;
create trigger cleanup_user_provider_secret after delete on public.user_provider_credentials for each row execute function public.cleanup_user_provider_secret();
