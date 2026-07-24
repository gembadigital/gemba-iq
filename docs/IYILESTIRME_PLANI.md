# Gemba IQ — UI/UX & Dil Tutarlılığı İyileştirme Planı

Bu dosya, projenin kaynak kodu üzerinden yapılan UI/UX değerlendirmesini ve dil (TR/EN) tutarlılığı taramasını fazlara bölünmüş, uygulanabilir bir plana çeviriyor. Ekip bu dosyayı çalışma listesi olarak kullanabilir — her fazın altında **Durum** satırı var ve ilerledikçe güncellenmeli.

Son güncelleme: 2026-07-24

---

## Faz 1 — Dil Tutarlılığı (TR/EN)

**Neden öncelikli:** Kullanıcının doğrudan ve tekrarlanan geri bildirimi ("hala bir çok noktada dil hatası var... menu seçeneklerini ingilizce yapıyorsun"). Ayrıca mekanik olarak en hızlı düzeltilebilir kategori — kod mimarisi değişmiyor, sadece sözlük dosyasına çeviri ekleniyor.

### Nasıl çalışıyor
`src/lib/LanguageContext.tsx` içindeki `t(englishString)` fonksiyonu, İngilizce kaynak metni `src/lib/LanguageContext.tsx`'in kendi TR sözlüğü + `src/lib/uiDictionaryExtensions.ts`'teki `uiDictionaryTR` sözlüğünde arıyor. Eşleşme yoksa, **hiçbir uyarı vermeden** ham İngilizce metni ekrana basıyor. Bu yüzden eksik çeviriler derlemede/hata konsolunda görünmüyor — sadece gözle fark ediliyor.

### Kapsam taraması (2026-07-24 tarihinde yapıldı)
Kod tabanındaki tüm `t("...")` çağrıları çıkarıldı (2347 benzersiz metin) ve her ikisi sözlük dosyası birlikte kontrol edildi (ilk taramada `uiDictionaryExtensions.ts` gözden kaçırılmış ve yanlışlıkla ~2267 eksik olduğu sanılmıştı — düzeltilmiş, doğru rakam aşağıda):

