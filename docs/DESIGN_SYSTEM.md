# Gemba IQ CRM düzen sistemi — v2

Referans: Müşteriler sayfasındaki mevcut müşteri kartı ve düzenleme alanı. Amaç görsel düzeni tutarlı hale getirmektir. Ana renk paleti, yazı tipi ailesi, erişim yetkileri, veri alanları, hesaplamalar ve iş akışları bu sistemin kapsamıyla değiştirilmez.

## Menü

Menü akordeon olarak çalışır: aynı anda yalnızca bir ana bölüm açık olabilir. Başka bölüm açıldığında önceki kapanır; açık başlığa yeniden basmak o bölümü kapatır. İlk yüklemede, yenilemede ve arama/bildirim üzerinden gezinmede yalnızca etkin sayfanın ana bölümü açılır. Bağımsız sayfalarda tüm gruplar kapalıdır.

Ana menüler **20 px ikon / esnek metin / 16 px açılır ok**, 12 px sütun aralığı kullanır. Ana ikonlar ve metinler kendi aralarında, alt menüler kendi aralarında hizalanır. Alt menü paneli kullanılabilir genişliğin %15'i kadar içe girer; zemini ana lacivertin RGB kanalları yaklaşık %25 azaltılarak `#141a2b` olur. Alt metin 12 px/450, ikon 18 px; ikon ızgarası 20 px ve sütun aralığı 12 px korunur; ana metin 13 px/600 kalır. Alt menünün solunda ince dikey rehber ve ana bölümler arasında düşük kontrastlı yatay ayraç vardır. Uzun başlıklar satıra sarılır; seçili alt menü vurgusu ve 44 px dokunma alanı korunur. Daraltılmış ikon menüsünde girinti, zemin ve ayraçlar uygulanmaz.

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

## Mobil okunabilirlik düzeltmesi (11 Kasım 2026)

- Teklif Yönetimi 768 px altında dokuz sütunu küçültmez; mevcut teklif satırını etiketli kart olarak gösterir. Şirket ve konu tam genişliktedir; referans, durum, sürüm, tutar, sorumlu ve aynı işlem menüsü korunur. Masaüstü tablo 900 px altında sıkıştırılmaz. Semantik tablo rolleri mobilde de korunur.
- Kart yüksekliği içerikten gelir. Eski genel `tbody tr { height:44px!important }` kuralı kartlara uygulanamaz; aksi halde kayıtlar üst üste biner. Harf harf kelime bölme ve durumun üstünü örten sabit hücre kullanılmaz.
- Karşılaştırma tablolarında otomatik sütun yerleşimi, okunabilir asgari hücre genişliği ve çok sütunlu tablolar için daha geniş iç tablo kullanılır. Panoların kolonları küçük telefonun içine sığar; diğer kolonlar kendi pano alanında kayar.
- `tests/responsiveReview.html`: 30 ana sayfa + 3 yönetim/giriş durumu ve 11 detay/form/liste geçişi. Uzun şirket/kişi/hizmet adları ve dolu örnek kayıtlarla; kök sayfa taşması, ezilen hücre, kartların üst üste binmesi, içeriğin kart dışına çıkması, dar teklif başlığı ve pencere taşması ölçülür. Boş listenin taşmaması tek başına başarı değildir.
- Teklif düzenleme, müşteri detay/düzenleme, görev liste/ekleme, gelir veri/fatura, P&L tablosu, fırsat listesi, sihirbaz ikinci aşama ve hizmet tanımı görünümü açılarak doğrulanır. Test taşıma/kayıt üretim servisine bağlanmaz. `responsive.html?width=390` ve `width=320/768/844` kullanılabilir; sonuçlar her ekran/durum için ayrı listelenir.
