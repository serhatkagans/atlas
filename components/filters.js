/**
 * GençTek Atlas — Filtreleme & Arama Bileşeni
 *
 * Kullanıcıların etkinlik ve projeleri tema, il, format ve arama metnine göre 
 * filtrelemesini sağlayan, mobil uyumlu ve URL hash senkronizasyonlu bileşen.
 */

// ── Küresel Filtre Durumu ───────────────────────────────────────────
let activeFilters = {
  tema: null,   // Seçili temalar (virgülle ayrılmış ID'ler string veya null)
  il: null,     // Seçili il plaka kodu (string veya null)
  format: null, // Seçili etkinlik formatı (yuz-yuze, cevrimici, hibrit veya null)
  arama: ''     // Arama çubuğundaki metin (her zaman string)
};

let themesData = [];
let citiesData = [];
let currentCallback = null;

// ── URL Hash Senkronizasyonu ────────────────────────────────────────

/**
 * URL Hash'indeki parametreleri okuyup filtre objesine dönüştürür.
 */
function parseHash() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return {
    tema: params.get('tema') || null,
    il: params.get('il') || null,
    format: params.get('format') || null,
    arama: params.get('arama') || ''
  };
}

/**
 * Filtre durumunu URL Hash'ine yazar.
 */
function writeHash(filters) {
  const params = new URLSearchParams();
  if (filters.tema) params.set('tema', filters.tema);
  if (filters.il) params.set('il', filters.il);
  if (filters.format) params.set('format', filters.format);
  if (filters.arama) params.set('arama', filters.arama);

  const hashString = params.toString();
  // Hash değişiminin sonsuz döngüye yol açmaması için kontrol ederek güncelle
  const newHash = hashString ? `#${hashString}` : '';
  if (window.location.hash !== newHash) {
    // History kaydı kirletmemek için replaceState tercih edilebilir,
    // ancak haritayla uyumluluk için hash doğrudan güncelleniyor.
    window.location.hash = newHash;
  }
}

// ── Türkçe Karakter Normalizasyonu (Arama İçin) ─────────────────────
function normalizeTurkish(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

// ── Filtreleme Arayüzü Başlatma ──────────────────────────────────────

/**
 * Filtre panelini render eder ve olay dinleyicileri bağlar.
 * @param {string} containerId - Filtre panelinin render edileceği div ID'si
 * @param {Function} onFilterChange - Filtre değiştiğinde çağrılacak callback: (filters) => void
 */
export async function initFilters(containerId, onFilterChange) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`initFilters: #${containerId} bulunamadı.`);
    return;
  }

  currentCallback = onFilterChange;

  // 1. Verileri Yükle
  try {
    const [themesRes, citiesRes] = await Promise.all([
      fetch('./data/themes.json').then((r) => r.json()),
      fetch('./data/cities.json').then((r) => r.json())
    ]);
    themesData = themesRes;
    citiesData = citiesRes;
  } catch (err) {
    console.error('Filtre verileri yüklenirken hata oluştu:', err);
  }

  // 2. Hash'ten İlk Durumu Al
  activeFilters = parseHash();

  // 3. Arayüz Taslağını Render Et
  renderFilterUI(container);

  // 4. UI Elemanlarını Güncelle
  updateUiFromState();

  // 5. Event Listener'ları Bağla
  setupEventListeners(container);

  // 6. İlk Değişimi Tetikle (İlk yüklemede URL'deki filtreleri uygulatmak için)
  if (currentCallback) {
    currentCallback(activeFilters);
  }
}

// ── HTML Arayüz Çıktısı ──────────────────────────────────────────────

