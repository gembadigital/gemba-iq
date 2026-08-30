# OpenClaw AI Sales Manager Entegrasyonu

Bu doküman, Gemba IQ CRM'e OpenClaw (veya başka bir harici AI agent) tarafından
`companies`, `contacts`, `deals`, `tasks` verisine erişmek için kullanılacak
API'yi tanımlar.

## 1. Kurulum: ilk API key'i oluşturma

Henüz bir yönetim ekranı (Admin UI) yok — Faz 2'de eklenebilir. İlk key'i şu
adımlarla elle oluşturun:

1. Aşağıdaki Node script'ini yerel makinenizde çalıştırın (repo'nun kendisine
   dahil değildir, tek seferlik bir yardımcıdır):

   ```js
   const crypto = require("crypto");
   const raw = "gembaiq_live_" + crypto.randomBytes(32).toString("hex");
   const hash = crypto.createHash("sha256").update(raw, "utf8").digest("hex");
   console.log("RAW KEY (OpenClaw'a bunu verin, bir daha görünmeyecek):", raw);
   console.log("KEY HASH (DB'ye bunu yazın):", hash);
   console.log("KEY PREFIX (DB'ye bunu yazın):", raw.slice(0, 20));
   ```

2. Supabase SQL Editor'de, kendi `organization_id`'nizi ve ADMIN kullanıcınızın
   `auth.users.id`'sini kullanarak:

   ```sql
   insert into public.integration_credentials
     (organization_id, name, key_prefix, key_hash, scopes, created_by)
   values (
     '<organization_id>',
     'OpenClaw AI Sales Manager',
     '<KEY PREFIX>',
     '<KEY HASH>',
     array['companies:read','companies:write','contacts:read','contacts:write',
           'deals:read','deals:write','tasks:read','tasks:write'],
     '<admin_user_id>'
   );

> Not: `mail:send`, `leads:read`, `outreach:read`, `outreach:write` ve
> `outreach:send` scope'ları buraya dahil değildir — bunlar, ilgili
> özellik gerçekten kullanılmaya başlanacağı zaman ayrı bir `update`
> sorgusuyla eklenir (bkz. §3).
   ```

3. Adım 1'de yazdırılan **RAW KEY**'i OpenClaw'ın konfigürasyonuna girin. Bu
   anahtar bir daha hiçbir yerde görünmeyecek — kaybederseniz yeni bir satır
   eklemeniz (ve eskisini `revoked_at = now()` ile iptal etmeniz) gerekir.

Bir key'i iptal etmek için:

```sql
update public.integration_credentials
set revoked_at = now()
where id = '<credential_id>';
```

## 2. Kimlik doğrulama

Her istekte:

```
Authorization: Bearer gembaiq_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json
```

- Anahtar geçersiz, eksik veya iptal edilmişse: `401 Unauthorized`
- Anahtarın ilgili işlem için scope'u yoksa: `403 Forbidden`
- `service_role` key hiçbir zaman gerekmez ve hiçbir endpoint'e gönderilmemelidir.

## 3. Scope'lar

| Scope | Yetki |
|---|---|
| `companies:read` | Şirket arama/görüntüleme |
| `companies:write` | Şirket oluşturma/güncelleme |
| `contacts:read` | Kişi arama |
| `contacts:write` | Kişi oluşturma |
| `deals:read` | Fırsat arama |
| `deals:write` | Fırsat oluşturma/güncelleme |
| `tasks:read` | Görev arama |
| `tasks:write` | Görev oluşturma/güncelleme |
| `mail:send` | Organizasyon Microsoft 365 kutusundan e-posta gönderme |
| `leads:read` | Aday Profilleri (Lead Profiles) arama/görüntüleme |
| `outreach:read` | Yeniden Temas taslaklarını listeleme |
| `outreach:write` | Yeniden Temas taslağı oluşturma/güncelleme |
| `outreach:send` | Onaylanmış bir Yeniden Temas taslağını gerçekten gönderme |
| `*` | Tüm scope'lar (yalnızca tam güvenilen entegrasyonlar için önerilir) |

## 4. Base URL

```
https://gemba-iq.vercel.app/api/organization/integration
```

## 5. Endpoint'ler

### Şirketler

**Oluştur** — `POST /companies` (`companies:write`)

```json
// Request
{
  "name": "Acme Otomotiv A.Ş.",
  "website": "acmeotomotiv.com",
  "industry": "Automotive",
  "billingCity": "Bursa",
  "customerStatus": "Lead"
}
```

```json
// Response 201 (yeni kayıt)
{ "created": true, "updated": false, "id": "company-1735...-a1b2c3d4", "data": { "...": "..." } }

// Response 409 (duplicate bulundu, upsert:true gönderilmediyse)
{
  "created": false,
  "matchedOn": "website",
  "existing": { "id": "company-...", "name": "Acme Otomotiv", "...": "..." }
}
```

