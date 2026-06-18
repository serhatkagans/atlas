# GençTek Atlas

> Türkiye genelindeki gençlik teknoloji etkinliklerini ve projelerini interaktif bir harita üzerinde görselleştiren ve listeyen açık kaynaklı ekosistem platformu.

GençTek Atlas; gençlerin geliştirdiği yenilikçi projeleri ve ekosistemdeki teknoloji etkinliklerini tek bir merkezde toplayarak erişilebilirliği artırmayı hedefler. Tamamen statik ve sunucusuz (serverless) mimaride çalışan bu sistem, Firebase altyapısı üzerinde güvenli ve yüksek performanslı bir şekilde çalışmaktadır.

---

## 🗺️ Ne Yapar?

Platform, kullanıcıların Türkiye'nin 81 ilindeki teknoloji faaliyetlerini keşfetmesine olanak tanır:
* **Etkileşimli Harita**: Harita üzerinden şehirlere tıklayarak o ile ait etkinlik ve projeleri filtreleme.
* **Akıllı Filtreleme**: Tema, il, format (çevrimiçi/yüz yüze/hibrit) ve arama çubuğu üzerinden anlık (client-side) süzme.
* **Kayıt Formları**: İller ve temalarla ilişkilendirilmiş, dosya yükleme destekli Etkinlik ve Proje kayıt formları.
* **Moderasyon Paneli**: Yetkisiz işlemlerin veritabanı kurallarıyla engellendiği, canlı istatistiklere sahip onay/red/düzenleme paneli.
* **Detay Modal Yapısı**: İlgili projelerin çapraz listelendiği, URL yönlendirmeli detay ekranları.

---

## 🚀 Canlı Demo

