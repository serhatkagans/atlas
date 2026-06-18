/**
 * GençTek Atlas — Detay Sayfaları Bileşeni
 *
 * Etkinlik ve projelerin detay bilgilerini bir modal/kayar panel içinde gösterir.
 * URL hash routing ve cross-navigation (etkinlikten projeye geçiş) destekler.
 */

// ── Tema ve Şehir Cache ──────────────────────────────────────────────
let themesMap = {};
let citiesMap = {};

async function loadStaticData() {
  if (Object.keys(themesMap).length > 0) return;
  try {
    const [themesRes, citiesRes] = await Promise.all([
      fetch('./data/themes.json').then((r) => r.json()),
      fetch('./data/cities.json').then((r) => r.json())
    ]);
    themesRes.forEach((t) => { themesMap[t.id] = t; });
    citiesRes.forEach((c) => { citiesMap[c.id] = c; });
  } catch (err) {
    console.error('Detay bileşeni statik verileri yüklerken hata oluştu:', err);
  }
}

function getTheme(themeId) {
  return themesMap[themeId] || null;
}

function getCityName(cityId) {
  return citiesMap[cityId]?.name || cityId || '—';
}

// ── Firebase Helper ──────────────────────────────────────────────────
function getAtlas() {
  if (!window.Atlas) {
    throw new Error('Firebase SDK (window.Atlas) bulunamadı. Lütfen Ekip 1 kurulumunu kontrol edin.');
  }
  return window.Atlas;
}

// ── Modal Yönetimi ───────────────────────────────────────────────────
let activeModalEl = null;

function closeActiveModal() {
  if (activeModalEl) {
    activeModalEl.classList.remove('open');
    const modalToRemove = activeModalEl;
    setTimeout(() => {
      modalToRemove.remove();
    }, 300); // CSS animasyon süresiyle uyumlu (300ms)
    activeModalEl = null;
  }

  // URL hash'i temizle (Eğer etkinlik veya proje detayındaysak)
  const hash = window.location.hash;
  if (hash.startsWith('#etkinlik/') || hash.startsWith('#proje/')) {
    // History yığınını kirletmeden hash'i temizle
    history.pushState(null, null, ' ');
  }
}

// Global ESC Tuşu Kapatma Dinleyicisi
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 'Esc') {
    closeActiveModal();
  }
});

// ── ETKİNLİK DETAY SAYFASI ───────────────────────────────────────────

/**
 * Belirtilen etkinlik detayını modal içinde açar.
 * @param {string} eventId - Etkinlik Firestore doküman ID'si
 */
export async function showEventDetail(eventId) {
  if (!eventId) return;

  // 1. Statik verileri yükle
  await loadStaticData();

  // 2. URL Hash Güncelle
  const targetHash = `#etkinlik/${eventId}`;
  if (window.location.hash !== targetHash) {
    window.location.hash = targetHash;
  }

  // 3. Mevcut açık modalı kapat
  closeActiveModal();

  // 4. Modal İskeletini Oluştur (Loading durumunda)
  createModalSkeleton();

  const { db, doc, getDoc } = getAtlas();

  try {
    // 5. Firestore'dan Etkinliği Çek
    const docRef = doc(db, 'events', eventId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      renderErrorModal('Etkinlik bulunamadı.', 'Aradığınız etkinlik silinmiş veya onaylanmamış olabilir.');
      return;
    }

    const event = { id: snap.id, ...snap.data() };
    
    // 6. İçeriği Render Et
    renderEventContent(event);

    // 7. İlgili Projeleri Çek ve Göster (Arka planda çalışsın)
    loadRelatedProjects(event);

  } catch (err) {
    console.error('Etkinlik detayları alınırken hata oluştu:', err);
    renderErrorModal('Bağlantı Hatası', `Veri çekilirken bir sorun oluştu: ${err.message}`);
  }
}

