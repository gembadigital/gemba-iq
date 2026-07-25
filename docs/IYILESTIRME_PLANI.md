# Gemba IQ — UI/UX & Dil Tutarlılığı İyileştirme Planı

Bu dosya, projenin kaynak kodu üzerinden yapılan UI/UX değerlendirmesini ve dil (TR/EN) tutarlılığı taramasını fazlara bölünmüş, uygulanabilir bir plana çeviriyor. Ekip bu dosyayı çalışma listesi olarak kullanabilir — her fazın altında **Durum** satırı var ve ilerledikçe güncellenmeli.

Son güncelleme: 2026-07-25 (Kaybetme nedeni + tekrar temas hatırlatması tamamlandı)

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
| 5 | LeadProfilesView.tsx + EmailLeadDiscoveryView.tsx | Tamamlandı (2026-07-24) |
| 6 | ServicesView.tsx (Hizmet Kataloğu) | Tamamlandı (2026-07-24, kısmi — aşağıya bak) |
| 7 | RevenueManagementView.tsx + ManagementPLView.tsx | Tamamlandı (2026-07-24, kısmi — aşağıya bak) |
| 8 | TasksView.tsx (Görevler) | Tamamlandı (2026-07-24, kısmi — aşağıya bak) |
| 9 | CampaignManagerView.tsx + CampaignDesigner.tsx | Tamamlandı (2026-07-24) |
| — | Gemba Lens özelliği kaldırıldı (kullanıcı talebi) | Tamamlandı (2026-07-25) |
| 10 | AISalesAssistant.tsx + SalesCoachAI.tsx + CompanyDiscoveryView.tsx | Tamamlandı (2026-07-25) |
| 11 | AdministrationCenter.tsx + UserAccountSettings.tsx | Tamamlandı (2026-07-25) |
| 12 | DashboardView.tsx + SalesDashboardView.tsx + CompanyDetailView.tsx | Tamamlandı (2026-07-25) |

Her modül geçişi kendi commit/deploy döngüsüyle kapanır; bu tablo ilerledikçe güncellenir.

**Gemba Lens kaldırma (2026-07-25) — kullanıcı talebi üzerine:**
- Kullanıcı Gemba Lens özelliğinin tamamen kaldırılmasını istedi. Kaldırılan dosyalar: `src/components/GembaLensView.tsx`, `src/lib/gembaLensDb.ts`.
- `src/App.tsx`: import, sidebar menü girişi ("Companies & Targets" altında), `activeTab` listesi, breadcrumb map'i ve render bloğu kaldırıldı.
- `api/gemini/[...action].js` + `lib/server/geminiCore.js`: `gemba-lens-chat` action'ı ve `runGembaLensChat` fonksiyonu (Saha AI Danışmanı chat handler'ı) kaldırıldı.
- `vercel.json`: `/api/gemini/gemba-lens-chat` rewrite kuralı kaldırıldı.
- Gemba Lens'in kullandığı veriler `CrmDb.getKv()` üzerinden genel key-value deposundaydı (ayrı bir Supabase tablosu değildi), bu yüzden veritabanı tarafında ek bir temizlik gerekmiyor — sadece kod tarafı kaldırıldı.
- Modül 10'un kapsamı bu kaldırma nedeniyle güncellendi: artık yalnızca AISalesAssistant.tsx + SalesCoachAI.tsx + CompanyDiscoveryView.tsx içeriyor.

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

**Modül 5 (LeadProfilesView.tsx + EmailLeadDiscoveryView.tsx) — yapılanlar:**
- UI/UX — Onay eksikliği (Faz 4, TargetAccountsView ile aynı ciddiyette bulgu): `LeadProfilesView.tsx`'te tekli ve toplu aday silme hiçbir onay istemeden anında siliyordu. Paylaşımlı `ConfirmModal`/`useConfirm()` eklendi.
- UI/UX — Erişilebilirlik: içe aktarma hata banner'ındaki kapatma ikonu gerçek bir `<button>` değildi → düzeltildi; silme/kapatma ikon-only butonlarına `aria-label` eklendi.
- Dil — `EmailLeadDiscoveryView.tsx`: canlı tarama akışının log/durum mesajlarının bir kısmı `t()` ile sarmalıyken bir kısmı (özellikle başarı/hata sonuç mesajları) hardcoded Türkçe'ydi — aynı ekranda İngilizce modda yarı Türkçe yarı İngilizce görünüyordu. Tüm tarama log satırları, durum mesajları ve "filtrelenen adres" nedeni etiketleri (`Bilinmeyen Adres`, `İç yazışma`, `Otomatik/Sistem e-postası` vb. — bunlar arayüzde gerçekten gösteriliyor, sadece kod yorumu değil) `t()`'ye taşındı.
- Dil — Hata detay kutusundaki "Hata Nedenleri & Nasıl Giderilir?" yardım metni (3 maddelik Mail.Read izin rehberi) ve canlı tarama istatistik etiketleri ("Çözümlenen Kurumsal Aday:", "Genel/Filtrelenen Sinyaller:") tamamen hardcoded Türkçe idi, hiç `t()` içermiyordu → sarmalandı.
- Not: `LeadProfilesView.tsx`'in kendi tablo/form arayüzü zaten baştan tamdı (dinamik `t(p.leadStatus)` / `t(p.leadSegment)` çevirileri dahil) — bu modülün asıl sorunu `EmailLeadDiscoveryView.tsx` tarafındaki tarama-sonucu mesajlarıydı.

