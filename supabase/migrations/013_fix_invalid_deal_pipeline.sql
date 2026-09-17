-- Kullanıcı hatası: "Gemba Sales Manager Agent Pazarlama ve iş geliştirme
-- modülündeki iş geliştirme pipeline'ını göremediğini belirtmiş."
-- Apply after 012_outreach_drafts.sql
--
-- Kök neden: integrationDealCreate (lib/server/integrationApi.js), yazma
-- sırasında "pipeline" alanını hiç doğrulamadan kabul ediyordu. Ajan bir
-- fırsat oluştururken pipeline alanına serbest metin olarak "İş Geliştirme
-- Pipeline'ı" yazmış — Gemba IQ'da bu isimde tanımlı bir pipeline yok,
-- panelde tek geçerli değer "Sales Pipeline Standard". Kayıt DB'ye yazıldı
-- ve ham liste sorgusunda göründü, ama Kanban görünümü fırsatları
-- d.pipeline/d.stage için KESİN eşleşmeyle sütunlara dizdiğinden, bu fırsat
-- panelde hiçbir sütunda görünmedi (bkz. kod tarafı düzeltmesi: aynı commit,
-- integrationApi.js — artık pipeline/stage yazma sırasında doğrulanıyor).
--
-- Bu migration, o kod düzeltmesinden ÖNCE zaten yazılmış olan bozuk
-- kayıt(lar)ı onarır. Yalnızca "pipeline" alanı düzeltilir — "Sales
-- Pipeline Standard" tüm kod tabanında tek geçerli/sabit pipeline adı
-- olduğundan bu her organizasyon için güvenlidir. "stage" alanına
-- kasıtlı dokunulmadı: organizasyonlar panelden aşama isimlerini yeniden
-- adlandırmış olabilir, bu yüzden hangi stage değerlerinin o organizasyon
-- için geçerli olduğu satır bazında (companies tablosundaki
-- __org_auxiliary__ satırının data->'pipelineStages' alanı) değişebilir —
-- kör bir toplu SQL güncellemesi yanlışlıkla geçerli, özelleştirilmiş bir
-- stage'i bozabilir.

update public.deals
set data = jsonb_set(data, '{pipeline}', to_jsonb('Sales Pipeline Standard'::text))
where data ->> 'pipeline' is distinct from 'Sales Pipeline Standard';
