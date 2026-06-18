/**
 * GençTek Atlas — Türkiye Haritası Bileşeni
 *
 * Leaflet.js + GeoJSON tabanlı interaktif harita.
 * CDN: https://unpkg.com/leaflet@1.9.4/dist/leaflet.js
 *
 * Kullanım:
 *   import { initMap, highlightCity, clearHighlights, showCityEvents } from './map.js';
 *   const map = await initMap('map-container', (cityId) => console.log('Seçilen il:', cityId));
 */

// ── Modül Değişkenleri ──────────────────────────────────────────────
let map = null;
let geojsonLayer = null;
let cityLayers = {};        // plateCode → Leaflet layer
let cityData = {};           // plateCode → city object from cities.json
let selectedCityId = null;
let onCitySelectCb = null;

// ── Stil Sabitleri ──────────────────────────────────────────────────
const STYLE_DEFAULT = {
  weight: 1.5,
  color: '#4a5568',
  fillColor: '#1a1a2e',
  fillOpacity: 0.6,
  dashArray: '',
};

const STYLE_HOVER = {
  weight: 2.5,
  color: '#e2e8f0',
  fillColor: '#2d3748',
  fillOpacity: 0.8,
};

const STYLE_SELECTED = {
  weight: 3,
  color: '#ffffff',
  fillColor: '#3A86FF',
  fillOpacity: 0.85,
};

// ── Yardımcı: GeoJSON id → cities.json plate eşleştirme ────────────
function buildNameToPlateMap(cities) {
  const nameMap = {};
  cities.forEach((c) => {
    // Normalize: küçük harf, trim
    nameMap[c.name.toLowerCase().trim()] = c;
    // Plaka kodu da anahtar olsun
    nameMap[String(c.plate)] = c;
  });
  return nameMap;
}

// GeoJSON'daki Türkçe karakter farklılıklarını normalize et
function normalizeProvinceName(name) {
  const corrections = {
    'afyon': 'afyonkarahisar',
    'içel': 'mersin',
    'istanbul': 'istanbul',  // İstanbul → istanbul
  };
  const lower = name.toLowerCase().trim()
    .replace(/^i̇/, 'i')   // Türkçe İ problemi
    .replace('İ', 'i')
    .replace('ı', 'ı');
  return corrections[lower] || lower;
}

// ── Ana: Haritayı Başlat ────────────────────────────────────────────
/**
 * Haritayı belirtilen container içinde başlatır.
 * @param {string} containerId - Haritanın render edileceği div id'si
 * @param {(cityId: string) => void} onCitySelect - İl seçildiğinde çağrılacak callback
 * @returns {Promise<object>} Leaflet map instance
 */
export async function initMap(containerId, onCitySelect) {
  onCitySelectCb = onCitySelect || (() => {});

  // Leaflet harita oluştur — tile katmansız, sadece GeoJSON
  map = L.map(containerId, {
    zoomControl: true,
    attributionControl: false,
    minZoom: 5,
    maxZoom: 9,
    zoomSnap: 0.5,
    zoomDelta: 0.5,
    // Türkiye merkezli başlangıç
    center: [39.0, 35.5],
    zoom: 6,
    // Touch desteği
    tap: true,
    touchZoom: true,
    dragging: true,
    // Arka plan rengi (tile yok)
    backgroundColor: '#0f0f1a',
  });

  // Koyu arka plan tile (opsiyonel, güzel görünsün diye)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 19,
    opacity: 0.4,
  }).addTo(map);

  // Verileri yükle
  const [geojson, cities] = await Promise.all([
    fetch('./data/tr-cities.geojson').then((r) => r.json()),
    fetch('./data/cities.json').then((r) => r.json()),
  ]);

  const nameMap = buildNameToPlateMap(cities);

  // Her il için cities.json verilerini plaka koduna göre indexle
  cities.forEach((c) => {
    cityData[c.id] = c;
  });

  // GeoJSON katmanını ekle
  geojsonLayer = L.geoJSON(geojson, {
    style: () => ({ ...STYLE_DEFAULT }),

    onEachFeature: (feature, layer) => {
      // GeoJSON id → plaka kodu eşleştirmesi
      const geojsonId = feature.id;
      const geojsonName = feature.properties?.name || '';
      const normalizedName = normalizeProvinceName(geojsonName);

      // Eşleşen city'yi bul
      const city = nameMap[String(geojsonId)] || nameMap[normalizedName];

      if (city) {
        const plateId = city.id; // "01", "06", vb.
        cityLayers[plateId] = layer;

        // Tooltip — il adı
        layer.bindTooltip(city.name, {
          sticky: true,
          direction: 'top',
          offset: [0, -10],
          className: 'atlas-tooltip',
        });

        // Hover efektleri
        layer.on('mouseover', () => {
          if (selectedCityId !== plateId) {
            layer.setStyle(STYLE_HOVER);
            layer.bringToFront();
          }
        });

        layer.on('mouseout', () => {
          if (selectedCityId !== plateId) {
            // Eğer highlight rengi varsa onu koru
            const customColor = layer._customHighlight;
            if (customColor) {
              layer.setStyle({
                ...STYLE_DEFAULT,
                fillColor: customColor,
                fillOpacity: 0.75,
              });
            } else {
              layer.setStyle(STYLE_DEFAULT);
            }
          }
        });

        // Tıklama — il seçimi
        layer.on('click', () => {
          selectCity(plateId);
        });
      }
    },
  }).addTo(map);

  // Haritayı Türkiye sınırlarına sığdır
  map.fitBounds(geojsonLayer.getBounds(), { padding: [20, 20] });

  // Resize desteği
  const resizeObserver = new ResizeObserver(() => {
    map.invalidateSize();
  });
  resizeObserver.observe(document.getElementById(containerId));

  return map;
}

