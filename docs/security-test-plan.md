# GençTek Atlas — Güvenlik Test Planı (Security Test Plan)

Bu doküman, GençTek Atlas web uygulamasının güvenlik sınırlarını, kullanılacak test araçlarını, test senaryolarını ve test ortamı koşullarını tanımlar.

## 1. Test Kapsamı

Güvenlik testleri temel olarak aşağıdaki dört ana alana odaklanır:

1. **Firestore Güvenlik Kuralları (Security Rules)**: Yetkilendirme modeli, veri oluşturma sınırları ve rol bazlı erişim denetimi (moderatör yetkileri).
2. **Kimlik Doğrulama (Auth Security)**: Anonim girişlerin yetki sınırları ve yetkisiz e-posta adreslerinin moderasyon paneline erişim durumları.
3. **Form Girdileri ve XSS (Cross-Site Scripting)**: Metin girdilerinin arayüzde güvenli render edilmesi, tehlikeli HTML etiketleri ve URI şemalarının (`javascript:`, `data:`) temizlenmesi.
4. **Dosya Yükleme (Firebase Storage)**: İzin verilen dosya boyut sınırları, MIME türü (contentType) kısıtlamaları ve silme/güncelleme yetkilerinin doğrulanması.

---

## 2. Test Araçları

Testlerin sağlıklı yürütülebilmesi için aşağıdaki araçlar kullanılır:

* **Tarayıcı Geliştirici Araçları (Browser DevTools)**:
  * **Console**: JavaScript hataları, payload tetiklenme durumları ve XSS tetikleyicilerinin takibi.
  * **Network**: Firebase REST API / Firestore gRPC çağrılarının izlenmesi, sahte istek oluşturma.
  * **Application**: URL hash durumları ve oturum verilerinin incelenmesi.
* **Firebase Emulator Suite**:
  * Yerel test ortamında Firestore, Storage ve Auth kurallarını test etmek amacıyla kullanılır.
  * Hızlı sıfırlanabilir ve izole veri tabanı yapısıyla kuralları debug etmek için idealdir.
* **Manuel Sızma ve Girdi Manipülasyonu**:
  * Form alanlarının tarayıcı seviyesindeki (HTML5) `required`, `maxlength` ve `type` kısıtlamalarının DevTools üzerinden silinerek sunucuya/veritabanına istek atılması.

---

## 3. Test Senaryoları Listesi

Uygulamada koşturulacak ve doğrulanacak test durumları aşağıda yapılandırılmıştır:

### A. Firestore & Auth Yetkilendirme Testleri (Ekip 11 Kapsamı)
* **TS-01**: Anonim kullanıcının `onaylandi: true` değeriyle yeni etkinlik/proje kaydı oluşturma girişimi. (Beklenen: `PERMISSION_DENIED`)
* **TS-02**: Anonim kullanıcının onaylı (`onaylandi == true`) verileri listelemesi/okuması. (Beklenen: `ALLOWED`)
* **TS-03**: Anonim kullanıcının mevcut bir kaydı silme girişimi. (Beklenen: `PERMISSION_DENIED`)
* **TS-04**: Giriş yapmış fakat yetkilendirilmemiş (moderatör olmayan) kullanıcının bir kaydı onaylama (`onaylandi: true`) güncelleme denemesi. (Beklenen: `PERMISSION_DENIED`)
* **TS-05**: `/moderators` listesinde kayıtlı yetkili hesabın moderasyon işlemlerini yürütmesi. (Beklenen: `ALLOWED`)

### B. Form Girdileri, XSS ve Dosya Yükleme Testleri (Ekip 12 Kapsamı)
* **TS-06**: Metin alanlarına script etiketleri (`<script>`, `<img>`, `<svg>`) yerleştirilerek HTML enjeksiyonu denemesi. (Beklenen: Alert tetiklenmemeli, kod kaçırılmalı)
* **TS-07**: URL alanlarına (`baglanti`, `demoUrl`) script protokolleri (`javascript:`, `data:`) girilerek DOM XSS denemesi. (Beklenen: Reddedilmeli / tıklandığında kod çalışmamalı)
* **TS-08**: Form kısıtlamaları bypass edilerek 10MB boyutunda görsel yükleme girişimi. (Beklenen: Firebase Storage tarafından engellenmeli)
* **TS-09**: `.exe` gibi güvensiz uzantılara sahip dosyaların yüklenmesi. (Beklenen: Reddedilmeli)
* **TS-10**: Dosya uzantısını `.jpg` yapılmış bir betiğin (ör. `.php`) sisteme yüklenmesi. (Beklenen: Stattic hosting sebebiyle kod olarak yorumlanmamalı)
* **TS-11**: Formun tüm alanları boş bırakılarak veya eksik veriyle gönderilmeye zorlanması. (Beklenen: Form gönderilmemeli, hata mesajları gösterilmeli)
* **TS-12**: Metin alanlarına sınırların üzerinde (ör. 10.000 karakter) uzunlukta metin girilmesi. (Beklenen: Kaydedilmemeli)
* **TS-13**: Katılımcı sayısı gibi nümerik alanlara negatif değerler girilmesi. (Beklenen: Kaydedilmemeli)

---

## 4. Test Ortamı (Staging vs Production)

* **Yerel / Staging Ortamı (Firebase Emulator)**:
  Güvenlik testlerinin büyük çoğunluğu, özellikle silme, güncelleme ve manipülasyon denemeleri canlı veritabanını bozmamak için **Firebase Emulator Suite** üzerinde gerçekleştirilir.
* **Canlı Ortam (Production)**:
  Uygulama Firebase Hosting'de yayınlandıktan sonra, okuma yetkileri (`read`) ve normal kayıt ekleme akışlarının güvenli SSL (https) bağlantısı altında sorunsuz çalıştığı canlı ortamda doğrulanır.