**Modül 6 (ServicesView.tsx) — yapılanlar ve ÖNEMLİ KAPSAM NOTU:**
- Dil: PDF indirme/e-posta gönderme akışındaki 5 `alert()` çağrısı hardcoded Türkçe idi (`t()` içermiyordu) → tamamı `t()`'ye taşındı.
- Dil: Hizmet Kartları panelindeki "Yeni Ekle" butonu ve "Seçili Hizmeti Sil" ikon başlığı hardcoded Türkçe idi → `t()`'ye sarmalandı, ikon-only silme butonuna `aria-label` eklendi.
- UI/UX: Dosyadaki tek gerçek modal (silme onay diyaloğu) zaten mevcut `confirmDeleteModal` sistemiyle tam `t()` kapsamındaydı, sadece eksik olan `role="dialog" aria-modal="true"` eklendi.
- **KAPSAM NOTU (önemli):** Bu dosyanın ~1700 satırlık "Teklif Sihirbazı" (Proposal Wizard, Aşama 1-5: Müşteri Bilgileri → Hizmet Seçimi → Ticari Opsiyonlar → Genel Şartlar → Antetli & Gönderim) bölümü, yukarıdaki modüllerde bulunan "birkaç satır hardcoded, geri kalanı `t()`" tipi noktasal tutarsızlıklardan farklı olarak, **baştan sona tasarım gereği Türkçe** yazılmış — placeholder token'ları bile Türkçe (`{{FirmaAdı}}`, `{{TeklifNo}}`, `{{İlgiliKişi}}` vb.). Yaklaşık 150+ ayrı metin (etiket, buton, placeholder, yardım metni) `t()` içermiyor. Bunu diğer modüllerdeki gibi noktasal düzeltmelerle kapatmak mümkün değil — bu, kendi başına ayrı bir "Teklif Sihirbazını İngilizce moda taşı" projesi gerektirir (~150+ yeni sözlük anahtarı, dikkatli test). Şu anki modül-modül dil taraması kapsamında bunu YAPMADIM; sadece gerçek tutarsızlık bulgularını (alert'ler, 2 buton, modal rolü) düzelttim. Kullanıcı bu sihirbazın İngilizce modda da tam çalışmasını istiyorsa, bu ayrı bir görev olarak planlanmalı.

