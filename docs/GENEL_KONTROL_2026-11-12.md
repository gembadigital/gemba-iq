# Gemba IQ — sayfa, kayıt ve örnek veri kontrolü

Tarih: 12 Kasım 2026. Çalışma tabanı: `37da0a4`. Bu rapor, kaynak kodu incelemesi ve canlıdan ayrılmış tarayıcı testlerine dayanır. Canlı müşteri kaydı oluşturulmadı/silinmedi; e-posta, davetiye veya LinkedIn gönderisi gönderilmedi. RLS, kullanıcı rolleri, plan ve API anahtarları değiştirilmedi.

## Sonuç ve kapsam

Önceki yayılımda ortak stil işaretleri eklenmişti; bütün ekranların görsel olarak tamamlandığı şeklinde yorumlanmamalıydı. Başlığın aynı zamanda kart olması bazı ekranlarda beyaz kutu/padding kurallarını geri getiriyordu. Bu çakışma giderildi. Ortak başlık, tipografi, tablo ve mobil düzen kuralları v3 olarak güncellendi.

- 30 ana sayfa + 3 yönetim/hesap/giriş görünümü + 28 detay/form/sekme durumu = **61 ekran/durum**.
- Açık tema: 320, 390, 768, 1280 px. Koyu tema: 390, 1280 px. Toplam **366 görünüm kontrolü**.
- Uzun Türkçe müşteri, kişi, görev ve teklif adları; dolu listeler; mobil teklif kartları; tablolar ve pencereler kullanıldı.
- Kontroller: kök sayfa taşması, uzun metnin aşırı dar hücreye sıkışması, teklif kartlarının üst üste binmesi/taşması, pencere genişliği, beklenen ekranın açılması ve işaretlenmiş başlıklarda eski tipografi/kutulu başlık kalması.
- Bu kontroller gerçek telefon Safari/Android donanım testi, tüm içerik kombinasyonları veya her formun canlı Supabase kaydı anlamına gelmez. Çok sütunlu tablolar kendi alanlarında yatay kayabilir; sayfanın tamamı kaymamalıdır.
- PDF/A4 tasarımı bu denetimde yeniden düzenlenmedi; içerik ve fiyat hesaplarına yeni bir tasarım uygulanmadı.

## Sayfa bazında inceleme

Aşağıdaki sayfaların tamamı altı görünümde açıldı. “Kayıt yolu” kaynak kodunda bağlı olan yolu belirtir; her satır için ayrı canlı yazma yapıldığı anlamına gelmez.

