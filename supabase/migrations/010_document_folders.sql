-- Nested (sub-)folder support for the Documents module
-- Apply after 009_enforce_admin_user_invitation_roles.sql
--
-- Previously the Documents page only had a fixed set of top-level category
-- buckets (companies, proposals, contracts, ...) with no way to create a
-- folder, let alone a folder inside another folder. This migration adds a
-- real, arbitrarily-nested folder tree scoped underneath each category.

-- ---------------------------------------------------------------------------
-- document_folders table
-- ---------------------------------------------------------------------------

create table if not exists public.document_folders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  category text not null check (category in (
    'companies', 'proposals', 'contracts', 'presentations', 'technical',
    'marketing', 'finance', 'hr', 'quality', 'other'
  )),
  parent_folder_id uuid references public.document_folders (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_document_folders_organization_id
  on public.document_folders (organization_id);

create index if not exists idx_document_folders_parent
  on public.document_folders (parent_folder_id);

create index if not exists idx_document_folders_category
  on public.document_folders (organization_id, category, parent_folder_id);

-- Prevent two sibling folders (same parent, same category) from sharing a name
create unique index if not exists uq_document_folders_sibling_name
  on public.document_folders (
    organization_id,
    category,
    coalesce(parent_folder_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(name)
  );

drop trigger if exists document_folders_set_updated_at on public.document_folders;
create trigger document_folders_set_updated_at
  before update on public.document_folders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- documents.folder_id (nullable = sits at the root of its category)
-- ---------------------------------------------------------------------------

alter table public.documents
  add column if not exists folder_id uuid references public.document_folders (id) on delete set null;

create index if not exists idx_documents_folder_id
  on public.documents (organization_id, folder_id)
  where is_deleted = false;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.document_folders enable row level security;

drop policy if exists "document_folders_select_org" on public.document_folders;
create policy "document_folders_select_org"
  on public.document_folders for select
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "document_folders_insert_org" on public.document_folders;
create policy "document_folders_insert_org"
  on public.document_folders for insert
  with check (
    organization_id in (select public.get_user_organization_ids())
    and created_by = auth.uid()
  );

drop policy if exists "document_folders_update_org" on public.document_folders;
create policy "document_folders_update_org"
  on public.document_folders for update
  using (organization_id in (select public.get_user_organization_ids()));

drop policy if exists "document_folders_delete_org" on public.document_folders;
create policy "document_folders_delete_org"
  on public.document_folders for delete
  using (organization_id in (select public.get_user_organization_ids()));
