"""Apply production schema and workspace migration to disposable PostgreSQL; no live writes."""
import pathlib, subprocess, tempfile, shutil, json
BIN=pathlib.Path('/opt/homebrew/opt/postgresql@16/bin')
ROOT=pathlib.Path(__file__).resolve().parents[1]
tmp=pathlib.Path(tempfile.mkdtemp(prefix='gemba-org-test-',dir='/private/tmp')); data=tmp/'data'; socket=tmp/'socket';socket.mkdir();started=False
checks=[]
def cmd(args):
 r=subprocess.run([str(a) for a in args],capture_output=True,text=True)
 if r.returncode: raise RuntimeError(r.stderr[-2500:])
 return r.stdout
def sql(q,ok=True):
 r=subprocess.run([str(BIN/'psql'),'-h',str(socket),'-U','workspace_test','-d','postgres','-XAt','-v','ON_ERROR_STOP=1'],input=q,capture_output=True,text=True)
 if ok and r.returncode:raise RuntimeError(r.stderr[-2500:])
 if not ok and not r.returncode:raise AssertionError('Expected denial: '+q)
 return r.stdout.strip().splitlines()[-1] if r.stdout.strip() else ''
TR='11111111-1111-4111-8111-111111111111'; DE='22222222-2222-4222-8222-222222222222'
SUPER='33333333-3333-4333-8333-333333333333'; DU='44444444-4444-4444-8444-444444444444'; TU='55555555-5555-4555-8555-555555555555'; DA='66666666-6666-4666-8666-666666666666'
def as_user(uid,org,query):
 return f"set role authenticated; set request.jwt.claim.sub='{uid}'; set request.headers='{{\"x-organization-id\":\"{org}\"}}'; "+query
