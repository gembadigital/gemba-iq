# CRM görsel yenileme

Kapsam yalnızca sunum: sol navigasyon, üst çubuk, müşteri kartı ve müşteri liste yüzeyleri. Menü grupları, sekmeler, alanlar ve mevcut olay işleyicileri korunur. Veri modeli, otomatik kayıt, API ve iş kuralları değiştirilmez.

- Koyu lacivert navigasyon; tek aktif öğe vurgusu, tutarlı çizgisel ikonlar ve 280px genişlik. Mevcut daraltma, mobil çekmece ve alt menüler korunur.
- Sade arama/işlem çubuğu; kullanıcı rozeti için ayrı stil.
- Şirket başlığına yalnızca dekoratif monogram; mevcut profil düzenleme ve silme aksiyonları aynı yerde.
- Müşteri sekmeleri kutu butonlar yerine alt çizgiyle vurgulanır. On sekmenin tamamı ve yatay kaydırması korunur.
- Genel bilgi alanlarında iç içe çerçeveler kaldırılır; bölüm kartları ve alan sınırları ayrılır. Alanların onBlur/onChange kayıt davranışı aynıdır.
- Eski tema katmanındaki her yuvarlatılmış div'e kenarlık ekleyen kurallar yeni temada devre dışıdır. Konuma göre üçüncü butonu maviye boyayan seçiciler kaldırılır; şirket oluşturma butonunun kendi kimlik seçicisi korunur.
- Açık/koyu renk tokenları ve ayrı CSS cascade katmanı kullanılır; teklif A4 içeriğine ait stiller kapsam dışında tutulur.

Doğrulama: yalnız bu görsel değişiklikleri içeren izole kopyada TypeScript ve üretim derlemesi. Gerçek App/CompanyDetail/CompanyOverview bileşenlerinden çevrimdışı görüntülerle açık/koyu, daraltılmış navigasyon ve 390px mobil görünüm incelendi. JSX olay öznitelikleri kaynak sürümle karşılaştırıldı; aynı kaldı. Gerçek müşteri kayıtlarına test verisi yazılmadı.

Gelir/P&L incelemesindeki bekleyen hesaplama değişiklikleri bu yayının parçası değildir.

Güncel menü ızgarası ve Teklif Yönetimi düzeni için [CRM düzen sistemi v1](DESIGN_SYSTEM.md) esas alınır.
