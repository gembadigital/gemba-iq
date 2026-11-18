# Gemba IQ Takvim — 18 Kasım 2026

## Genel takvim ve iki kullanıcı arasında paylaşım

Varsayılan **Genel takvim**, yöneticinin açıkça belirlediği iki hesabın faaliyetlerini birleştirir. Takvim sahibi filtresiyle tek kişi de seçilebilir. Faaliyet başlıkları ve başlangıç–bitiş saatleri hem gün hücresinde hem günlük ajandada görünür. Kişilerin renkleri açıklama satırında gösterilir; mobilde gün seçilince tam başlıklı ve saatli ajanda kullanılır.

Diğer kişinin Outlook kaydı yalnızca başlık ve saat içerir. Konum, açıklama, katılımcılar ve Outlook ayrıntı bağlantısı aktarılmaz; özel/kişisel/gizli etkinliklerin başlığı **Meşgul** olur. Kendi takviminizde kendi etkinliğinizin normal ayrıntıları korunur. Diğer kullanıcı için düzenleme ve silme arayüzde yoktur; tüm yazma yolları sunucuda oturum sahibinin kendi doğrulanmış posta kutusuyla sınırlı kalır.

İzin kaydı, `organization_settings.microsoft_graph_application.calendar_sharing` içindedir: `enabled: true`, `mode: "titles_times"`, `user_ids: [onaylı-kullanıcı-1, onaylı-kullanıcı-2]`. Kullanıcı kimlikleri kaynak koduna veya genel depoya eklenmez. Bu ayar mevcut organizasyon yöneticisi yazma politikasıyla korunur. Her okumada aktif aynı organizasyon üyeliği, doğrulanmış hesap e-postası ve o hesapla eşleşen bağlı posta kutusu tekrar kontrol edilir. Sonradan eklenen üyeler otomatik katılmaz. Paylaşım kapatılınca yalnızca kişinin kendi takvimi kalır. Hesap/üyelik silinince eski izin kaydı erişim sağlamaz.

Genel görünümde okumalardan biri başarısızsa diğerinin sonuçları gösterilir, ancak eksik takvim açıkça uyarılır ve tam eşitleme zamanı yazılmaz. Outlook'un kişiler arası paylaşım ekranı bu app-only erişimin güvenlik sınırı değildir; sunucu yukarıdaki sınırlı izin kaydını uygular. Azure uygulama izinleri genişletilmez.

İlk doğrulama: 27 sunucu/tarih/erişim testi ve 8 görünüm × 8 tarayıcı kontrolü (64) geçti. Örnek taşıyıcıyla kişi filtresi, başlık/saat görünümü, özel kayıt maskeleme, diğer kullanıcıya yazma engeli, üçüncü kullanıcı ve başka organizasyon reddi, kısmi hatalar incelendi. Canlı toplantı içerikleri okunmadı veya değiştirilmedi.

Takvim, Görevler'in altında bağımsız menüdür. Ay/hafta/gün, tarih seçimi, kaynak filtresi ve günlük ajanda içerir. Telefonda dar hücrelere başlık sıkıştırılmaz: etkinlik sayısı günün altında, tam başlıklar günlük ajandada gösterilir.

## Veri ve eşitleme

