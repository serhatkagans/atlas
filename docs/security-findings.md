# GençTek Atlas — Güvenlik Bulguları Raporu (Firestore & Auth)

Bu rapor, GençTek Atlas projesinin Firestore veritabanı kuralları, Firebase Storage kuralları ve kimlik doğrulama (Auth) mekanizmalarına yönelik gerçekleştirilen güvenlik testlerinin sonuçlarını ve tespit edilen açıkları içerir.

## 1. Güvenlik Test Senaryoları ve Sonuçları

Gerçekleştirilen testlerin özet tablosu aşağıdadır:

| Test | Açıklama | Beklenen | Sonuç | Risk | Durum |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **TEST 1** | Anonim kullanıcı `onaylandi: true` ile kayıt oluşturabilir mi? | DENIED | **DENIED** | - | Geçti |
| **TEST 2** | Anonim kullanıcı onaylanmış kayıtları okuyabilir mi? | ALLOWED | **ALLOWED** | - | Geçti |
| **TEST 3** | Anonim kullanıcı başka birinin kaydını silebilir mi? | DENIED | **DENIED** | - | Geçti |
| **TEST 4** | Yetkisiz kullanıcı `onaylandi` alanını `true` yapabilir mi? | DENIED | **DENIED** | - | Geçti |
| **TEST 5** | Yetkili Moderatör kayıtları güncelleyip onaylayabilir mi? | ALLOWED | **ALLOWED** | - | Geçti |

---

## 2. Tespit Edilen Güvenlik Açıkları ve Entegrasyon Riskleri

Yapılan kural (rules) ve kod analizlerinde, Ekip 1'in gözden kaçırdığı bazı kritik güvenlik ve fonksiyonel riskler tespit edilmiştir.

### Bulgusu 1: Firebase Storage — Anonim Dosya Üzerine Yazma ve Silme Açığı (Yüksek Risk)
* **Açıklama**: Mevcut `storage.rules` dosyasında, `/events` ve `/projects` yolları altındaki görseller ile `/prompts` altındaki dosyalar için `allow write: if isValidImageType() && isUnderSizeLimit();` kuralı geçerlidir. Firebase Storage'da `write` kuralı; **yazma (create)**, **güncelleme (update)** ve **silme (delete)** yetkilerinin tamamını kapsar. 
* **Etki**: Herhangi bir anonim saldırgan, sistemdeki mevcut bir görselin adı ile aynı adda dosya yükleyerek o dosyayı değiştirebilir (deface/overwrite) veya doğrudan silebilir.
* **Gerekli Eylem**: Yazma yetkisi `create` ve `update/delete` olarak bölünmeli, silme ve güncelleme yetkisi sadece moderatörlere verilmelidir.

### Bulgusu 2: Firestore — "onaylandi" Alanının Boş Gönderilmesi Durumunda Listeleme Hatası (Orta Risk)
* **Açıklama**: Firestore kurallarında `allow create: if !touchesOnaylandi() || request.resource.data.onaylandi == false;` kuralı bulunmaktadır. Bu durum, kaydı oluşturan anonim kullanıcının `onaylandi` alanını hiç göndermemesine izin verir. Ancak Moderasyon ve Listeleme ekranlarında sorgular `where('onaylandi', '==', false)` ve `where('onaylandi', '==', true)` şeklinde atılmaktadır. 
* **Etki**: Eğer bir kayıt `onaylandi` alanı olmadan oluşturulursa, bu kayıt ne onaylılar listesine ne de moderatörün onay bekleyenler listesine girebilir (veri havada asılı kalır ve kaybolur).
* **Gerekli Eylem**: Firestore kurallarında `onaylandi` alanının mutlaka `false` olarak gönderilmesi zorunlu kılınmalıdır.

### Bulgusu 3: Entegrasyon Şartı — Moderatör Doküman Kimliği (UID) Gereksinimi (Düşük Risk / Bilgilendirme)
* **Açıklama**: Firestore kurallarındaki `isModerator()` fonksiyonu, `exists(/databases/$(database)/documents/moderators/$(request.auth.uid))` kontrolünü yapmaktadır. Bu durum, `/moderators` koleksiyonundaki doküman ID'lerinin (Key) mutlaka moderatörlerin **Firebase Auth UID**'si olması gerektiği anlamına gelir. 
* **Etki**: Eğer moderatör kayıtları veritabanında rastgele ID'lerle oluşturulur ve sadece içeride e-posta alanı tutulursa, kurallar bu kullanıcının moderatör olduğunu doğrulayamaz ve panel işlemleri yetki hatası verir.
* **Gerekli Eylem**: Moderatör eklenirken doküman ID'sinin auth UID'si ile eşleştiğinden emin olunmalıdır.

---

## 3. Ekip 1 İçin Kural Güncelleme Önerileri

Açıkların kapatılması için aşağıdaki kural güncellemelerinin Ekip 1 tarafından uygulanması önerilir:

### A. Firestore Kuralları (`firestore.rules`) Güncellemesi:
Anonim kayıt oluşturulurken `onaylandi` alanının varlığı ve varsayılan olarak `false` olması zorunlu tutulmalıdır:

```javascript
// Eski Kural:
// allow create: if !touchesOnaylandi() || request.resource.data.onaylandi == false;

// Önerilen Yeni Kural:
allow create: if request.resource.data.onaylandi == false;
```

### B. Storage Kuralları (`storage.rules`) Güncellemesi:
Anonim kullanıcıların sadece yeni dosya yüklemesine izin verilmeli, güncelleme ve silme işlemleri yetkilendirilmelidir:

```javascript
// Eski Kural (events ve projects için):
// allow write: if isValidImageType() && isUnderSizeLimit();

// Önerilen Yeni Kural (events ve projects için):
allow create: if isValidImageType() && isUnderSizeLimit();
allow update, delete: if request.auth != null && 
                         firestore.exists(/databases/(default)/documents/moderators/$(request.auth.uid));
```

Aynı şekilde prompt dosyaları için de `create` ve `update/delete` yetkileri ayrılmalıdır.
