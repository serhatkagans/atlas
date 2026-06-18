/**
 * GençTek Atlas — Listeleme & Kart Bileşenleri
 *
 * Firestore'dan onaylı etkinlik/proje çekme ve kart olarak render etme.
 * Bağımlılık: window.Atlas (Firebase SDK fonksiyonları)
 *
 * Kullanım:
 *   import { fetchApprovedEvents, fetchApprovedProjects, renderList } from './cards.js';
 *   const events = await fetchApprovedEvents('06');
 *   const projects = await fetchApprovedProjects();
 *   renderList('content-area', events, projects);
 */

// ── Tema Verisi Cache ───────────────────────────────────────────────
let themesCache = null;
let themesMap = null; // id → theme object

async function loadThemes() {
  if (themesCache) return themesCache;
  const res = await fetch('./data/themes.json');
  themesCache = await res.json();
  themesMap = {};
  themesCache.forEach((t) => { themesMap[t.id] = t; });
  return themesCache;
}

function getTheme(themeId) {
  return themesMap?.[themeId] || null;
}

// ── Şehir Verisi Cache ──────────────────────────────────────────────
let citiesMap = null;

async function loadCities() {
  if (citiesMap) return citiesMap;
  const res = await fetch('./data/cities.json');
  const cities = await res.json();
  citiesMap = {};
  cities.forEach((c) => { citiesMap[c.id] = c; });
  return citiesMap;
}

function getCityName(cityId) {
  return citiesMap?.[cityId]?.name || cityId;
}


// ═══════════════════════════════════════════════════════════════════
//  FİRESTORE VERİ ÇEKME
// ═══════════════════════════════════════════════════════════════════

/**
 * Onaylanmış etkinlikleri getirir.
 * @param {string|null} ilId - Opsiyonel il filtresi (plaka kodu string, ör. "06")
 * @returns {Promise<Array<Object>>} Etkinlik listesi (her biri id + data)
 */
export async function fetchApprovedEvents(ilId = null) {
  if (!window.Atlas) throw new Error('Firebase bağlantısı bulunamadı.');
  const { db, collection, query, where, getDocs } = window.Atlas;

  const constraints = [where('onaylandi', '==', true)];
  if (ilId) constraints.push(where('il', '==', ilId));

  const q = query(collection(db, 'events'), ...constraints);
  const snap = await getDocs(q);

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Onaylanmış projeleri getirir.
 * @param {string|null} ilId - Opsiyonel il filtresi (plaka kodu string)
 * @returns {Promise<Array<Object>>} Proje listesi
 */
export async function fetchApprovedProjects(ilId = null) {
  if (!window.Atlas) throw new Error('Firebase bağlantısı bulunamadı.');
  const { db, collection, query, where, getDocs } = window.Atlas;

  let q;
  if (ilId) {
    // katilimciIller array'inde ilId varsa (array-contains)
    q = query(
      collection(db, 'projects'),
      where('onaylandi', '==', true),
      where('katilimciIller', 'array-contains', ilId)
    );
  } else {
    q = query(collection(db, 'projects'), where('onaylandi', '==', true));
  }

  const snap = await getDocs(q);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}


// ═══════════════════════════════════════════════════════════════════
//  KART RENDER
// ═══════════════════════════════════════════════════════════════════

/**
 * Etkinlik kartı DOM elementi oluşturur.
 * @param {Object} event - Etkinlik verisi
 * @returns {HTMLElement}
 */
export function renderEventCard(event) {
  const theme = getTheme(event.tema);
  const themeColor = theme?.color || '#3A86FF';
  const themeName = theme?.name || event.tema || '—';
  const cityName = getCityName(event.il);

  const card = document.createElement('article');
  card.className = 'atlas-card atlas-card--event';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `Etkinlik: ${event.etkinlikAdi}`);

  // Üst renk şeridi
  card.style.setProperty('--card-accent', themeColor);

  card.innerHTML = `
    <div class="card-accent-bar"></div>
    ${event.gorselUrl ? `<div class="card-image"><img src="${escapeHtml(event.gorselUrl)}" alt="${escapeHtml(event.etkinlikAdi)}" loading="lazy" /></div>` : ''}
    <div class="card-body">
      <div class="card-meta">
        <span class="card-badge" style="background:${themeColor}20; color:${themeColor}; border-color:${themeColor}40">
          ${escapeHtml(themeName)}
        </span>
        <span class="card-format">${escapeHtml(formatLabel(event.format))}</span>
      </div>
      <h3 class="card-title">${escapeHtml(event.etkinlikAdi)}</h3>
      <div class="card-info">
        <span class="card-info-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${escapeHtml(cityName)}
        </span>
        <span class="card-info-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${escapeHtml(formatDate(event.tarih))}
        </span>
        ${event.katilimciSayisi ? `
        <span class="card-info-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          ${event.katilimciSayisi} kişi
        </span>` : ''}
      </div>
    </div>
  `;

  // Tıklama → detay eventi
  const triggerDetail = () => {
    window.dispatchEvent(new CustomEvent('showEventDetail', { detail: event.id }));
  };
  card.addEventListener('click', triggerDetail);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); triggerDetail(); }
  });

  return card;
}