Duplicate bulunduğunda mevcut kaydı güncellemek isterseniz body'ye `"upsert": true` ekleyin — bu durumda `200` ile güncellenmiş kayıt döner.

**Ara** — `GET /companies/search?q=Acme&limit=20` (`companies:read`)

```json
{ "results": [ { "id": "company-...", "name": "Acme Otomotiv", "...": "..." } ], "count": 1 }
```

`?website=acmeotomotiv.com` ile domain üzerinden de aranabilir.

**Tek kayıt getir** — `GET /companies/get?id=company-...` (`companies:read`)

**Güncelle** — `PATCH /companies/update?id=company-...` (`companies:write`)

```json
// Request (sadece değişecek alanlar)
{ "customerStatus": "Active Customer", "healthScore": 78 }
```

### Kişiler (Contacts)

**Oluştur** — `POST /contacts` (`contacts:write`)

```json
// Request
{
  "companyId": "company-1735...-a1b2c3d4",
  "firstName": "Deniz",
  "lastName": "Erol",
  "email": "deniz.erol@acmeotomotiv.com",
  "phone": "+90 532 000 00 00",
  "department": "Satın Alma"
}
```

`companyId` bu organizasyonda mevcut olmayan bir şirkete işaret ediyorsa `400` döner.
Aynı şirket içinde email (yoksa telefon) eşleşmesiyle duplicate kontrolü yapılır — davranış şirketlerdekiyle aynı (`409` + `upsert: true` seçeneği).

**Ara** — `GET /contacts/search?company_id=company-...` veya `?email=...` (`contacts:read`)

### Fırsatlar (Deals)

**Oluştur** — `POST /deals` (`deals:write`)

```json
// Request
{
  "companyId": "company-1735...-a1b2c3d4",
  "dealName": "Yalın Üretim Danışmanlığı 2026",
  "opportunityValue": 450000,
  "stage": "Yeni",
  "priority": "High",
  "expectedCloseDate": "2026-11-30"
}
```

```json
// Response 201
{ "created": true, "id": "deal-1735...-b2c3d4e5", "data": { "...": "..." } }
```

**Güncelle** — `PATCH /deals/update?id=deal-...` (`deals:write`) — örn. `{ "stage": "Teklif Gönderildi" }`

**Ara** — `GET /deals/search?company_id=company-...&stage=Yeni` (`deals:read`)

### Görevler (Tasks)

**Oluştur** — `POST /tasks` (`tasks:write`)

```json
// Request
{
  "title": "Acme ile takip görüşmesi",
  "companyId": "company-1735...-a1b2c3d4",
  "dueDate": "2026-09-05",
  "priority": "Medium",
  "assignee": "Atakan Zehir"
}
```

**Güncelle** — `PATCH /tasks/update?id=task-...` (`tasks:write`) — örn. `{ "status": "done" }`

**Ara** — `GET /tasks/search?company_id=...&status=todo&assignee=...` (`tasks:read`)

### Mail (organizasyon kutusu)

**Gönder** — `POST /mail/send` (`mail:send`)

```json
// Request
{
  "to": "musteri@example.com",
  "cc": ["ikinci@example.com"],
  "subject": "Teklif takibi",
  "html": "<p>Merhaba, teklifimizi inceleme fırsatınız oldu mu?</p>"
}
```

```json
// Response 200
{ "sent": true, "from": "satis@sirketiniz.com", "to": "musteri@example.com", "subject": "Teklif takibi" }
```

Organizasyonun Microsoft 365 kutusu bağlı değilse veya Azure kimlik bilgileri eksikse `400` döner. Gönderim, Gemba IQ'nun mevcut Microsoft Graph mail servisi üzerinden yapılır — OpenClaw'a hiçbir Microsoft/Azure kimlik bilgisi verilmez.

## 6. Yeniden Temas (Re-engagement)

Daha önce temas kurulmuş ama soğuyan fırsatları veya ılık/sıcak adayları
yeniden canlandırmak için kullanılan onay kuyruğu. `mail:send`'den farklı
olarak burada gönderim, insan onayından SONRA gerçekleşir — agent hiçbir
zaman bu akışta doğrudan, onaysız mail göndermez.

### Aday Profilleri arama

**Ara** — `GET /leads/search?segment=Warm,Hot&company=Viko` (`leads:read`)

`segment` virgülle ayrılmış bir veya daha fazla değer alır: `Cold`, `Warm`,
`Hot`. `company` parametresi opsiyoneldir, firma adına göre (case-insensitive,
kısmi eşleşme) filtreler.

```json
{
  "results": [
    {
      "id": "lead-...",
      "firstName": "Deniz",
      "lastName": "Erol",
      "email": "deniz.erol@viko.com.tr",
      "company": "Viko by Panasonic",
      "leadSegment": "Warm",
      "leadStatus": "Contacted"
    }
  ],
  "count": 1
}
```

