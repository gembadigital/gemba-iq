# Gemba IQ — UI/UX & Dil Tutarlılığı İyileştirme Planı

Bu dosya, projenin kaynak kodu üzerinden yapılan UI/UX değerlendirmesini ve dil (TR/EN) tutarlılığı taramasını fazlara bölünmüş, uygulanabilir bir plana çeviriyor. Ekip bu dosyayı çalışma listesi olarak kullanabilir — her fazın altında **Durum** satırı var ve ilerledikçe güncellenmeli.

Son güncelleme: 2026-07-24

---

## Yürütme yöntemi (2026-07-24'te güncellendi)

İlk yaklaşım bulgu-tipi bazlıydı (önce tüm uygulamada dil hatalarını topla, sonra tüm CSS çakışmalarını topla, vb.). Kullanıcı talebiyle yönteme geçildi: **modül modül / sayfa sayfa ilerle** — her modülü açıp o modüldeki hem dil (eksik `t()` çevirisi) hem UI/UX (alert/confirm, aria-label, boş durum, CSS çakışması) sorunlarını aynı anda düzelt, sonra bir sonraki modüle geç. Faz 1-8 altındaki bulgu kategorileri hâlâ referans olarak geçerli — her modül geçişinde hangi kategoriye denk geldiği not ediliyor.

**Modül sırası ve durumu:**

| # | Modül | Durum |
|---|-------|-------|
| 1 | CompaniesView.tsx (Şirketler) | Tamamlandı (2026-07-24) |
| 2 | TargetAccountsView.tsx (Hedef Hesaplar) | Tamamlandı (2026-07-24) |
| 3 | DealManagementView.tsx (Fırsat Yönetimi / Kanban) | Tamamlandı (2026-07-24) |
| 4 | ProposalManagementView.tsx + ProposalFormModal.tsx | Tamamlandı (2026-07-24) |
| 5 | LeadProfilesView.tsx + EmailLeadDiscoveryView.tsx | Planlandı |
| 6 | ServicesView.tsx (Hizmet Kataloğu) | Planlandı |
| 7 | RevenueManagementView.tsx + ManagementPLView.tsx | Planlandı |
| 8 | TasksView.tsx (Görevler) | Planlandı |
| 9 | CampaignManagerView.tsx + CampaignDesigner.tsx | Planlandı |
| 10 | AISalesAssistant.tsx + SalesCoachAI.tsx + CompanyDiscoveryView.tsx + GembaLensView.tsx | Planlandı |
| 11 | AdministrationCenter.tsx + UserAccountSettings.tsx | Planlandı |
| 12 | DashboardView.tsx + SalesDashboardView.tsx + CompanyDetailView.tsx | Planlandı |

Her modül geçişi kendi commit/deploy döngüsüyle kapanır; bu tablo ilerledikçe güncellenir.