| Sayfa | Kayıt/veri yolu ve bulgu |
|---|---|
| Müşteriler | `CrmDb.saveCompanies/createCompany`; örnek ciro/çalışan/şehir/sağlık varsayılanları kaldırıldı. Yeni kayıt çağrısı form durumunu korur; sektör/sağlık ve sayısal alanların yeniden yüklenmesi test edildi. |
| Müşteri kartı | Özet, kişiler, zaman tüneli, fırsatlar, teklifler, e-postalar, belgeler, toplantılar, finansal ciro ve araştırma sekmeleri açıldı. Alan değişiklikleri şirket/auxiliary kayıt katmanına bağlı. |
| Şirket arama | Araştırma çıktıları ile kullanıcı tarafından CRM'e eklenen kayıtların ayrımı kontrol edildi; arama sonucunun doğruluğu canlı harici servislerle test edilmedi. |
| Satış gösterge paneli | Hedefler kalıcı CRM anahtarına bağlandı; hata halinde pencere açık kalır. Ay/çeyrek/yıl filtresi güncel tarihe bağlandı. Sahte %10 huni kaybı kaldırıldı; grafik para birimi sistem ayarına bağlandı. |
| Fırsat ve süreç yönetimi | Aşama/alan kayıtları ortak kalıcı katmana bağlı. Gönderim istemcisi açılınca üretilen sahte müşteri yanıtı kaldırıldı; eksik alıcı için uydurma adres oluşturulmaz. |
| Teklif yönetimi | Liste, mobil kartlar ve düzenleme penceresi açıldı; teklif kopyalama, içerik imzası, sürüm artırma ve müşteri imzası testleri çalıştırıldı. |
| Teklif oluşturma | İkinci aşama dahil sihirbaz açıldı; mevcut `saveProposalsConfirmed` yolu korundu. Oluşan fırsata rastgele telefon numarası yazılması kaldırıldı. |
| Hizmet kataloğu | Liste ve 201 tanım görünümü açıldı; 18 mevcut tanımın h3/metin koruma testleri geçti. |
| Görevler | Pano, liste ve ekleme penceresi kontrol edildi; görevler/bildirimler ortak kayıt katmanına bağlı. Gerçek bildirim gönderimi bu testte çalıştırılmadı. |
| Belgeler | Liste/depo ekranı açıldı. Eski CRM belgesi taşınırken mevcut dosya içeriği artık korunur. Gerçek sağlayıcı yüklemesi olmadan `Synced` yazılmaz. |
| Hedef hesaplar | Liste ve CRUD kayıt yolu incelendi; CRM auxiliary anahtarları kullanılır. |
| Aday profilleri | Liste açıldı; CRM kayıt yolu incelendi. Rastgele kimlik üretimi sahte müşteri verisi üretimiyle karıştırılmadı. |
| E-posta üretimi | Şablon/kişi seçimi ve düzenleyici açıldı. E-posta gönderilmedi. |
| Yapay zekâ satış asistanı | Ekran ve taşma kontrolü yapıldı. API çıktılarının doğruluğu/ücretli çağrıların başarısı bu testin dışında. |
| Gelir yönetimi | Dashboard, veri girişi ve faturalar açıldı. Sabit +%12 büyüme kaldırıldı; 18.000 TL yedek varsayımı kullanılan yerde tahmin olarak görünür. |
| Yönetim P&L | Dashboard ve tablo açıldı. Gerçek kaynak boşken devreye giren örnek danışman, proje, fatura ve plan değerleri kaldırıldı. Finans hesaplarının tümü için yeni muhasebe mutabakatı yapılmadı. |
| Pazarlama — genel bakış | Mevcut CRM kayıtlarından okunan özetler ve düzen kontrol edildi. |
| Pazarlama — sektör zekâsı | Sektör kırılımları ve düzen kontrol edildi. |
| Pazarlama — hedef pazar | Hedef hesap kayıt yolu ve düzen kontrol edildi. |
| Pazarlama — iş geliştirme panosu | Aşama/metadata kayıt yolu ve mobil pano kontrol edildi. |
| Pazarlama — büyüme sağlığı | Mevcut CRM kayıtlarına dayalı metrikler ve düzen kontrol edildi. |
| Pazarlama — dijital zekâ | Rapor/analiz ekranı açıldı; harici yapay zekâ çağrısı yapılmadı. |
| Pazarlama — KPI/OKR | Hedef kayıt yolu ve düzen kontrol edildi. |
| Pazarlama — yapay zekâ koçu | Ekran açıldı; üretilen öneriler gerçekleşmiş CRM işlemi sayılmadı. |
| Kampanya yöneticisi | Örnek kayıt seeding'i ve sahte zamanlayıcı başarıları kaldırıldı. Planlar kaydedilir; bu ekranın gerçek LinkedIn yayın/zamanlanmış e-posta sağlayıcı uygulaması yoktur. Gerçek e-posta için mevcut gönderim düzenleyicisi kullanılır. |
| Yeniden temas/onay | Onay/kuyruk kayıt yolu ve düzen kontrol edildi; gerçek ileti gönderilmedi. |
| Sözleşme yöneticisi | Örnek müşteri/adres/kimlik/tutar başlangıçları kaldırıldı. Kayıtlı tarih ve para biriminin yeniden açılmada korunması düzeltildi. |
| Kampanya dashboard | Boş geçmişte görünen beş uydurma kampanya grafiği kaldırıldı. |
| Kampanya tasarımcısı | Şablon ve alıcı ekranı açıldı; gerçek gönderim yapılmadı. |
| Gönderim ekranı | Gerçek oturumlarda rastgele açılma/tıklanma üretilmez. Açık sandbox araçları gerçek oturumdan gizlendi; sandbox sonuçlarının gerçek kampanya defterine/geçmiş callback'ine yazılması engellendi. |
| Kampanya geçmişi | Geçmiş kayıtlarından okunan liste ve düzen kontrol edildi. |
| Yönetim/hesap/giriş | Organizasyon, kullanıcılar, posta, şablonlar, veri merkezi, denetim, yapay zekâ ayarları ve sistem sağlığı sekmeleri açıldı. Sahte denetim geçmişi kaldırıldı. Sadece alanların dolu olmasıyla bulut bağlantısı “test başarılı” sayılmaz. |

## Kayıt işlevleri hakkında kesin ayrım

Çekirdek müşteri, fırsat, teklif ve görev işlemleri Supabase'e giden ortak kayıt katmanına bağlı. Yardımcı modüller organizasyon kapsamlı auxiliary/KV kaydı kullanır. Bekleyen/hatalı yazmaları gösteren ortak durum bileşeni korunmuştur. Görsel test ortamı bu gerçek bağlantıya yazmaz.

Doğrulanan ve düzeltilen hatalar:

