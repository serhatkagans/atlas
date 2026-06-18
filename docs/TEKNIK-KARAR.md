# Teknik Karar: Harita Teknolojisi

## Karar

**Seçenek A: Leaflet.js + GeoJSON** seçildi.

## Neden Leaflet.js?

### Değerlendirilen Alternatifler

| Kriter | Leaflet + GeoJSON | SVG Harita | Canvas |
|---|---|---|---|
| Mobil/Touch desteği | ✅ Yerleşik | ⚠️ Manuel | ⚠️ Manuel |
| Zoom/Pan | ✅ Yerleşik | ❌ Manuel gerekli | ❌ Manuel gerekli |
| İl sınırları | ✅ GeoJSON ile otomatik | ⚠️ Sabit SVG path | ⚠️ Çizim gerekli |
| Tooltip/Popup | ✅ Yerleşik API | ⚠️ Manuel | ⚠️ Manuel |
| Dosya boyutu | ~40 KB (gzip) | ~150 KB SVG | ~0 KB |
| Responsive | ✅ Otomatik | ⚠️ viewBox ile | ⚠️ Resize listener |
| Erişilebilirlik | ✅ ARIA desteği | ⚠️ Kısıtlı | ❌ Yok |
| Geliştirme süresi | ⭐ Düşük | ⭐⭐ Orta | ⭐⭐⭐ Yüksek |

### Seçim Gerekçesi

1. **Sıfır sunucu bağımlılığı**: Leaflet tamamen istemci tarafında çalışır. CDN üzerinden yüklenir, Firebase Hosting ile uyumludur.

2. **GeoJSON doğal desteği**: `L.geoJSON()` ile il sınırları doğrudan çizilebilir. Her il (feature) ayrı stil ve etkileşim alabilir.

3. **Mobil öncelikli**: Pinch-to-zoom, dokunma/sürükleme, atalet kaydırma gibi touch olayları sıfır konfigürasyonla çalışır.

4. **Hafif**: Leaflet ~40 KB (gzipped). Tile katmanı kullanmadan sadece GeoJSON overlay olarak bile çalışabilir — bu projede harita altlığı opsiyoneldir.

5. **Topluluk ve olgunluk**: 10+ yıllık aktif geliştirme, kapsamlı dokümantasyon, geniş eklenti ekosistemi.

## CDN Linkleri

```html
<!-- Leaflet CSS -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

<!-- Leaflet JS -->
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
```

## Veri Kaynağı

- **GeoJSON**: [cihadturhan/tr-geojson](https://github.com/cihadturhan/tr-geojson) — Türkiye il sınırları, UTF-8 kodlamalı
- Dosya: `data/tr-cities.geojson` (241 KB, 81 il poligonu)
- Her feature'ın `id` alanı plaka koduna, `properties.name` alanı il adına karşılık gelir

## Mimari Kararlar

- **Tile katmanı yok**: Harita altlığı olarak OpenStreetMap tiles kullanılmıyor; sadece il sınırları gösteriliyor. Bu, dış bağımlılığı azaltır ve yükleme hızını artırır.
- **GeoJSON lokal**: Dosya proje içinde `data/tr-cities.geojson` olarak tutulur, her ziyarette GitHub'dan çekilmez.
- **İl eşleştirme**: GeoJSON `id` alanı (plaka kodu) ile `cities.json` `plate` alanı eşleştirilir.