- Kullanıcının varsayılan Outlook takvimi, mevcut `/api/user/mailbox?action=calendar-list` üzerinden tarih aralığıyla okunur. Tekrarlayan toplantıların gerçekleşen örnekleri `calendarView` ile alınır. Sayfalama tamamlanmadan başarılı sonuç gösterilmez.
- Ekran açılması, tarih aralığı değişmesi ve **Eşitle** okuma başlatır. Ekran kapalıyken arka plan eşitlemesi, webhook veya yeni cron yoktur. Vercel fonksiyon sayısı ve plan ayarları değişmez.
- Yeni katılımcısız randevu doğrudan Outlook'a kaydedilir. Düzenleme/silme aynı Outlook kaydını hedefler. Başarı yalnızca API başarılı olursa gösterilir; hatada form açık ve dolu kalır. Yeni kayıt yeniden denemesinde aynı transactionId kullanılır.
- Katılımcılı, tekrarlayan, çevrimiçi, tüm gün ve kullanıcının düzenleyicisi olmadığı etkinlikler okunur; kendi takvimindeki bu kayıtları değiştirmek için Outlook bağlantısı kullanılır. Paylaşılan kayıtların ayrıntı bağlantısı verilmez. Bu sürüm davetli eklemez/göndermez. Sunucu da uygunluğu yeniden kontrol eder.
- Mevcut müşteri kartı toplantı kayıtları salt okunur gösterilir. Aynı Graph kimliği bulunan Outlook/CRM kaydı Tümü görünümünde tek kez görünür; CRM kaynak filtresi toplantı tutanağını da açar. CRM bağlantılı etkinlikler müşteri kartından yönetilir; takvimden silinip tutanakla çelişmesi önlenir.
- Outlook kişisel etkinlikleri yalnızca ekran belleğindedir; organizasyonun ortak KV deposuna kopyalanmaz. Bu yüzden kişisel Outlook takvimi yerel CRM veri yedeğinin kapsamına eklenmez; Microsoft 365 kendi saklama/kurtarma kaynağıdır.
- Görüntüleme ve form saat dilimi Europe/Istanbul (UTC+3). Müşteri kartının mevcut bir saatlik toplantı hesabında tarayıcı yerel saatinden UTC'ye dönüştürmenin neden olduğu kayma da giderildi.

## Bağlantı koşulu

Mevcut Microsoft 365 uygulama bağlantısı kullanılır. Ayarlar → Hesabım → Kişisel Posta Kutusu adresi doğrulanmış CRM giriş e-postasıyla aynı olmalıdır. İstek başka bir posta adresi seçemez; okuma yalnızca sunucunun izin verdiği kullanıcı kimliklerinden seçilir. Tüm yazma uçları kişinin kendi adresiyle sınırlıdır. Başka adres/alias için bu sürümde yetki devri yoktur.

Azure uygulamasının takvim okuma/yazma yetkisi için **Calendars.ReadWrite application permission + admin consent** gereklidir. Bu çalışmada Azure izinleri, anahtarlar, plan veya ücret ayarları değiştirilmedi. 403 durumunda eksik izin mesajı ve yalnızca CRM kayıtlarının gösterildiği açıklaması çıkar. Mevcut app-only bağlantı Microsoft 365 içindir; kişisel Outlook.com OAuth bağlantısı bu sürüme dahil değildir.

Planın teknik kısıtlarına uygun geliştirme, Vercel'in ticari kullanım şartlarını değiştirmez. Pro'ya geçilmedi.

## İlk sürüm doğrulaması — 17 Kasım

`node tests/runCalendarTest.mjs`: 14 sunucu/tarih/rota kontrolü; tam sayfalama, güvenli nextLink, 403, kişisel posta erişimi, geçersiz tarih, UTC/tüm gün sınırı, PATCH veri koruması, transactionId ve davetsiz kayıt. Graph taşıyıcısı ve posta kimlik doğrulama adaptörü testte izoledir; gerçek Supabase oturumu/Azure yetkisini doğrulamaz.

`npm run build` ardından `node tests/buildCalendarPreview.mjs`: `/tmp/gemba-calendar-preview` çıktısını yerel HTTP üzerinden açın. `responsive.html`, 320/390/768/1280 px açık/koyu temada her biri 6 kontrol çalıştırır (48 geçti). Ekle→yeniden oku, düzenle, kayıt hatasında alanları koru, onaylı sil, CRM/Outlook tekilleştirme, ay/hafta/gün ve yatay taşma/pencere genişliği incelenir. Örnek kayıtlar yalnızca test kodundadır. Sonuç özeti `calendar-checks-2026-11-17.json` içindedir.

TypeScript ve üretim derlemesi geçti. Gerçek posta kutusu okunmadı, canlı test randevusu eklenmedi/silinmedi. Microsoft izinlerinin ve gerçek cihaz davranışının canlı kullanıcıyla doğrulanması gerekir.

Kaynaklar: [calendarView](https://learn.microsoft.com/en-us/graph/api/user-list-calendarview?view=graph-rest-1.0), [etkinlik oluşturma](https://learn.microsoft.com/en-us/graph/api/user-post-events?view=graph-rest-1.0), [etkinlik güncelleme](https://learn.microsoft.com/en-us/graph/api/event-update?view=graph-rest-1.0).