**Modül 7 (RevenueManagementView.tsx + ManagementPLView.tsx) — yapılanlar ve KAPSAM NOTU:**
- **RevenueManagementView.tsx** (255 `t()` çağrısı, zaten büyük ölçüde tam çevrili — Türkçe karakter taramasında yalnızca kod yorumları ve örnek isim placeholder'ları çıktı, gerçek dil tutarsızlığı bulunmadı):
  - UI/UX — Onay eksikliği/tutarsızlığı: danışman atama (`handleDeleteAssignment`) kaydı hiçbir onay istemeden anında siliniyordu — TargetAccountsView'da (Modül 2) bulunanla aynı kök neden. Fatura silme (`handleDeleteInvoice`) ve toplu fatura silme (`handleDeleteSelectedInvoices`) ise native tarayıcı `confirm()` kullanıyordu — dosyanın geri kalanı tamamen markalı arayüz bileşenleriyle tasarlanmışken bu native diyalog göze batan bir tutarsızlıktı. Üçü de paylaşımlı `ConfirmModal`/`useConfirm()` hook'una taşındı; yeni sözlük anahtarı yalnızca atama onay mesajı için eklendi (`"Are you sure you want to delete this assignment?"`), diğer metinler zaten mevcuttu.
  - UI/UX — Erişilebilirlik: Fatura Düzenle modalına `role="dialog" aria-modal="true"` eklendi (dosyadaki tek gerçek modal, daha önce yoktu). Danışman/atama/fatura satırlarındaki ikon-only düzenle/sil butonlarına ve modalın kapatma ikonuna `aria-label` eklendi — hiçbirinde daha önce yoktu (yalnızca bazılarında `title` vardı).
- **ManagementPLView.tsx** (2700+ satır, **`t()` çağrısı SIFIR** — ServicesView'daki Teklif Sihirbazı ile aynı kalıp: baştan sona tasarım gereği Türkçe yazılmış bağımsız bir yönetim paneli, noktasal tutarsızlık değil): Bu dosyayı tam `t()` kapsamına almak (tahmini 200+ yeni sözlük anahtarı) ayrı, büyük bir proje gerektirdiğinden şu an kapsam dışı bırakıldı — yalnızca gerçek UI/UX güvenlik açıkları düzeltildi, dosyanın kendi Türkçe diliyle tutarlı kalacak şekilde (yeni metinler `t()` yerine düz Türkçe eklendi, çünkü dosyada zaten `useLanguage`/`t()` altyapısı hiç kullanılmıyor):
  - Fatura satırı silme (`removeInvoice`) ve Sabit Giderler satırı silme — ikisi de hiçbir onay istemeden anında siliniyordu → `window.confirm()` ile onay eklendi (Türkçe metin, dosyanın geneliyle tutarlı).
  - İkon-only sil (Trash2, x2) ve indir (Download) butonlarına `aria-label` eklendi — hiçbirinde yoktu.
  - Modal/CSS taraması: dosyada hiç modal yok (0 `fixed inset-0`), geçersiz z-index class'ı yok.
  - **Kullanıcı bu panelin İngilizce modda da çalışmasını istiyorsa, ServicesView'ın Teklif Sihirbazı ile birlikte ayrı bir "büyük Türkçe-özel panelleri İngilizceye taşı" görevi olarak planlanmalı.**

**Modül 8 (TasksView.tsx) — yapılanlar ve KAPSAM NOTU:**
- **En kritik bulgu:** Bu dosyada (3300+ satır) daha önceki modüllerin hiçbirinde görülmemiş bir dil sorunu vardı — dosyada tam olarak **SIFIR** `t()` çağrısı bulunuyordu. Sayfa başlığı/alt başlığı `lang === "TR" ? "..." : "..."` şeklinde 2 adet manuel ternary ile çevriliyordu (çalışıyordu), ama geri kalan HER ŞEY — sekme başlıkları, butonlar, tablo başlıkları, boş durum mesajları, dropdown seçenekleri, bildirim etiketleri, modal form alanları — dil ayarından bağımsız olarak sabit Türkçe basılıyordu. Bu, "birkaç satır unutulmuş" değil, sayfanın neredeyse tamamının İngilizce modda hiç çalışmadığı anlamına geliyordu.
- Kapsam: Görev Tahtası (Kanban + Liste görünümü) sekmesinin tamamı, Bildirim Merkezi sekmesinin tamamı, Görev Ekle/Düzenle modalları, ve E-posta Önizleme modalı — hepsi `t()` ile sarmalandı (~90 yeni sözlük anahtarı eklendi). Öncelik rozetleri (`task.priority` → `Low/Medium/High`) artık `t()` üzerinden gösteriliyor, önceden dil değişse bile hep İngilizce enum değeri basılıyordu.
- UI/UX — Onay eksikliği: Danışman Atamaları modülündeki (Modül 7) ile aynı kalıp — Kanban kartındaki hızlı-sil ikonu zaten dosya-yerel `confirmDeleteModal` sistemi üzerinden onay alıyordu (iyi), ama bu sistemin başlık/mesaj metinleri hardcoded Türkçe idi → `t()`'ye taşındı, `role="dialog" aria-modal="true"` eklendi (önceden yoktu).
- UI/UX — Erişilebilirlik: Liste görünümündeki ikon-only düzenle/sil butonlarına, Kanban kartının hızlı-sil ikonuna, sütun kebab-menü tetikleyicisine ve sütun daraltma/genişletme ikonlarına `aria-label` eklendi (hiçbirinde yoktu). Görev Ekle/Düzenle ve E-posta Önizleme modallarına `role="dialog" aria-modal="true"` eklendi (3 modal, hiçbirinde yoktu).
- **KAPSAM NOTU:** Sayfanın "Engine Kuralları (Admin)" sekmesi (SLA eskalasyon/bildirim motoru yapılandırması, ~650 satır — genel kurallar, eskalasyon yetkilileri, e-posta HTML şablonları alt-sekmeleri) şu anki modül kapsamına **dahil edilmedi**. Bu, ServicesView'ın Teklif Sihirbazı veya ManagementPLView'dan farklı olarak "tasarım gereği Türkçe" değil — sadece hacim olarak çok büyük, yalnızca Admin rolündeki kullanıcıların seyrek eriştiği bir yapılandırma paneli olduğu için bu modülün zaman/kapsam bütçesi dışında bırakıldı. Görev panosu ve bildirim merkezi gibi günlük kullanılan, yüksek trafikli kısımlar tam kapsandı. Admin ayarları sekmesi ayrı bir alt-görev olarak planlanmalı.

**Modül 9 (CampaignManagerView.tsx + CampaignDesigner.tsx) — yapılanlar:**
- Bu iki dosya önceki modüllerin çoğundan farklı olarak baştan iyi durumdaydı: CampaignManagerView.tsx'te 175, CampaignDesigner.tsx'te 165 adet `t()` çağrısı zaten mevcuttu — sistematik dil eksikliği yoktu. Türkçe karakter taramasında bulunan tek eşleşmeler gerçek UI metni değildi (LinkedIn gönderisi için örnek/demo Türkçe içerik verisi ve bir anahtar kelime eşleştirme kontrolü `"TEKLİF"` — ikisi de kasıtlı, dil hatası değil).
- **Gerçek bug — onay eksikliği tutarsızlığı:** `CampaignManagerView.tsx`'te markalı bir `confirmDeleteModal` sistemi kurulmuştu ve kampanya silme (`handleDeleteCampaign`) doğru şekilde bu onay modalını kullanıyordu, ama LinkedIn gönderisi silme (`handleDeletePost`) aynı dosyada, doğrudan `onClick={() => handleDeletePost(p.id)}` ile **hiç onay almadan** siliyordu. İki silme işlemi arasında tutarsızlık vardı; `handleDeletePost` de `confirmDeleteModal`'a bağlandı.
- UI/UX — Erişilebilirlik: Kampanya ve gönderi silme butonlarına `aria-label` eklendi; `confirmDeleteModal`'ın dış `div`'ine `role="dialog" aria-modal="true"` eklendi (önceden yoktu, dosyanın tek modalı).
- CampaignDesigner.tsx'te modal/CSS taraması: gerçek bir overlay modal yok (tek `fixed inset-0` eşleşmesi, alıcı listesi panelinin "büyüt" moduna geçişi — TasksView'daki ekran genişletme paternine benzer, dialog değil), geçersiz z-index class'ı yok, `alert()`/`confirm()` yok. Alıcı satırı silme (mail-merge tablosundaki taslak satır) onay istemiyor — bu, henüz kaydedilmemiş/gönderilmemiş bir taslak listesinden satır çıkarma olduğu için (Modül 4'te aynı gerekçeyle satır düzeyi silmelerin onaysız bırakıldığı kalıpla tutarlı) kasıtlı olarak değiştirilmedi.
- Not: CampaignManagerView.tsx'teki 8 `alert()` çağrısı (başarı/hata bilgilendirmesi) — Modül 1'de not edilen "toast sistemi" eksikliğiyle aynı kategori, bu modülün kapsamı dışında bırakıldı.

