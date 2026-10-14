-- Gemba IQ — Supabase egress Faz 0 ölçüm sorguları
-- Supabase Dashboard > SQL Editor'de sırayla çalıştır.

-- 1) Her CRM tablosunun organizasyon başına satır sayısı ve toplam `data` boyutu
select 'companies' as table_name, organization_id, count(*) as row_count,
       pg_size_pretty(sum(pg_column_size(data))) as data_size,
       sum(pg_column_size(data)) as data_bytes
from companies group by organization_id
union all
select 'contacts', organization_id, count(*), pg_size_pretty(sum(pg_column_size(data))), sum(pg_column_size(data))
from contacts group by organization_id
union all
select 'deals', organization_id, count(*), pg_size_pretty(sum(pg_column_size(data))), sum(pg_column_size(data))
from deals group by organization_id
union all
select 'proposals', organization_id, count(*), pg_size_pretty(sum(pg_column_size(data))), sum(pg_column_size(data))
from proposals group by organization_id
union all
select 'tasks', organization_id, count(*), pg_size_pretty(sum(pg_column_size(data))), sum(pg_column_size(data))
from tasks group by organization_id
order by table_name, organization_id;

-- 2) "__org_auxiliary__" satırının boyutu (companies tablosunda özel satır —
--    kampanya geçmişi, hedef hesaplar, kvStore vb. hepsi burada)
select organization_id,
       pg_size_pretty(pg_column_size(data)) as auxiliary_blob_size,
       pg_column_size(data) as auxiliary_blob_bytes
from companies where id = '__org_auxiliary__';

-- 3) Auxiliary blob içindeki büyük alt alanların dökümü
select organization_id,
       pg_size_pretty(pg_column_size(data->'taskNotifications')) as task_notifications_size,
       pg_size_pretty(pg_column_size(data->'kvStore')) as kv_store_size,
       pg_size_pretty(pg_column_size(data->'emails')) as emails_size,
       pg_size_pretty(pg_column_size(data->'activities')) as activities_size,
       pg_size_pretty(pg_column_size(data->'crmDocuments')) as crm_documents_size
from companies where id = '__org_auxiliary__';

-- 4) kvStore İÇİNDEKİ bilinen büyük anahtarlar (kampanya HTML gövdeleri,
--    hedef hesaplar, AI koçu haftalık planları vb.)
select organization_id,
       pg_size_pretty(pg_column_size(data->'kvStore'->'crm_campaign_history_logs')) as campaign_logs_size,
       pg_size_pretty(pg_column_size(data->'kvStore'->'crm_target_accounts')) as target_accounts_size,
       pg_size_pretty(pg_column_size(data->'kvStore'->'crm_ai_coach_weekly_plans')) as ai_coach_plans_size,
       pg_size_pretty(pg_column_size(data->'kvStore'->'crm_lead_profiles')) as lead_profiles_size
from companies where id = '__org_auxiliary__';

-- 5) Kaç organizasyon var (tek org'a özel bir hesap mı, yoksa egress birden
--    fazla organizasyona mı dağılmış, bunu anlamak için)
select count(distinct organization_id) as org_count from companies;

-- 6) Her organizasyon için TEK BİR tam yüklemenin (loadOrganizationCrm /
--    hydrateFromSupabase full) toplam boyutu tahmini (1-5 sorgularının toplamı)
--    — bu rakamı × (3 dk'da bir açık sekme sayısı × gün başına açık saat / 3 dk)
--    ile çarpıp gözlenen ~0,4 GB/gün ile karşılaştır.