function renderEventContent(event) {
  if (!activeModalEl) return;

  const theme = getTheme(event.tema);
  const themeColor = theme?.color || '#3a86ff';
  const themeName = theme?.name || event.tema || '—';
  const cityName = getCityName(event.il);

  const panel = activeModalEl.querySelector('.atlas-detail-panel');
  panel.className = 'atlas-detail-panel atlas-detail-panel--event';

  panel.innerHTML = `
    <button class="detail-close-btn" aria-label="Kapat">&times;</button>
    <div class="detail-hero">
      <div class="detail-hero-banner" style="background: linear-gradient(135deg, ${themeColor} 0%, #0d0d15 100%)">
        ${event.gorselUrl ? `<img src="${escapeHtml(event.gorselUrl)}" alt="${escapeHtml(event.etkinlikAdi)}" loading="lazy" />` : ''}
      </div>
    </div>
    <div class="detail-content">
      <div class="detail-header">
        <span class="detail-badge" style="background: ${themeColor}20; color: ${themeColor}; border-color: ${themeColor}40">
          ${escapeHtml(themeName)}
        </span>
        <span class="detail-format">${escapeHtml(formatFormat(event.format))}</span>
      </div>
      <h2 class="detail-title">${escapeHtml(event.etkinlikAdi)}</h2>
      
      <div class="detail-info-grid">
        <div class="detail-info-item">
          <span class="info-icon">📍</span>
          <div class="info-text">
            <span class="info-label">İl</span>
            <span class="info-value">${escapeHtml(cityName)}</span>
          </div>
        </div>
        <div class="detail-info-item">
          <span class="info-icon">📅</span>
          <div class="info-text">
            <span class="info-label">Tarih</span>
            <span class="info-value">${escapeHtml(formatDate(event.tarih))}</span>
          </div>
        </div>
        ${event.katilimciSayisi ? `
        <div class="detail-info-item">
          <span class="info-icon">👥</span>
          <div class="info-text">
            <span class="info-label">Katılımcı Sayısı</span>
            <span class="info-value">${event.katilimciSayisi} Kişi</span>
          </div>
        </div>` : ''}
      </div>
      
      <div class="detail-section">
        <h3>Etkinlik Açıklaması</h3>
        <p class="detail-desc">${escapeHtml(event.aciklama || 'Bu etkinlik için bir açıklama girilmemiş.')}</p>
      </div>
      
      ${event.baglanti ? `
      <div class="detail-action-bar">
        <a href="${escapeHtml(event.baglanti)}" target="_blank" rel="noopener noreferrer" class="detail-primary-btn" style="--theme-accent: ${themeColor}">
          Etkinliğe Git / Başvur ↗
        </a>
      </div>` : ''}
      
      <!-- İlgili Projeler -->
      <div class="detail-section detail-section--related">
        <h3>İlgili Projeler</h3>
        <div class="related-projects-list">
          <div class="related-spinner-wrap"><div class="detail-mini-spinner"></div> İlgili projeler yükleniyor...</div>
        </div>
      </div>
    </div>
  `;

  // Kapatma butonu listener'ı
  panel.querySelector('.detail-close-btn').addEventListener('click', closeActiveModal);
}

// ── İLGİLİ PROJELERİ YÜKLEME (EVENT İÇİN) ─────────────────────────────
async function loadRelatedProjects(event) {
  const listContainer = activeModalEl?.querySelector('.related-projects-list');
  if (!listContainer) return;

  const { db, collection, query, where, getDocs } = getAtlas();

  try {
    // Tema veya İl ortaklığına göre onaylı projeleri çek
    // Firestore OR desteklemediği için paralel iki sorgu atıp birleştiriyoruz.
    const qTheme = query(
      collection(db, 'projects'),
      where('onaylandi', '==', true),
      where('tema', '==', event.tema)
    );

    const qCity = query(
      collection(db, 'projects'),
      where('onaylandi', '==', true),
      where('katilimciIller', 'array-contains', event.il)
    );

    const [snapTheme, snapCity] = await Promise.all([
      getDocs(qTheme),
      getDocs(qCity)
    ]);

    // Map kullanarak dokümanları tekilleştir
    const projectsMap = new Map();
    
    snapTheme.docs.forEach((doc) => {
      projectsMap.set(doc.id, { id: doc.id, ...doc.data() });
    });
    
    snapCity.docs.forEach((doc) => {
      projectsMap.set(doc.id, { id: doc.id, ...doc.data() });
    });

    const relatedProjects = Array.from(projectsMap.values());

    // Arayüzü güncelle
    listContainer.innerHTML = '';

    if (relatedProjects.length === 0) {
      listContainer.innerHTML = '<p class="related-empty-text">Aynı temada veya şehirde henüz proje bulunmuyor.</p>';
      return;
    }

    relatedProjects.forEach((proj) => {
      const item = document.createElement('div');
      item.className = 'related-project-card';
      const projTheme = getTheme(proj.tema);
      const projColor = projTheme?.color || '#8338ec';

      item.innerHTML = `
        <div class="related-card-accent" style="background-color: ${projColor}"></div>
        <div class="related-card-body">
          <h4 class="related-card-title">${escapeHtml(proj.projeAdi)}</h4>
          <span class="related-card-team">👥 ${escapeHtml(proj.takimAdi || '—')}</span>
        </div>
        <span class="related-card-arrow">→</span>
      `;

      // Karta tıklayınca proje detayına geçsin
      item.addEventListener('click', () => {
        showProjectDetail(proj.id);
      });

      listContainer.appendChild(item);
    });

  } catch (err) {
    console.error('İlgili projeler yüklenirken hata oluştu:', err);
    listContainer.innerHTML = '<p class="related-error-text">İlgili projeler yüklenemedi.</p>';
  }
}