function renderFilterUI(container) {
  // Şehir dropdown listesi HTML'i
  const cityItemsHtml = citiesData
    .map((city) => `<li class="city-dropdown-item" data-id="${city.id}">${city.name}</li>`)
    .join('');

  // Tema butonları HTML'i
  const themeButtonsHtml = themesData
    .map((theme) => {
      return `
        <button class="theme-filter-btn" data-id="${theme.id}" style="--theme-color: ${theme.color}">
          <span class="theme-dot" style="background-color: ${theme.color}"></span>
          ${theme.name}
        </button>
      `;
    })
    .join('');

  container.innerHTML = `
    <div class="atlas-filters-container">
      <!-- Mobil Filtre Butonu -->
      <button class="filters-mobile-toggle-btn" aria-haspopup="dialog" aria-expanded="false">
        <span class="toggle-icon-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="4" y1="21" x2="4" y2="14"></line>
            <line x1="4" y1="10" x2="4" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12" y2="3"></line>
            <line x1="20" y1="21" x2="20" y2="16"></line>
            <line x1="20" y1="12" x2="20" y2="3"></line>
            <line x1="1" y1="14" x2="7" y2="14"></line>
            <line x1="9" y1="8" x2="15" y2="8"></line>
            <line x1="17" y1="16" x2="23" y2="16"></line>
          </svg>
        </span>
        Filtrele & Ara
        <span class="active-filters-badge" style="display: none;">0</span>
      </button>

      <!-- Ana Filtre Paneli (Mobilde Drawer/Panel) -->
      <div class="filters-drawer-overlay"></div>
      <div class="filters-panel-wrapper">
        <div class="filters-panel-header">
          <h3>Filtrele & Ara</h3>
          <button class="filters-drawer-close-btn" aria-label="Kapat">&times;</button>
        </div>

        <div class="filters-panel-body">
          
          <!-- Arama Girişi -->
          <div class="filter-element filter-element--search">
            <label for="atlas-search-input">Metin Arama</label>
            <div class="search-input-box">
              <span class="search-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </span>
              <input type="text" id="atlas-search-input" placeholder="Etkinlik, proje veya takım adı ara..." autocomplete="off">
              <button class="search-clear-inline-btn" type="button" aria-label="Temizle" style="display: none;">&times;</button>
            </div>
          </div>

          <div class="filters-row-grid">
            <!-- İl Dropdown Filtresi -->
            <div class="filter-element filter-element--city">
              <label>İl Seçimi</label>
              <div class="city-custom-select">
                <button type="button" class="city-select-trigger" aria-haspopup="listbox" aria-expanded="false">
                  <span class="city-trigger-text">Tüm İller</span>
                  <span class="chevron-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </span>
                </button>
                <div class="city-select-dropdown">
                  <div class="city-search-box">
                    <input type="text" class="city-search-input" placeholder="İl adı ara..." autocomplete="off">
                  </div>
                  <ul class="city-select-options" role="listbox">
                    <li class="city-dropdown-item city-dropdown-item--all active" data-id="all">Tüm İller</li>
                    ${cityItemsHtml}
                  </ul>
                </div>
              </div>
            </div>

            <!-- Format Butonları -->
            <div class="filter-element filter-element--format">
              <label>Format</label>
              <div class="format-button-group">
                <button type="button" class="format-filter-btn active" data-format="all">Tümü</button>
                <button type="button" class="format-filter-btn" data-format="yuz-yuze">Yüz Yüze</button>
                <button type="button" class="format-filter-btn" data-format="cevrimici">Çevrimiçi</button>
                <button type="button" class="format-filter-btn" data-format="hibrit">Hibrit</button>
              </div>
            </div>
          </div>

          <!-- Tema Filtresi (Rozetli Butonlar) -->
          <div class="filter-element filter-element--themes">
            <label>Temalara Göre Filtrele (Çoklu Seçim)</label>
            <div class="themes-filter-container">
              ${themeButtonsHtml}
            </div>
          </div>

          <!-- Filtre Durumu / Bilgi & Sıfırlama -->
          <div class="filters-panel-footer">
            <div class="results-summary">
              <span class="results-count-text">Yükleniyor...</span>
            </div>
            <button type="button" class="filters-reset-btn" disabled>Filtreleri Temizle</button>
          </div>

        </div>
      </div>
    </div>
  `;
}

// ── State'ten Arayüzü Güncelleme (Sync UI) ───────────────────────────

