# Veri kaybı koruması (CRM)

## Sorun (Kasım 2026)
Eskiden her kayıtta istemcinin bellekteki **tüm** listesi (fırsat, kişi, şirket, teklif, görev)
veritabanına yazılıyor ve listede olmayan satırlar **siliniyordu**. Eski bir sekme, ikinci kullanıcı
veya OpenClaw API'nin eklediği kayıtlar silinebiliyor, başkalarının düzenlemeleri eski sürümle
eziliyordu. Aday profilleri / hedef hesaplar tek bir JSON anahtarında olduğundan tek bir eksik
kayıt tüm listeyi (≈3000 kişi) küçültüyordu.

## Çözüm
`src/lib/syncMerge.ts` (saf mantık, `npm run test:sync`) + `src/lib/crmSupabaseService.ts`:

- **Satır bazlı yazma:** İstemci yalnızca yüklediğinden/yazdığından *farklı* satırları yazar.
- **Sınırlı silme:** Yalnızca istemcinin bildiği (baseline'da olan) ve bilerek sildiği satırlar
  silinir. Başkasının eklediği satır silinmez.
- **Çakışma:** Satırın sunucudaki `updated_at` değeri yüklediğimizden beri değiştiyse yazılmaz
  (sunucu sürümü kazanır, cache yenilenir, `crm-sync-conflict` olayı yayılır).
- **Toplu silme koruması:** >10 satır ve tablonun ≥%50'sini silen yazma engellenir.
- **kvStore:** id'li diziler (aday profilleri, hedef hesaplar…) üç yönlü birleştirilir; kv dışı
  alanlar istemci değiştirmediyse sunucudaki değer korunur; yazma `updated_at` ile kilitlidir.
- **Delta senkron:** İstemci/sunucu saat farkı için 2 dk örtüşme.

## Yedek (migration 015)
`pg_cron` her gün 03:00 UTC'de `crm_take_backup(14)` çalıştırır; son 14 günün her günü için
`crm_backups` tablosunda tablo başına tek satır (JSON) tutulur. Yalnızca `postgres`/service role
okuyabilir. **Aynı projede durur** — hesap/proje kaybına karşı koruma değildir; harici `pg_dump`
yedeği ayrıca alınmalıdır.

### Bir tabloyu yedekten geri okuma (örnek: bir günün fırsatları)
```sql
select jsonb_array_elements(payload) as row
from crm_backups
where source_table = 'deals' and backup_day = '2026-11-06'
order by id desc limit 1;
```
Geri yükleme, ilgili satırları `deals` tablosuna `insert ... on conflict (id) do update` ile
elle yazarak yapılır; önce sonucu inceleyin.
