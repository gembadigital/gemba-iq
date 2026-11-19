# AI Marketing Coach incelemesi — 19 Kasım 2026

İncelenen sürüm: `8b42042e58396f91beb5a60e6d0154efa8f23d93`.

Modül bir AI/model servisi çağırmıyordu. Gerçek CRM verilerinden sabit kurallarla bekleyen teklif/fırsat görevleri oluşturabiliyordu; bu nedenle tamamen işlevsiz değildi. Ancak yönetici raporunun bazı sonuçları ölçüme dayanmıyordu ve ekran açılışı görev kayıtlarını değiştiriyordu.

İzole gerçek motor testi, sahte CrmDb ile beş durumu doğruladı; canlı kayıtlar değiştirilmedi:

- Boş CRM verisinde üç görev oluşturuldu. Rapor yine %85 tamamlanma ve LinkedIn etkileşiminde %18 artış bildirdi.
- 21 gündür bekleyen bir Sent teklif için gerçek kural tabanlı takip görevi oluşturuldu.
- Son temas tarihi olmayan fırsat 16 gündür hareketsiz olarak sunuldu.
- Kimlikleri farklı, başlıkları aynı iki manuel görevden biri toplu görev kaydı sırasında kaldırıldı.
- Bu senaryolarda ağ/model çağrısı sayısı sıfırdı. Atamalar Atakan/Ersin olarak sabitti.

Kullanıcının işlevi yoksa kaldırma isteği kapsamında, güvenilir AI işlevi sunmayan modül menüden, pazarlama bölüm kartlarından ve üretim kodundan kaldırıldı. Eski ana rota pazarlama özetini gösterir; kayıtlı eski sekme de özete döner. Kayıtlı haftalık planlar ve görevler silinmez; veritabanı temizliği veya geçişi yapılmaz. Diğer AI özellikleri, teklif sonrası otomasyonlar ve görev yönetimi bu değişikliğin kapsamı dışındadır.

## Değişiklik doğrulaması

`npm run lint` ve `npm run build` başarılı. Derleme mevcut CSS seçici ve paket boyutu uyarılarını koruyor. İzole tarayıcı önizlemesinde eski `marketing-ai-coach` bağlantısı Genel Bakış ekranını açtı; açık Pazarlama menüsünde koç bağlantısı bulunmadı. Koç bileşeni/motoru ve yalnızca bunların kullandığı tipler üretim kodundan çıkarıldı. Canlı koç ekranı açılmadı; canlı veriye yazma/silme yapılmadı.
