# Teklif revizyonları ve kopyaları

Kaydedilen müşteri teklifinin kapak, faaliyet adımları, koşullar, opsiyon başlıkları/açıklamaları/süreleri, fiyat satırları ve kullanılan görselleri revizyonda geri yüklenir. Hizmet kataloğu ve genel şart değişiklikleri açık bir müşteri teklifinin üzerine uygulanmaz. Boş alanlar ve kullanılmayan opsiyonlar da aynen geri yüklenir. Eski, satır içermeyen fiyat kayıtları günlük ücret × adam/gün olarak korunur.

CRM kaydı sunucudan onay alınmadan başarılı sayılmaz. Çakışma/hata kullanıcıya bildirilir. PDF hatası içerik kaydından ayrı bildirilir. Sonraki kayıtlar aynı teklif kimliğinde yeni sürüm oluşturur: v1.9 → v1.10. Önceki sürümler korunur. Sürüm geçmişini görüntülemek aktif kaydı değiştirmez. İlişkili satış fırsatının aşaması ve geçmişi revizyonda sıfırlanmaz.

Son belge HTML'i içerik imzasıyla beraber saklanır; önizlemedeki elle yapılan düzenlemeler, yeniden açılışta ve PDF üretiminde korunur. Yapısal alanlar değiştirildiğinde belge yeni alanlardan üretilir; önceki kaydedilmiş belge sürüm geçmişinde kalır.

Teklif Yönetimi → İşlemler → Kopya oluştur, müşteri içeriğini bağımsız bir sihirbaz taslağına aktarır. Yeni teklif numarası atanır; kaynak teklif değiştirilmez. Yeni kimlik ve v1.0 yalnızca kullanıcı kaydettiğinde oluşturulur. Fırsat kimliği, onay durumu ve denetim geçmişi yeni teklife taşınmaz.

Alan etiketlerindeki teknik `{{...}}` rozetleri kaldırıldı. Şablon/e-posta düzenleyicilerindeki çalışan birleştirme etiketleri korunur.

## Doğrulama

- `node_modules/.bin/esbuild tests/proposalSnapshot.test.ts --bundle --platform=node --format=cjs --outfile=/tmp/proposalSnapshot.test.cjs` ve `node /tmp/proposalSnapshot.test.cjs`.
- `node tests/buildProposalWizardTest.mjs /tmp/gemba-proposal-browser-test`, ardından bu klasörü yerel HTTP sunucusunda açın. `index.html` gerçek ServicesView bileşenini sentetik veriler ve sahte veri/PDF servisleriyle çalıştırır. 20 kontrol; tekrarlı revizyon, aynı oturumda kayıt, boş/eksik opsiyonlar, özel konu, elle düzenlenmiş belge, hata bildirimi, bağımsız kopyalama ve menü/Escape içerir. Canlı veritabanına veya e-posta servisine erişmez. `?preview` menünün Teklif Yönetimi içindeki görünümünü açar.
- TypeScript ve üretim derlemesi yalnızca bu değişiklikleri içeren temiz yayın kopyasında çalıştırılır.
