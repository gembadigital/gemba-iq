-- Veri kaybı koruması: CRM tablolarının günlük anlık yedeği.
-- Free planda otomatik yedek / PITR yok; uygulama katmanı bir hata yüzünden
-- veriyi ezerse en az son 14 günün her günü için geri dönülebilecek kopya olsun.
--
-- Bu yedek AYNI Supabase projesinde durur: uygulama hatalarına (ezme/silme)
-- karşı korur, hesap/proje kaybına karşı KORUMAZ. Harici yedek için ayrıca
-- pg_dump kullanılmalıdır (bkz. docs/).

create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.crm_backups (
  id bigserial primary key,
  taken_at timestamptz not null default now(),
  backup_day date not null default (now() at time zone 'utc')::date,
  source_table text not null,
  row_count integer not null,
  payload jsonb not null
);

create index if not exists crm_backups_day_idx on public.crm_backups (backup_day desc, source_table);

-- Yalnızca postgres/service role okuyabilir; uygulama kullanıcıları (anon/authenticated) erişemez.
alter table public.crm_backups enable row level security;
revoke all on public.crm_backups from anon, authenticated;

create or replace function public.crm_take_backup(p_keep_days integer default 14)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tbl text;
  v_count integer;
  v_total integer := 0;
begin
  foreach v_tbl in array array['companies','contacts','deals','proposals','tasks','documents']
  loop
    execute format(
      'insert into public.crm_backups (source_table, row_count, payload)
         select %L, count(*), coalesce(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) from public.%I t',
      v_tbl, v_tbl
    );
    get diagnostics v_count = row_count;
    v_total := v_total + v_count;
  end loop;

  delete from public.crm_backups where taken_at < now() - make_interval(days => p_keep_days);
  return v_total;
end;
$$;

revoke all on function public.crm_take_backup(integer) from public, anon, authenticated;

-- Her gün 03:00 UTC (06:00 TR). Zaten varsa yeniden oluştur.
do $$
begin
  perform cron.unschedule('crm-daily-backup')
  where exists (select 1 from cron.job where jobname = 'crm-daily-backup');
  perform cron.schedule('crm-daily-backup', '0 3 * * *', 'select public.crm_take_backup(14)');
end;
$$;