// ── PROJE DETAY SAYFASI ──────────────────────────────────────────────

/**
 * Belirtilen proje detayını modal içinde açar.
 * @param {string} projectId - Proje Firestore doküman ID'si
 */
export async function showProjectDetail(projectId) {
  if (!projectId) return;

  // 1. Statik verileri yükle
  await loadStaticData();

  // 2. URL Hash Güncelle
  const targetHash = `#proje/${projectId}`;
  if (window.location.hash !== targetHash) {
    window.location.hash = targetHash;
  }

  // 3. Mevcut açık modalı kapat
  closeActiveModal();

  // 4. Modal İskeletini Oluştur
  createModalSkeleton();

  const { db, doc, getDoc } = getAtlas();

  try {
    // 5. Firestore'dan Projeyi Çek
    const docRef = doc(db, 'projects', projectId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      renderErrorModal('Proje bulunamadı.', 'Aradığınız proje silinmiş veya onaylanmamış olabilir.');
      return;
    }

    const project = { id: snap.id, ...snap.data() };

    // 6. İçeriği Render Et
    renderProjectContent(project);

  } catch (err) {
    console.error('Proje detayları alınırken hata oluştu:', err);
    renderErrorModal('Bağlantı Hatası', `Veri çekilirken bir sorun oluştu: ${err.message}`);
  }
}

function renderProjectContent(project) {
  if (!activeModalEl) return;

  const theme = getTheme(project.tema);
  const themeColor = theme?.color || '#8338ec';
  const themeName = theme?.name || project.tema || '—';

  // Katılımcı iller rozetlerini hazırla
  const cityBadgesHtml = (project.katilimciIller || [])
    .map(cityId => `<span class="detail-city-badge">📍 ${escapeHtml(getCityName(cityId))}</span>`)
    .join('');

  const panel = activeModalEl.querySelector('.atlas-detail-panel');
  panel.className = 'atlas-detail-panel atlas-detail-panel--project';

  panel.innerHTML = `
    <button class="detail-close-btn" aria-label="Kapat">&times;</button>
    <div class="detail-hero">
      <div class="detail-hero-banner" style="background: linear-gradient(135deg, ${themeColor} 0%, #0d0d15 100%)">
        ${project.gorselUrl ? `<img src="${escapeHtml(project.gorselUrl)}" alt="${escapeHtml(project.projeAdi)}" loading="lazy" />` : ''}
      </div>
    </div>
    <div class="detail-content">
      <div class="detail-header">
        <span class="detail-badge" style="background: ${themeColor}20; color: ${themeColor}; border-color: ${themeColor}40">
          ${escapeHtml(themeName)}
        </span>
        <span class="detail-badge detail-badge--ethics ${project.etikOnay ? 'ethics-approved' : 'ethics-pending'}">
          ⚖️ Etik Uygunluk: ${project.etikOnay ? 'Onaylandı' : 'Bekliyor'}
        </span>
      </div>
      
      <h2 class="detail-title">${escapeHtml(project.projeAdi)}</h2>
      <p class="detail-team-name">👥 Takım: <strong>${escapeHtml(project.takimAdi || '—')}</strong></p>
      
      <div class="detail-section">
        <h3>Proje Açıklaması</h3>
        <p class="detail-desc">${escapeHtml(project.aciklama || 'Bu proje için bir açıklama girilmemiş.')}</p>
      </div>

      <div class="detail-section">
        <h3>Katılımcı İller</h3>
        <div class="detail-cities-badges">
          ${cityBadgesHtml || '<span class="detail-city-badge">Katılımcı il bilgisi bulunmuyor.</span>'}
        </div>
      </div>

      <div class="detail-links-grid">
        ${project.githubUrl ? `
        <a href="${escapeHtml(project.githubUrl)}" target="_blank" rel="noopener noreferrer" class="detail-btn detail-btn--github">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
          GitHub Deposu ↗
        </a>` : ''}

        ${project.demoUrl ? `
        <a href="${escapeHtml(project.demoUrl)}" target="_blank" rel="noopener noreferrer" class="detail-btn detail-btn--demo" style="--btn-color: ${themeColor}">
          🔗 Proje Demosu ↗
        </a>` : ''}

        ${project.promptDosyasiUrl ? `
        <a href="${escapeHtml(project.promptDosyasiUrl)}" target="_blank" rel="noopener noreferrer" class="detail-btn detail-btn--prompt">
          📄 Yapay Zeka Promptları ↗
        </a>` : ''}
      </div>
    </div>
  `;

  // Kapatma butonu listener'ı
  panel.querySelector('.detail-close-btn').addEventListener('click', closeActiveModal);
}

