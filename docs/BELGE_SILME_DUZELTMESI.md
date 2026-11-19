# Belge silme — 19 Kasım 2026

Müşteri kartı ve Belgeler ekranı aynı DocumentExplorer/deleteDocument akışını kullanır. Eski istemci UPDATE is_deleted=true işlemi, belgeleri is_deleted=false ile sınırlayan SELECT RLS kuralıyla çakışıyordu. Canlı PostgreSQL günlüklerindeki hata doğrulandı; eski davranış geçici PostgreSQL veritabanında üretim şemasıyla yeniden oluşturuldu.

Yeni POST /api/organization/documents/delete uç noktası mevcut organizasyon catch-all işlevindedir; Vercel işlev sayısı artmaz. Bearer oturumu Supabase auth.getUser ile doğrulanır, seçili organizasyonun üyeliği resolveOrganizationAccess ile doğrulanır. İstemcinin gönderdiği organizasyon, kullanıcı veya güncelleme alanları kullanılmaz. Sunucudaki mevcut servis istemcisi yalnızca doğrulanmış organizasyon + belge kimliği + is_deleted=false koşullarıyla is_deleted=true yazar; aynı mutasyon üzerinde kapsam koşulları korunur. Yalnızca gerçekten değişen tek satır başarı sayılır. Başka organizasyon, eksik/silinmiş belge 404; doğrulanmamış oturum 401; yetkisiz organizasyon 403 döner.

RLS kuralları ve tablo yetkileri değiştirilmedi. Silinmiş kayıtlar tarayıcıya açılmadı, SECURITY DEFINER işlevi eklenmedi, fiziksel Storage dosyası silinmedi. Kaynak dosya ve kayıt yedekleme için korunur. Gerçek müşteri belgesi test amacıyla değiştirilmedi.

Doğrulama: 16 sunucu/istemci silme testi, üretim şemasını kullanan geçici PostgreSQL üzerinde 46 izolasyon/güvenlik testi, TypeScript ve üretim derlemesi geçti. PostgreSQL testleri eski RLS reddini, başarısız işlemde kayıt korunmasını, sunucu komutunu, başka organizasyondan gizliliği ve Storage korunmasını kapsar. Kimliği doğrulanmış gerçek kullanıcıyla gerçek belge silme ajan tarafından yapılmadı; kullanıcı yenilemeden sonra kendi belgesinde tekrar deneyebilir.