**Modül 10 (AISalesAssistant.tsx + SalesCoachAI.tsx + CompanyDiscoveryView.tsx) — yapılanlar:**
- Kullanıcı bu turda kapsamı genişletti: dil hatalarına ek olarak "fiziksel olarak var ama çalışmayan butonlar", "çalışmayan segmentler" ve "mükerrer fonksiyonlar" aranması istendi. Üçü de bulundu, en büyüğü CompanyDiscoveryView.tsx'te.
- **AISalesAssistant.tsx** (~1600 satır, Tavily+Gemini şirket araştırma paneli): dosyada `useLanguage` import edilmişti ama yalnızca 6 `t()` çağrısı vardı — geçmiş listesi, sonuç kartları (Şirket Özeti, Finansal Veri, E-posta Keşfi, Karar Vericiler, Fırsat Analizi), gömülü + genişletilmiş B2B E-posta Sihirbazı, tüm toast/hata mesajları hardcoded Türkçe idi, ~100 metin `t()` ile sarmalandı (~95 yeni sözlük anahtarı eklendi). `handleDeleteAnalysis` hiç onay almadan siliyordu → paylaşımlı `ConfirmModal`/`useConfirm()`'e bağlandı. İki genişletilmiş modala (Finansal Veri, E-posta Sihirbazı) `role="dialog" aria-modal="true"` eklendi. Modül-seviyesi yardımcı fonksiyonlar (`getBusinessErrorMessage`, `toUserFacingError`, `parseJsonApiResponse`) `t()` hook'una erişemediği için orijinal Türkçe sabit metinlerinde bırakıldı, gösterim noktalarında (`{t(error)}`, `{t(toastMessage)}`) sarmalandı ve sözlüğe ters-yönlü (İngilizce anahtar → aynı Türkçe değer) eşleşmeler eklendi. Dosyada dead/non-functional buton bulunmadı — tüm `onClick`'ler gerçek mantığa bağlıydı.
- **SalesCoachAI.tsx**: dosya zaten iyi durumdaydı (89 `t()` çağrısı, `useLanguage` kullanılıyordu). Tek gerçek bug: `handleDeleteSkill` hiç onay almadan siliyordu → `ConfirmModal`/`useConfirm()`'e bağlandı, sil butonuna `aria-label` eklendi. "Yetkinlik Ekle" modalına `role="dialog" aria-modal="true"` eklendi (önceden yoktu).
- **CompanyDiscoveryView.tsx — asıl bulgu (kullanıcının tarif ettiği "fiziksel butonlar" sorununun tam örneği):** Dosyanın (~1790 satır) yaklaşık üçte biri tamamen ölü koddu. Eski filtre bazlı arama formu (searchName/searchIndustry/searchCity/searchRegion/searchKeywords + `handleChipClick`), sonuç seçim sistemi (`selectedResultIds`, `handleToggleSelectResult`, `handleSelectAllOnPage`), toplu hesap ekleme (`handleBulkAddToTargetAccounts`), Pipeline Kanban sekmesi (`PIPELINE_STAGES`, `accountsByStage`, `pipelineMetrics`, `handleUpdateTargetStage`, `handleDeleteTargetAccount`), Excel/CSV/PDF dışa aktarma (`handleExportResultXl/Csv/Pdf`, `XLSX`/`jsPDF`/`recharts` importları), Satış Sorumlusu Atama diyaloğu (`showAssignDialog`) ve eski Kampanya Oluştur diyaloğu (`showCampaignDialog`) — bunların hiçbiri artık render edilen `currentTab` sekmelerinden (`search`, `campaign-builder`) erişilemiyordu; state'i güncelleyen tek tetikleyici buton/sekme yoktu. Yani bu fonksiyonlar "fiziksel olarak" kod içinde vardı ama kullanıcı arayüzünde asla ulaşılamıyordu. Tamamı kaldırıldı (~275 satır).
- **Bununla bağlantılı gerçek bug:** Kampanya Oluşturucu sekmesindeki (gerçekten görünen ve tıklanabilen) "Kampanya Draftı Oluştur" butonu, `handleBulkCreateCampaign` fonksiyonunu çağırıyordu; bu fonksiyon da az önce kaldırılan ölü `selectedResultIds` seçim listesini kontrol ediyordu. Seçim arayüzü hiç render edilmediği için `selectedResultIds` her zaman boştu → buton her tıklamada "Kampanya oluşturulacak şirketleri seçin!" hatası veriyordu, asla çalışmıyordu. Düzeltme: `handleBulkCreateCampaign` artık gerçekten ekranda görünen `targetAccounts` listesinden kampanya oluşturuyor (Dialing Sheet/Call List panelinde zaten aynı listeyi kullanıyordu, tutarlı hale getirildi).
- Kaldırılan ölü kodla birlikte artık kullanılmayan importlar da temizlendi: `Layers, ChevronRight, TrendingUp, Users, Download, FileSpreadsheet, FileText, Printer, ChevronDown, Trash2, Calendar, DollarSign, Briefcase, Workflow, HelpCircle, Eye` (lucide-react), `XLSX`, `jsPDF`, ve tüm `recharts` importları (`BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area`) — hiçbiri render edilen kodda kullanılmıyordu.
- Dil: Detay çekmecesi (Kapat butonu, "FİRMA AYRINTILARI" başlığı, "Derin Rapor Analizi Çalıştır"/"Rapor Oluşturuluyor..." butonu, "Müşteriler'e (Won) Ekle"/"Hedef Hesaplara Ekle" alt butonları) ve arama sonuç kartlarındaki üç aksiyon butonu (CRM Hedef Defterine Ekle, Müşteriler'e Ekle, Fabrikayı Analiz Et) `t()` ile sarmalandı. Google-tarzı arama sayfasındaki "Klasik Arama"/"Kendimi Şanslı Hissediyorum"/"Hızlı Arama Önerileri"/"Arama Paneline Dön" butonları da `t()`'ye taşındı. Detay çekmecesine `role="dialog" aria-modal="true"` eklendi.
- **Kasıtlı olarak dokunulmadı:** Sanayi/OSB arama sonuçlarındaki mock şirket verisi, örnek arama anahtar kelimeleri (chip önerileri), `computeCompanyProfile`'daki sektörel strateji cümleleri, ve interpolasyonlu (değişken içeren) toast mesajları (`` `"${item.name}" ... eklendi!` `` gibi) — bunlar ya iş verisi/demo içeriği ya da `t()`'nin tam-eşleşme gerektirmesi nedeniyle basit bir sarmalamayla çevrilemeyen dinamik metinler; önceki modüllerdeki aynı kategori kararlarıyla tutarlı bırakıldı.

**Modül 11 (AdministrationCenter.tsx + UserAccountSettings.tsx) — yapılanlar:**
- **UserAccountSettings.tsx** (246 satır, Kişisel Posta Kutusu paneli): baştan iyi durumdaydı (19 `t()` çağrısı, hiç `alert()`/`confirm()` yok, üç buton — Bağla/Test/Bağlantıyı Kes — hepsi gerçek handler'lara bağlı). Ek düzeltme gerekmedi.
- **AdministrationCenter.tsx** (2369 satır) çok daha büyük bir bulgu içeriyordu — bu dosyada yalnızca 4 `t()` çağrısı vardı (dosyanın geri kalanı kendi yerel `L(tr, en)` iki-dilli fonksiyonuyla yazılmış, bu yüzden dil tarafı zaten büyük ölçüde kapsanıyordu; asıl mesele farklıydı):
  - **Gerçek "mükerrer fonksiyon" bulgusu (kullanıcının bu turdaki talebiyle birebir örtüşüyor):** Dosyada TAMAMEN AYRI, ikinci bir "Bağlı Posta Kutuları" sistemi vardı (`MailboxItem` interface, `mailboxes` state + Supabase-backed key, `handleConnectNewMailbox`, `handleRemoveMailbox`, kendi seed verisi, ve gerçekte hiçbir API çağırmayan ama "Microsoft Graph API yetkilendirmesi başarıyla tamamlandı!" diyen sahte bir başarı `alert()`'i). Render edilen "E-posta" sekmesi bu sistemi hiç kullanmıyordu — gerçek, MS Graph destekli `organizationMailboxCard`'ı gösteriyordu. Yani bu ikinci sistem tamamen ölü koddu; tek etkisi, "Sistem Sağlığı" sekmesindeki "BAĞLI POSTA KUTULARI" istatistik kartının kendi sahte verisini göstermesiydi (gerçek organizasyon posta kutusu durumunu değil). Kaldırıldı; istatistik kartı artık gerçek `organizationMailbox` prop'undan okuyor (`1/1` bağlıysa, `0/1` değilse).
  - **İlişkili başka bir sahte veri:** Aynı Sistem Sağlığı sekmesindeki "BULUT DEPOLAMA KANALLARI" kartı hesaplanmış bir değer değil, sabit "3 Bağlantı"/"3 Connections" metniydi — gerçek `dataHubConnections` listesi zaten mevcuttu (Data Hub sekmesinde kullanılıyor), kart artık `dataHubConnections.filter(c => c.enabled).length / dataHubConnections.length` gösteriyor.
  - **Onay eksikliği (3 yer):** `deleteTemplate` (e-posta şablonu silme) ve `handleDeleteDocType` (döküman kategorisi silme) hiçbir onay istemeden anında siliyordu; `handleDeleteConnection` (bulut depolama bağlantısı silme) native tarayıcı `confirm()` kullanıyordu (Türkçe sabit metin, uygulamanın geri kalanıyla tutarsız UX). Üçü de paylaşımlı `ConfirmModal`/`useConfirm()`'e bağlandı, yeni sözlük anahtarları eklendi (`Template Will Be Deleted`, `Document Category Will Be Deleted`, `Storage Connection Will Be Deleted` + karşılık gelen onay mesajları).
  - **Kasıtlı olarak dokunulmadı:** Organizasyon Posta Kutusu kartındaki "Bağlantıyı Kes" butonu (App.tsx'ten gelen `onDisconnectOrganizationMailbox` prop'una doğrudan bağlı, onaysız) — UserAccountSettings.tsx'teki Kişisel Posta Kutusu panelinin aynı Bağla/Test/Bağlantıyı Kes deseniyle tutarlı bırakıldı, tutarsızlık yaratmamak için değiştirilmedi. Dosyanın üç genişleyen form paneli (Yeni Şablon, Yeni Depolama Bağlantısı, Bağlantı Düzenle) gerçek `fixed inset-0` overlay modal değil, sayfa akışı içinde açılıp kapanan satır-içi panellerdir — bu yüzden `role="dialog"` eklenmedi (diğer modüllerdeki gerçek overlay modallardan farklı bir UI deseni). "Engine Kuralları (Admin)" alt-sekmesi bu dosyada yok (ayrı bir bileşende — bu modülün kapsamında bulunmadı, önceki not hâlâ geçerli: Modül 8'de kapsam dışı bırakılmıştı, tekrar incelenmedi). Kalan 15+ `alert()` çağrısı (bilgilendirme amaçlı başarı/hata mesajları) — Modül 1'de not edilen "toast sistemi" eksikliğiyle aynı kategori, kapsam dışı bırakıldı.

**Modül 12 (DashboardView.tsx + SalesDashboardView.tsx + CompanyDetailView.tsx) — yapılanlar:**
- **DashboardView.tsx** (275 satır, kampanya performans paneli): baştan iyi durumdaydı — kampanyaya özel çeviri sözlüğünü genel `t()` ile birleştiren yerel bir `t = (key) => getCampaignTranslation(lang, key) ?? globalT(key) ?? key` yardımcısı kullanıyor, hiç `alert()`/`confirm()` yok, tek `onClick` (`onNavigateToDesigner`) gerçek bir prop'a bağlı. Ek düzeltme gerekmedi.
- **CompanyDetailView.tsx** (488 satır): 36 `t()` çağrısı, `alert()`/`confirm()` yok, 5 `onClick` (Kapat ×2, Düzenle Formunu Aç, Şirketi Sil, sekme değiştir) hepsi gerçek prop/state'e bağlı. Türkçe karakter taramasındaki tek eşleşmeler durum etiketi eşleme sözlüğü (`{"Prospect": "Potansiyel Müşteri", ...}` — gerçek iş verisi, dil hatası değil) ve bir kod yorumuydu. Ek düzeltme gerekmedi.
- **SalesDashboardView.tsx** (1977 satır) — asıl bulgular burada:
  - Dil sızıntısı: `{lang === "TR" ? "AKSİYON TETİKLE" : "TETIKLE / FOLLOW-UP"}` — İngilizce dal içinde yanlışlıkla Türkçe kelime kalmış (`TETIKLE`) → `"TRIGGER FOLLOW-UP"` olarak düzeltildi.
  - Erişilebilirlik: Filtre çekmecesi (Filter Drawer) ve Düzenlenebilir Hedefler modalına `role="dialog" aria-modal="true"` + kapat butonlarına `aria-label` eklendi (ikisinde de yoktu).
  - **Uydurma veri — "SECTION 7: TOPLANTI PERFORMANSI" paneli:** Hızlı istatistik kartları (Toplam Görüşme, Gemba Ziyareti, Online Görüşme, Kişi Başı Ortalama) gerçek hiçbir veriye dayanmıyordu — `stats.totalCount * 3`, `* 1`, `* 2` gibi keyfi çarpanlardan üretiliyordu. Altındaki trend grafiğinde de Ocak-Mayıs ayları için sabit, uydurma sayılar (`{ name: "Ocak", visits: 2, online: 5, ... }` vb.) vardı, yalnızca son ay (Haziran) aynı sahte formülü kullanıyordu. `DealRecord.meetings` (id/date/title/result) alanı gerçek bir veri kaynağı olarak zaten mevcuttu; panel artık `filteredDeals`'ten gerçek toplantı tarihlerine göre aylık toplam hesaplayan yeni `meetingTrendData`/`totalMeetingsCount` useMemo'larını kullanıyor. Görüşme tipi (yerinde Gemba ziyareti / online görüşme) ayrı bir alan olarak tutulmadığı için bu ayrım kaldırıldı — tek, dürüst bir "toplam görüşme" serisi gösteriliyor; kart sayısı 4'ten 2'ye indi (Toplam Görüşme, Kişi Başı Ortalama).
  - **Bununla bağlantılı, önceden gizli kalmış gerçek bug:** Bu değişikliği yaparken TypeScript, dosyanın yerel `Deal` arayüzünde (`meetings` alanı hiç tanımlı değildi) zaten var olan bir hatayı ortaya çıkardı — "Fırsat Yaşlandırma" panelindeki `{d.meetings?.length === 0 && <span>...Toplantı Yok...</span>}` satırı, `meetings` alanı tipte tanımsız olduğu için çalışma zamanında her zaman `undefined === 0` → `false` değerlendiriyor, yani "Toplantı Yok" rozeti **hiçbir zaman görünmüyordu** — kullanıcının tarif ettiği "fiziksel olarak var ama çalışmayan" segment örneklerinden biri. Kök neden: `SalesDashboardView.tsx`'in kendi yerel `Deal` arayüzü (satır 60), `DealManagementView.tsx`'teki asıl `Deal` tipinden farklı ve `meetings?: {...}[]` alanını içermiyordu. Düzeltme: alan yerel arayüze eklendi — hem yeni useMemo'ların tip hatası giderildi hem de "Toplantı Yok" rozeti artık gerçekten çalışıyor.
  - Tüm `onClick` handler'ları (`resetAllFilters`, `setIsFilterOpen`, `setDashboardPageTab`, `setDateRangePreset`, `setActiveDrillDown`, `handleCompanyClick`, `setTrendPeriod`, `setIsTargetModalOpen`, `handleSaveTargets` vb.) tarandı — hepsi gerçek state/mantığa bağlı, başka ölü buton bulunmadı. `dashboardPageTab`'ın iki değeri de (`metrics`, `coach`) render ediliyor — ölü sekme yok.
  - **Kasıtlı olarak dokunulmadı:** Satış Temsilcisi Liderlik Tablosu'ndaki `meetings` sütunu (satır ~628) — bu sütun, gerçek toplantı-ekleme arayüzü sistemde henüz bulunmadığı için (deal detayına toplantı eklemek için bir form/buton yok, `meetings` alanı yalnızca demo/seed verilerinde dolu) önceki bir oturumda zaten dürüstçe `0` gösterecek şekilde düzeltilmişti (kod yorumuyla belgelenmiş); bu modülde tekrar dokunulmadı, aynı gerekçeyle tutarlı bırakıldı.

**Teklif modülü — 5 yeni kullanıcı hatası (2026-07-25) — yapılanlar:**

Kullanıcının bu turda bildirdiği 5 hata, hepsi Teklif (Proposal) akışıyla ilgili:

1. **Müşteri kartında teklif "N/A" bedel gösteriyordu:** `CompanyDetailView.tsx` (Teklif geçmişi tablosu) ve `CompanyTimelineTab.tsx` (zaman tüneli "Teklif Gönderildi" kartı), `Proposal` tipinde hiç var olmayan `prop.totalCost` ve `prop.title` alanlarını okuyordu (gerçek alan adları `grandTotal`/`totalBudget` ve `proposalSubject`) — ikisi de `any` tipli okunduğu için TypeScript bunu yakalamıyordu, sonuç her zaman `undefined` → "N/A" idi. Doğru alanlara düzeltildi. Ayrıca kullanıcının "teklif detayını göster" isteği üzerine, müşteri kartındaki teklif satırı artık tıklanabilir — `crm-navigate` olayı ile (Fırsat panosundaki "Teklif No" linkiyle aynı, önceden kurulmuş mekanizma) doğrudan Teklif Yönetimi'ndeki gerçek teklif kaydını açıyor.
2. **Kapak mektubunda sabit "SAYIN YETKİLİ," ifadesi:** `ServicesView.tsx`'in `assembleDocument()` fonksiyonunda kapak mektubu her zaman bu jenerik, kişiselleştirilmemiş hitapla başlıyordu. Satır kaldırıldı — kapak mektubu artık doğrudan kullanıcının yazdığı/seçtiği içerikle başlıyor.
3. **ve** 4. **PDF formatı tutarsızdı / Teklif Yönetimi listesinde tıklanınca farklı bir PDF açılıyordu:** Kök neden araştırması, teklif PDF'i için code base'de **iki farklı üretici** olduğunu ortaya çıkardı: (a) `src/lib/proposalPdf.ts` — jenerik, elle çizilmiş bir jsPDF şablonu (sabit "Standart Paket Detayları" gibi placeholder metinler, kullanıcının gerçek kapak/sayfa görsellerinden veya markalamasından habersiz — kullanıcının "kurumsal şablon ibaresi var" şikayetinin kaynağı), (b) `src/lib/htmlToPdf.ts` + `ProposalLetterheadBody.tsx` — gerçek, marka/kapak görselli HTML letterhead'i html2canvas-pro ile yakalayıp PDF'e çeviren, "Yazdır" önizlemesiyle birebir eşleşen doğru üretici (önceki bir oturumda "PDF İndir" butonu için zaten inşa edilmiş ama her yere yayılmamıştı). Teklif Yönetimi listesinde bir teklife tıklanınca açılan detay çekmecesi (`selectedProposalForDetail` iframe + indirme linki) hâlâ eski, yanlış üreticiyi (a) kullanıyordu — bu yüzden "PDF İndir" ile indirilen dosya doğruyken, listede tıklanan teklif farklı görünüyordu. Artık detay çekmecesi de doğru üretici (b)'yi kullanıyor (`captureProposalPdf`), eski üretici yalnızca yakalama başarısız olursa yedek olarak devrede. Ayrıca her teklif kaydedildiğinde Documents'a otomatik yüklenen kopya da (`storeProposalPdf`) artık aynı doğru, marka/kapak görselli PDF'i saklıyor — önceden bu da eski jenerik üreticiyi kullanıyordu.
5. **"CRM'e Kaydet" butonunun çalışıp çalışmadığı belli değildi:** Buton hiçbir görsel durum göstermiyordu (disabled/loading yok), tek geri bildirim birkaç saniyede kaybolan bir toast'tı. Ayrıca art arda tıklamalar, `proposalNumber`'a göre eşleşen kaydı sessizce **üzerine yazıyordu** — bu, kullanıcı kaydettikten sonra fırsatı pipeline'da ilerletmişse (`stage` değişmişse), tekrar "Kaydet"e basmanın o ilerlemeyi sessizce "Proposal Submitted" aşamasına sıfırlayabileceği gizli bir risk anlamına geliyordu. Artık başarılı kayıttan sonra buton kalıcı bir yeşil "CRM'e Kaydedildi ✓" durumuna geçiyor; aynı taslak için tekrar tıklanırsa yeniden kayıt/üzerine yazma yapmadan "Bu teklif sistemde zaten kayıtlı (PROP-XXXX)" mesajı gösteriyor.

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

---

## Global CSS: kenarlık kontrastı + font okunabilirliği (2026-07-25)

**Kullanıcı geri bildirimi:** "gemba iq renk geçişler, kenarlıklar çok belirgin değil, bazı alanlara font büyüklüğü yeteri kadar okunaklı değil." Netleştirme sorusuyla kapsam teyit edildi: canlı Gemba IQ uygulaması (Stitch tasarım önizlemesi değil), genel olarak her yerde (tek bir modül değil).

**Kök neden 1 — kenarlık kontrastı:** `src/App.tsx` (satır ~341-362) `<html>` etiketine daima `.saas-layout` sınıfını uyguluyor (`layoutTheme` sabit `"saas"`, kullanıcıya açık bir tema seçici yok — `.notion-layout`/`.fluent-layout` CSS'te tanımlı ama hiç aktif edilmiyor). `.saas-layout` teması altında sidebar, kart, input, tablo ve hover kenarlıkları `rgba(0,0,0,0.03-0.08)` / `rgba(255,255,255,0.03-0.08)` gibi çok düşük opaklıkta tanımlanmıştı (yaklaşık 1.1-1.5:1 kontrast oranı). Ayrıca genel (saas-layout dışı) bir "kenarlık birleştirme" katmanı da `#EDEBE9` (açık tema) / `#323130` (koyu tema) gibi benzer düşük kontrastlı hex değerleri kullanıyordu. WCAG 2.1 AA, arayüz bileşeni sınırları (non-text contrast) için minimum 3:1 kontrast oranı istiyor — mevcut değerler bunun oldukça altındaydı.

**Düzeltme 1:** `src/index.css` içinde ~16 farklı kural bloğu güncellendi (sidebar, kart, input/select/textarea, hover durumları, tablo başlık/satır kenarlıkları, buton kenarlıkları, `.ms-border` yardımcı sınıfı, genel `.border`/`.divide-y`/`[class*="border-..."]` birleştirme katmanı, KPI kart kenarlıkı). Açık temada kenarlıklar `#d4d4d8` (hex) veya `rgba(0,0,0,0.10-0.22)` (bağlama göre kademeli opaklık) değerlerine, koyu temada `#52525b` (hex) veya `rgba(255,255,255,0.12-0.24)` değerlerine yükseltildi. Renkli anlamsal rozet kenarlıkları (örn. emerald durum etiketleri) kasıtlı olarak dokunulmadan bırakıldı.

**Kök neden 2 — font okunabilirliği:** "SUBTEXT PUNTO & COLOR UNIFICATION" kuralı yalnızca `<p>` etiketlerini ve `text-[9px]/[10px]/[11px]` boyutlarını yakalıyordu; `<span>`/`<div>` içindeki küçük metinler ile `text-[8px]` boyutu kapsam dışı kalmıştı — bu da bazı alanlardaki metnin hem çok küçük hem düşük kontrastlı kalmasına yol açıyordu.

**Düzeltme 2:** Aynı kural `span`/`div` etiketlerini de kapsayacak şekilde genişletildi (rozet/etiket bileşenlerini bozmamak için `bg-`/`p-`/`border-` sınıfı taşıyan `span`/`div`'ler hariç tutuldu — `div[class*="text-xs"]` için zaten var olan aynı koruma deseni kullanıldı) ve `text-[8px]` boyutu da her iki tema için kapsama eklendi. Sonuç: tüm küçük yazı tipleri artık tutarlı şekilde 11px + yüksek kontrastlı slate rengine (`#64748b` açık / `#94a3b8` koyu) normalize ediliyor.

**Kapsam dışı bırakılan bulgu:** Kullanıcının bahsettiği "renk geçişleri" (gradient) incelendi; kod taramasında gradient kullanımı seyrek ve dağınık bulundu (dominant bir sorun değil) — bu nedenle bu turda kenarlık ve font düzeltmelerine odaklanıldı. Kullanıcı hâlâ belirgin bir gradient sorunu görüyorsa spesifik ekran/örnek istenmeli.

**Doğrulama:** `npx tsc --noEmit` (yalnızca CSS değişikliği, tsc çıktısı etkilenmedi — mevcut ilgisiz hatalar değişmeden kaldı), `npx vite build` (EXIT:0, `dist/assets/index-*.css` başarıyla üretildi).

**Durum:** Tamamlandı (2026-07-25).

---

## Fırsat/Teklif kaybetme nedeni + tekrar temas hatırlatması (2026-07-25)

**Kullanıcı talebi:** "Teklif yönetimi, ve Fırsat yönetimi kanban yönetim paneli için özellikle kaybedilen tekliflerde kaybetme nedenini ekleme fonksiyonu koy... kaybetme nedeni (Proje iptal, ertelendi, farklı firma, Teklif pahalı, diğer)... bir sonraki dönem değerlendirmek ve müşteri ile temasa geçebilmek adına Tekrar temas hatırlatması ve tarih aralığı koy... bu hatırlatma sistem maili tarafından sistemi kullanan kişiye (user, admin) mail atsın."

**Yeni paylaşılan bileşen:** `src/components/shared/LossReasonModal.tsx` — hem `DealManagementView.tsx` (Kanban sürükle-bırak VE liste görünümü aşama dropdown'ı) hem `ProposalManagementView.tsx` ("Reddet" butonu) tarafından kullanılıyor. Sabit 5 seçenekli kaybetme nedeni (`Project cancelled`/`Postponed`/`Went with different company`/`Proposal too expensive`/`Other` — TR arayüzde otomatik "Proje iptal"/"Ertelendi"/"Farklı firma"/"Teklif pahalı"/"Diğer" olarak gösteriliyor), opsiyonel serbest metin notu, ve varsayılan olarak bugünden +90/+97 gün önerilen (kullanıcı değiştirebilir veya kapatabilir) bir "tekrar temas" tarih aralığı içeriyor.

**Fırsat (Deal) tarafı — `DealManagementView.tsx`:** Bir fırsat Kanban'da "Kaybedildi"ye benzer bir aşamaya sürüklenince (mevcut `isLostStage()` yardımcı fonksiyonu — özel aşama isimlerini de kapsıyor, sadece literal "Lost" değil) veya liste görünümündeki aşama dropdown'ından aynı şekilde değiştirilince, modal otomatik açılıyor. Onaylandığında `deal.lossReason`/`lossReasonNote`/`nextContactReminderStart`/`nextContactReminderEnd` alanları kaydediliyor (bu alanlar `Deal` arayüzüne eklendi — Supabase `deals` tablosu zaten `jsonb` blob olduğu için migration gerekmedi).

**Teklif (Proposal) tarafı — `ProposalManagementView.tsx`:** Detay panelindeki "Reddet" butonu artık eski `prompt()` yerine aynı modalı açıyor; onay `handleSetApproval` → `setProposalApprovalStatus` (`src/lib/proposalService.ts`) zincirine `lossInfo` parametresi olarak akıyor ve aynı 4 alan `Proposal` nesnesine (tip tanımı `src/types/proposal.ts`) kaydediliyor.

**Hatırlatma e-postası — kök neden ve mimari karar:** Kod tabanında zaten çalışan bir görev hatırlatma motoru var (`TasksView.tsx`, 20 dakikada bir tarayan client-side `setInterval` + "Şimdi Tara" butonu, `POST /api/mail/send` üzerinden gerçek e-posta gönderiyor, alıcı e-postası bulunamazsa isimden organizasyon dizinine bakarak (`orgMembers`) çözümlüyor). Vercel Hobby planı 12/12 serverless fonksiyon limitinde olduğu için yeni bir `api/*.js` dosyası eklemek yerine, modal onaylandığında `CrmDb.upsertTask(...)` ile bu mevcut motoru tetikleyen bir Görev (`Task`) otomatik oluşturuluyor (`dueDate` = hatırlatma başlangıç tarihi, `assignee` = fırsat/teklif sorumlusu). Böylece hatırlatma tarihi geldiğinde kullanıcı zaten var olan "Görev Takibi" e-posta altyapısı üzerinden gerçek bir e-posta alıyor — ek sunucu kodu veya yeni fonksiyon eklemeden.

**Yan düzeltme:** `CrmDb.createTask()` her zaman yeni bir satır ekliyordu (aynı id ile tekrar çağrılırsa satır çoğaltıyordu). Kayıp nedeni modalı aynı fırsat/teklif için tekrar açılıp kaydedilebileceğinden (`recontact-deal-<id>` / `recontact-proposal-<id>` sabit id kullanıyor), bu durumda çoğalan görev satırları oluşmasını önlemek için `CrmDb.upsertTask()` eklendi (var olan id ise günceller, yoksa oluşturur).

**Dil:** 19 yeni TR çeviri anahtarı `src/lib/uiDictionaryExtensions.ts`'e eklendi (kaybetme nedeni seçenekleri + modal metinleri). EN sözlük TR'den otomatik türetildiği için ayrıca dokunulmadı.

**Doğrulama:** `npx tsc --noEmit` (yeni hata yok, aynı 3 önceden var olan ilgisiz hata — birleşim tipi sıralaması dışında birebir aynı), `npx vite build` (EXIT:0).

**Durum:** Tamamlandı (2026-07-25).
