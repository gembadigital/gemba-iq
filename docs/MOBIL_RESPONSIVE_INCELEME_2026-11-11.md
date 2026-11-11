# Mobil responsive inceleme — 11 Kasım 2026

Kapsam: 33 ana/yönetim/giriş görünümü ve 11 liste, detay, düzenleme veya sihirbaz durumu. Gerçek bileşenler uzun şirket/kişi/hizmet adları ve dolu sentetik kayıtlarla, üretim veri servisine bağlanmadan açıldı. Her ekran/durum ayrı kontrol edildi.

Kontroller: sayfa taşması; dar veri hücreleri; teklif kartlarında çakışma ve kart dışına çıkan içerik; teklif başlığının genişliği; pencerenin yatay sınırları; açılması beklenen detay/form görünümünün gerçekten açılması.

| Ekran / durum | 320 px | 390 px | 768 px | 844 px |
|---|---|---|---|---|
| revenue-management/ | Geçti | Geçti | Geçti | Geçti |
| management-pl/ | Geçti | Geçti | Geçti | Geçti |
| lead-profiles/ | Geçti | Geçti | Geçti | Geçti |
| lead-generator/ | Geçti | Geçti | Geçti | Geçti |
| ai-sales-assistant/ | Geçti | Geçti | Geçti | Geçti |
| companies-registry/ | Geçti | Geçti | Geçti | Geçti |
| company-discovery/ | Geçti | Geçti | Geçti | Geçti |
| services/ | Geçti | Geçti | Geçti | Geçti |
| sales-dashboard/ | Geçti | Geçti | Geçti | Geçti |
| deal-management/ | Geçti | Geçti | Geçti | Geçti |
| proposal-management/ | Geçti | Geçti | Geçti | Geçti |
| create-proposal/ | Geçti | Geçti | Geçti | Geçti |
| todo-list/ | Geçti | Geçti | Geçti | Geçti |
| documents/ | Geçti | Geçti | Geçti | Geçti |
| target-accounts/ | Geçti | Geçti | Geçti | Geçti |
| marketing-ai-coach/ | Geçti | Geçti | Geçti | Geçti |
| marketing-overview/ | Geçti | Geçti | Geçti | Geçti |
| marketing-industry-intel/ | Geçti | Geçti | Geçti | Geçti |
| marketing-target-market/ | Geçti | Geçti | Geçti | Geçti |
| marketing-bd-pipeline/ | Geçti | Geçti | Geçti | Geçti |
| marketing-growth-health/ | Geçti | Geçti | Geçti | Geçti |
| marketing-digital-intel/ | Geçti | Geçti | Geçti | Geçti |
| marketing-kpi-okr/ | Geçti | Geçti | Geçti | Geçti |
| campaign-manager/ | Geçti | Geçti | Geçti | Geçti |
| outreach-approval/ | Geçti | Geçti | Geçti | Geçti |
| contract-manager/ | Geçti | Geçti | Geçti | Geçti |
| dashboard/ | Geçti | Geçti | Geçti | Geçti |
| designer/ | Geçti | Geçti | Geçti | Geçti |
| progress/ | Geçti | Geçti | Geçti | Geçti |
| history/ | Geçti | Geçti | Geçti | Geçti |
| proposal-management/edit | Geçti | Geçti | Geçti | Geçti |
| companies-registry/detail | Geçti | Geçti | Geçti | Geçti |
| companies-registry/edit | Geçti | Geçti | Geçti | Geçti |
| todo-list/list | Geçti | Geçti | Geçti | Geçti |
| todo-list/add | Geçti | Geçti | Geçti | Geçti |
| revenue-management/data | Geçti | Geçti | Geçti | Geçti |
| revenue-management/invoices | Geçti | Geçti | Geçti | Geçti |
| management-pl/table | Geçti | Geçti | Geçti | Geçti |
| deal-management/list | Geçti | Geçti | Geçti | Geçti |
| create-proposal/stage2 | Geçti | Geçti | Geçti | Geçti |
| services/definition | Geçti | Geçti | Geçti | Geçti |
| screen-admin/ | Geçti | Geçti | Geçti | Geçti |
| screen-account/ | Geçti | Geçti | Geçti | Geçti |
| screen-auth/ | Geçti | Geçti | Geçti | Geçti |

Sonuç: 176 ekran/durum/genişlik kontrolü geçti. Görsel önizleme tarayıcıda yapıldı; fiziksel telefon veya tüm işletim sistemi/sürüm kombinasyonlarının testi değildir. Testler, sayfa taşmamasını tek başarı ölçütü kabul etmez.

Düzeltilenler: mobil Teklif Yönetimi artık etiketli kart; kartlar içeriğe göre büyür; durum/işlemler çakışmaz. Karşılaştırma tabloları okunabilir sütun genişliğini korur. Pano kolonları telefonun içine sığar. Sihirbazın ikinci aşamasındaki başlık/kaydet alanı dar telefonda alt alta geçer.

İşlem işleyicileri, veri alanları, hesaplamalar ve belge içerikleri önceki sürümle AST karşılaştırmasında korundu. TypeScript ve üretim derlemesi geçti; mevcut kayıt entegrasyon testleri de başarılı.