function updateUiFromState() {
  // 1. Arama Çubuğu
  const searchInput = document.getElementById('atlas-search-input');
  const searchClear = document.querySelector('.search-clear-inline-btn');
  if (searchInput) {
    searchInput.value = activeFilters.arama || '';
    if (searchClear) {
      searchClear.style.display = activeFilters.arama ? 'block' : 'none';
    }
  }

  // 2. İl Seçimi (Dropdown)
  const cityTriggerText = document.querySelector('.city-trigger-text');
  const cityItems = document.querySelectorAll('.city-dropdown-item');
  if (cityTriggerText) {
    if (activeFilters.il) {
      const selectedCity = citiesData.find((c) => c.id === activeFilters.il);
      cityTriggerText.textContent = selectedCity ? selectedCity.name : activeFilters.il;
    } else {
      cityTriggerText.textContent = 'Tüm İller';
    }
  }

  cityItems.forEach((item) => {
    const itemId = item.getAttribute('data-id');
    const isSelected = (!activeFilters.il && itemId === 'all') || (activeFilters.il === itemId);
    item.classList.toggle('active', isSelected);
  });

  // 3. Format Filtresi
  const formatButtons = document.querySelectorAll('.format-filter-btn');
  formatButtons.forEach((btn) => {
    const btnFormat = btn.getAttribute('data-format');
    const isSelected = (!activeFilters.format && btnFormat === 'all') || (activeFilters.format === btnFormat);
    btn.classList.toggle('active', isSelected);
  });

  // 4. Tema Filtresi (Çoklu Seçim)
  const selectedThemeIds = activeFilters.tema ? activeFilters.tema.split(',') : [];
  const themeButtons = document.querySelectorAll('.theme-filter-btn');
  themeButtons.forEach((btn) => {
    const btnId = btn.getAttribute('data-id');
    const isSelected = selectedThemeIds.includes(btnId);
    btn.classList.toggle('active', isSelected);
  });

  // 5. Temizle Butonu Durumu & Aktif Filtre Göstergeleri
  const hasActiveFilters = !!(activeFilters.tema || activeFilters.il || activeFilters.format || activeFilters.arama);
  const resetBtn = document.querySelector('.filters-reset-btn');
  if (resetBtn) {
    resetBtn.disabled = !hasActiveFilters;
  }

  // Mobil panel sayacı ve aktif durumu
  const mobileToggle = document.querySelector('.filters-mobile-toggle-btn');
  const badge = document.querySelector('.active-filters-badge');
  if (mobileToggle) {
    mobileToggle.classList.toggle('filters-mobile-toggle-btn--active', hasActiveFilters);
  }
  if (badge) {
    let activeCount = 0;
    if (activeFilters.il) activeCount++;
    if (activeFilters.format) activeCount++;
    if (activeFilters.arama) activeCount++;
    if (activeFilters.tema) activeCount += activeFilters.tema.split(',').length;

    if (activeCount > 0) {
      badge.textContent = activeCount;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

// ── Olay Dinleyicileri (Event Listeners) ─────────────────────────────

function setupEventListeners(container) {
  const panelWrapper = container.querySelector('.filters-panel-wrapper');
  const overlay = container.querySelector('.filters-drawer-overlay');
  const mobileToggle = container.querySelector('.filters-mobile-toggle-btn');
  const closeBtn = container.querySelector('.filters-drawer-close-btn');

  // A. Mobil Drawer Açma / Kapama
  const toggleDrawer = (open) => {
    panelWrapper.classList.toggle('open', open);
    overlay.classList.toggle('open', open);
    mobileToggle.setAttribute('aria-expanded', open);
    if (open) {
      document.body.style.overflow = 'hidden'; // Arka plan kaymasını engelle
    } else {
      document.body.style.overflow = '';
    }
  };

  if (mobileToggle) mobileToggle.addEventListener('click', () => toggleDrawer(true));
  if (closeBtn) closeBtn.addEventListener('click', () => toggleDrawer(false));
  if (overlay) overlay.addEventListener('click', () => toggleDrawer(false));

  // B. Arama Girişi Dinleyicisi
  const searchInput = container.querySelector('#atlas-search-input');
  const searchClear = container.querySelector('.search-clear-inline-btn');

  let debounceTimer;
  searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    if (searchClear) searchClear.style.display = val ? 'block' : 'none';

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      activeFilters.arama = val.trim();
      filterChanged();
    }, 300); // 300ms debounce
  });

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchClear.style.display = 'none';
      activeFilters.arama = '';
      searchInput.focus();
      filterChanged();
    });
  }

  // C. Şehir Dropdown Olayları
  const citySelect = container.querySelector('.city-custom-select');
  const cityTrigger = container.querySelector('.city-select-trigger');
  const citySearch = container.querySelector('.city-search-input');
  const cityItems = container.querySelectorAll('.city-dropdown-item');

  cityTrigger.addEventListener('click', () => {
    const isOpen = citySelect.classList.toggle('open');
    cityTrigger.setAttribute('aria-expanded', isOpen);
    if (isOpen && citySearch) {
      citySearch.focus();
    }
  });

  // İl Arama (Dropdown içinde)
  citySearch.addEventListener('input', (e) => {
    const queryNormalized = normalizeTurkish(e.target.value);
    cityItems.forEach((item) => {
      const name = item.textContent;
      const id = item.getAttribute('data-id');
      if (id === 'all') return; // "Tüm İller" aramaya girmez, hep görünür
      
      const normalizedName = normalizeTurkish(name);
      if (normalizedName.includes(queryNormalized)) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });
  });

  // İl Tıklama
  cityItems.forEach((item) => {
    item.addEventListener('click', () => {
      const id = item.getAttribute('data-id');
      activeFilters.il = (id === 'all') ? null : id;
      citySelect.classList.remove('open');
      cityTrigger.setAttribute('aria-expanded', 'false');
      citySearch.value = '';
      cityItems.forEach(i => i.style.display = ''); // aramayı sıfırla
      filterChanged();
    });
  });

  // Dropdown dışına tıklanınca kapansın
  document.addEventListener('click', (e) => {
    if (!citySelect.contains(e.target)) {
      citySelect.classList.remove('open');
      cityTrigger.setAttribute('aria-expanded', 'false');
    }
  });

  // D. Format Butonları Olayları
  const formatButtons = container.querySelectorAll('.format-filter-btn');
  formatButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const format = btn.getAttribute('data-format');
      activeFilters.format = (format === 'all') ? null : format;
      filterChanged();
    });
  });

  // E. Tema Butonları Olayları (Çoklu Seçim)
  const themeButtons = container.querySelectorAll('.theme-filter-btn');
  themeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const themeId = btn.getAttribute('data-id');
      let selectedThemes = activeFilters.tema ? activeFilters.tema.split(',') : [];

      if (selectedThemes.includes(themeId)) {
        selectedThemes = selectedThemes.filter((id) => id !== themeId);
      } else {
        selectedThemes.push(themeId);
      }

      activeFilters.tema = selectedThemes.length > 0 ? selectedThemes.join(',') : null;
      filterChanged();
    });
  });

  // F. Temizle Butonu Olayı
  const resetBtn = container.querySelector('.filters-reset-btn');
  resetBtn.addEventListener('click', () => {
    activeFilters = {
      tema: null,
      il: null,
      format: null,
      arama: ''
    };
    filterChanged();
  });
}