// ── YARDIMCI GÖRÜNÜM YAPILARI ────────────────────────────────────────

/**
 * Modal iskeletini oluşturup body'ye ekler.
 */
function createModalSkeleton() {
  const overlay = document.createElement('div');
  overlay.className = 'atlas-detail-overlay';
  overlay.innerHTML = `
    <div class="atlas-detail-panel">
      <div class="skeleton-banner"></div>
      <div class="skeleton-body">
        <div class="skeleton-line skeleton-line--badge"></div>
        <div class="skeleton-line skeleton-line--title"></div>
        <div class="skeleton-line skeleton-line--text"></div>
        <div class="skeleton-line skeleton-line--text"></div>
      </div>
    </div>
  `;

  // Overlay'e tıklayınca modal kapansın
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeActiveModal();
    }
  });

  document.body.appendChild(overlay);
  activeModalEl = overlay;

  // Animasyon için bir sonraki tick'te .open class'ını ekle
  setTimeout(() => {
    overlay.classList.add('open');
  }, 10);
}

/**
 * Veri alınamadığında hata ekranı render eder.
 */
function renderErrorModal(title, text) {
  if (!activeModalEl) return;
  const panel = activeModalEl.querySelector('.atlas-detail-panel');
  panel.className = 'atlas-detail-panel atlas-detail-panel--error';
  panel.innerHTML = `
    <button class="detail-close-btn" aria-label="Kapat">&times;</button>
    <div class="detail-error-content">
      <div class="detail-error-icon">⚠️</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(text)}</p>
      <button class="mod-btn mod-btn--secondary detail-error-close-btn">Kapat</button>
    </div>
  `;

  panel.querySelector('.detail-close-btn').addEventListener('click', closeActiveModal);
  panel.querySelector('.detail-error-close-btn').addEventListener('click', closeActiveModal);
}

// ── FORMATLAMA YARDIMCILARI ──────────────────────────────────────────

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

function formatFormat(format) {
  const labels = {
    'yuz-yuze': 'Yüz yüze',
    'cevrimici': 'Çevrimiçi',
    'hibrit': 'Hibrit',
  };
  return labels[format] || format || '—';
}

// ── URL HASH ROUTING KONTROLLERİ ──────────────────────────────────────

function handleHashRoute() {
  const hash = window.location.hash;
  if (hash.startsWith('#etkinlik/')) {
    const eventId = hash.split('/')[1];
    if (eventId) showEventDetail(eventId);
  } else if (hash.startsWith('#proje/')) {
    const projectId = hash.split('/')[1];
    if (projectId) showProjectDetail(projectId);
  } else {
    // Hash boşsa veya başka bir hash ise detay panelini kapat
    closeActiveModal();
  }
}

// Olay dinleyicilerini bağla
window.addEventListener('hashchange', handleHashRoute);

if (document.readyState === 'complete') {
  handleHashRoute();
} else {
  window.addEventListener('load', handleHashRoute);
}

// Custom event dinleyicileri (Kartlardan gelen tetiklemeler için)
window.addEventListener('showEventDetail', (e) => showEventDetail(e.detail));
window.addEventListener('showProjectDetail', (e) => showProjectDetail(e.detail));
