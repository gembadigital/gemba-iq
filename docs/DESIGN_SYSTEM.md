# Gemba IQ CRM düzen sistemi — v2

Referans: Müşteriler sayfasındaki mevcut müşteri kartı ve düzenleme alanı. Amaç görsel düzeni tutarlı hale getirmektir. Menü renkleri, yazı tipi ailesi, erişim yetkileri, veri alanları, hesaplamalar ve iş akışları bu sistemin kapsamıyla değiştirilmez.

## Menü

Menü akordeon olarak çalışır: aynı anda yalnızca bir ana bölüm açık olabilir. Başka bölüm açıldığında önceki kapanır; açık başlığa yeniden basmak o bölümü kapatır. İlk yüklemede, yenilemede ve arama/bildirim üzerinden gezinmede yalnızca etkin sayfanın ana bölümü açılır. Bağımsız sayfalarda tüm gruplar kapalıdır.

Bütün satırlar tek ızgara kullanır: **20 px ikon / esnek metin / 16 px açılır ok**, sütunlar arasında 12 px. Menü panelinde 8 px, satırda 16 px yatay iç boşluk bulunur; böylece ikonlar panelin solundan 24 px, metinler 56 px çizgisinde başlar. Ana ve alt menüler aynı sütunlara oturur; hiyerarşi grup aralığı, açılır ok ve başlık ağırlığıyla belirtilir. Uzun başlıklar satıra sarılır, üç noktayla kesilmez.

Asgari satır yüksekliği 44 px; seçili/pasif satır ölçüsü aynıdır. Aktif işaret mutlak konumlanır ve metni kaydırmaz. Geniş menü 280 px, dar menü 80 px. Dar durumda bütün ikonlar aynı merkezde kalır. Satırlar gerçek düğmedir; grup düğmeleri `aria-expanded`, sayfalar `aria-current="page"` ve açıklayıcı ad taşır. Renkli vurgu ve mevcut tema korunur.

## Sayfa, kart ve form

- Başlık: 22×24 px boşluk; 44 px ikon alanı, başlık/açıklama ve sağda eylemler. Renkli üst şerit ve yanıp sönen ana düğme kullanılmaz.
- Kart: 12 px köşe, 1 px mevcut tema çizgisi, 22 px iç boşluk. Bölümler arasında 20 px. İç içe gereksiz çerçeveler kullanılmaz.
- Başlık 21 px, bölüm başlığı 14 px; mevcut Inter ailesi. Alan etiketi 12 px, alan metni 13 px; gereksiz monospace, büyük harf ve aşırı kalın yazı kullanılmaz.
- Alan: en az 40 px yükseklik, 9×11 px iç boşluk, 7 px köşe. Izgaralarda 18 px aralık; dar ekranda tek sütuna düşer.
- Özet rakamları tek beyaz yüzeyde ayrılan hücreler halinde; hesaplama ve para birimi mantığı korunur.
- Liste: okunabilir satır aralığı; küçük ekranda kaydırma yalnızca tablo içinde. İşlemler sütunu sağda sabittir. Mevcut eylemler aynı açılır menüde kalır.
- Pencere: sade başlık, kaydırılan gövde ve her zaman görünen alt eylem çubuğu. Form dışındaki Kaydet düğmesi `form` özelliğiyle aynı forma bağlı kalır. Alanlar kaldırılmaz veya yeniden yorumlanmaz.
- Mobil: 16 px kart/form boşluğu; eylemler gerektiğinde satıra sarılır. Açık/koyu ve dar menü durumları birlikte kontrol edilir.

## Uygulama ve kapsam

Uygulanmış: sol menü; gelir ve P&L; aday profilleri, e-posta üretimi ve yapay zekâ satış asistanı; şirket listesi/kartları ve sekmeleri, şirket arama; fırsat panosu/satış dashboard; hizmet kataloğu/teklif sihirbazı, teklif listesi/düzenleme; görevler, belgeler, hedef hesaplar; pazarlamanın tüm alt sayfaları, kampanya yönetimi/oluşturma/gönderim/geçmiş; yeniden temas, sözleşme yönetiminin kontrol alanları; organizasyon/kullanıcı ayarları ve ortak giriş formu. PDF, A4 önizleme, teklif içeriği ve yazdırma stilleri bu düzen kurallarıyla hedeflenmez.