**Modül 1 (CompaniesView.tsx) — yapılanlar:**
- Dil: "Açıklama" ve "Custom field inputs" sabit yazılmıştı, `t()`'ye sarıldı + sözlüğe eklendi.
- UI/UX — Boş durum (Faz 6): Şirketler tablosu 0 sonuçta artık boş satırlar yerine ikon + mesaj + (hesap tamamen boşsa) "Add Enterprise Company" butonu gösteriyor.
- UI/UX — Onay diyalogları (Faz 4): Şirket silme, toplu silme, özel alan tanımı silme artık native `confirm()` yerine yeni paylaşımlı `ConfirmModal` + `useConfirm()` hook'unu kullanıyor (`src/components/shared/ConfirmModal.tsx`, `src/lib/useConfirm.tsx`) — bundan sonraki her modülde aynı bileşen tekrar kullanılacak.
- UI/UX — Erişilebilirlik (Faz 5): ikon-only butonlara (düzenle/sil/kapat/geniş görünüm) `aria-label` eklendi, iki modal'a `role="dialog" aria-modal="true"` eklendi.
- UI/UX — CSS: özel alan modalındaki `z-55` geçersiz bir Tailwind class'ıydı (Tailwind'in varsayılan ölçeğinde yok, hiç uygulanmıyordu) → `z-[55]` yapıldı.
- Not: Bu dosyadaki 9 `alert()`'ten sadece 3'ü (silme onayları) ConfirmModal'a taşındı; kalan 6'sı bilgilendirme amaçlı (içe/dışa aktarma sonucu) — bunlar ayrı bir "toast sistemi" gerektiriyor (Faz 4'ün ikinci yarısı), henüz yapılmadı.

**Modül 2 (TargetAccountsView.tsx) — yapılanlar:**
- UI/UX — Onay eksikliği (Faz 4, daha kritik bir varyant): bu dosyada silme işlemleri (tekli ve toplu) hiçbir onay istemeden anında siliyordu — CompaniesView'daki gibi "çirkin ama en azından var olan" bir `confirm()` bile yoktu. Artık ikisi de Modül 1'de kurulan `ConfirmModal`/`useConfirm()` üzerinden onay istiyor.
- Dil: Yeni kayıt/içe aktarma varsayılanlarında ve tablo/detay panelinde gösterilen "Kalite / Operasyon", "Direktörü", "Genel Endüstri", "Belirtilmemiş" gibi sabit Türkçe yer tutucu metinler artık `t()` ile sarmalanmış kanonik İngilizce anahtarlar üzerinden gösteriliyor (İngilizce modda da doğru görünür; eskiden kaydedilmiş kayıtlardaki ham Türkçe veri de sözlüğün çift yönlü arama mekanizması sayesinde doğru çevriliyor).
- UI/UX — Erişilebilirlik: İçe aktarma hata banner'ındaki kapatma ikonu aslında bir `<button>` bile değildi (klavyeyle asla kapatılamıyordu) → gerçek `<button>` yapıldı. Satır aksiyon ikonları (mail/düzenle/sil), düzenleme modu onay/iptal ikonları, form ve çekmece kapatma ikonlarına `aria-label` eklendi; detay çekmecesine `role="dialog" aria-modal="true"` eklendi.
- Not: Bu dosyanın kendi `t()` çağrıları zaten sözlükte tamdı (yalnızca örnek/placeholder veri metinleri "eksik" görünüyordu, gerçek arayüz metni değil) — bu modülün asıl sorunu dil değil, UI/UX'ti.

**Modül 3 (DealManagementView.tsx) — yapılanlar:**
- Bu dosya 4600+ satır ile şimdiye kadarki en büyük modül; kendi içinde daha önce kurulmuş, dosyaya özel bir `confirmDeleteModal` onay sistemi zaten vardı (bulgu: onay eksikliği değil, bu onay sisteminin metinleri hardcoded Türkçe'ydi). Karar: bu iyi çalışan yapıyı paylaşımlı `ConfirmModal`'a taşımadık (4600 satırlık dosyada riskli bir refactor olurdu), sadece metinlerini `t()` ile sarmaladık.
- Dil — Onay diyalogları: toplu silme, tekli fırsat silme (liste görünümü + Kanban kart görünümü) başlık/mesajları artık `t()` üzerinden geliyor (`"Deal Record Will Be Deleted"`, `"Deal Card Will Be Deleted"`, `"Selected Deals Will Be Deleted"` vb. yeni sözlük anahtarları eklendi).
- Dil — 6 `alert()` çağrısı hardcoded Türkçe'ydi, `t()`'ye taşındı: CSV dışa aktarma boş liste uyarısı, CSV içe aktarma başarı mesajı, aşama adı çakışması, hatırlatma maili hazırlama başarı mesajı, alıcı/konu-gövde boş uyarıları.
- Dil — JSX içinde 5 sabit Türkçe metin bulundu ve `t()`'ye sarmalandı: "İçe Aktar"/"Dışa Aktar" liste toolbar butonları, çekmece başlığı "Fırsat Kartvizit Detayları", hatırlatma maili panelindeki "Bilgi ve Akıllı Entegrasyon" bilgi kutusu metni ve gönder butonu etiketi.
- Aşama silme/yeniden adlandırma akışı (`handleDeleteStage`/`handleRenameStage`, migrasyon popup'ı dahil) incelendi — bu akış zaten tam `t()` kapsamındaydı, ek düzeltme gerekmedi.
- UI/UX — CSS: fırsat detay çekmecesinin overlay'inde geçersiz `z-45` Tailwind class'ı (Modül 1'deki `z-55` ile aynı kök neden — proje bu ölçeği tanımlamıyor, hiç uygulanmıyordu) → `z-[45]` yapıldı.
- UI/UX — Erişilebilirlik: liste ve Kanban kart görünümündeki ikon-only silme (Trash2) butonlarına `aria-label` eklendi; dosyadaki 8 modal/popup overlay'inin tamamına (`role="dialog" aria-modal="true"`) eklendi — bu dosyada daha önce hiçbirinde yoktu.
- UI/UX — Boş durumlar: liste görünümü ("No deals found matching current filters") ve Kanban sütunları ("Move deals here") için boş durum mesajları zaten mevcuttu, ek iş gerekmedi.

**Modül 4 (ProposalManagementView.tsx + ProposalFormModal.tsx) — yapılanlar:**
- Bu iki dosya genel olarak zaten büyük ölçüde `t()` kapsamındaydı (önceki modüllerin aksine, çoğu metin baştan beri sarmalıydı) — asıl bulgu az sayıda ama göze çarpan istisnalardı.
- Dil — Silme onay modalı en kötü örnekti: başlık ve butonlar TR/EN karışık hardcoded metin içeriyordu ("Teklifi Sil / Delete Proposal", "Geri dönüşüm kutusuna taşınsın mı?", "Kod:"/"Sürüm:", "İptal", "Sil") → tamamı `t()`'ye taşındı, mevcut sözlük anahtarları (`Delete Proposal`, `Cancel`, `Move to recycle bin?`) yeniden kullanıldı, yalnızca `"Code"` yeni eklendi.
- Dil — Liste satırındaki PDF indirme ikonunun `title`'ı hardcoded Türkçe'ydi ("Teklifi PDF olarak indir") → `t()`'ye taşındı.
- Dil — Belge önizleme modalındaki "Close" ve şablon yöneticisindeki "CLOSE" butonları literal İngilizce yazılmıştı (TR modda çevrilmiyordu) → `t()`'ye sarmalandı.
- Dil — `ProposalFormModal.tsx`'te AI tablo dönüştürme akışının 2 hata mesajı (`throw new Error(...)`) hardcoded Türkçe'ydi, kullanıcıya `catch` bloğunda `t()`'siz gösteriliyordu → `t()`'ye taşındı. "Quick Add Company" linki de hardcoded İngilizce'ydi → mevcut sözlük anahtarına bağlandı.
- UI/UX — Erişilebilirlik: bu iki dosyada `role="dialog"` hiç kullanılmamıştı — `ProposalManagementView.tsx`'teki 6 modal (revizyon, belge önizleme, mail gönderim, silme onayı, teklif detay paneli, şablon yöneticisi) ve `ProposalFormModal.tsx`'teki tek modal olmak üzere toplam 7 modal'a eklendi. Ayrıca 4 ikon-only butona (detay panel kapatma X, form modal kapatma X, şablon düzenle/sil ikonları) `aria-label` eklendi.
- Not: Teklif onay durumunu "Draft"a geri alma (`confirm()`) ve red gerekçesi girme (`prompt()`) hâlâ native tarayıcı diyalogları kullanıyor — bu modülün kapsamındaki tek "eksik" ama düşük öncelikli madde; silme akışının aksine burada zaten en az bir onay adımı var, sadece markalı modal değil.

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
