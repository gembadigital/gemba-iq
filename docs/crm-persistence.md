# CRM kayıtlarının yenilemede kaybolması

## Doğrulanan hata

Eski kodla, geciken aşama kayıtları sırasında CRM yenilemesi eski önbelleği geri yüklüyordu. Daha sonra alakasız bir ayar kaydı, yardımcı satırın tamamını yeniden karşılaştırarak yeni aşama adını eski `Solution Design` değeriyle değiştirebiliyordu. Aynı senaryo eski kodla başarısız, düzeltmeyle başarılı olarak tekrarlandı.

## Düzeltme

- Okuma/yazma istekleri aynı sırada işlenir. Yenileme bekleyen kayıtları bekler; okuma başladıktan sonra yerel değişiklik yapıldıysa eski anlık görüntü önbelleğe uygulanmaz.
- Yardımcı kayıtta sadece açıkça değişen anahtarlar ve alanlar yazılır. Kuyruktaki isteklerin değişiklik niyeti ve birleştirme tabanı çağrı anında saklanır. Alakasız bir ayar aşama listesini veya açıklamalarını yazamaz.
- Aşama adı ve açıklama eşlemesi tek yardımcı kayıt isteğinde kaydedilir. İlgili fırsatların kayıtları da onaylanmadan yeniden adlandırma penceresi kapanmaz. İsteklerden biri başarısızsa hata gösterilir ve yeniden denenebilir; iki tablo arasındaki işlem bir veritabanı işlemi değildir.
- Sunucudaki `updated_at` kontrolü son denemede de kaldırılmaz.
- Ortak kayıt katmanı bekleyen ve başarısız istekleri izler. Başarısız değişiklikler bellekte korunur; hata görünür kalır ve kullanıcı yeniden deneyebilir. Kaydedilmemiş değişiklik varken sayfayı kapatma/yenilemede tarayıcı uyarısı istenir. Bu bir disk üzerinde çevrimdışı kayıt sistemi değildir.
- İlk veri yüklemesi başarısızsa boş CRM üzerinde düzenlemeye izin verilmez. Var olan önbellek başarısız arka plan yenilemesinde silinmez.

## Testler

`node tests/runCrmPersistenceTest.mjs`: Gerçek CrmDb ve crmSupabaseService kodu, sahte ağ taşıyıcısıyla çalıştırılır. Sekiz senaryo: yavaş kayıt/yenileme, eski kuyruk isteği, hızlı düzenle/geri al, aşama+açıklama+fırsatların yeniden yüklenmesi, ağ hatası/yeniden deneme, yenileme sırasında yeni düzenleme, başarısız satır kaydının yenilemeden korunması, sürekli CAS çakışması.

Mevcut 17 birleştirme testi ve 20 teklif iş akışı testi de kontrol edilir. Üretim derlemesi diğer bekleyen finans değişiklikleri eklenmeden temiz yayın kopyasında çalıştırılır.
