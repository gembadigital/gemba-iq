# Organizasyon çalışma alanları

19 Kasım 2026. Türkiye ve Almanya aynı Supabase projesinde ayrı organizasyonlar kullanır. Müşteri, kişi, fırsat, teklif, görev, dosya, Outlook arşivi ve ortak CRM ayarları organizasyona bağlıdır. Veri kopyalama yapılmaz.

## Yetki modeli

- Organizasyon rolleri ADMIN / USER olarak kalır. ADMIN yalnızca aktif organizasyonundaki üyelikleri yönetir; USER organizasyonunun iş kayıtlarına erişir.
- Platform superadmin ataması `platform_superadmins` tablosunda sunucu tarafından tutulur. Kullanıcı metadata'sı, davet rolü veya profil düzenleyerek atanamaz.
- Superadmin, kendisine açıkça üyelik verilen organizasyonlar arasında geçebilir; diğer organizasyonlar otomatik açılmaz. Normal kullanıcıların birden fazla organizasyona katılması engellenir.
- `organization_access_rules` e-posta alanı ve AI erişimini tanımlar. Tarayıcı bu kuralları değiştiremez. Giriş e-postasının alanı otomatik üyelik sağlamaz; geçerli davet gerekir.
- Bir kullanıcı çıkarıldığında yalnızca aktif organizasyon üyeliği kaldırılır. Auth hesabı ve oluşturduğu iş kayıtları silinmez. Superadminin üyeliği başka admin tarafından kaldırılamaz.

## Geçiş ve kayıt

Seçici Organizasyon Ayarları → Organizasyon Ayarları bölümünde, yalnızca superadmin için görünür. Önce açık form kaydedilmeli, hedef seçilmeli ve “Organizasyona geç” kullanılmalıdır. `CrmDb.flushPendingWrites()` hata verirse geçiş durur. Başarılı geçiş tam sayfa yenilemesiyle açık bileşenleri, zamanlayıcıları ve bellek önbelleklerini birlikte sonlandırır.

Aktif organizasyon `sessionStorage` içinde sekmeye özeldir. Aynı tarayıcıda iki sekme ayrı organizasyonlarda çalışabilir. API ve Supabase istekleri `X-Organization-Id` taşır. Bu değer güvenilir kimlik değildir: sunucu/SQL her istekte gerçek üyeliği doğrular. Birden fazla üyelik olup başlık yoksa ilk üyeliği seçmek yerine hata verilir.

İş tablolarında ek restrictive RLS politikası aktif organizasyonla sınırlar. Storage yolu aynı organizasyonla başlamalıdır. Kayıtların organizasyonu değiştirilemez; yeni/değiştirilen müşteri, fırsat, kişi, teklif ve klasör bağlantıları aynı organizasyonda olmalıdır.

## Ortak veriler ve Microsoft

Türkiye'nin eski `__org_auxiliary__` kaydı korunur; yeni organizasyonlar `__org_auxiliary__:<organization_id>` kimliğini kullanır. Cron ve entegrasyon okuması her iki biçimi organizasyona göre tanır. Eski tarayıcı verileri ve API anahtarları boş bir organizasyona otomatik taşınmaz.

Outlook arşivi aktif organizasyon ve müşteriyle sınırlıdır. Kişisel posta yalnızca doğrulanmış giriş hesabıyla eşleşebilir. Kurumsal posta kutusunun alanı aktif organizasyonun alanıyla eşleşmelidir. Takvim paylaşımı organizasyonun kendi onaylı kullanıcı listesini kullanır. Almanya'da Microsoft 365 erişimi, kullanılan Azure uygulamasının ilgili Microsoft tenant'ında izinli olmasına bağlıdır; Türkiye bağlantısı Almanya'ya kopyalanmaz.

AI uçları oturum, aktif organizasyon ve kullanıcının kendi API anahtarını denetler. Ortak sunucu anahtarına veya başka kullanıcıya dönüş yoktur. Kendi anahtarı bulunmayan işlem açıklayıcı hatayla durur. Ayrıntılar: [Kişisel API Anahtarları](KISISEL_API_ANAHTARLARI.md). Almanya ayrı Microsoft tenant'ı kullandığından kendi Microsoft uygulaması kurulana kadar Outlook/takvim çağrıları Türkiye uygulamasına gönderilmez.

## Doğrulama

- `python3 -B tests/checkOrganizationIsolation.py`: gerçek migrationları geçici yerel PostgreSQL'e uygular; RLS, Storage, ilişki bütünlüğü, davet alanı, rol yükseltme, superadmin koruması ve veri korunmasını sınar.
- `node tests/organizationAccess.test.mjs`: sunucu organizasyon seçimi ve posta alanı denetimleri.
- Mevcut kayıt, takvim ve Outlook arşivi entegrasyon testleri ayrıca çalıştırılır.
- `node tests/buildOrganizationPreview.mjs`: gerçek seçiciyi sentetik kimlik ve kayıt hatasıyla yerel tarayıcıda sınamak içindir; üretim servisine bağlanmaz.

Canlı Almanya admini için davet e-postası kullanıcı ayrıca istemeden gönderilmez. Gerçek Almanya hesabıyla giriş ve Microsoft onayı, kullanıcı daveti başlattığında ayrıca doğrulanacaktır.
