# Güvenlik Bulguları Raporu

Bu rapor, GençTek Atlas projesinin Firestore veritabanı kuralları, Firebase Storage kuralları ve kimlik doğrulama (Auth) mekanizmalarına yönelik gerçekleştirilen güvenlik testlerinin ve form testlerinin sonuçlarını ve tespit edilen açıkları içerir.

---

## Yüksek Risk Bulguları

### 1. Bağlantı Alanlarında javascript: ve data: Protokolleri Üzerinden Stored DOM XSS
* **Açıklama**: Etkinlik kayıt ve proje formlarındaki `baglanti`, `demoUrl` ve `githubUrl` alanlarına girilen URL'ler, detay pencerelerinde ve kartlarda `href="${escapeHtml(url)}"` biçiminde render edilmektedir. `escapeHtml()` fonksiyonu HTML etiketlerini filtreler ancak `javascript:alert(1)` veya `data:text/html,...` gibi tehlikeli URI şemalarını temizlemez.
* **Etki**: Kötü niyetli kullanıcılar form üzerinden veya doğrudan veritabanına yazarak bu alanlara script kodları enjekte edebilir. Diğer kullanıcılar veya moderatörler butona tıkladığında script kurbanın tarayıcısında çalışır. Bu durum oturum çalma (Session Hijacking) veya yetki yükseltme (Privilege Escalation) riskine yol açar.
* **Çözüm Önerisi**: URL alanları render edilmeden önce kontrol edilmeli ve sadece `http://` veya `https://` ile başlayan güvenli protokollere izin veren bir `sanitizeUrl()` temizlik fonksiyonu uygulanmalıdır.
* **Durum**: Açık (Kod geliştirme takımları bilgilendirildi, çözüm önerildi).

### 2. Firebase Storage — Dosya Silme ve Üzerine Yazma Açığı (Defacement)
* **Açıklama**: Mevcut `storage.rules` dosyasındaki `allow write` kuralı, dosya oluşturma (create), güncelleme (update) ve silme (delete) yetkilerinin tamamını anonim kullanıcılara vermektedir.
* **Etki**: Herhangi bir kullanıcı, sistemdeki mevcut bir görselin adı ile aynı adı taşıyan bir dosya yükleyerek o görseli değiştirebilir (deface/overwrite) veya doğrudan silebilir.
* **Çözüm Önerisi**: Anonim kullanıcılar için yazma yetkisi sadece `create` seviyesine indirilmeli; `update` ve `delete` işlemleri yalnızca `/moderators` koleksiyonundaki yetkili moderatörlerle sınırlandırılmalıdır.
* **Durum**: Açık (Ekip 1 kuralları güncellemesi için bilgilendirildi).

---

## Orta Risk Bulguları

### 1. Firestore — Eksik "onaylandi" Değeriyle Kayıt Oluşturulması ve Askıda Kalan Veri Problemi
* **Açıklama**: Firestore kuralları `onaylandi` alanının hiç gönderilmemesine izin vermektedir (`!touchesOnaylandi()`). Ancak moderasyon ve liste ekranlarındaki tüm sorgular `where('onaylandi', '==', false)` ve `where('onaylandi', '==', true)` filtreleriyle atılmaktadır.
* **Etki**: Bir kayıt `onaylandi` parametresi olmadan veritabanına eklenirse, bu kayıt ne onaylılar listesine ne de moderatörün onay bekleyenler listesine girebilir. Sistemde veri asılı kalır ve veritabanı kirliliği oluşur.
* **Çözüm Önerisi**: Firestore `create` kuralları güncellenerek kayıt ekleme esnasında `onaylandi` alanının bulunması ve değerinin `false` olması zorunlu tutulmalıdır (`request.resource.data.onaylandi == false`).
* **Durum**: Açık (Ekip 1 kuralları güncellemesi için bilgilendirildi).

---

## Düşük Risk Bulguları

### 1. Veritabanı Düzeyinde Veri Uzunluğu ve Değer Sınırlandırması Eksikliği
* **Açıklama**: Firestore kuralları, metin alanlarının uzunluklarını (örneğin description alanı için 1000 karakter sınırı) ve sayısal değerlerin aralıklarını (katılımcı sayısının negatif girilebilmesi) veritabanı düzeyinde kontrol etmemektedir.
* **Etki**: İstemci tarafındaki form doğrulamaları (DevTools üzerinden) bypass edilirse, veritabanına çok büyük boyutlarda veri yazılarak veritabanı kaynakları tüketilebilir (Denial of Service) veya mantıksız veriler eklenebilir.
* **Çözüm Önerisi**: Firestore kurallarına `request.resource.data.aciklama.size() <= 1000` ve `request.resource.data.katilimciSayisi >= 1` gibi veri tipi ve aralık doğrulama koşulları eklenmelidir.
* **Durum**: Açık (Ekip 1 bilgilendirildi).

### 2. Firebase Storage — Boş (0 Byte) Dosya Yükleme İzni
* **Açıklama**: Firebase Storage kuralları minimum dosya boyutu kontrolü yapmamakta, bu da boş dosyaların yüklenmesine izin vermektedir.
* **Etki**: Depolama alanı kirliliği ve hatalı dosya referansları oluşması.
* **Çözüm Önerisi**: Kurala `request.resource.size > 0` şartı eklenmelidir.
* **Durum**: Açık.

---

## Bilgi Notu

### Firebase İstemci apiKey'i Neden Gizli Değildir ve Güvenlik Nasıl Sağlanır?

Firebase istemci anahtarı (`apiKey`), klasik backend API anahtarlarından (örneğin AWS gizli anahtarı veya ödeme sistemi API anahtarı) temelde farklıdır. Klasik backend anahtarları tüm sisteme tam yetkili erişim sunarken, Firebase `apiKey` yalnızca uygulamanızın hangi Firebase projesine bağlanacağını tanımlayan bir **proje kimlik numarası (ID)** işlevi görür.

İstemci tarafında çalışan web ve mobil uygulamalarda, tarayıcının Firebase servislerine istek gönderebilmesi için bu anahtarın kod içerisinde açıkça yer alması zorunludur ve gizlenemez. 

**Güvenlik istemci anahtarını gizleyerek değil; sunucu tarafında çalışan ve bypass edilmesi imkansız olan Firestore ve Firebase Storage güvenlik kuralları (Security Rules) ile sağlanır.** Bu kurallar, hangi kullanıcının hangi verileri okuyabileceğini ve yazabileceğini kimlik doğrulama (Auth) durumuna göre kontrol eder. Bu nedenle, `apiKey` bilgisinin açıkta olması tek başına bir güvenlik açığı oluşturmaz; sistemin güvenliği kuralların doğru yapılandırılmasına bağlıdır.