Uygulama Firebase Hosting üzerinde yayınlanmaktadır:
👉 **[Canlı Demo Linki](https://genctek-atlas.firebaseapp.com)**

---

## 🌟 Özellikler

* **Mobil Öncelikli Responsive Tasarım**: Telefon, tablet ve masaüstü cihazlar için tamamen duyarlı dark-theme arayüzü.
* **URL Hash Yönlendirme (Routing)**: Paylaşılabilir link yapısı (ör. `#etkinlik/ID` veya `#il=34`).
* **Debounce Arama Kalkanı**: Arama çubuğunda yazarken tarayıcıyı yormayan 300ms gecikmeli filtreleme tetikleyicisi.
* **Erişilebilirlik (A11y)**: Klavye ile gezinme (ESC tuşu ile modalleri kapama, odaklama) ve ekran okuyucu uyumluluğu (`aria-label` tanımlamaları).
* **Güvenlik Test Planlı Altyapı**: XSS enjeksiyonları, sahte veri yüklemeleri ve yetkisiz veritabanı güncellemelerine karşı Firestore & Storage kuralları ile güçlendirilmiş mimari.

---

## 🛠️ Teknoloji Stack

* **Frontend**: Vanilla HTML5, Vanilla CSS3 (Custom Variables, Segmented UI, Bottom Drawers), Modern Vanilla ES6+ Javascript.
* **Harita Bileşeni**: **Leaflet.js** ve **tr-geojson** (Türkiye illeri sınır koordinat verisi).
* **Veritabanı (Database)**: Firebase Firestore v10 Modular SDK.
* **Depolama (Storage)**: Firebase Storage v10 (Görsel ve prompt PDF yüklemeleri için).
* **Kimlik Doğrulama (Auth)**: Firebase Authentication (Anonim kullanıcı oturumu ve moderatör girişi).
* **Sunucu & Yayınlama (Hosting)**: Firebase Hosting (Statik web barındırma).

---

## 📊 Firebase Yapısı (Koleksiyonlar ve Alanlar)

Veritabanında 3 ana koleksiyon bulunmaktadır:

### 1. `events` (Etkinlikler)
* `etkinlikAdi` (string): Etkinliğin başlığı.
* `tema` (string): İlişkilendirilen GençTek teması ID'si (ör. `yapay-zeka`).
* `format` (string): `yuz-yuze`, `cevrimici` veya `hibrit`.
* `il` (string): Plaka kodu (ör. `06`).
* `tarih` (string): Tarih verisi (YYYY-MM-DD).
* `katilimciSayisi` (number): Tahmini veya net katılımcı adedi.
* `aciklama` (string): Açıklama metni (Maks. 500 karakter).
* `baglanti` (string): Başvuru veya bilgi linki.
* `gorselUrl` (string): Yüklenen afişin depolama adresi (Opsiyonel).
* `onaylandi` (boolean): Moderatör onay durumu (Varsayılan: `false`).
* `reddedildi` (boolean): Moderatör reddetme durumu.
* `reddSebebi` (string): Reddetme gerekçesi.
* `oneCikan` (boolean): Vitrine taşınacak içerik işareti (Opsiyonel).
* `timestamp` (FieldValue): Sunucu saatiyle oluşturulma zamanı.

### 2. `projects` (Projeler)
* `projeAdi` (string): Projenin başlığı.
* `tema` (string): İlişkilendirilen tema ID'si.
* `takimAdi` (string): Geliştirici takım adı.
* `katilimciIller` (array): Projeye katılan illerin plaka kodları listesi.
* `aciklama` (string): Açıklama metni (Maks. 1000 karakter).
* `githubUrl` (string): GitHub repo adresi (Zorunlu, `github.com` doğrulamalı).
* `demoUrl` (string): Canlı demo adresi (Opsiyonel).
* `gorselUrl` (string): Proje görseli adresi (Opsiyonel).
* `promptDosyasiUrl` (string): AI promptlarının yer aldığı dosya adresi (Opsiyonel).
* `etikOnay` (boolean): Etik beyan onay kutusu (Zorunlu).
* `onaylandi` (boolean): Moderatör onay durumu (Varsayılan: `false`).
* `reddedildi` (boolean): Moderatör reddetme durumu.
* `reddSebebi` (string): Reddetme gerekçesi.
* `oneCikan` (boolean): Öne çıkan proje işareti (Opsiyonel).
* `timestamp` (FieldValue): Oluşturulma zamanı.

### 3. `moderators` (Moderatör Yetkileri)
* `email` (string): Yetkili e-posta adresi.
* *Not*: Firestore kuralları için bu dokümanın ID'si, moderatörün Firebase Auth `uid` değeriyle tam olarak eşleşmelidir.

---

## 💻 Kurulum ve Çalıştırma

Uygulamayı yerel bilgisayarınızda çalıştırmak için:

1. Depoyu bilgisayarınıza kopyalayın:
   ```bash
   git clone https://github.com/serhatkagans/atlas.git
   ```
2. Klasöre girin:
   ```bash
   cd atlas
   ```
3. Firebase Emulator Suite veya statik bir HTTP sunucusu (Live Server, http-server vb.) yardımıyla `public` dizinini sunun:
   ```bash
   # Örnek http-server kullanımı:
   npx http-server public/
   ```
4. Tarayıcınızda `http://localhost:8080` adresine gidin.

---

## 👥 Ekipler ve Görevler (15 Ekip)

Proje, 15 uzman ekibin paralel çalışmasıyla tamamlanmıştır:

* **Ekip 1 — Firebase Kurulumu & Altyapı**: Firebase entegrasyonu, veritabanı kuralları ve ilk iskelet.
* **Ekip 2 — Şehir ve Tema JSON Verileri**: Şehir plakaları koordinatları ve 18 kurumsal temanın hazırlanması.
* **Ekip 3 — Türkiye Haritası Bileşeni**: Leaflet.js + GeoJSON katmanlı Türkiye haritasının kodlanması.
* **Ekip 4 — Etkinlik Kayıt Formu**: Validasyonlu ve dosya yüklemeli etkinlik ekleme formu.
* **Ekip 5 — Proje Kayıt Formu**: Bölgelere göre il arama filtreli, AI prompt yüklemeli proje kayıt formu.
* **Ekip 6 — Listeleme & Kart Bileşenleri**: Approved listeleri çeken, SVG ikonlu dinamik kart render motoru.
* **Ekip 7 — Filtreleme & Arama**: Custom il arama kutulu, URL hash senkronizasyonlu filtreleme paneli.
* **Ekip 8 — Moderasyon Paneli**: Canlı sayaç istatistiklerine sahip onay/red/inline düzenleme ekranı.
* **Ekip 9 — Detay Sayfaları**: Kayar modal animasyonlu, çapraz ilgili projeler listelemeli detay ekranı.
* **Ekip 10 — Ana Sayfa & Canlı İstatistikler**: Üst navbar, footer, genel UI ve istatistik şeritleri.
* **Ekip 11 — Firestore & Auth Güvenlik Testleri**: Yetki aşımı ve veri bypass testleri.
* **Ekip 12 — Form & XSS Güvenlik Testleri**: Girdi alanlarına yönelik injection ve dosya sınır testleri.
* **Ekip 13 — Repo Tarama & Raporlama**: Gizli veri sızıntı taraması, genel rapor birleştirme ve yama doğrulama.
* **Ekip 14 — Proje Dokümantasyonu**: README, prompts, ethics ve LICENSE yönergelerinin yazılması.
* **Ekip 15 — Firebase Hosting & Deployment**: CI/CD entegrasyonu ve canlıya yayınlama süreçleri.

---

## 🤝 Katkıda Bulunma

1. Bu depoyu çatallayın (Fork).
2. Yeni bir özellik dalı (Feature Branch) oluşturun: `git checkout -b feature/yenilik`
3. Değişikliklerinizi commitleyin: `git commit -m 'Yenilik eklendi'`
4. Dalınızı pushlayın: `git push origin feature/yenilik`
5. Bir Pull Request açarak incelemeye gönderin.

---

## 📄 Lisans

Bu proje **MIT Lisansı** altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına göz atabilirsiniz.