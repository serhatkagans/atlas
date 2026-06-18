# Kullanılan AI Promptları

Bu dokümanda, GençTek Atlas projesinin geliştirilmesinde ve güvenlik denetimlerinde rol alan 15 ekibin yapay zeka (AI) asistanlarına verdiği komutlar (promptlar), kullanılan araçlar ve elde edilen çıktılar yer almaktadır.

---

## Ekip 1 — Firebase Kurulumu & Altyapı
* **Prompt**: "GençTek Atlas projesi için Firebase Hosting, Firestore ve Storage altyapısını kur. HTML web uygulamamız için Firebase v10 Modular SDK CDN entegrasyonu içeren, `.env.example`, `firebase.json`, `firestore.rules` ve `storage.rules` dosyalarını oluşturan iskeleti hazırla. Anonim oturum açma (signInAnonymously) ve global `window.Atlas` tanımlaması yap."
* **Araç**: Antigravity
* **Sonuç**: Firebase projesinin altyapısı kuruldu, Hosting yapılandırılması tamamlandı ve güvenlik kurallarının ilk iskeleti oluşturuldu.

---

## Ekip 2 — Şehir ve Tema JSON Verileri
* **Prompt**: "Türkiye'nin 81 ilinin plaka kodlarını, isimlerini, coğrafi koordinatlarını (lat, lng) ve bölgelerini içeren `data/cities.json` dosyasını oluştur. Ayrıca GençTek'in 18 kurumsal temasına ait benzersiz ID, isim, renk kodu ve ikon kodlarını içeren `data/themes.json` dosyasını ve bu verilerin tiplerini açıklayan JSDoc typedef dosyasını (`data/types.js`) hazırla."
* **Araç**: Cursor
* **Sonuç**: Coğrafi koordinatlı ve bölge gruplamalı şehir listesi ile renk kodlu tema veri tabanları oluşturuldu.

---

## Ekip 3 — Türkiye Haritası Bileşeni
* **Prompt**: "Leaflet.js kütüphanesini ve tr-geojson (Türkiye sınır koordinatları) dosyasını kullanarak `components/map.js` ve `components/map.css` dosyalarını yaz. `initMap(containerId, onCitySelect)` fonksiyonunu geliştir, şehirlere tıklanınca callback tetiklensin. Seçilen şehirleri vurgulama (highlightCity) ve temizleme (clearHighlights) işlevlerini ekle. Harita koyu renk temaya sahip olmalı."
* **Araç**: Cursor
* **Sonuç**: Harita modülü, GeoJSON sınır çizimleri, harita üzeri tooltip bilgilendirmeleri ve koyu tema görsel stilleri üretildi.

---

## Ekip 4 — Etkinlik Kayıt Formu
* **Prompt**: "GençTek Atlas için `components/forms.js` içine `renderEventForm(containerId)` fonksiyonunu ekle. Form alanları: etkinlik adı, tema (themes.json'dan seçmeli), format (Yüz yüze / Çevrimiçi / Hibrit), il (cities.json'dan seçmeli), tarih, katılımcı sayısı, açıklama (maks 500 karakter ve karakter sayacı), baglanti URL'i ve en fazla 5MB'lık görsel dosyası olmalıdır. Hata ve yükleme durumlarını Firebase Storage entegrasyonu ile yönet."
* **Araç**: Antigravity
* **Sonuç**: Hata mesajı geri bildirimli, afiş yükleme destekli ve Firestore veri kayıt motorlu etkinlik formu oluşturuldu.

---

## Ekip 5 — Proje Kayıt Formu
* **Prompt**: "Aynı `components/forms.js` dosyasına `renderProjectForm(containerId)` fonksiyonunu ekle. Proje adı, takım adı, tema, katılımcı iller (arama destekli çoklu seçim checkbox grubu), açıklama (maks 1000 karakter), githubUrl (sadece github.com ile başlayanlar zorunlu), demoUrl, prompt dosyası (PDF/görsel), etik onay beyanı (zorunlu checkbox) alanlarını yerleştir. CSS'i `forms.css` içerisine yaz."
* **Araç**: Antigravity
* **Sonuç**: Çoklu il seçimi için arama destekli bölge grupları, GitHub URL doğrulayıcısı ve etik kontrol beyanı içeren proje formu yazıldı.

---

## Ekip 6 — Listeleme & Kart Bileşenleri
* **Prompt**: "Approved events ve approved projects listelerini Firestore'dan filtreli çeken, `components/cards.js` ve `components/cards.css` dosyalarını oluştur. Kartlar tıklanınca `showEventDetail` ve `showProjectDetail` Custom Event'lerini fırlatsın. Kartların üzerinde temaya ait kurumsal renk şeridi ve tema ismi rozet olarak yer alsın. XSS saldırılarına karşı verileri escape et."
* **Araç**: Cursor
* **Sonuç**: UI kart render fonksiyonları, dinamik svg ikonları, GitHub/Demo aksiyon butonları, boş durum şablonu ve XSS korumalı veri çıkışları kodlandı.

---

## Ekip 7 — Filtreleme & Arama
* **Prompt**: "Client-side çalışan, filtre durumunu URL hash şeridine (`#tema=yapay-zeka&il=34`) eşzamanlı yazan ve okuyan `components/filters.js` ve `components/filters.css` dosyalarını yaz. Tema seçimi buton grubu (çoklu seçim), il seçimi (81 il, Türkçe karakter folding arama destekli custom dropdown), format butonları ve metin araması (debounce 300ms) içersin. Mobilde alt çekmece (drawer panel) olarak açılsın."
* **Araç**: Antigravity
* **Sonuç**: Hash router dinleyicili filtre paneli, Türkçe arama normalizasyonu, mobil bottom drawer tasarımı ve in-memory veri arama süzme fonksiyonu yazıldı.

