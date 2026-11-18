# Şirket kartı Outlook yazışma arşivi — 18 Kasım 2026

Müşteri → E-postalar sekmesinde ayrı Outlook arşivi vardır. Mevcut Gemba IQ e-posta kayıtları korunur; büyük posta içerikleri eski ortak auxiliary şirket satırına eklenmez.

## Kullanım

1. İletişim Kişileri sekmesine gerçek müşteri e-posta adreslerini kaydedin.
2. E-postalar sekmesinde eşleşme adreslerini kontrol edip **Outlook’u eşitle** düğmesine basın. İlk aktarım kullanıcının seçtiği **son 90 gün** içindir.
3. Sonraki açılışlarda onaylanmış aynı adresler için yeni yazışmalar kontrol edilir. Tamamlanan eşitlemeler beş dakika içinde otomatik tekrarlanmaz. Manuel düğme beklemeyi kaldırır. Uygulama kapalıyken çalışan yeni cron/webhook yoktur.
4. Konuya basarak kaydedilmiş ileti metnini açın. Önceki yazışmaları yükle arşiv listesinin devamını getirir.

Kullanıcı kendi doğrulanmış giriş adresiyle eşleşen bağlı kişisel Microsoft 365 posta kutusunu tarar. Takvim paylaşımı, diğer kişinin posta kutusuna okuma yetkisi vermez. Her kullanıcı kendi kapsamını başlatır. Aktarılan müşteri yazışmaları şirket kartına erişebilen organizasyon üyeleri tarafından okunabilir; bu durum ekranda belirtilir.

İlk kapsam ve kişi listesi değişiklikleri, adres listesiyle birlikte gösterilen hash'e bağlanır. Kişi adresi ilk gösterimle başlatma arasında değişirse aktarım başlamaz; güncel adresler yeniden gösterilir. Böylece başka bir kullanıcının paylaşılan kişi listesine eklediği adresler, kişisel posta kutusundan sessizce dışa aktarım başlatamaz.

## Eşleştirme ve veri

- Gelen: gönderen adresi kayıtlı müşteri kişilerinden biriyle tam eşleşmeli.
- Gönderilen: gönderen bağlı posta kutusu olmalı; alıcı veya CC'de kayıtlı müşteri adresi bulunmalı.
- Büyük/küçük harf ve dış boşluk normalleştirilir. Alan adı, imza, gövde veya benzer adres üzerinden şirket tahmini yapılmaz. Taslaklar ve aralık dışındaki iletiler aktarılmaz.
- Microsoft Graph önce adres aramasıyla yalnızca metadata döndürür; tam metin yalnızca sunucunun doğruladığı eşleşmeler için alınır. Arama dönen sonuçlar tam eşleşmenin yerine geçmez. Tarayıcıdan gönderilen müşteri adresleri kullanılmaz.
- `company_email_messages` metni ve kaynak kimliğini; `company_email_sync_state` sunucuya özel devam durumunu tutar. İleti kimliği ImmutableId olarak istenir. Organizasyon/şirket/posta kutusu sahibi/Graph kimliği benzersizliği tekrar aktarımı engeller. Farklı posta kutularındaki kaynak kopyalar ayrı saklanır.
- İlk tam aktarım sonrasında iki günlük örtüşmeyle yeni gelen/gönderilen yazışmalar kontrol edilir. Kişi listesi değişip yeniden onaylanınca son 90 günlük kapsam yeniden taranır.
- İleti silinmesi Outlook'a geri yazılmaz ve Outlook'tan silinen kayıt arşivden otomatik kaldırılmaz. Şirket silinirse bağlı arşiv kayıtları da silinir.
- Konu, gönderen, alıcı/CC, tarih, düz metin, kaynak posta kutusu ve ek-var bilgisi saklanır. Ek dosyaları indirilmez. Normal metin 250 KB'a kadar saklanır; daha uzun metin veya HTML-only yanıt açıkça sınırlı kopya olarak işaretlenir. İçerik React metni olarak gösterilir, e-posta HTML'si çalıştırılmaz.
- Liste 50 kaydın önizlemesini alır; tam gövde yalnızca konu açılınca veritabanından yüklenir. Diğer posta kutusundan aktarılmış kayda Outlook ayrıntı bağlantısı verilmez.

## Sınırlar ve kalıcılık

Mevcut `/api/mail/scan` rotası `company-read`, `company-detail`, `company-sync` modlarıyla genişletildi. Yeni Vercel fonksiyonu veya plan değişikliği yoktur; mevcut mail fonksiyonunun süresi 60 saniye olarak belirtildi. Bir istekte 20 metadata ve en fazla 20 eşleşen gövde işlenir; arayüz sayfalar bitene kadar ilerler. Sayfa değişirse son kaydedilmiş sunucu devam durumundan sürdürülebilir.

Microsoft Graph `$search` sorgusu en fazla 1.000 sonuç verir. Bu sınıra veya 100 kişi adresi sınırına ulaşıldığında tam aktarım iddia edilmez; ekranda kapsamı daraltmak için destek gerektiği belirtilir. [Microsoft arama belgesi](https://learn.microsoft.com/en-us/graph/search-query-parameter#use-search-on-message-collections).

Yazılar veritabanı tarafından onaylanmadan eşitleme tamamlandı denmez. Devam durumu yalnızca başarılı arşiv yazımından sonra ilerler. Aynı kartı iki sekme tararsa version karşılaştırması eski devam durumunun yenisini ezmesini önler. Hata mevcut arşivi silmez. Archive yazımı sunucu tarafındadır; istemcideki CrmDb auxiliary listeleriyle toplu değiştirme yapılmaz.

Yeni tablolar RLS ile korunur: arşiv okumaları aynı organizasyon ve şirketle sınırlı, istemci yazmaları kapalı, devam tablosu tamamen sunucuya özeldir. Canlı sistemde müşteri iletişimi gönderen veya değiştiren bir Graph çağrısı yoktur. Mail.Read uygulama izni ve yönetici onayı gerekir; izin yoksa açık hata gösterilir. [Microsoft ileti API'si](https://learn.microsoft.com/en-us/graph/api/user-list-messages).

## Doğrulama

- `node tests/runCompanyMailTest.mjs`: adres/scope onayı, gelen/gönderilen/CC, 90 gün, taslak ve benzer adres dışlama, tekrar aktarım, sayfa devamı, yazma/Graph hataları, organizasyon/posta kutusu sınırı, metin güvenliği.
- `python3 -B tests/checkCompanyMailMigration.py`: geçici yerel PostgreSQL 16 üzerinde gerçek SQL, RLS organizasyon ayrımı, anonim ve istemci yazma engeli, sunucuya özel devam tablosu ve benzersiz kayıt kontrolü. Canlı kayıt kullanılmaz.
- `node tests/buildCompanyMailPreview.mjs`: gerçek React bileşeniyle ilk adres kontrolü, iki sayfalı aktarım, tam metin açma, eski kayıt yükleme, hata sonrası arşiv koruma, yeniden açılış ve taşma. `/tmp/gemba-calendar-preview/mail/responsive.html` 320/390/768/1280 px açık/koyu temayı çalıştırır.

Gerçek posta kutusundan bu geliştirme/test sırasında ileti okunmadı veya aktarılmadı. Canlı kullanıcı ilk eşitlemesinde Microsoft izni ve gerçek sonuçlar doğrulanacaktır. Örnek kayıtlar yalnızca izole test taşıyıcılarında bulunur.