// ── İl Seçimi ───────────────────────────────────────────────────────
function selectCity(plateId) {
  // Önceki seçimi temizle
  if (selectedCityId && cityLayers[selectedCityId]) {
    const prevLayer = cityLayers[selectedCityId];
    const prevCustom = prevLayer._customHighlight;
    if (prevCustom) {
      prevLayer.setStyle({
        ...STYLE_DEFAULT,
        fillColor: prevCustom,
        fillOpacity: 0.75,
      });
    } else {
      prevLayer.setStyle(STYLE_DEFAULT);
    }
  }

  // Yeni seçimi uygula
  selectedCityId = plateId;
  if (cityLayers[plateId]) {
    cityLayers[plateId].setStyle(STYLE_SELECTED);
    cityLayers[plateId].bringToFront();
  }

  // Callback'i çağır
  onCitySelectCb(plateId);
}

// ── API: İli Vurgula ────────────────────────────────────────────────
/**
 * Belirtilen ili verilen renkle vurgular.
 * @param {string} cityId - İl id'si (plaka kodu string, ör. "06")
 * @param {string} color - HEX renk kodu (ör. "#E63946")
 */
export function highlightCity(cityId, color) {
  const layer = cityLayers[cityId];
  if (!layer) return;

  layer._customHighlight = color;

  // Seçili olan ilde highlight uygulanmasın
  if (selectedCityId === cityId) return;

  layer.setStyle({
    ...STYLE_DEFAULT,
    fillColor: color,
    fillOpacity: 0.75,
    weight: 2,
    color: shadeColor(color, -30),
  });
}

// ── API: Tüm Vurgulamaları Temizle ─────────────────────────────────
/**
 * Tüm il vurgularını varsayılan stile döndürür.
 */
export function clearHighlights() {
  Object.keys(cityLayers).forEach((id) => {
    const layer = cityLayers[id];
    delete layer._customHighlight;
    if (selectedCityId !== id) {
      layer.setStyle(STYLE_DEFAULT);
    }
  });
}

// ── API: Etkinlikleri Göster ────────────────────────────────────────
/**
 * Birden fazla ili tema renkleriyle vurgular.
 * @param {Array<{cityId: string, themeColor: string}>} events - Etkinlik listesi
 */
export function showCityEvents(events) {
  clearHighlights();
  events.forEach(({ cityId, themeColor }) => {
    highlightCity(cityId, themeColor);
  });
}

// ── API: Haritayı Sıfırla ──────────────────────────────────────────
/**
 * Seçimi kaldırır, vurguları temizler ve haritayı başlangıç konumuna döndürür.
 */
export function resetMap() {
  selectedCityId = null;
  clearHighlights();
  if (geojsonLayer && map) {
    // Tüm stilleri sıfırla
    geojsonLayer.eachLayer((layer) => {
      layer.setStyle(STYLE_DEFAULT);
    });
    map.fitBounds(geojsonLayer.getBounds(), { padding: [20, 20] });
  }
}

// ── API: Harita nesnesini döndür ────────────────────────────────────
/**
 * Leaflet map instance'ını döndürür (ileri düzey kullanım için).
 * @returns {object|null}
 */
export function getMapInstance() {
  return map;
}

// ── Yardımcı: Renk tonu karartma ────────────────────────────────────
function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}
