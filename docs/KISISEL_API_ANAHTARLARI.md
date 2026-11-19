# Kişisel API anahtarları

19 Kasım 2026. Kullanıcı kendi Gemini ve isteğe bağlı Tavily anahtarını **Hesabım → Kişisel API Anahtarları** ekranında kaydeder. Supabase yönetim paneline erişmesi gerekmez. Bu değişiklik Almanya'nın farklı hesaplarını destekler; aynı kurallar Türkiye kullanıcılarına da uygulanır.

## İşleyiş

- Anahtarlar kullanıcı + organizasyon + sağlayıcı kapsamında tutulur. Bir kullanıcının ya da başka organizasyonun anahtarı otomatik kullanılmaz.
- Gemini/Tavily isteklerinde `process.env.GEMINI_API_KEY`, `process.env.TAVILY_API_KEY`, organizasyonun eski ortak KV anahtarı veya istekte gönderilmiş alternatif anahtar kullanılmaz. Kişisel anahtar yoksa işlem açıklayıcı hatayla durur. Kaldırma da aynı sonucu doğurur.
- Eski ortak çevre değişkenleri silinmez veya değiştirilmez; üretim istekleri bu değerlere başvurmaz.
- Şifreleme mevcut Supabase Vault ile yapılır. `user_provider_credentials` tablosunda yalnızca Vault referansı, son dört karakter ve tarihler vardır. Tam anahtar browser storage/CRM ortak KV deposuna yazılmaz, GET yanıtında döndürülmez.
- Tablo ve şifre çözen RPC işlevleri `anon` / `authenticated` rollerine kapalıdır. Sunucu her istekte gerçek oturum, doğrulanmış e-posta ve aktif organizasyon üyeliğini denetler. Kullanıcı/organizasyon kimliği istek gövdesinden alınmaz. Superadmin arayüzü de diğer kullanıcıların anahtarlarını göstermez.
- Anahtarın değiştirilmesi eski erişim testi tarihini temizler. Kaldırma veya kullanıcı/organizasyon silinmesi, ilgili Vault kaydını da temizler.
- Her AI isteğinin anahtarları ve SDK istemcisi Node AsyncLocalStorage kapsamında ayrıdır. Ortak SDK istemcisi ve global anahtar değişkeni yoktur.
- Gemini SDK hataları sağlayıcı mesajını/istek başlıklarını loglara veya yanıta taşımadan güvenli hata metnine çevrilir.

## Erişim testi

Kullanıcı Kaydet'ten sonra Erişimi Test Et'i kullanır. Gemini model listesi ve Tavily kullanım metadata'sı sabit HTTPS adreslerinden kontrol edilir. Model çıktısı üretilmez, web araması yapılmaz. Test yalnızca bu erişimi doğrular; tüm model yetkileri veya kalan kota için garanti değildir. Başka bir URL/sağlayıcı kaydedilemez. Gerçek anahtarlarla bu geliştirme sırasında işlem yapılmadı.

## API ve dağıtım

`/api/user/mailbox?action=api-credentials` mevcut kullanıcı uç noktasında GET/POST/DELETE olarak çalışır. Yeni Vercel function veya cron eklenmez. Yerel Express de Vercel ile aynı AI işleyicilerini kullanır. Kullanıcı Supabase konsoluna yönlendirilmez.

AI özelliklerinin arayüzde görünmesi hizmetin ortak hesapla açık olduğu anlamına gelmez; sunucu kişisel anahtar olmadan çağrı yapmaz. Eski `organization_access_rules.ai_enabled=false` değerleri ortak erişim için kapalı kalır; kişisel anahtar yolu bu alanla ortak anahtara geçiş yapmaz.

## Microsoft 365 ayrı kuruluşu

Kullanıcı Almanya'nın ayrı bir Microsoft tenant'ı olduğunu doğruladı. Gemini/Tavily anahtarları Microsoft uygulama kimliği değildir. Almanya'nın Outlook/takvim bağlantısı için Almanya tenant'ında ayrı uygulama kaydı, tenant/client bilgileri ve yönetici onayı gerekir. Bu bilgi ve bağlantı henüz yapılandırılmadığından Almanya, Türkiye'nin Azure uygulamasına yönlendirilemez. Etkileşimli posta/takvim, şirket e-postası eşitlemesi ve ortak gönderim yolu bunu sunucuda engeller. Türkiye'nin mevcut Microsoft bağlantısı korunur.

**Microsoft'a ait organizasyon özelindeki kurulum ekranı bu değişikliğin parçası değildir; Almanya Outlook henüz etkin değildir.** Sonraki iş, Almanya Microsoft uygulamasını ve organizasyona özel güvenli bağlantısını hazırlamaktır. Davet e-postası gönderilmez.

## Kontroller

- 39 geçici PostgreSQL kontrolü: mevcut RLS ayrımı + yeni tablonun/RPC'lerin kapalı oluşu, şifreli saklama, güncelleme ve Vault temizliği.
- Gerçek Supabase Vault üzerinde yalnızca sentetik bir anahtarla şifreleme/geri okuma/temizleme doğrulandı ve işlem rollback edildi. Gerçek kayıtlı anahtar okunmadı; testten sonra tablo boştu.
- 17 sunucu testi: ortak çevre değişkenine dönüş yok, kullanıcı/org taklidi yok, eşzamanlı kullanıcıların SDK ayrımı, güvenli hata, yalnızca kişisel kayda erişim, silme sonrası durma.
- Microsoft kuruluşu ayrımı, takvim, e-posta arşivi ve mevcut kayıt testleri ayrıca çalıştırıldı. UI kontrolü sentetik hesap ve sahte anahtarla yapıldı.

Kaynaklar: [Supabase Vault](https://supabase.com/docs/guides/database/vault), [Gemini API anahtarları](https://ai.google.dev/gemini-api/docs/api-key), [Tavily kullanım endpoint'i](https://docs.tavily.com/documentation/api-reference/endpoint/usage).
