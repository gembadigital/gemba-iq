-- Server-written archive, separate from the legacy org-wide auxiliary array.
create table public.company_email_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id text not null references public.companies(id) on delete cascade,
  mailbox_user_id uuid references auth.users(id) on delete set null,
  mailbox_address text not null,
  graph_id text not null,
  internet_message_id text,
  conversation_id text,
  sender text not null,
  recipients text[] not null default '{}',
  cc text[] not null default '{}',
  subject text not null default '',
  message_date timestamptz not null,
  body_text text not null default '',
  body_preview text not null default '',
  body_limited boolean not null default false,
  is_incoming boolean not null,
  has_attachments boolean not null default false,
  web_link text not null default '',
  matched_contacts text[] not null default '{}',
  imported_at timestamptz not null default now(),
  unique(organization_id, company_id, mailbox_user_id, graph_id),
  check(octet_length(body_text) <= 300000)
);
create index company_email_messages_company_date_idx on public.company_email_messages(organization_id,company_id,message_date desc,id);
create index company_email_messages_company_fk_idx on public.company_email_messages(company_id);
create index company_email_messages_mailbox_fk_idx on public.company_email_messages(mailbox_user_id);
alter table public.company_email_messages enable row level security;
revoke all on public.company_email_messages from public,anon,authenticated;
grant select on public.company_email_messages to authenticated;
grant all on public.company_email_messages to service_role;
create policy company_email_messages_member_read on public.company_email_messages for select to authenticated
using(organization_id in (select public.get_user_organization_ids()) and exists (
  select 1 from public.companies c where c.id=company_id and c.organization_id=company_email_messages.organization_id
));

create table public.company_email_sync_state (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_id text not null references public.companies(id) on delete cascade,
  mailbox_user_id uuid not null references auth.users(id) on delete cascade,
  contact_hash text not null,
  range_start timestamptz not null,
  range_end timestamptz not null,
  next_link text,
  scanned_count integer not null default 0,
  completed_at timestamptz,
  capped boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(organization_id,company_id,mailbox_user_id)
);
alter table public.company_email_sync_state enable row level security;
create index company_email_sync_state_company_fk_idx on public.company_email_sync_state(company_id);
create index company_email_sync_state_mailbox_fk_idx on public.company_email_sync_state(mailbox_user_id);
revoke all on public.company_email_sync_state from public,anon,authenticated;
grant all on public.company_email_sync_state to service_role;
create policy company_email_sync_state_server_only on public.company_email_sync_state for all to authenticated using(false) with check(false);
-- Cursors are server-only. Members read the company's archived messages,
-- not another person's mailbox scan state or Graph continuation URLs.
notify pgrst, 'reload schema';