1. Satış hedefleri yalnızca React durumunda kalıyordu; CRM'e yazma ve yazma onayını bekleme eklendi.
2. Yeni şirket oluşturulurken formdaki tüm alanlar çağrıya geçmiyordu; form durumu korunur. `createCompany` sektör/sağlık/lifecycle alanlarını da korur. Geçerli sıfır değerleri gösterimde kaybolmaz.
3. Sözleşme tarihi kaydedilse bile açılış etkisi bugüne çeviriyordu; bu üzerine yazma kaldırıldı. Para birimi de kalıcı hale geldi.
4. Şirket değişiklik kayıtlarında sabit kişi yerine oturumdaki aktör kullanılır. Organizasyon Kaydet ve Kaydet/Kapat işlemleri yazma onayını bekler; hatada başarı göstermez.
5. Müşteri finans sekmesi, yalnızca açılınca örnek ödeme planını kaydediyordu. Artık veri yoksa boş kalır; ödemeyi “tahsil edildi” işaretlemek dosyası olmayan bir fatura PDF'i oluşturmaz.
6. Yönetimdeki menü izin matrisi gerçek yetki denetimine bağlı değil ve kalıcı değildi. Yetki değiştirdiği izlenimi vermemesi için taslak/salt okunur olarak işaretlendi. Gerçek Admin/User rol yönetimi korundu; yeni bir yetkilendirme modeli uygulanmadı.

## Örnek/dummy veri ayrımı

Üretim ekranında gerçekmiş gibi görünen örnekler kaldırıldı: müşteri liste varsayılanları, müşteri finans planları ve boş sözleşme değeri, boş kampanya grafiği, P&L yedek başlangıç verileri, kampanya zamanlayıcısındaki rastgele istatistikler, sahte müşteri yanıtı ve sahte denetim geçmişi.

`EmailLeadDiscoveryView` içinde bağlantı yokken örnek kişiler üreten kod da kaldırıldı; bu bileşen mevcut App yönlendirmesinde bağlı değildir. Test fixture'ları yalnızca `tests/` ve yerel önizlemede kalır. Açıkça seçilen sandbox oturumu örnek gönderim gösterebilir; bu sonuçlar gerçek kampanya geçmişine kaydedilmez.

Önceki sürümün veritabanına kaydetmiş olabileceği örnekler otomatik silinmedi. Sabahki yerel yedekte kaynak örnek kimlikleri/yapısı ile eşleşen adaylar saptandı. Sonradan kullanıcı tarafından değiştirilmiş olabilecekleri için temizleme ayrı inceleme gerektirir. İsim ve kayıt anahtarı içeren aday listesi yalnızca özel çalışma klasöründe tutulur; GitHub'a eklenmez.

## Açık kalan işlevler ve sınırlar

- Outlook'ta CRM dışında yapılan yazışmaları müşteri kartına eşitleme henüz yok; önceki iyileştirme planında duruyor.
- Kampanya yöneticisinin LinkedIn otomatik yayını ve kendi zamanlanmış gönderim motoru uygulanmış değil. Kaydetme, gönderim/yayın başarısı olarak sunulmamalı.
- SharePoint/OneDrive/Azure belge sağlayıcısı ayarlarının bulunması gerçek yükleme/senkronizasyonun varlığı anlamına gelmiyor. Belge CRM içinde saklanır; harici durum beklemede kalır.
- İnce menü izin matrisi taslak. Gerçek yetkilendirmeyi genişletmek Türkiye–Almanya çalışmasının parçasıdır; bu çalışma kullanıcının önceki isteğiyle beklemede.
- Fırsat ekranındaki dış posta istemcisini açmak gönderim teslimatını doğrulamaz. Gerçek API gönderimi müşteri e-posta sekmesinde ve gönderim düzenleyicisinde ayrı yoldur.
- Teklif sonrası takip otomasyonu mevcuttur; bu denetimde sıfırdan yapılmadı veya canlı e-posta ile test edilmedi. Aktif cron/üretim tetikleme doğrulaması ayrı planda korunur.
- P&L tarafındaki istemci PIN'i gerçek veri erişim yetkisinin yerine geçmez; sunucu/veritabanı yetkileri bu denetimde yeniden tasarlanmadı.
- Üretim derlemesi başarılıdır; mevcut büyük JS paketi ve eski CSS seçicisi uyarıları performans/teknik borç olarak sürüyor.

## Doğrulama

- `node tests/runCrmPersistenceTest.mjs`: gerçek CrmDb/service koduyla, izole ağ taşıyıcısında 9 test geçti. Gecikme, yenileme, kayıt hatası, yeniden deneme, çakışma ve yeni müşteri alanlarının yeniden yüklenmesi kapsanır.
- `tests/workspaceLayout.browser.tsx`: menü hizası/akordeon ve teklif formunun kayıt bağı için 26 kontrol geçti.
- `tests/generalAudit.browser.tsx`: 15 tarayıcı regresyon kontrolü geçti; gerçek bileşenlerde satış hedefi kaydetme/yeniden açma/hata, tarih filtresi, örnek veri üretmeme, müşteri formu, sözleşme ve yönetim geçmişi kontrolleri.
- Teklif snapshot/kopya/sürüm, müşteri imzası (5), gelir–teklif eşleşmesi (5), hizmet tanımı (4) ve PWA testleri geçti.
- `npm run lint` ve `npm run build` çalıştırıldı.
- Canlı kayıt CRUD, gerçek gönderim, OAuth izinleri, dosya sağlayıcı uçtan uca testi ve tüm finansal hesapların muhasebe doğrulaması bu sonuçlarla yapılmış sayılmaz.