try:
 cmd([BIN/'initdb','-D',data,'--encoding=UTF8','--no-locale','--auth-local=trust','--auth-host=reject','--username=workspace_test'])
 cmd([BIN/'pg_ctl','-D',data,'-l',tmp/'postgres.log','-o',"-k '"+str(socket)+"' -c listen_addresses=''",'-w','start']);started=True
 sql('''create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key,email text,last_sign_in_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant usage on schema auth,storage,public to anon,authenticated,service_role;
 grant select,insert,update,delete on storage.objects to authenticated;
 alter default privileges in schema public grant all on tables to anon,authenticated,service_role;
 ''')
 for f in sorted((ROOT/'supabase/migrations').glob('0*.sql')):
  if f.name.startswith('015'): continue
  sql(f.read_text())
 sql(next((ROOT/'supabase/migrations').glob('*_company_email_archive.sql')).read_text())
 sql(next((ROOT/'supabase/migrations').glob('*_organization_workspaces.sql')).read_text())
 sql(next((ROOT/'supabase/migrations').glob('*_workspace_rpc_hardening.sql')).read_text())
 checks.append('exact_schema_and_migration')
 sql(f"""insert into organizations(id,name,slug) values('{TR}','Turkey','tr'),('{DE}','Germany','de');
 insert into auth.users(id,email) values('{SUPER}','owner@tr.test'),('{TU}','user@tr.test'),('{DU}','user@de.test'),('{DA}','admin@de.test');
 insert into platform_superadmins(user_id) values('{SUPER}');
 insert into organization_access_rules values('{TR}','tr.test',true),('{DE}','de.test',false);
 insert into organization_members(organization_id,user_id,role) values('{TR}','{SUPER}','ADMIN'),('{TR}','{TU}','USER'),('{DE}','{SUPER}','ADMIN'),('{DE}','{DA}','ADMIN'),('{DE}','{DU}','USER');
 insert into companies(id,organization_id,created_by,data) values('tr-company','{TR}','{SUPER}','{{"name":"TR"}}'),('de-company','{DE}','{DA}','{{"name":"DE"}}');
 insert into storage.objects(bucket_id,name) values('organization-documents','{TR}/file.pdf'),('organization-documents','{DE}/file.pdf');""")
 for uid,org in [(TU,TR),(DU,DE),(DA,DE),(SUPER,TR),(SUPER,DE)]:
  assert sql(as_user(uid,org,'select count(*) from companies;'))=='1'; checks.append('read_scope_'+uid[:2]+org[:2])
 assert sql(as_user(SUPER,DE,"select count(*) from companies where id='tr-company';"))=='0';checks.append('superadmin_active_workspace_only')
 sql(as_user(DU,TR,'select * from companies;'),False);checks.append('forged_header_denied')
 sql(as_user(DU,DE,f"insert into companies(id,organization_id,created_by,data) values('bad','{TR}','{DU}','{{}}');"),False);checks.append('cross_org_insert_denied')
 sql(as_user(DU,DE,f"update companies set organization_id='{TR}' where id='de-company';"),False);checks.append('organization_move_denied')
 sql(as_user(DU,DE,f"insert into contacts(id,organization_id,created_by,company_id,data) values('bad-ref','{DE}','{DU}','tr-company','{{}}');"),False);checks.append('cross_org_relation_denied')
 sql(as_user(DU,DE,f"insert into contacts(id,organization_id,created_by,company_id,data) values('good-ref','{DE}','{DU}','de-company','{{}}');"));checks.append('valid_relation_saved')
 assert sql(as_user(DU,DE,"select count(*) from storage.objects;"))=='1';checks.append('storage_scope')
 sql(as_user(DU,DE,f"insert into storage.objects(bucket_id,name) values('organization-documents','{TR}/bad.pdf');"),False);checks.append('cross_org_upload_denied')
 sql(as_user(DU,DE,"select * from platform_superadmins;"),False);checks.append('superadmin_registry_private')
 assert sql(as_user(DU,DE,'select is_platform_superadmin();'))=='f';assert sql(as_user(SUPER,DE,'select is_platform_superadmin();'))=='t';checks.append('superadmin_identity')
 sql(as_user(DU,DE,f"select ensure_organization_has_admin('{DE}');"),False);checks.append('repair_rpc_private')
 sql('set role anon;select ensure_organization_has_admin(null);',False);checks.append('anonymous_repair_denied')
 sql(as_user(DU,DE,'truncate companies;'),False);checks.append('truncate_denied')
 sql(as_user(DA,DE,"select create_organization_invitation('wrong@tr.test','USER');"),False);checks.append('invite_domain_denied')
 assert sql(as_user(DA,DE,"select create_organization_invitation('new@de.test','USER')->>'organization_id';"))==DE;checks.append('invite_active_org')
 assert sql(as_user(DA,DE,"select (list_organization_directory()->'members')::text like '%owner@tr.test%';"))=='t';checks.append('directory_includes_shared_superadmin')
 assert sql(as_user(DA,DE,"select (list_organization_directory()->'members')::text like '%user@tr.test%';"))=='f';checks.append('directory_no_other_org_users')
 target=sql(f"select id from organization_members where user_id='{SUPER}' and organization_id='{DE}';")
 sql(as_user(DA,DE,f"select manage_organization_member('{target}','USER',false);"),False);checks.append('superadmin_cannot_be_demoted')
 target=sql(f"select id from organization_members where user_id='{TU}';")
 sql(as_user(DA,DE,f"select manage_organization_member('{target}',null,true);"),False);checks.append('cross_org_member_remove_denied')
 target=sql(f"select id from organization_members where user_id='{DU}';")
 sql(as_user(DU,DE,f"select manage_organization_member('{target}','ADMIN',false);"),False);checks.append('user_cannot_promote_self')
 sql(as_user(DA,DE,f"select manage_organization_member('{target}',null,true);"));assert sql(f"select count(*) from auth.users where id='{DU}';")=='1';checks.append('removal_preserves_auth_and_data')
 sql(f"insert into organization_members(organization_id,user_id,role) values('{DE}','{TU}','USER');",False);checks.append('non_superadmin_multiple_memberships_denied')
 # New auxiliary IDs do not collide with preserved legacy Turkey data.
 sql(as_user(SUPER,TR,f"insert into companies values('__org_auxiliary__','{TR}','{SUPER}',now(),now(),'{{}}');"))
 sql(as_user(DA,DE,f"insert into companies values('__org_auxiliary__:{DE}','{DE}','{DA}',now(),now(),'{{}}');"));checks.append('independent_auxiliary_rows')
 # Reproduce the reported soft-delete RLS conflict without changing production.
 doc='77777777-7777-4777-8777-777777777777'
 sql(f"insert into documents(id,organization_id,uploader_id,filename,original_filename,extension,mime_type,file_size,storage_path,folder,company_id) values('{doc}','{TR}','{SUPER}','test.pdf','test.pdf','pdf','application/pdf',10,'{TR}/file.pdf','companies','tr-company');")
 sql(as_user(TU,TR,f"update documents set is_deleted=true where id='{doc}';"),False);checks.append('direct_soft_delete_reproduces_rls_denial')
 assert sql(f"select is_deleted from documents where id='{doc}';")=='f';checks.append('failed_direct_delete_preserves_document')
 assert sql(f"set role service_role; update documents set is_deleted=true where organization_id='{DE}' and id='{doc}' and is_deleted=false returning id;")=='UPDATE 0';checks.append('server_delete_scoped_organization_no_match')
 sql(f"set role service_role; update documents set is_deleted=true where organization_id='{TR}' and id='{doc}' and is_deleted=false returning id;")
 assert sql(f"select count(*) from documents where id='{doc}' and is_deleted;")=='1';checks.append('server_command_retains_tombstone')
 assert sql(as_user(TU,TR,f"select count(*) from documents where id='{doc}';"))=='0';checks.append('deleted_document_stays_hidden_under_rls')
 assert sql(as_user(DA,DE,f"select count(*) from documents where id='{doc}';"))=='0';checks.append('deleted_document_stays_hidden_other_org')
 assert sql(f"select count(*) from storage.objects;")=='2';checks.append('soft_delete_preserves_storage_files')
 # Model Vault only in this disposable database; production uses installed Supabase Vault.
 sql("""create extension pgcrypto; create schema vault;
 create table vault.secrets(id uuid primary key default gen_random_uuid(),secret text,name text unique,description text);
 create view vault.decrypted_secrets as select id,convert_from(public.pgp_sym_decrypt_bytea(decode(secret,'base64'),'test-only-vault-master'),'utf8') decrypted_secret from vault.secrets;
 create function vault.create_secret(new_secret text,new_name text default null,new_description text default '') returns uuid language plpgsql as $$ declare sid uuid; begin insert into vault.secrets(secret,name,description) values(encode(public.pgp_sym_encrypt(new_secret,'test-only-vault-master'),'base64'),new_name,new_description) returning id into sid;return sid;end $$;
 create function vault.update_secret(secret_id uuid,new_secret text) returns void language sql as $$ update vault.secrets set secret=encode(public.pgp_sym_encrypt(new_secret,'test-only-vault-master'),'base64') where id=secret_id $$;
 """)
 sql(next((ROOT/'supabase/migrations').glob('*_personal_provider_credentials.sql')).read_text())
 sample='synthetic-provider-key-never-live-123456'
 sql(f"set role service_role; select write_user_provider_secret('{DE}','{DA}','gemini','{sample}');")
 assert sql(f"select secret <> '{sample}' from vault.secrets;")=='t';checks.append('provider_secret_encrypted_at_rest')
 assert sql(f"set role service_role; select api_key='{sample}' from read_user_provider_secrets('{DE}','{DA}');")=='t';checks.append('provider_secret_server_only_read')
 sql(as_user(DA,DE,'select * from user_provider_credentials;'),False);checks.append('provider_table_client_denied')
 sql(as_user(DA,DE,f"select * from read_user_provider_secrets('{DE}','{DA}');"),False);checks.append('provider_decrypt_client_denied')
 sql(f"set role anon;select * from read_user_provider_secrets('{DE}','{DA}');",False);checks.append('provider_decrypt_anonymous_denied')
 assert sql(f"set role service_role; select count(*) from read_user_provider_secrets('{TR}','{DA}');")=='0';checks.append('provider_org_scope')
 assert sql(f"set role service_role; select count(*) from read_user_provider_secrets('{DE}','{SUPER}');")=='0';checks.append('provider_user_scope')
 sql(f"set role service_role; select write_user_provider_secret('{DE}','{DA}','gemini','synthetic-rotated-provider-key-9999');")
 assert sql('select count(*) from vault.secrets;')=='1';checks.append('provider_rotation_no_duplicate_secrets')
 sql(f"set role service_role; select write_user_provider_secret('{DE}','{TU}','gemini','{sample}');",False);checks.append('provider_foreign_membership_denied')
 sql(f"set role service_role; select write_user_provider_secret('{DE}','{DA}','gemini',null);")
 assert sql('select count(*) from vault.secrets;')=='0';checks.append('provider_delete_cleans_vault')
 print(json.dumps({'passed':len(checks),'checks':checks,'live_data_touched':False},ensure_ascii=False))
finally:
 if started:subprocess.run([str(BIN/'pg_ctl'),'-D',str(data),'-m','fast','-w','stop'],capture_output=True)
 shutil.rmtree(tmp,ignore_errors=True)
