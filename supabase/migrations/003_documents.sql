-- Enterprise document management
-- Apply after 002_invitations.sql

-- ---------------------------------------------------------------------------
-- Documents table
-- ---------------------------------------------------------------------------

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_id text,
  deal_id text,
  proposal_id text,
  uploader_id uuid not null references auth.users (id) on delete cascade,
  filename text not null,
  original_filename text not null,
  extension text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0),
  storage_path text not null unique,
  folder text not null check (folder in (
    'companies', 'proposals', 'contracts', 'presentations', 'technical',
    'marketing', 'finance', 'hr', 'quality', 'other'
  )),
  version integer not null default 1 check (version > 0),
  document_group_id uuid not null default gen_random_uuid(),
  tags text[] not null default '{}',
  description text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_documents_organization_id
  on public.documents (organization_id);

create index if not exists idx_documents_company_id
  on public.documents (organization_id, company_id)
  where company_id is not null and is_deleted = false;

create index if not exists idx_documents_folder
  on public.documents (organization_id, folder)
  where is_deleted = false;

create index if not exists idx_documents_group_id
  on public.documents (document_group_id, version desc);

create index if not exists idx_documents_uploader_id
  on public.documents (organization_id, uploader_id)
  where is_deleted = false;

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.documents enable row level security;

drop policy if exists "documents_select_org" on public.documents;
create policy "documents_select_org"
  on public.documents for select
  using (
    organization_id in (select public.get_user_organization_ids())
    and is_deleted = false
  );

drop policy if exists "documents_insert_org" on public.documents;
create policy "documents_insert_org"
  on public.documents for insert
  with check (
    organization_id in (select public.get_user_organization_ids())
    and uploader_id = auth.uid()
  );

drop policy if exists "documents_update_org" on public.documents;
create policy "documents_update_org"
  on public.documents for update
  using (organization_id in (select public.get_user_organization_ids()));

-- ---------------------------------------------------------------------------
-- Storage bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'organization-documents',
  'organization-documents',
  false,
  104857600,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/csv',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Storage policies (org-scoped by first path segment)
-- ---------------------------------------------------------------------------

create or replace function public.storage_path_belongs_to_user_org(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.get_user_organization_ids() org_id
    where object_name like org_id::text || '/%'
  );
$$;

drop policy if exists "org_documents_select" on storage.objects;
create policy "org_documents_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'organization-documents'
    and public.storage_path_belongs_to_user_org(name)
  );

drop policy if exists "org_documents_insert" on storage.objects;
create policy "org_documents_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'organization-documents'
    and public.storage_path_belongs_to_user_org(name)
  );

drop policy if exists "org_documents_update" on storage.objects;
create policy "org_documents_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'organization-documents'
    and public.storage_path_belongs_to_user_org(name)
  );

drop policy if exists "org_documents_delete" on storage.objects;
create policy "org_documents_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'organization-documents'
    and public.storage_path_belongs_to_user_org(name)
  );
