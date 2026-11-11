# Gemba IQ'yu ana ekrana ekleme

Adres: https://gemba-iq.vercel.app

- iPhone/iPad: Safari → Paylaş → Ana Ekrana Ekle → varsa “Web Uygulaması Olarak Aç” açık → Ekle.
- Android: Chrome → üç nokta → Yükle ve kısayol oluştur / Ana ekrana ekle → Yükle.
- Adı Gemba IQ, ikonu sol menüdeki mevcut G logosudur. Ana ekrandan açılınca ayrı uygulama penceresi kullanılır. CRM kayıtları için internet gerekir.

Resmî kurulum yönergeleri: [Apple](https://support.apple.com/en-eg/guide/iphone/iphea86e5236/ios), [Google Chrome](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=tr).

## Bakım

`public/manifest.json` uygulama kimliği `/`, kapsam `/`, başlangıç `/` ve `display: standalone` içerir. Android için gerçek 192/512 px PNG'ler ve güvenli kenar boşluklu ayrı maskable ikon; iPhone için opak 180 px Apple touch icon; tarayıcı için 32 px favicon bulunur. Kaynak: `public/logos/Giqlogo.png`. Logonun çizimi değiştirilmez.

macOS'ta ikonları yeniden paketlemek için `swift -module-cache-path /tmp/gemba-icons-cache scripts/generate-pwa-icons.swift`. İkon değiştiğinde servis çalışanındaki cache sürümü de artırılmalıdır.

Servis çalışanı yalnızca ikonları ve statik bağlantı-yok ekranını önbellekler. CRM, API, kimlik doğrulama yanıtları ve uygulama JavaScript'i bu önbelleğe yazılmaz. Eski bu uygulamaya ait cache'ler aktivasyonda temizlenir; diğer modüllerin cache'lerine dokunulmaz. Çevrimdışıyken JavaScript dosyası yerine HTML dönülmez. `vercel.json` manifest ve servis çalışanının tekrar doğrulanmasını sağlar.

Kontrol: `node tests/pwaInstall.test.mjs`; gerçek ikon boyutları, manifest, API/auth isteklerinin müdahalesiz bırakılması, cache geçişi ve çevrimdışı belge yanıtı sınanır. Ana ekrana fiziksel kurulum telefonun kendi tarayıcı menüsünden kullanıcı tarafından yapılır.