/**
 * Filtre durumlarından biri değiştiğinde çağrılır.
 */
function filterChanged() {
  updateUiFromState();
  writeHash(activeFilters);
  if (currentCallback) {
    currentCallback(activeFilters);
  }
}

// ── Dışarıya Açık Yardımcı Fonksiyonlar ────────────────────────────────

/**
 * Sonuç sayısını gösteren metni günceller.
 * @param {number} eventCount - Bulunan etkinlik sayısı
 * @param {number} projectCount - Bulunan proje sayısı
 */
export function updateResultsCount(eventCount, projectCount) {
  const countLabel = document.querySelector('.results-count-text');
  if (countLabel) {
    countLabel.textContent = `${eventCount} etkinlik, ${projectCount} proje bulundu`;
  }
}

/**
 * Client-side filtreleme yapan yardımcı fonksiyon.
 * Etkinlik ve projeleri verilen aktifFiltreler nesnesine göre süzüp yeni bir nesne döndürür.
 * 
 * @param {Array<Object>} events - Orijinal tüm etkinlikler
 * @param {Array<Object>} projects - Orijinal tüm projeler
 * @param {Object} filters - Aktif filtreler nesnesi
 * @returns {Object} { filteredEvents: Array, filteredProjects: Array }
 */
export function filterItems(events, projects, filters) {
  const { tema, il, format, arama } = filters;
  const searchNormalized = normalizeTurkish(arama);

  // A. ETKİNLİKLERİ FİLTRELE
  const filteredEvents = (events || []).filter((event) => {
    // 1. Tema Filtresi (Çoklu seçim)
    if (tema) {
      const allowedThemes = tema.split(',');
      if (!allowedThemes.includes(event.tema)) return false;
    }

    // 2. İl Filtresi
    if (il && event.il !== il) return false;

    // 3. Format Filtresi
    if (format && event.format !== format) return false;

    // 4. Metin Arama Filtresi (Etkinlik Adı)
    if (searchNormalized) {
      const titleNormalized = normalizeTurkish(event.etkinlikAdi);
      if (!titleNormalized.includes(searchNormalized)) return false;
    }

    return true;
  });

  // B. PROJELERİ FİLTRELE
  const filteredProjects = (projects || []).filter((project) => {
    // 1. Tema Filtresi
    if (tema) {
      const allowedThemes = tema.split(',');
      if (!allowedThemes.includes(project.tema)) return false;
    }

    // 2. İl Filtresi (Katılımcı iller dizisi il kodunu içermeli)
    if (il) {
      const participantCities = project.katilimciIller || [];
      if (!participantCities.includes(il)) return false;
    }

    // 3. Format Filtresi (Projelerde format alanı yoktur, eğer bir format seçilmişse projeler elenir)
    if (format) return false;

    // 4. Metin Arama Filtresi (Proje Adı veya Takım Adı)
    if (searchNormalized) {
      const titleNormalized = normalizeTurkish(project.projeAdi);
      const teamNormalized = normalizeTurkish(project.takimAdi);
      const inTitle = titleNormalized.includes(searchNormalized);
      const inTeam = teamNormalized.includes(searchNormalized);
      if (!inTitle && !inTeam) return false;
    }

    return true;
  });

  return { filteredEvents, filteredProjects };
}

// ── URL Hash Değişimini Dinle (Harita veya diğer bileşenlerle eşzamanlanma için) ──
window.addEventListener('hashchange', () => {
  const newFilters = parseHash();
  // Durum gerçekten değiştiyse UI'ı güncelle ve callback'i tetikle
  if (JSON.stringify(newFilters) !== JSON.stringify(activeFilters)) {
    activeFilters = newFilters;
    updateUiFromState();
    if (currentCallback) {
      currentCallback(activeFilters);
    }
  }
});
