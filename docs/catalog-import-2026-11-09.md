# Gemba IQ — Hizmet kataloğu aktarımı ve arayüz incelemesi

Tarih: 9 Kasım 2026

## Katalog kapsamı

Excel’deki 33 satır 33 benzersiz ürün koduyla eşleştirildi. Sarı Kuşak kullanıcı düzeltmesiyle 314, Yeşil Kuşak 313 olarak alındı. Güncellenen 307 SPC PDF’i kullanıldı. 18 kartın kaynak belgesi mevcut; 15 kartın kapak ve faaliyet içeriği boş bırakıldı ve tanım bekleniyor olarak işaretlendi.

Kategoriler: ANALİZ & RAPORLAMA: 6, PROJE: 10, KOÇLUK: 3, EĞİTİM: 14.

106 kodunun Excel’deki boş kategorisi ANALİZ & RAPORLAMA olarak tamamlandı. 204 kodu Excel’de YOK olsa da klasördeki eşleşen PDF ile dolduruldu. Excel’deki hizmet adları korundu; örneğin 305 kodundaki A4 ifadesi değiştirilmedi.

## İçeriğin ayrılması

- Kapak / giriş alanına kapsam, amaç ve kazanımlar aktarıldı.
- Faaliyetler, programdaki Word uyumlu tablo alanının kullandığı activityTableHtml alanına düzenlenebilir HTML tabloları olarak aktarıldı.
- Kaynak PDF’in müşteri unvanı, muhatabı, teklif numarası, tarihi ve tarihsel müşteri fiyatları varsayılan hizmet kartına alınmadı. Kapsam içindeki müşteri adları işletme / müşteri kuruluş olarak genelleştirildi.
- Fiyat satırları boş, ek seçenekler kapalı başlatıldı. Kaynaklardaki faaliyet eforları korundu; müşteri fiyatlarının güncel tarife olduğu varsayılmadı. Ticari şartlar için mevcut programın genel şart mekanizması korundu.
- PDF’i çizilmiş tablo içermeyen VSM, Kanban ve Standart İş eğitimlerinin numaralı programları iki sütunlu düzenlenebilir tablolara dönüştürüldü.
- Kaynakta dönük yazılmış faz adları okunur yatay başlıklara dönüştürüldü. Birleştirilmiş faz adları devam satırlarında tekrar edilerek sayfa bölünmesinde anlamın kaybolması önlendi.

## Kod değişiklikleri

- Birden fazla tabloyu ilk tabloda kesen sayfalama düzeltildi; başlıklar devam sayfalarında tekrarlanıyor.
- Tek bir sayfadan uzun hücre metinleri devam satırlarına ayrılıyor.
- Sabit Word hücre boyutları temizleniyor; A4 genişliğine sığan sütunlar ve kelime kaydırma uygulanıyor.
- 6 puntoya kadar küçültme yerine 9 / 8,5 punto ile okunabilir sayfalama kullanılıyor.
- Sadece birkaç paragraf içeren ayrı faaliyet giriş sayfası kaldırıldı.
- Faaliyet tablosu değiştiğinde teklif önizlemesini güncellemeyen eksik bağımlılık tamamlandı.
- Hizmet değişiminde boş açıklama ve süre alanlarının önceki hizmetten taşınması önlendi.
- Katalog kategorisi ANALİZ & RAPORLAMA seçiciye eklendi. Eksik kart durumu ve kaynak sayfaları gösteriliyor. Kart kaydında boş / mükerrer ürün kodu engelleniyor.

## Kaynak eşleştirmesi

Sayfa numaraları PDF dosyasındaki fiziksel sıra numarasıdır; eski tekliflerin üzerinde basılı sayfa numarası farklı olabilir.