/**
 * Proje kartı DOM elementi oluşturur.
 * @param {Object} project - Proje verisi
 * @returns {HTMLElement}
 */
export function renderProjectCard(project) {
  const theme = getTheme(project.tema);
  const themeColor = theme?.color || '#8338EC';
  const themeName = theme?.name || project.tema || '—';

  // Katılımcı il isimlerini al
  const cityNames = (project.katilimciIller || [])
    .map(getCityName)
    .filter(Boolean);
  const cityDisplay = cityNames.length > 3
    ? `${cityNames.slice(0, 3).join(', ')} +${cityNames.length - 3}`
    : cityNames.join(', ') || '—';

  const card = document.createElement('article');
  card.className = 'atlas-card atlas-card--project';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', `Proje: ${project.projeAdi}`);

  card.style.setProperty('--card-accent', themeColor);

  card.innerHTML = `
    <div class="card-accent-bar"></div>
    ${project.gorselUrl ? `<div class="card-image"><img src="${escapeHtml(project.gorselUrl)}" alt="${escapeHtml(project.projeAdi)}" loading="lazy" /></div>` : ''}
    <div class="card-body">
      <div class="card-meta">
        <span class="card-badge" style="background:${themeColor}20; color:${themeColor}; border-color:${themeColor}40">
          ${escapeHtml(themeName)}
        </span>
      </div>
      <h3 class="card-title">${escapeHtml(project.projeAdi)}</h3>
      <p class="card-team">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
        ${escapeHtml(project.takimAdi || '—')}
      </p>
      <div class="card-info">
        <span class="card-info-item">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          ${escapeHtml(cityDisplay)}
        </span>
      </div>
      <div class="card-actions">
        ${project.githubUrl ? `<a href="${escapeHtml(project.githubUrl)}" target="_blank" rel="noopener noreferrer" class="card-link card-link--github" onclick="event.stopPropagation()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
          GitHub
        </a>` : ''}
        ${project.demoUrl ? `<a href="${escapeHtml(project.demoUrl)}" target="_blank" rel="noopener noreferrer" class="card-link card-link--demo" onclick="event.stopPropagation()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Demo
        </a>` : ''}
      </div>
    </div>
  `;

  const triggerDetail = () => {
    window.dispatchEvent(new CustomEvent('showProjectDetail', { detail: project.id }));
  };
  card.addEventListener('click', triggerDetail);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); triggerDetail(); }
  });

  return card;
}


// ═══════════════════════════════════════════════════════════════════
//  LİSTE RENDER
// ═══════════════════════════════════════════════════════════════════

/**
 * Etkinlikleri ve projeleri kart listesi olarak render eder.
 * @param {string} containerId - Hedef container div id'si
 * @param {Array} events - Etkinlik listesi
 * @param {Array} projects - Proje listesi
 */
export async function renderList(containerId, events, projects) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`renderList: #${containerId} bulunamadı`);
    return;
  }

  // Tema ve şehir verilerini yükle (kartlar için lazım)
  await Promise.all([loadThemes(), loadCities()]);

  container.innerHTML = '';

  const hasEvents = events && events.length > 0;
  const hasProjects = projects && projects.length > 0;

  // Boş durum
  if (!hasEvents && !hasProjects) {
    container.appendChild(buildEmptyState());
    return;
  }

  // Etkinlikler bölümü
  if (hasEvents) {
    const section = document.createElement('section');
    section.className = 'card-section';

    const header = document.createElement('div');
    header.className = 'card-section-header';
    header.innerHTML = `
      <h3 class="card-section-title">📅 Etkinlikler <span class="card-section-count">${events.length}</span></h3>
    `;
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'card-grid';
    events.forEach((event) => grid.appendChild(renderEventCard(event)));
    section.appendChild(grid);

    container.appendChild(section);
  }

  // Projeler bölümü
  if (hasProjects) {
    const section = document.createElement('section');
    section.className = 'card-section';

    const header = document.createElement('div');
    header.className = 'card-section-header';
    header.innerHTML = `
      <h3 class="card-section-title">🚀 Projeler <span class="card-section-count">${projects.length}</span></h3>
    `;
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'card-grid';
    projects.forEach((project) => grid.appendChild(renderProjectCard(project)));
    section.appendChild(grid);

    container.appendChild(section);
  }
}

// ── Boş Durum ───────────────────────────────────────────────────────
function buildEmptyState() {
  const wrapper = document.createElement('div');
  wrapper.className = 'card-empty-state';
  wrapper.innerHTML = `
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4">
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
      <polyline points="13 2 13 9 20 9"/>
    </svg>
    <p class="card-empty-text">Henüz onaylanmış içerik yok.</p>
    <p class="card-empty-sub">Haritadan bir il seçerek etkinlik ve projeleri keşfedin.</p>
  `;
  return wrapper;
}


// ═══════════════════════════════════════════════════════════════════
//  YARDIMCI FONKSİYONLAR
// ═══════════════════════════════════════════════════════════════════

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatLabel(format) {
  const labels = {
    'yuz-yuze': 'Yüz yüze',
    'cevrimici': 'Çevrimiçi',
    'hibrit': 'Hibrit',
  };
  return labels[format] || format || '—';
}