---

## Ekip 8 — Moderasyon Paneli
* **Prompt**: "Firebase Auth oturumu ve Firestore `/moderators` koleksiyonu ile korunan `components/moderation.js` ve `components/moderation.css` dosyalarını oluştur. Onay bekleyen etkinlikleri ve projeleri listelesin; [Onayla], [Reddet] (neden belirterek) ve [Düzenle] (satır içi inline form ile) butonları içersin. Öne çıkan içerikleri (`oneCikan: true`) işaretleyebilme listesi ve istatistik özeti sunsun."
* **Araç**: Antigravity
* **Sonuç**: Giriş yapmamış yetkisiz hesapları engelleyen, bekleyen/onaylanan/reddedilen sayaçlarına sahip moderatör yönetim paneli üretildi.

---

## Ekip 9 — Detay Sayfaları
* **Prompt**: "Etkinlik ve proje detaylarını gösteren `components/detail.js` ve `components/detail.css` dosyalarını yaz. URL hash rotalarını dinlesin (`#etkinlik/ID` veya `#proje/ID`). Etkinlik detayında aynı tema veya ildeki projeleri ('İlgili Projeler') listele ve tıklandığında proje detay modalına geçiş sağla. Modal ESC tuşu veya dışarı tıklanınca kapansın, loading durumunda shimmer (iskelet) animasyonu göster."
* **Araç**: Cursor
* **Sonuç**: Kayar modal arayüzü, çapraz ilgili projeler paralel veri çekme sorgusu, shimmer yükleme iskeleti ve URL hash navigasyon eşitleyicisi yazıldı.

---

## Ekip 10 — Ana Sayfa & Canlı İstatistikler
* **Prompt**: "Uygulamanın ana kabuğu olan `index.html` ve genel stilleri tutan `style.css` dosyalarını tamamla. Menüde Harita | Liste | Etkinlik Ekle | Proje Ekle sekmeleri olsun. En üstte onaylı etkinlik, proje, il sayıları ve en popüler tema adı canlı olarak Firestore'dan çekilip gösterilsin. Diğer bileşenler (map, filters, cards vs.) mevcut olmadığında çökmeyi önleyen dynamic import mimarisi kur."
* **Araç**: Antigravity
* **Sonuç**: Üst menü, footer, prefers-color-scheme light/dark stil entegrasyonu, istatistik kartları ve dinamik lazy loading modül yükleyicileri yazıldı.

---

## Ekip 11 — Firestore & Auth Güvenlik Testleri
* **Prompt**: "Mevcut `firestore.rules` dosyasını analiz et. Anonim kayıt oluşturma, `onaylandi: true` alan manipülasyonu, silme yetkileri ve yetkisiz e-postaların moderasyon paneline erişimini test ederek bulguları raporla. Kural açıklarını tespit et."
* **Araç**: Antigravity
* **Sonuç**: Güvenlik kuralları analiz edildi, `onaylandi` parametresinin boş gönderilebilme açığı raporlandı ve çözüm kural güncellemeleri önerildi.

---

## Ekip 12 — Form & XSS Güvenlik Testleri
* **Prompt**: "Formlardaki metin ve URL alanlarına yönelik XSS payload'ları (`<script>`, `<img>`, `javascript:`, `data:`) göndererek arayüzün sızma testlerini yap. Dosya yüklemelerinde 10MB boyutu, exe uzantılarını ve form manipülasyon sınırlarını test et."
* **Araç**: Cursor
* **Sonuç**: Linklerin `href` alanlarında `javascript:` protokollerinin çalışabildiği (Stored DOM XSS) tespit edildi, Storage'a boş (0 byte) dosya yükleme izni raporlandı.

---

## Ekip 13 — Repo Tarama & Raporlama
* **Prompt**: "Repository'de hassas verilerin (.env, private key .json, node_modules) commit edilip edilmediğini tara. Ekip 11 ve 12'nin bulgularını bir araya getirerek `docs/security-findings.md`, `docs/security-test-plan.md` ve `docs/patch-verification.md` yama doğrulama dokümanlarını oluştur."
* **Araç**: Antigravity
* **Sonuç**: Git log taraması yapıldı, sızıntı olmadığı doğrulandı. Güvenlik test planı ve açıkların kod/kural düzeyinde kapatılmasını gösteren yama doğrulama raporları hazırlandı.

---

## Ekip 14 — Proje Dokümantasyonu
* **Prompt**: "Proje için profesyonel `README.md`, ekiplerin asistan promptlarını toplayan `prompts.md`, etik standartları tanımlayan `ethics-check.md`, MIT Lisansı (`LICENSE`) ve dışarıda bırakılacak dosyaları tutan `.gitignore` dosyalarını Türkçe dilinde ve ayrı ayrı oluştur."
* **Araç**: Antigravity
* **Sonuç**: Proje standartlarını ve dokümantasyonel ihtiyaçlarını karşılayan tüm kılavuz ve lisans dosyaları hazırlandı.

---

## Ekip 15 — Firebase Hosting & Deployment
* **Prompt**: "GençTek Atlas uygulamasını Firebase Hosting'e yayınlamak için gerekli CI/CD GitHub Actions workflow yaml dosyasını ve son dağıtım yönergelerini oluştur."
* **Araç**: Cursor
* **Sonuç**: GitHub üzerinde her push işleminde otomatik yayınlama (deploy) yapan scriptler ve Hosting yapılandırma talimatları üretildi.