| Kod | Hizmet | Durum | PDF | Kapak / kapsam sayfaları | Faaliyet sayfaları | Faaliyet satırı |
|---|---|---|---|---|---|---|
| 101 | OPEX ASSESSMENT -( SÜREÇ ANALİZİ) | Hazır | 101-Opex ASSESSMENT-.pdf | 1 | 3 | 18 |
| 102 | TEDARİK ZİNCİRİ SÜREÇ ANALİZİ | Tanım bekleniyor | — | — | — | 0 |
| 103 | OFIS OPEX ASSESSMENT | Tanım bekleniyor | — | — | — | 0 |
| 104 | TPM - BAKIM SÜREÇLERİ ANALİZİ | Tanım bekleniyor | — | — | — | 0 |
| 105 | OFİS SÜREÇ AKIŞ - İŞ YÜKÜ | Hazır | 105-ofis süreç AKIŞLARI analizi.pdf | 2 | 4 | 11 |
| 106 | ÜRETİM İŞ YÜKÜ ANALİZLERİ | Hazır | 106-üretim iş yükü analizi.pdf | 2, 3 | 5 | 12 |
| 201 | YALIN DÖNÜŞÜM | Hazır | 201- YALIN DÖNÜŞÜM.pdf | 1, 2 | 4, 5 | 28 |
| 202 | TPM - TOPLAM VERİMLİ YÖNETİM | Tanım bekleniyor | — | — | — | 0 |
| 203 | YALIN TEDARİK ZİNCİRİ YÖNETİM | Tanım bekleniyor | — | — | — | 0 |
| 204 | YERLEŞİM PLANLAMA / LAYOUT TASARIMI | Hazır | 204- YERLEŞİM PLANLAMA.pdf | 1 | 2 | 19 |
| 205 | UYGULAMALI 5S | Hazır | 205- UYGULAMALI 5S.pdf | 1 | 2 | 35 |
| 206 | SAHA YÖNETİMİNİ GÜÇLENDİRME | Tanım bekleniyor | — | — | — | 0 |
| 207 | LİDER GELİŞİM PROGRAMI | Tanım bekleniyor | — | — | — | 0 |
| 208 | A3 PROBLEM ÇÖZME KOÇLUK ÇALIŞMALARI | Tanım bekleniyor | — | — | — | 0 |
| 209 | YENİ FABRİKA KURULUM PLANLAMA | Hazır | 209-Yeni fabrika kuruluşu.pdf | 1, 2 | 3 | 29 |
| 210 | DEPO YERLEŞİM / 5S UYGULAMA | Hazır | 210- Perakende depo 5s.pdf | 1 | 2 | 19 |
| 211 | PLANLAMA / ÜRÜM AĞACI OLUŞTURMA | Hazır | 211-Planlama -BOM.pdf | 1, 2 | 2 | 9 |
| 212 | UYGULAMALI EĞİTİM ALANI KURULUMU | Hazır | 212-uygulamalı eğitim alanı.pdf | 2, 3 | 5 | 11 |
| 213 | SMED UYGULAMA | Tanım bekleniyor | — | — | — | 0 |
| 301 | YALIN ÜRETİM EĞİTİM PAKETLERİ | Hazır | 301-YALIN ÜRETİM EĞİTİM PAKETLERİ .pdf | 1 | 3 | 23 |
| 302 | VSM EĞİTİMİ | Hazır | 302-VSM eğitimi .pdf | 1, 2 | 1, 2 | 21 |
| 303 | 5S EĞİTİMİ | Hazır | 303- 5S Eğitimi.pdf | 2 | 4 | 35 |
| 304 | KAIZEN EĞİTİMİ | Tanım bekleniyor | — | — | — | 0 |
| 305 | A4 PROBLEM ÇÖZME EĞİTİMİ | Tanım bekleniyor | — | — | — | 0 |
| 306 | İÇ LOJİSTİK - KANBAN EĞİTİMİ | Hazır | 306-KANBAN EĞİTİMİ.pdf | 1, 2 | 1, 2 | 4 |
| 307 | TOPLAM KALİTE YÖNETİM ARAÇLARI SPC | Hazır | 307-SPC eğitmi.pdf | 2 | 4 | 12 |
| 308 | TOPLAM KALİTE YÖNETİM ARAÇLARI FMEA | Tanım bekleniyor | — | — | — | 0 |
| 309 | GEMBA UYGULAMALI TEKNİK EĞİTİMLERİ | Tanım bekleniyor | — | — | — | 0 |
| 310 | İÇ LOJİSTİK - MALZEME AKIŞ PLANLAMA | Hazır | 310-İÇ LOJİSTİK MALZEME PLANLAMA .pdf | 2 | 4, 5 | 29 |
| 311 | STANDART İŞ YAMAZUMİ ANALİZİ | Hazır | 311-STANDART İŞ .pdf | 1 | 1 | 7 |
| 312 | SMED TEKLİ DAKİKALARDA KALIP DEĞİŞİM SÜRESİ | Tanım bekleniyor | — | — | — | 0 |
| 313 | YALIN 6S - YEŞİL KUŞAK EĞİTİMİ VE UYGULAMA | Tanım bekleniyor | — | — | — | 0 |
| 314 | YALIN 6S - SARI KUŞAK EĞİTİMİ VE UYGULAMA | Hazır | 314- YALIN 6S SARI KUŞAK .pdf | 2 | 4 | 7 |

