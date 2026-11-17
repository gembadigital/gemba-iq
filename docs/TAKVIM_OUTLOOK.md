# Gemba IQ Takvim — 17 Kasım 2026

Takvim, Görevler'in altında bağımsız menüdür. Ay/hafta/gün, tarih seçimi, kaynak filtresi ve günlük ajanda içerir. Telefonda dar hücrelere başlık sıkıştırılmaz: etkinlik sayısı günün altında, tam başlıklar günlük ajandada gösterilir.

## Veri ve eşitleme

- Kullanıcının varsayılan Outlook takvimi, mevcut `/api/user/mailbox?action=calendar-list` üzerinden tarih aralığıyla okunur. Tekrarlayan toplantıların gerçekleşen örnekleri `calendarView` ile alınır. Sayfalama tamamlanmadan başarılı sonuç gösterilmez.
- Ekran açılması, tarih aralığı değişmesi ve **Eşitle** okuma başlatır. Ekran kapalıyken arka plan eşitlemesi, webhook veya yeni cron yoktur. Vercel fonksiyon sayısı ve plan ayarları değişmez.
- Yeni katılımcısız randevu doğrudan Outlook'a kaydedilir. Düzenleme/silme aynı Outlook kaydını hedefler. Başarı yalnızca API başarılı olursa gösterilir; hatada form açık ve dolu kalır. Yeni kayıt yeniden denemesinde aynı transactionId kullanılır.
- Katılımcılı, tekrarlayan, çevrimiçi, tüm gün ve kullanıcının düzenleyicisi olmadığı etkinlikler okunur; değiştirmek için Outlook bağlantısı kullanılır. Bu sürüm davetli eklemez/göndermez. Sunucu da uygunluğu yeniden kontrol eder.
- Mevcut müşteri kartı toplantı kayıtları salt okunur gösterilir. Aynı Graph kimliği bulunan Outlook/CRM kaydı Tümü görünümünde tek kez görünür; CRM kaynak filtresi toplantı tutanağını da açar. CRM bağlantılı etkinlikler müşteri kartından yönetilir; takvimden silinip tutanakla çelişmesi önlenir.
- Outlook kişisel etkinlikleri yalnızca ekran belleğindedir; organizasyonun ortak KV deposuna kopyalanmaz. Bu yüzden kişisel Outlook takvimi yerel CRM veri yedeğinin kapsamına eklenmez; Microsoft 365 kendi saklama/kurtarma kaynağıdır.
- Görüntüleme ve form saat dilimi Europe/Istanbul (UTC+3). Müşteri kartının mevcut bir saatlik toplantı hesabında tarayıcı yerel saatinden UTC'ye dönüştürmenin neden olduğu kayma da giderildi.

## Bağlantı koşulu

Mevcut Microsoft 365 uygulama bağlantısı kullanılır. Ayarlar → Hesabım → Kişisel Posta Kutusu adresi doğrulanmış CRM giriş e-postasıyla aynı olmalıdır. İstek gövdesi başka bir posta adresi seçemez; tüm takvim uçları sunucuda kullanıcıyı ve adres eşleşmesini kontrol eder. Başka adres/alias için bu sürümde yetki devri yoktur.

Azure uygulamasının takvim okuma/yazma yetkisi için **Calendars.ReadWrite application permission + admin consent** gereklidir. Bu çalışmada Azure izinleri, anahtarlar, plan veya ücret ayarları değiştirilmedi. 403 durumunda eksik izin mesajı ve yalnızca CRM kayıtlarının gösterildiği açıklaması çıkar. Mevcut app-only bağlantı Microsoft 365 içindir; kişisel Outlook.com OAuth bağlantısı bu sürüme dahil değildir.

Planın teknik kısıtlarına uygun geliştirme, Vercel'in ticari kullanım şartlarını değiştirmez. Pro'ya geçilmedi.

## Doğrulama

`node tests/runCalendarTest.mjs`: 14 sunucu/tarih/rota kontrolü; tam sayfalama, güvenli nextLink, 403, kişisel posta erişimi, geçersiz tarih, UTC/tüm gün sınırı, PATCH veri koruması, transactionId ve davetsiz kayıt. Graph taşıyıcısı ve posta kimlik doğrulama adaptörü testte izoledir; gerçek Supabase oturumu/Azure yetkisini doğrulamaz.

`npm run build` ardından `node tests/buildCalendarPreview.mjs`: `/tmp/gemba-calendar-preview` çıktısını yerel HTTP üzerinden açın. `responsive.html`, 320/390/768/1280 px açık/koyu temada her biri 6 kontrol çalıştırır (48 geçti). Ekle→yeniden oku, düzenle, kayıt hatasında alanları koru, onaylı sil, CRM/Outlook tekilleştirme, ay/hafta/gün ve yatay taşma/pencere genişliği incelenir. Örnek kayıtlar yalnızca test kodundadır. Sonuç özeti `calendar-checks-2026-11-17.json` içindedir.

TypeScript ve üretim derlemesi geçti. Gerçek posta kutusu okunmadı, canlı test randevusu eklenmedi/silinmedi. Microsoft izinlerinin ve gerçek cihaz davranışının canlı kullanıcıyla doğrulanması gerekir.

Kaynaklar: [calendarView](https://learn.microsoft.com/en-us/graph/api/user-list-calendarview?view=graph-rest-1.0), [etkinlik oluşturma](https://learn.microsoft.com/en-us/graph/api/user-post-events?view=graph-rest-1.0), [etkinlik güncelleme](https://learn.microsoft.com/en-us/graph/api/event-update?view=graph-rest-1.0).