- **Toplam benzersiz `t()` çağrısı:** 2347
- **Sözlükte karşılığı olan:** 1812
- **Sözlükte karşılığı olmayan (İngilizce sızıyor):** 535 benzersiz metin, kod tabanında toplam 591 kullanım noktası
- Bunların bir kısmı gerçek arayüz metni değil (örnek e-posta adresleri, gün kısaltmaları, CSS class string'leri, simülatör/demo verisi) — bu yüzden gerçek "kullanıcının göreceği" eksik metin sayısı biraz daha düşük, ama tam liste `docs/eksik-cevi̇ri̇ler.txt` altında saklanıyor (bkz. Adım 2).

### Adım 1 — En sık geçen 38 metin (TAMAMLANDI, bu oturumda)
Kod tabanında 2 veya daha fazla yerde geçen 38 eksik metin (toplam 94 kullanım noktası) `uiDictionaryExtensions.ts`'e eklendi: `Campaign {n}`, `Organization Settings`, `My Personal Mailbox`, `Last Name`, `Success`, `Subject Line`, `Email Address`, `Scheduled Date`, `Recipients`, `Account` ve benzerleri. Bu, tek bir sözlük değişikliğiyle en çok ekranı etkileyen batch'ti.

Aynı oturumda, kendi eklediğim bir hata da düzeltildi: `SalesCoachAI.tsx` içindeki 60 saniyelik zaman aşımı hata mesajı sabit Türkçe yazılmıştı (bileşenin geri kalanı `t()` kullanırken) — İngilizce mode'da bile Türkçe görünüyordu. Artık kanonik İngilizce metin fırlatılıyor ve çağrı noktalarında `t()` üzerinden gösteriliyor.

**Durum:** Tamamlandı ve deploy edildi.

### Adım 2 — Kalan ~497 metin (SIRADA, henüz yapılmadı)
Geri kalan metinlerin büyük çoğunluğu tek bir yerde geçiyor (frekans=1) ve çoğu Mail Merge / Campaign / LinkedIn Scheduler modüllerinde yoğunlaşıyor (simülatör mesajları, SMTP/Graph hata metinleri, gün isimleri Mon/Tue/Wed, placeholder örnek veriler). Bunları toptan, bağlamı görmeden çevirmek riskli (bazı string'ler zaten veri/örnek değeri, çeviri gerektirmiyor). Önerilen yaklaşım:

1. Modül modül ilerle (örn. önce Mail Merge Builder, sonra LinkedIn Scheduler, sonra Campaign Manager) — her modülü açıp gerçek ekran bağlamında çevir.
2. Her batch sonrası aynı build/verify/deploy döngüsünü çalıştır.
3. Yeni bir bileşen/özellik eklenirken bu dosyadaki kurala uy: **her yeni kullanıcıya görünen metin `t("...")` ile sarılmalı VE aynı commit içinde `uiDictionaryExtensions.ts`'e TR karşılığı eklenmeli.** Bu, bu oturumdaki `SalesCoachAI.tsx` hatasının tekrarını önler.

**Durum:** Planlandı, uygulanmadı. Tahmini iş büyüklüğü: 8-10 modül bazlı batch.

### Adım 3 — Kanban aşama menüsü (kullanıcının verdiği örnek)
Kullanıcının doğrudan örnek verdiği "Collapse Stage / Add-Edit Description / Add Adjacent Stage / Rename Stage / Delete Stage" menü öğeleri kontrol edildi: **bu beşi zaten `uiDictionaryTR`'de mevcut ve doğru çalışıyor** (`DealManagementView.tsx` satır 2447-2500). Muhtemelen bu geri bildirim daha önceki bir gözlemden kaynaklanıyor veya başka bir menüyü işaret ediyor olabilir — yine de genel dil sorununun kapsamı (535 metin) doğrulanmış durumda, sorun gerçek ve genel.

**Durum:** Doğrulandı, bu spesifik örnek zaten düzgün.

---

## Faz 2 — Sessiz kayıt hatalarını yüzeye çıkar (en kritik UX bulgusu)

`CrmDb.ts`'teki `persistSoon()` fire-and-forget deseni: ekran anında güncelleniyor ama arka plandaki Supabase yazması başarısız olursa kullanıcı hiç haberdar olmuyor, hata sadece `console.error`'a düşüyor. 18 farklı yerde (şirket/kişi/fırsat/teklif/görev/ayar kaydı) kullanılıyor. Ayrıca `useCrm()` hook'unun `error` state'i hiçbir ekranda tüketilmiyor — veri yükleme tamamen başarısız olsa bile kullanıcı boş bir hesapla karşılaşıyor, uyarı almadan.

**Önerilen düzeltme:** `persistSoon()` bir toast/uyarı callback'i alacak şekilde genişletilsin; her `catch` bloğu kullanıcıya görünür bir "Kaydedilemedi, tekrar deneyin" bildirimi göstersin. `useCrm().error` en azından App.tsx seviyesinde bir banner ile gösterilsin.

**Durum:** Planlandı, uygulanmadı.

---

## Faz 3 — Global CSS substring çakışmalarını temizle

`index.css`'te `[class*="..."]` gibi en az 12 kural grubu var; ikisi doğrudan çelişiyor (satır ~518-531 mavi buton kuralı vs. ~1004-1015 lacivert buton kuralı — hangisi kazanıyor sadece dosya sırasına bağlı, biri sessizce diğerini eziyor). Bu oturumda aynı sınıf sorunun 2 somut örneği (PIN kartı padding, buton rengi) zaten düzeltildi; bu, kalan örnekleri kapsıyor.

**Önerilen düzeltme:** Çelişen iki kural bloğundan birini kaldır; substring seçicileri kademeli olarak adlandırılmış component class'larına taşı.

**Durum:** Planlandı, uygulanmadı.

---

## Faz 4 — Paylaşımlı Onay Modalı + Toast bileşeni

169 yerde native `alert()`/`confirm()`/`prompt()` kullanılıyor. Fırsatlar ekranının kendi tasarlanmış onay modalı var ama aynı dosyada hâlâ 16 yerde `alert()` var; Şirketler ekranında hiç tasarlanmış modal yok. Ayrıca 9 farklı, birbirinden bağımsız toast implementasyonu var (bazen "başarılı" yeşil ✓, bazen kırmızı ⚠ ile çıkıyor).

**Önerilen düzeltme:** Fırsatlar ekranındaki mevcut onay modalını ortak bir bileşene çıkar (`components/shared/ConfirmModal.tsx` gibi), tüm ekranlarda kullan. Aynı şekilde tek bir toast sistemi kur.

**Durum:** Planlandı, uygulanmadı.

---

## Faz 5 — Erişilebilirlik (Accessibility)

762 butondan sadece 4'ünde `aria-label` var; kod tabanında sadece 1 `role="..."` var; ikon-only butonlar `title` kullanıyor ama `aria-label` kullanmıyor; klavye ile Tab gezinirken görünür focus ring yok (örn. AI Sales Assistant "Analiz Et" butonu).

**Önerilen düzeltme:** İkon-only butonlara `aria-label`, modallara `role="dialog"`, global bir `:focus-visible` stili.

**Durum:** Planlandı, uygulanmadı.

---

## Faz 6 — Boş durumları (empty state) standardize et

Bazı ekranlarda iyi tasarlanmış boş durumlar var (Lead listesi, Teklif oluştur), ama Şirketler ana listesi filtre sonucu 0 kayıt olduğunda sadece boş tablo başlıkları gösteriyor — hiç mesaj/buton yok. Yönetim P/L ekranındaki boş durumlar da düz gri yazı.

**Önerilen düzeltme:** Ortak bir `EmptyState` bileşeni (ikon + başlık + açıklama + aksiyon butonu), önce Şirketler listesine uygula.

**Durum:** Planlandı, uygulanmadı.

---

## Faz 7 — Form doğrulamasını satır içi hale getir

Şirket/Fırsat/Teklif formlarında zorunlu alan eksikse hangi alanın eksik olduğunu belirtmeyen genel bir `alert()` çıkıyor.

**Önerilen düzeltme:** Alan bazlı kırmızı çerçeve + satır içi hata mesajı.

**Durum:** Planlandı, uygulanmadı.

---

## Faz 8 — Kanban ve P/L tabloları için mobil görünüm

Kanban kolonları sabit 352px, mobilde uyarlanmıyor. P/L tabloları 860-1020px minimum genişlikte, telefonda 2-2.7 kat yatay kaydırma gerektiriyor.

**Önerilen düzeltme:** Düşük öncelik (bu ekranlar çoğunlukla masaüstünde kullanılıyor) — mobilde otomatik "Liste görünümü" / kart görünümüne geçiş.

**Durum:** Planlandı, uygulanmadı. Düşük öncelik.

---

## Ekip için kural (ileriye dönük)

Bundan sonra eklenen her yeni özellik/menü/buton için:

1. Görünen her metin `t("İngilizce kaynak metin")` ile sarılmalı.
2. Aynı commit içinde `src/lib/uiDictionaryExtensions.ts`'e TR karşılığı eklenmeli.
3. Kayıt/silme işlemi varsa, hata durumunu kullanıcıya görünür şekilde göster (fire-and-forget + sadece `console.error` YETERSİZ — bkz. Faz 2).
4. Yeni bir global CSS kuralı yazmadan önce `index.css`'teki mevcut `[class*="..."]` desenlerine bakılmalı, aynı hataya düşülmemeli (bkz. Faz 3).