### Taslak oluştur

**Oluştur** — `POST /outreach` (`outreach:write`)

```json
// Request
{
  "companyId": "company-...",           // opsiyonel
  "dealId": "deal-...",                  // opsiyonel, kaynak bir fırsatsa
  "leadProfileIds": ["lead-..."],        // opsiyonel, kaynak Aday Profilleriyse
  "recipients": [
    { "name": "Deniz Erol", "email": "deniz.erol@viko.com.tr" }
  ],
  "subject": "Gemba Partner - Yeniden Görüşelim mi?",
  "bodyHtml": "<p>Merhaba Deniz Bey,...</p>",
  "source": "manual-telegram"
}
```

```json
// Response 201
{ "created": true, "id": "outreach-1735...-a1b2c3d4", "data": { "...": "...", "status": "pending" } }
```

Yeni bir taslak her zaman `status: "pending"` ile başlar.

### Taslakları listele

**Ara** — `GET /outreach/search?status=pending` (`outreach:read`)

### Taslak güncelle (onay/red)

**Güncelle** — `PATCH /outreach/update?id=outreach-...` (`outreach:write`)

```json
// Onaylama örneği
{ "status": "approved", "approvedBy": "Atakan Zehir" }
```

```json
// Reddetme örneği
{ "status": "rejected", "rejectedReason": "Yanlış kişi seçilmiş" }
```

### Onaylanmış taslağı gönder

**Gönder** — `POST /outreach/send?id=outreach-...` (`outreach:send`)

Taslağın `status`'u `"approved"` DEĞİLSE `409` döner — bu, agent'ın veya
başka bir çağıranın onaysız bir taslağı yanlışlıkla göndermesini API
seviyesinde engeller.

```json
// Response 200
{
  "sent": true,
  "sender": "info@gembapartner.com",
  "timestamp": "2026-09-01T08:00:00.000Z"
}
```

Başarılı gönderimde otomatik olarak:
- Taslağın `status`'u `"sent"`, `sentAt` doldurulur.
- `dealId` verilmişse, o fırsatın `lastContactDate` alanı bugüne güncellenir
  (aşamasına dokunulmaz).
- İlgili şirketin Etkinlikler (Activities) geçmişine "Yeniden temas maili
  gönderildi" kaydı düşülür.

409 (uygun olmayan durum) dışında, hata formatı diğer tüm endpoint'lerle
aynıdır (bkz. §7 Hata formatı).

> **Güvenlik notu:** `outreach:write` skopu, bir taslağın `status`'unu
> `"approved"` yapmaya da yetiyor — yani aynı API key'e hem `outreach:write`
> hem `outreach:send` verilirse, agent teknik olarak kendi taslağını
> kendi onaylayıp hemen gönderebilir; API seviyesindeki `409` kontrolü
> sadece "onaysız" taslakları durdurur, "kimin onayladığını" doğrulamaz.
> Gerçek bir insan-onayı garantisi istiyorsanız, OpenClaw'ın entegrasyon
> key'ine `outreach:send` scope'unu VERMEYİN — gönderim SADECE panelin
> kendi oturum-bazlı `outreach-send-internal` route'u üzerinden yapılsın
> (bkz. panel dokümantasyonu). Bu durumda agent taslak oluşturup
> `outreach:read` ile durumu izleyebilir, ama gönderim daima panelden bir
> insan tarafından tetiklenir.

## 7. Hata formatı

Tüm hata yanıtları aynı şekli kullanır:

```json
{ "error": "İnsan tarafından okunabilir açıklama." }
```

| HTTP kodu | Anlamı |
|---|---|
| 400 | Eksik/geçersiz alan (örn. `name` yok, `companyId` bulunamadı) |
| 401 | Bearer key eksik, hatalı formatta, geçersiz veya iptal edilmiş |
| 403 | Key geçerli ama gerekli scope'a sahip değil |
| 404 | Kayıt bulunamadı (get/update) veya bilinmeyen action |
| 409 | Duplicate kayıt tespit edildi (`upsert:true` ile aşılabilir) |
| 500 | Sunucu/veritabanı hatası |

## 8. Notlar

- Tüm yazma işlemleri o API key'in bağlı olduğu **tek** organizasyona kilitlidir — key başka bir organizasyonun verisini asla göremez/değiştiremez.
- `data` içine otomatik olarak `integrationSource: "openclaw"` ve `integrationCredentialId` eklenir — hangi kaydın hangi entegrasyon üzerinden geldiğini ayırt etmek için.
- Her istek `integration_request_log` tablosuna (credential id, action, status code, entity) düşer — sorumlu bulma / kötüye kullanım tespiti için.
- Mevcut Supabase RLS politikaları, Auth akışı ve diğer `/api/organization/*`, `/api/gemini/*`, `/api/mail/*` uç noktaları bu değişiklikten etkilenmedi.