## Stitch uyarlanabilirlik değerlendirmesi

İncelenen paket altı statik HTML ekranı, beş ekran görüntüsü ve bir DESIGN.md dosyasından oluşuyor. Gerçek React bileşenleri, veri bağları ve iş akışları içermiyor. Şablondaki satışlar, marjlar, ürün adetleri ve başarı yüzdeleri örnek veriler; uygulamaya gerçek veri gibi taşınmamalı.

**Sonuç:** Görsel dil mevcut React / Tailwind uygulamasına uygulanabilir. Koyu sol menü, açık çalışma alanı, kontrollü kırmızı aksiyon rengi ve ortak Inter / JetBrains Mono fontları uyumlu. Mevcut yazı tipleri zaten bu aileleri içeriyor.

| Alan | Mevcut durum / bulgu | Önerilen iş |
|---|---|---|
| Ortak kabuk | Ana menü ve içerik düzeni App.tsx içinde; farklı görünüm sınıfları mevcut. | Önce renk / aralık / tipografi değişkenlerini birleştirip yeni kabuğu ayrı seçilebilir görünüm olarak eklemek. |
| Hizmet kataloğu | Mevcut sayfa kart düzenleyici ve teklif sihirbazını birlikte içeriyor. Stitch ise katalog listesi ve fiyat / marj sağ paneli gösteriyor. | Kart düzenleme ve teklif oluşturma işlevlerini koruyarak liste / filtre / detay panelini yeniden kurmak. |
| Satış ve firma ekranları | Pipeline, müşteri listeleri ve detay ekranlarının davranışları canlı modüllerde ayrı ayrı. | Ortak tablo, rozet ve detay çekmecesi bileşenlerinden ilerlemek; iş mantığını statik HTML ile değiştirmemek. |
| Okunabilirlik | DESIGN.md en az 12px diyor; örnek HTML ve mevcut uygulamada daha küçük metinler bulunuyor. | Web arayüzünü 12–14px tabanında düzenlemek; A4 baskı ölçülerini web temasından ayrı tutmak. |
| Stiller | Mevcut üretim derlemesinde köşeli parantezli sınıf seçicilerinden 16 CSS uyarısı var; bu çalışma CSS dosyasını değiştirmiyor. | Görünüm aktarımından önce sorunlu global seçicileri temizlemek; yeni temayı global !important kurallarıyla kaplamamak. |

Tam arayüz aktarımı bu katalog çalışmasından ayrı bir iş olarak bırakıldı. Önerilen sıra: ortak kabuk → katalog ekranı → firmalar / kişiler → fırsat ve teklif ekranları. Önce bir ekran üzerinde onaylanabilir pilot oluşturmak, sonrasında ortak bileşenlerle yaymak.

## İnceleme sırasında görülen açık konu

CrmDb.persistSoon yazma hatalarını yalnızca console.error ile raporluyor. Bazı ekranlar uzaktaki yazmayı beklemeden başarı mesajı verebiliyor. Kota / bağlantı hatalarını kullanıcıya görünür kılmak ve yazma sonucunu beklemek ayrı bir kalıcılık düzeltmesi olarak ele alınmalı. Bu katalog aktarımı doğrudan veritabanında geri okunarak doğrulanacaktır.

## Doğrulama

- TypeScript: npm run lint başarılı.
- Üretim derlemesi: npm run build başarılı; önceden mevcut CSS seçici ve büyük paket uyarıları var.
- 18 hizmet tablosu için içerik eşitliği ve A4 genişlik / yükseklik kontrolleri geçti.
- Uzun tek hücre, iki ardışık tablo ve kesintisiz uzun metin sınır testleri geçti.
- 201 Yalın Dönüşüm için A4 devam sayfası ve tekrarlanan başlık görsel olarak incelendi.
- Tekrar çalıştırılabilir tarayıcı kontrolü: tests/proposalTableLayout.browser.html (Vite geliştirme sunucusuyla açılır).

## Yedek

Aktarım öncesindeki 11 kartın yerel yedeği katalog çalışma klasöründeki catalog-before.json dosyasında tutulur. Canlı aktarımda aynı liste ayrı bir KV yedek anahtarında da korunur; diğer CRM verileri değiştirilmez.
