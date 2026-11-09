# Teklif belge düzeni

Teklif sihirbazı, kayıtlı teklif önizlemesi, PDF indirme, e-posta eki ve Documents kopyası aynı `buildProposalDocument` düzenini kullanır:

1. Kurumsal cover.png üzerinde kapak.
2. Teklif tanıtımı; tanım ve amaç başlıkları h3.
3. Kaydedilmişse fazlar / içerik adımları tablosu.
4. Her aktif opsiyonun gerçek hizmet satırları, ara toplam, KDV ve toplamı. Alternatifler toplanmaz.
5. Mevcut hukuki koşullar; kısa h3 başlıklar. Eksik koşullar açıkça belirtilir; ticari şart üretilmez.
6. Son sayfanın altında danışman ve müşteri imza / kaşe alanları.

Tanıtım ve faaliyet içerikleri teklif ve versiyonuyla saklanır. Eski kayıtların saklanmamış faaliyetleri güncel katalogdan uydurulmaz. Eski methodology/projectPlan/timeline alanları varsa korunarak kullanılır. PDF üretimi her A4 sayfasını ayrı yakalar; eksik içerikli eski PDF üretecine sessiz geçiş yapılmaz. Önceden arşivlenmiş PDF dosyaları topluca değiştirilmez.

## Doğrulama

- `npm run lint`, `npm run build`.
- `node --import tsx --test tests/serviceDefinition.test.ts`.
- Vite üzerinden `/tests/proposalDocument.browser.html`: 18 katalog belgesi; tablosuz, uzun metin / 90 satır / çoklu opsiyon, eski HTML kayıt ve güvenli metin senaryoları. Toplam 22 test: sıralama, içerik korunması, yatay/dikey taşma, tek imza ve son sayfa altına hizalama.
- Aynı sayfadaki PDF kontrolü gerçek html2canvas-pro + jsPDF çıktısını doğrular: SPC örneğinde 5 A4 sayfa.
- Tarayıcıda kurumsal görseller, tablolar, kısa hukuki başlıklar ve imza alanları görsel olarak kontrol edildi. Testler müşteri kaydı oluşturmaz veya e-posta göndermez.

Yapılandırılmış katalog tanımları ve kişisel veri içermeyen örnek fiyatlar test girdisidir; canlı tekliflere fiyat veya sözleşme koşulu aktarılmaz.
