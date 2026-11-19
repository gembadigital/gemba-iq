-- Authenticated helper RPCs have explicit caller checks. Anonymous callers do not need them.
revoke execute on function public.accept_organization_invitation(uuid,text,text,text,text,text) from public,anon;
revoke execute on function public.cancel_organization_invitation(uuid) from public,anon;
revoke execute on function public.create_organization_invitation(text,text) from public,anon;
revoke execute on function public.create_organization_with_admin(text,text,text,text,text,text) from public,anon;
revoke execute on function public.get_user_organization_ids() from public,anon;
revoke execute on function public.list_organization_directory() from public,anon;
revoke execute on function public.record_profile_login() from public,anon;
grant execute on function public.accept_organization_invitation(uuid,text,text,text,text,text),public.cancel_organization_invitation(uuid),public.create_organization_invitation(text,text),public.create_organization_with_admin(text,text,text,text,text,text),public.get_user_organization_ids(),public.list_organization_directory(),public.record_profile_login() to authenticated;
-- Trigger and event-trigger routines are internal, not RPC endpoints.
revoke execute on function public.enforce_organization_admin_invariant() from public,anon,authenticated;
do $$ begin
 if to_regprocedure('public.rls_auto_enable()') is not null then
  revoke execute on function public.rls_auto_enable() from public,anon,authenticated;
 end if;
end $$;
alter function public.set_updated_at() set search_path='';
create policy platform_superadmins_server_only on public.platform_superadmins for all to authenticated using(false) with check(false);
-- get_invitation_preview intentionally remains anonymous: it validates a random invitation token.
