"""Exercise the exact migration in a disposable PostgreSQL cluster, no network."""
import pathlib, subprocess, tempfile, shutil, json
BIN = pathlib.Path('/opt/homebrew/opt/postgresql@16/bin')
root = pathlib.Path(__file__).resolve().parents[1]
tmp = pathlib.Path(tempfile.mkdtemp(prefix='gemba-mail-schema-', dir='/private/tmp'))
data, socket = tmp/'data', tmp/'socket'
socket.mkdir()
started = False
def command(args):
    result = subprocess.run([str(a) for a in args], capture_output=True, text=True)
    if result.returncode: raise RuntimeError(result.stderr[-2000:])
    return result.stdout
def sql(source, succeeds=True):
    result = subprocess.run([str(BIN/'psql'), '-h', str(socket), '-U', 'gemba_mail_test', '-d', 'postgres', '-XAt', '-v', 'ON_ERROR_STOP=1'], input=source, capture_output=True, text=True)
    if succeeds and result.returncode: raise RuntimeError(result.stderr)
    if not succeeds and result.returncode == 0: raise AssertionError('Permission check unexpectedly succeeded')
    return result.stdout.strip().splitlines()[-1] if result.stdout.strip() else ''
try:
    command([BIN/'initdb', '-D', data, '--encoding=UTF8', '--no-locale', '--auth-local=trust', '--auth-host=reject', '--username=gemba_mail_test'])
    command([BIN/'pg_ctl', '-D', data, '-l', tmp/'postgres.log', '-o', "-k '"+str(socket)+"' -c listen_addresses=''", '-w', 'start'])
    started = True
    sql("""create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      create table public.organizations(id uuid primary key);
      create table public.companies(id text primary key,organization_id uuid);
      create function public.get_user_organization_ids() returns setof uuid language sql stable as $$ select nullif(current_setting('test.org',true),'')::uuid $$;
      grant usage on schema public to authenticated,anon,service_role; grant select on public.companies to authenticated;
      insert into public.organizations values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
      insert into public.companies values ('c1','11111111-1111-4111-8111-111111111111'),('c2','22222222-2222-4222-8222-222222222222');
      insert into auth.users values ('33333333-3333-4333-8333-333333333333');""")
    sql(next((root/'supabase/migrations').glob('*_company_email_archive.sql')).read_text())
    sql("""insert into company_email_messages(organization_id,company_id,mailbox_user_id,mailbox_address,graph_id,sender,message_date,is_incoming)
      values ('11111111-1111-4111-8111-111111111111','c1','33333333-3333-4333-8333-333333333333','owner@example.test','one','client@customer.test',now(),true),
      ('22222222-2222-4222-8222-222222222222','c2','33333333-3333-4333-8333-333333333333','owner@example.test','two','other@customer.test',now(),true);""")
    assert sql("set role authenticated; set test.org='11111111-1111-4111-8111-111111111111'; select count(*) from company_email_messages;") == '1'
    assert sql("set role authenticated; set test.org='11111111-1111-4111-8111-111111111111'; select count(*) from company_email_messages where company_id='c2';") == '0'
    sql('set role anon; select * from company_email_messages;', False)
    sql('set role authenticated; delete from company_email_messages;', False)
    sql('set role authenticated; select * from company_email_sync_state;', False)
    assert sql("select count(*) from pg_policies where schemaname='public' and tablename in ('company_email_messages','company_email_sync_state');") == '2'
    sql("""insert into company_email_messages(organization_id,company_id,mailbox_user_id,mailbox_address,graph_id,sender,message_date,is_incoming)
      values ('11111111-1111-4111-8111-111111111111','c1','33333333-3333-4333-8333-333333333333','owner@example.test','one','client@customer.test',now(),true) on conflict(organization_id,company_id,mailbox_user_id,graph_id) do nothing;""")
    assert sql('select count(*) from company_email_messages;') == '2'
    print(json.dumps({'migration_applied':True,'rls_org_isolation':True,'anonymous_denied':True,'client_writes_denied':True,'cursor_private':True,'idempotency_constraint':True,'live_data_touched':False}))
finally:
    if started: subprocess.run([str(BIN/'pg_ctl'),'-D',str(data),'-m','fast','-w','stop'],capture_output=True)
    shutil.rmtree(tmp,ignore_errors=True)