Ölçüler ve teklif düzeni `src/styles/workspace-layout.css`, ortak ekran stilleri `src/styles/workspace-pages.css`, mobil düzenler `src/styles/workspace-mobile.css` içindedir; mevcut renkler `src/styles/stitch-theme.css` değişkenlerinden alınır. Yeni ekranlarda `crm-workspace`, `crm-page-section`, `crm-page-header`, `crm-page-heading`, `crm-page-actions`, `crm-panel`, `crm-form-section`, `crm-dialog-*` sınıflarını tekrar kullanın. Genel `table`, `input`, `svg`, `button` seçicileriyle bütün uygulamayı veya `.a4-page` belgelerini değiştirmeyin.

Her yeni ekran için açık/koyu tema, dar ekran, uzun Türkçe başlıklar, klavye odağı ve mevcut kayıt/eylem davranışını kontrol edin. Bu belge görsel dilin kalıcı kaydıdır; kullanıcı düzeltme istediğinde hem ilgili ekranı hem bu kuralları güncelleyin.

## Kontrol

`tests/workspaceLayout.browser.tsx` gerçek App ve ProposalFormModal bileşenlerini sentetik verilerle inceler: ikon/metin/ok sütunları, aktif ve dar menü, uzun başlıklar, grup açma/kapatma, form ile sabit Kaydet düğmesinin bağı ve gönderilen alan/fiyatlar. Dış veri ve posta servisleri `tests/buildWorkspacePreview.mjs` tarafından sahte servislerle değiştirilir.

Derlemeden sonra `node tests/buildWorkspacePreview.mjs /tmp/gemba-ui-preview /yayin-kopyasi/dist/assets` çalıştırıp çıktı klasörünü yerel HTTP sunucusunda açın. `index.html?test` testleri, `?dark` koyu görünümü, `?editor` düzenleme penceresini, `mobile.html` 390 px önizlemeyi açar. Canlı veritabanına yazmaz.

## Ekranlara yayılım ve mobil kurallar

- `data-crm-screen`, `data-crm-header`, `data-crm-card`, `data-crm-heading`, `data-crm-label`, `data-crm-field` ve `data-crm-button` doğrudan kontrol edilen React öğelerinde kullanılır. Kural, belge HTML'sinin içine veya bütün uygulamanın genel `div/input/table` seçicilerine yayılmaz.
- `data-crm-stack` 20 px bölüm aralığı sağlar. Eski CSS'in üst ve alt marjı birlikte uygulayıp boşluğu ikiye katlamasını engeller. Küçük araç satırları `data-crm-toolbar`, ikon alanları `data-crm-icon-box` ile ayrı ölçülenir.
- Geniş tablo bir `data-crm-scroll="horizontal"` kapsayıcısı içinde kalır. Satırların semantik tablo yapısı korunur; sayfanın tamamı yatay kaymaz. Tablolardaki mevcut aksiyonlar korunur.
- 1024 px altında yan menü mevcut hamburger çekmecesidir. 768 px altında sayfa kenarları 12 px, kart içleri 16 px; başlık/eylemler alt alta, form ızgaraları tek sütundur. Alan ve ana düğmeler en az 44 px, alan yazısı 16 px (telefonun otomatik yakınlaştırmasını önler).
- Teklif sihirbazının dört aşaması telefonda iki sütunlu görünür. P&L özetinde altı dar kart yerine masaüstünde üç sütun, telefonda tek sütun kullanılır. Rakamların hesabı ve aşama geçişleri değişmez.
- Fiziksel A4, antet, sözleşme/teklif önizleme ve çıktı alanları `data-crm-document` sınırıdır. Bu alanlar tasarım yayılımının dışındadır; düzenli CRM tabloları ve zengin metin belge tabloları birbirine karıştırılmaz.

`node tests/verifyUiPresentation.mjs` görsel öncesi sürümle üretim bileşenlerini TypeScript AST üzerinden karşılaştırır; yalnızca `data-crm-*` sunum işaretleri, tablo kaydırma kapsayıcısı ve stil importları ayrıldıktan sonra kod aynı kalmalıdır. `checks.html?width=390` örnek verilerle 30 ana sayfa ve 3 yönetim/giriş görünümünü yükleyip hata ve sayfa taşmasını raporlar. Masaüstü 1280 px, telefon 320/390 px ve tablet 768 px kontrol edilir. Bu kontrol tüm veri kombinasyonlarını veya her formun canlı kaydını doğruladığı anlamına gelmez; mevcut kayıt entegrasyon testleri ayrıca çalıştırılır.
