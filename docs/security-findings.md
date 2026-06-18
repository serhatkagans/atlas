# GençTek Atlas — Güvenlik Bulguları Raporu (Form & XSS)

Bu rapor, GençTek Atlas projesinin Etkinlik ve Proje kayıt formları, veritabanı yazma süreçleri ve arayüz render (gösterim) mantığı üzerindeki XSS (Cross-Site Scripting), URL Enjeksiyonu, Dosya Yükleme ve Form Manipülasyonu testlerinin sonuçlarını ve tespit edilen açıkları içerir.

## 1. Güvenlik Test Bulguları Tablosu

Aşağıdaki tabloda form alanlarına yönelik gerçekleştirilen test senaryoları, girdi payload'ları ve sistemin davranışları özetlenmiştir:

| Alan | Payload | Davranış | Beklenen | Risk | Durum |
| :--- | :--- | :--- | :---: | :---: | :---: |
| **Metin Alanları (XSS-1)** | `<script>alert('XSS-1')</script>` | HTML Karakter Kaçırma (Escaping) ile düz metin olarak gösterildi. | AÇILMAMALI | Yok | Geçti |
| **Metin Alanları (XSS-2)** | `<img src=x onerror=alert('XSS-2')>` | HTML Karakter Kaçırma ile etiketler etkisiz kılındı. | AÇILMAMALI | Yok | Geçti |
| **Metin Alanları (XSS-3)** | `<svg onload=alert('XSS-3')>` | HTML Karakter Kaçırma ile etiketler etkisiz kılındı. | AÇILMAMALI | Yok | Geçti |
| **URL Alanları (XSS-4)** | `javascript:alert('XSS-4')` | `demoUrl` veya `baglanti` alanlarında tıklandığında **tarayıcıda scripti çalıştırdı (DOM XSS).** | AÇILMAMALI | **YÜKSEK** | **BAŞARISIZ** |
| **Metin Alanları (XSS-5)** | `"><script>alert('XSS-5')</script>` | HTML Karakter Kaçırma ile çift tırnak ve büyüktür sembolleri kaçırıldı. | AÇILMAMALI | Yok | Geçti |
| **URL (Enjeksiyon-1)** | `javascript:alert(1)` | `baglanti` ve `githubUrl` form alanlarında (eğer regex kontrolü yoksa) Firestore'a yazıldı. | HATA VERMELİ | **YÜKSEK** | **BAŞARISIZ** |
| **URL (Enjeksiyon-2)** | `data:text/html,<script>alert(1)</script>` | URL formatı olarak kabul edilerek tıklandığında yeni sekmede scripti çalıştırdı. | HATA VERMELİ | **YÜKSEK** | **BAŞARISIZ** |
| **URL (Enjeksiyon-3)** | `ftp://zararli.site` | `http/https` kontrolü aşılırsa kabul edildi. | HATA VERMELİ | Orta | Bireysel |
| **URL (Enjeksiyon-4)** | `abc` (URL değil) | Form HTML5 doğrulayıcıları tarafından yakalandı ve gönderilmedi. | HATA VERMELİ | Yok | Geçti |
| **Dosya (Boyut)** | 10MB JPEG Yükleme | Form boyutu algıladı, storage kuralları ve istemci dosyayı reddetti. | REDDEDİLMELİ | Yok | Geçti |
| **Dosya (Uzantı-1)** | `.exe` Dosyası Yükleme | Form `image/*` filtresiyle, Storage ise contentType kontrolüyle dosyayı engelledi. | REDDEDİLMELİ | Yok | Geçti |
| **Dosya (Uzantı-2)** | `.php` dosyasını `.jpg` yapma | Storage kuralları contentType başlığına güvendiği için izin verdi, ancak static hosting PHP yorumlamadığı için kod çalıştırılamadı. | REDDEDİLMELİ | Düşük | Risk Var |
| **Dosya (Boyut-2)** | 0 byte Dosya Yükleme | Form ve Firebase Storage tarafından engellenmedi (boş dosya yüklenebildi). | REDDEDİLMELİ | Düşük | Risk Var |
| **Manipülasyon-1** | Boş Form Gönderme | Formda yer alan `required` alanlar sebebiyle engellendi. | HATA VERMELİ | Yok | Geçti |
| **Manipülasyon-2** | 10.000 Karakter Girme | İstemcideki `maxlength` kaldırılırsa Firestore kuralları uzunluk kontrolü yapmadığı için kaydedildi. | HATA VERMELİ | Düşük | Risk Var |
| **Manipülasyon-3** | Negatif Katılımcı Sayısı | İstemcideki `min="1"` bypass edilirse Firestore negatif sayıları kaydetti. | HATA VERMELİ | Düşük | Risk Var |

---

## 2. Kritik Güvenlik Açıkları Detayları

### 🚨 Bulgusu 1: URL Bağlantıları Üzerinden DOM XSS (Kritik Açık)
* **Açıklama**: Etkinlik detay sayfasındaki `baglanti` veya proje kartlarındaki/detaylarındaki `demoUrl`, `githubUrl` ve `promptDosyasiUrl` linkleri, dinamik HTML render edilirken doğrudan `href="${escapeHtml(url)}"` içine basılmaktadır. `escapeHtml()` fonksiyonu HTML etiketlerini (`<`, `>`) kaçırır fakat `javascript:alert(1)` gibi tehlikeli URI şemalarını temizlemez.
* **Etki**: Kullanıcı forma veya doğrudan Firestore veritabanına `javascript:alert(document.cookie)` yazdığında, bu içeriğin kartta veya detay modalında "Demosuna Git" butonuna basıldığı an kurbanın tarayıcısında çalıştırılmasına (Stored XSS) sebep olur.
* **Önerilen Çözüm**: Render edilmeden önce URL şeması kontrol edilmeli, yalnızca `http:` veya `https:` protokollerine izin verilmelidir.

```javascript
// Güvenli URL Temizleme Fonksiyonu (detail.js ve cards.js için):
function sanitizeUrl(urlStr) {
  if (!urlStr) return '';
  const trimmed = urlStr.trim();
  // Yalnızca http veya https şemalarına izin ver
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return '#'; // Güvensiz protokoller yerine boş/etkisiz link koy
}
```

---

## 3. Ekip 4 ve Ekip 5 (Form Geliştiricileri) İçin Öneriler

Aşağıdaki önlemlerin form bileşenlerinde (`forms.js`) sıkılaştırılması gerekmektedir:

1. **Gelişmiş URL Doğrulaması**:
   Yalnızca HTML5 `type="url"` özelliğine güvenilmemeli, form submit edilmeden önce URL alanlarının regex ile `^https?://` yapısında olduğu doğrulanmalıdır.
   
2. **Boş Dosya Kontrolü**:
   Dosya yükleme olayında dosya boyutu kontrolüne `file.size === 0` durumu eklenerek boş dosyaların yüklenmesi engellenmelidir.

3. **Güvenli Dosya Türü Tespiti (MIME Sniffing)**:
   Firebase Storage'a yüklenen görsellerin sadece dosya adına veya tarayıcının gönderdiği `contentType` değerine göre doğrulanması risklidir. Firebase Storage kurallarına eklenebilecek ek kontroller araştırılmalıdır.
