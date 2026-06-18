/**
 * GençTek Atlas — Veri Tip Tanımları
 * Tüm JSON veri yapılarının JSDoc ile belgelenmesi.
 */

/**
 * GençTek tema/konu alanı
 * @typedef {Object} Theme
 * @property {string} id          - Benzersiz kebab-case tanımlayıcı (ör. "oyun-tasarimi")
 * @property {string} name        - Tam tema adı (ör. "Oyun Tasarımı (EğitiJAM)")
 * @property {string} shortCode   - 2-3 harfli kısaltma (ör. "OT")
 * @property {string} color       - HEX renk kodu (ör. "#E63946")
 * @property {string} icon        - Tabler Icons ikon adı, "ti-" öneki olmadan (ör. "device-gamepad-2")
 * @property {"Teknoloji"|"Tasarım"|"Güvenlik"|"Spor"|"Ticaret"|"Genel"} category - Tema kategorisi
 */

/**
 * Türkiye ili
 * @typedef {Object} City
 * @property {string} id      - Plaka kodu string olarak (ör. "06")
 * @property {string} name    - İl adı, Türkçe karakterlerle (ör. "Ankara")
 * @property {number} plate   - Plaka numarası (ör. 6)
 * @property {number} lat     - Enlem (WGS84)
 * @property {number} lng     - Boylam (WGS84)
 * @property {"Marmara"|"Ege"|"Akdeniz"|"İç Anadolu"|"Karadeniz"|"Doğu Anadolu"|"Güneydoğu Anadolu"} region - Coğrafi bölge
 */

/**
 * Etkinlik kaydı
 * @typedef {Object} Event
 * @property {string} id            - Benzersiz etkinlik tanımlayıcısı
 * @property {string} title         - Etkinlik başlığı
 * @property {string} description   - Etkinlik açıklaması
 * @property {string} themeId       - İlişkili tema ID'si (Theme.id)
 * @property {string} cityId        - İlişkili şehir ID'si (City.id)
 * @property {string} date          - Etkinlik tarihi (ISO 8601 formatı)
 * @property {string} [endDate]     - Bitiş tarihi (opsiyonel, ISO 8601)
 * @property {string} venue         - Mekan/adres bilgisi
 * @property {number} [participantCount] - Katılımcı sayısı
 * @property {"planned"|"active"|"completed"|"cancelled"} status - Etkinlik durumu
 * @property {string[]} [tags]      - Ek etiketler
 */

/**
 * Proje kaydı
 * @typedef {Object} Project
 * @property {string} id            - Benzersiz proje tanımlayıcısı
 * @property {string} title         - Proje başlığı
 * @property {string} description   - Proje açıklaması
 * @property {string} themeId       - İlişkili tema ID'si (Theme.id)
 * @property {string} cityId        - Projenin yürütüldüğü şehir ID'si (City.id)
 * @property {string[]} [eventIds]  - İlişkili etkinlik ID'leri
 * @property {string} startDate     - Başlangıç tarihi (ISO 8601)
 * @property {string} [endDate]     - Bitiş tarihi (opsiyonel, ISO 8601)
 * @property {"draft"|"in-progress"|"completed"|"archived"} status - Proje durumu
 * @property {number} [teamSize]    - Ekip büyüklüğü
 * @property {string} [repoUrl]     - Kaynak kod deposu URL'si
 * @property {string[]} [tags]      - Ek etiketler
 */

export {};
