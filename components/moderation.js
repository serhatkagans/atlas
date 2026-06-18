/**
 * GençTek Atlas — Moderasyon Paneli Bileşeni
 *
 * Yetkili moderatörlerin giriş yapıp bekleyen etkinlik ve projeleri
 * onaylamasını, reddetmesini, düzenlemesini ve öne çıkarmasını sağlar.
 */

// ── Tema ve Şehir Cache ──────────────────────────────────────────────
let themesMap = {};
let citiesMap = {};
let themesList = [];
let citiesList = [];

// ── Veri Yükleme Yardımcısı ──────────────────────────────────────────
async function loadStaticData() {
  try {
    const [themesRes, citiesRes] = await Promise.all([
      fetch('./data/themes.json').then((r) => r.json()),
      fetch('./data/cities.json').then((r) => r.json())
    ]);
    themesList = themesRes;
    citiesList = citiesRes;
    themesRes.forEach((t) => { themesMap[t.id] = t; });
    citiesRes.forEach((c) => { citiesMap[c.id] = c; });
  } catch (err) {
    console.error('Moderasyon statik verileri yüklenirken hata:', err);
  }
}

function getThemeName(themeId) {
  return themesMap[themeId]?.name || themeId || '—';
}

function getCityName(cityId) {
  return citiesMap[cityId]?.name || cityId || '—';
}

// ── Firebase Helpers ────────────────────────────────────────────────
function getAtlas() {
  if (!window.Atlas) {
    throw new Error('Firebase SDK (window.Atlas) bulunamadı. Lütfen Ekip 1 kurulumunu kontrol edin.');
  }
  return window.Atlas;
}

// ── Ana Giriş Fonksiyonu ─────────────────────────────────────────────
export async function initModerationPanel(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`initModerationPanel: #${containerId} bulunamadı.`);
    return;
  }

  // 1. Statik verileri yükle (temalar, iller)
  await loadStaticData();

  const { auth, onAuthStateChanged } = getAtlas();

  // Yükleme ekranı göster
  container.innerHTML = `
    <div class="mod-loading-overlay">
      <div class="mod-spinner"></div>
      <p>Oturum durumu kontrol ediliyor...</p>
    </div>
  `;

  // 2. Auth durumu dinleyicisi
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Giriş yapılmamışsa giriş formunu göster
      renderLoginForm(container);
    } else {
      // Giriş yapılmışsa moderatör yetkisini kontrol et
      checkModeratorAccess(user, container);
    }
  });
}

// ── Giriş Formu Render ────────────────────────────────────────────────
function renderLoginForm(container) {
  container.innerHTML = `
    <div class="mod-login-card">
      <div class="mod-login-header">
        <h2>GençTek Atlas</h2>
        <p>Moderasyon Paneli Girişi</p>
      </div>
      <form id="mod-login-form" class="mod-form">
        <div class="mod-form-group">
          <label for="mod-email">E-posta Adresi</label>
          <input type="email" id="mod-email" placeholder="email@genctek.org" required autocomplete="email">
        </div>
        <div class="mod-form-group">
          <label for="mod-password">Şifre</label>
          <input type="password" id="mod-password" placeholder="••••••••" required autocomplete="current-password">
        </div>
        <div id="mod-login-error" class="mod-alert mod-alert--danger" style="display: none;"></div>
        <button type="submit" class="mod-btn mod-btn--primary mod-btn--block">
          <span class="btn-text">Giriş Yap</span>
          <span class="btn-spinner" style="display: none;"></span>
        </button>
      </form>
    </div>
  `;

  const form = document.getElementById('mod-login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('mod-email').value;
    const password = document.getElementById('mod-password').value;
    const errorEl = document.getElementById('mod-login-error');
    const submitBtn = form.querySelector('button[type="submit"]');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');

    errorEl.style.display = 'none';
    submitBtn.disabled = true;
    btnText.style.opacity = '0.5';
    btnSpinner.style.display = 'inline-block';

    const { auth, signInWithEmailAndPassword } = getAtlas();

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Giriş başarılı olunca onAuthStateChanged tetiklenecek ve panel yüklenecek.
    } catch (err) {
      console.error('Giriş hatası:', err);
      let errorMsg = 'E-posta veya şifre hatalı.';
      if (err.code === 'auth/user-not-found') errorMsg = 'Kullanıcı bulunamadı.';
      if (err.code === 'auth/wrong-password') errorMsg = 'Şifre hatalı.';
      if (err.code === 'auth/invalid-email') errorMsg = 'Geçersiz e-posta formatı.';
      
      errorEl.textContent = errorMsg;
      errorEl.style.display = 'block';
      submitBtn.disabled = false;
      btnText.style.opacity = '1';
      btnSpinner.style.display = 'none';
    }
  });
}

// ── Yetki Kontrolü ───────────────────────────────────────────────────
async function checkModeratorAccess(user, container) {
  const { db, collection, query, where, getDocs } = getAtlas();

  try {
    // moderators koleksiyonunda bu e-posta adresi var mı?
    const q = query(collection(db, 'moderators'), where('email', '==', user.email));
    const snap = await getDocs(q);

    if (snap.empty) {
      // Yetki yok
      renderUnauthorized(container, user.email);
    } else {
      // Yetki var, paneli yükle
      renderModerationPanel(container, user);
    }
  } catch (err) {
    console.error('Yetki denetlenirken hata oluştu:', err);
    container.innerHTML = `
      <div class="mod-alert mod-alert--danger">
        <h4>Bağlantı Hatası</h4>
        <p>Yetkileriniz denetlenirken Firestore bağlantı hatası oluştu: ${err.message}</p>
        <button class="mod-btn mod-btn--secondary" id="mod-retry-auth">Tekrar Dene</button>
      </div>
    `;
    document.getElementById('mod-retry-auth').addEventListener('click', () => {
      checkModeratorAccess(user, container);
    });
  }
}

// ── Yetkisiz Kullanıcı Ekranı ───────────────────────────────────────
function renderUnauthorized(container, email) {
  container.innerHTML = `
    <div class="mod-unauthorized-card">
      <div class="mod-warning-icon">⚠️</div>
      <h2>Erişim Engellendi</h2>
      <p><strong>${escapeHtml(email)}</strong> hesabı ile giriş yapıldı ancak bu hesabın moderatör yetkisi bulunmuyor.</p>
      <div class="mod-actions-row">
        <button id="mod-signout-btn" class="mod-btn mod-btn--danger">Çıkış Yap / Başka Hesapla Giriş Yap</button>
      </div>
    </div>
  `;

  document.getElementById('mod-signout-btn').addEventListener('click', async () => {
    const { auth, signOut } = getAtlas();
    await signOut(auth);
  });
}

// ── MODERASYON PANELİ (DASHBOARD) ────────────────────────────────────
let activeTab = 'events'; // 'events', 'projects', 'featured'
let allEvents = [];
let allProjects = [];

async function renderModerationPanel(container, user) {
  // Panel iskeleti
  container.innerHTML = `
    <div class="mod-dashboard">
      <header class="mod-dashboard-header">
        <div class="mod-header-title">
          <h2>GençTek Atlas</h2>
          <span class="mod-badge-role">Moderatör Paneli</span>
        </div>
        <div class="mod-user-info">
          <span class="mod-user-email">${escapeHtml(user.email)}</span>
          <button id="mod-logout-action-btn" class="mod-btn mod-btn--sm mod-btn--outline-danger">Güvenli Çıkış</button>
        </div>
      </header>

      <!-- İstatistik Özeti -->
      <section class="mod-stats-section" id="mod-stats-summary">
        <div class="mod-spinner-wrap"><div class="mod-spinner"></div> İstatistikler yükleniyor...</div>
      </section>

      <!-- Sekme Navigasyonu -->
      <nav class="mod-tabs-nav">
        <button class="mod-tab-btn active" data-tab="events">📅 Bekleyen Etkinlikler (<span id="count-pending-events">-</span>)</button>
        <button class="mod-tab-btn" data-tab="projects">🚀 Bekleyen Projeler (<span id="count-pending-projects">-</span>)</button>
        <button class="mod-tab-btn" data-tab="featured">⭐ Öne Çıkan İçerik Yönetimi</button>
      </nav>

      <!-- Liste Alanı -->
      <main class="mod-main-content" id="mod-lists-container">
        <div class="mod-spinner-wrap" style="padding: 40px 0;"><div class="mod-spinner"></div> İçerikler çekiliyor...</div>
      </main>
    </div>
  `;

  // Çıkış yap butonu
  document.getElementById('mod-logout-action-btn').addEventListener('click', async () => {
    const { auth, signOut } = getAtlas();
    await signOut(auth);
  });

  // Sekme değiştirme
  const tabs = container.querySelectorAll('.mod-tab-btn');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.getAttribute('data-tab');
      renderActiveTabContents();
    });
  });

  // Verileri çek ve render et
  await refreshData();
}

// ── Verileri Yenileme & İstatistik Hesaplama ───────────────────────
async function refreshData() {
  const { db, collection, query, where, getDocs } = getAtlas();

  try {
    // Paralel çek
    const [eventsSnap, projectsSnap] = await Promise.all([
      getDocs(collection(db, 'events')),
      getDocs(collection(db, 'projects'))
    ]);

    allEvents = eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    allProjects = projectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // İstatistik ve Sekme Sayılarını Güncelle
    calculateStatsAndCounts();

    // Aktif sekmeyi çiz
    renderActiveTabContents();

  } catch (err) {
    console.error('Veri çekme hatası:', err);
    const listContainer = document.getElementById('mod-lists-container');
    if (listContainer) {
      listContainer.innerHTML = `
        <div class="mod-alert mod-alert--danger">
          <h4>Veriler yüklenemedi</h4>
          <p>Firestore koleksiyonları okunurken hata oluştu. Kuralları veya bağlantınızı kontrol edin.</p>
          <pre>${err.message}</pre>
          <button class="mod-btn mod-btn--primary" id="mod-refresh-btn">Tekrar Dene</button>
        </div>
      `;
      document.getElementById('mod-refresh-btn').addEventListener('click', refreshData);
    }
  }
}

function calculateStatsAndCounts() {
  // 1. Etkinlik Sayıları
  const pendingEvs = allEvents.filter(e => !e.onaylandi && !e.reddedildi).length;
  const approvedEvs = allEvents.filter(e => e.onaylandi).length;
  const rejectedEvs = allEvents.filter(e => e.reddedildi).length;

  // 2. Proje Sayıları
  const pendingPjs = allProjects.filter(p => !p.onaylandi && !p.reddedildi).length;
  const approvedPjs = allProjects.filter(p => p.onaylandi).length;
  const rejectedPjs = allProjects.filter(p => p.reddedildi).length;

  // İstatistik kutuları
  const statsSummary = document.getElementById('mod-stats-summary');
  if (statsSummary) {
    statsSummary.innerHTML = `
      <div class="mod-stat-card mod-stat-card--pending">
        <div class="stat-num">${pendingEvs + pendingPjs}</div>
        <div class="stat-label">Onay Bekleyen</div>
        <div class="stat-sub">${pendingEvs} etkinlik, ${pendingPjs} proje</div>
      </div>
      <div class="mod-stat-card mod-stat-card--approved">
        <div class="stat-num">${approvedEvs + approvedPjs}</div>
        <div class="stat-label">Onaylanan</div>
        <div class="stat-sub">${approvedEvs} etkinlik, ${approvedPjs} proje</div>
      </div>
      <div class="mod-stat-card mod-stat-card--rejected">
        <div class="stat-num">${rejectedEvs + rejectedPjs}</div>
        <div class="stat-label">Reddedilen</div>
        <div class="stat-sub">${rejectedEvs} etkinlik, ${rejectedPjs} proje</div>
      </div>
    `;
  }

  // Sekme üstü sayaçlar
  const evSpan = document.getElementById('count-pending-events');
  const pjSpan = document.getElementById('count-pending-projects');
  if (evSpan) evSpan.textContent = pendingEvs;
  if (pjSpan) pjSpan.textContent = pendingPjs;
}

// ── Sekme İçeriğini Çizme ───────────────────────────────────────────
function renderActiveTabContents() {
  const container = document.getElementById('mod-lists-container');
  if (!container) return;

  container.innerHTML = '';

  if (activeTab === 'events') {
    const pendingEvents = allEvents.filter(e => !e.onaylandi && !e.reddedildi);
    if (pendingEvents.length === 0) {
      container.appendChild(buildEmptyState('Bekleyen etkinlik bulunmuyor.'));
      return;
    }
    const list = document.createElement('div');
    list.className = 'mod-items-list';
    pendingEvents.forEach((ev) => {
      list.appendChild(buildItemRow(ev, 'event'));
    });
    container.appendChild(list);

  } else if (activeTab === 'projects') {
    const pendingProjects = allProjects.filter(p => !p.onaylandi && !p.reddedildi);
    if (pendingProjects.length === 0) {
      container.appendChild(buildEmptyState('Bekleyen proje bulunmuyor.'));
      return;
    }
    const list = document.createElement('div');
    list.className = 'mod-items-list';
    pendingProjects.forEach((proj) => {
      list.appendChild(buildItemRow(proj, 'project'));
    });
    container.appendChild(list);

  } else if (activeTab === 'featured') {
    renderFeaturedManagement(container);
  }
}

function buildEmptyState(message) {
  const div = document.createElement('div');
  div.className = 'mod-empty-state';
  div.innerHTML = `
    <div class="empty-icon">✓</div>
    <p>${message}</p>
  `;
  return div;
}

// ── Bekleyen Kart / Satır Yapısı ─────────────────────────────────────
function buildItemRow(item, type) {
  const row = document.createElement('article');
  row.className = 'mod-item-row';
  row.setAttribute('data-id', item.id);

  const themeName = getThemeName(item.tema);
  const cityName = type === 'event' ? getCityName(item.il) : '';

  // Gönderim tarihi
  let dateAdded = '—';
  if (item.timestamp) {
    try {
      const d = item.timestamp.toDate ? item.timestamp.toDate() : new Date(item.timestamp);
      dateAdded = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      dateAdded = item.timestamp;
    }
  }

  row.innerHTML = `
    <div class="row-content-view">
      <div class="row-main-info">
        <h4 class="row-title">${escapeHtml(type === 'event' ? item.etkinlikAdi : item.projeAdi)}</h4>
        <div class="row-meta">
          <span class="row-badge-theme" style="background-color: ${themesMap[item.tema]?.color || '#333'}20; color: ${themesMap[item.tema]?.color || '#ccc'}">
            ${escapeHtml(themeName)}
          </span>
          ${type === 'event' 
            ? `<span class="row-meta-item">📍 ${escapeHtml(cityName)}</span>
               <span class="row-meta-item">📅 ${escapeHtml(formatDate(item.tarih))}</span>
               <span class="row-meta-item">💻 ${escapeHtml(formatFormat(item.format))}</span>`
            : `<span class="row-meta-item">👥 Takım: <strong>${escapeHtml(item.takimAdi || '—')}</strong></span>`
          }
        </div>
        ${item.aciklama ? `<p class="row-desc">${escapeHtml(item.aciklama)}</p>` : ''}
        ${type === 'project' && item.githubUrl ? `
          <div class="row-links">
            <a href="${escapeHtml(item.githubUrl)}" target="_blank" rel="noopener noreferrer" class="mod-link-out">🔗 GitHub'da Gör</a>
            ${item.demoUrl ? `<a href="${escapeHtml(item.demoUrl)}" target="_blank" rel="noopener noreferrer" class="mod-link-out">🔗 Canlı Demo</a>` : ''}
          </div>
        ` : ''}
        <div class="row-timestamp">Gönderilme Tarihi: ${dateAdded}</div>
      </div>
      <div class="row-actions">
        <button class="mod-btn mod-btn--success mod-action-approve">Onayla ✓</button>
        <button class="mod-btn mod-btn--danger mod-action-reject">Reddet ✗</button>
        <button class="mod-btn mod-btn--secondary mod-action-edit">Düzenle ✎</button>
      </div>
    </div>
    <div class="row-edit-view" style="display: none;">
      <!-- Düzenleme Formu buraya dinamik eklenecek -->
    </div>
  `;

  // Onayla
  row.querySelector('.mod-action-approve').addEventListener('click', () => approveItem(item.id, type));
  // Reddet
  row.querySelector('.mod-action-reject').addEventListener('click', () => rejectItem(item.id, type));
  // Düzenle
  row.querySelector('.mod-action-edit').addEventListener('click', () => openInlineEdit(row, item, type));

  return row;
}

// ── Moderasyon İşlemleri (Onay/Red/Düzenle) ─────────────────────────

async function approveItem(id, type) {
  const { db, doc, updateDoc } = getAtlas();
  const coll = type === 'event' ? 'events' : 'projects';

  if (!confirm('Bu içeriği onaylamak istediğinize emin misiniz? Haritada ve listelerde görünür olacaktır.')) return;

  try {
    await updateDoc(doc(db, coll, id), {
      onaylandi: true,
      reddedildi: false,
      reddSebebi: null
    });
    await refreshData();
  } catch (err) {
    alert(`Onaylama işlemi başarısız: ${err.message}`);
  }
}

async function rejectItem(id, type) {
  const { db, doc, updateDoc } = getAtlas();
  const coll = type === 'event' ? 'events' : 'projects';

  const reason = prompt('Reddetme sebebini yazın (Kullanıcıya/Kayda açıklama olarak eklenecektir):');
  if (reason === null) return; // İptal edildi
  if (!reason.trim()) {
    alert('Reddetme gerekçesi girmek zorunludur!');
    return;
  }

  try {
    await updateDoc(doc(db, coll, id), {
      onaylandi: false,
      reddedildi: true,
      reddSebebi: reason.trim()
    });
    await refreshData();
  } catch (err) {
    alert(`Reddetme işlemi başarısız: ${err.message}`);
  }
}

// ── Satır İçi Düzenleme (Inline Edit) ─────────────────────────────────
function openInlineEdit(rowEl, item, type) {
  const viewDiv = rowEl.querySelector('.row-content-view');
  const editDiv = rowEl.querySelector('.row-edit-view');

  viewDiv.style.display = 'none';
  editDiv.style.display = 'block';

  // Temalar select options
  const themeOptions = themesList
    .map(t => `<option value="${t.id}" ${t.id === item.tema ? 'selected' : ''}>${t.name}</option>`)
    .join('');

  // Şehirler select options
  const cityOptions = citiesList
    .map(c => `<option value="${c.id}" ${c.id === item.il ? 'selected' : ''}>${c.name}</option>`)
    .join('');

  if (type === 'event') {
    editDiv.innerHTML = `
      <form class="mod-inline-form">
        <h4>Etkinlik Düzenle</h4>
        <div class="mod-inline-grid">
          <div class="mod-form-group">
            <label>Etkinlik Adı</label>
            <input type="text" id="edit-ev-name" value="${escapeHtml(item.etkinlikAdi)}" required>
          </div>
          <div class="mod-form-group">
            <label>Tema</label>
            <select id="edit-ev-theme">${themeOptions}</select>
          </div>
          <div class="mod-form-group">
            <label>İl</label>
            <select id="edit-ev-city">${cityOptions}</select>
          </div>
          <div class="mod-form-group">
            <label>Tarih</label>
            <input type="date" id="edit-ev-date" value="${item.tarih || ''}" required>
          </div>
        </div>
        <div class="mod-form-group">
          <label>Açıklama</label>
          <textarea id="edit-ev-desc" rows="3">${escapeHtml(item.aciklama || '')}</textarea>
        </div>
        <div class="mod-inline-actions">
          <button type="submit" class="mod-btn mod-btn--sm mod-btn--success">Kaydet</button>
          <button type="button" class="mod-btn mod-btn--sm mod-btn--secondary edit-cancel">Vazgeç</button>
        </div>
      </form>
    `;
  } else {
    editDiv.innerHTML = `
      <form class="mod-inline-form">
        <h4>Proje Düzenle</h4>
        <div class="mod-inline-grid">
          <div class="mod-form-group">
            <label>Proje Adı</label>
            <input type="text" id="edit-pj-name" value="${escapeHtml(item.projeAdi)}" required>
          </div>
          <div class="mod-form-group">
            <label>Takım Adı</label>
            <input type="text" id="edit-pj-team" value="${escapeHtml(item.takimAdi || '')}" required>
          </div>
          <div class="mod-form-group">
            <label>Tema</label>
            <select id="edit-pj-theme">${themeOptions}</select>
          </div>
        </div>
        <div class="mod-form-group">
          <label>Açıklama</label>
          <textarea id="edit-pj-desc" rows="3">${escapeHtml(item.aciklama || '')}</textarea>
        </div>
        <div class="mod-inline-actions">
          <button type="submit" class="mod-btn mod-btn--sm mod-btn--success">Kaydet</button>
          <button type="button" class="mod-btn mod-btn--sm mod-btn--secondary edit-cancel">Vazgeç</button>
        </div>
      </form>
    `;
  }

  // Vazgeç
  editDiv.querySelector('.edit-cancel').addEventListener('click', () => {
    viewDiv.style.display = 'flex';
    editDiv.style.display = 'none';
  });

  // Kaydet Form Submit
  editDiv.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { db, doc, updateDoc } = getAtlas();
    const coll = type === 'event' ? 'events' : 'projects';

    const updatedData = {};

    if (type === 'event') {
      updatedData.etkinlikAdi = document.getElementById('edit-ev-name').value.trim();
      updatedData.tema = document.getElementById('edit-ev-theme').value;
      updatedData.il = document.getElementById('edit-ev-city').value;
      updatedData.tarih = document.getElementById('edit-ev-date').value;
      updatedData.aciklama = document.getElementById('edit-ev-desc').value.trim();
    } else {
      updatedData.projeAdi = document.getElementById('edit-pj-name').value.trim();
      updatedData.takimAdi = document.getElementById('edit-pj-team').value.trim();
      updatedData.tema = document.getElementById('edit-pj-theme').value;
      updatedData.aciklama = document.getElementById('edit-pj-desc').value.trim();
    }

    try {
      await updateDoc(doc(db, coll, item.id), updatedData);
      await refreshData();
    } catch (err) {
      alert(`Düzenleme kaydedilirken hata oluştu: ${err.message}`);
    }
  });
}

// ── Öne Çıkan İçerik Yönetimi (Featured) ──────────────────────────────
function renderFeaturedManagement(container) {
  const approvedEvents = allEvents.filter(e => e.onaylandi);
  const approvedProjects = allProjects.filter(p => p.onaylandi);

  container.innerHTML = `
    <div class="mod-featured-section">
      <h3>⭐ Öne Çıkan İçerikler</h3>
      <p class="section-subtitle">Haritada ve anasayfa vitrininde özel olarak işaretlenecek içerikleri belirleyin.</p>
      
      <div class="mod-featured-cols">
        <!-- Etkinlikler -->
        <div class="mod-featured-col">
          <h4>Onaylı Etkinlikler (${approvedEvents.length})</h4>
          ${approvedEvents.length === 0 ? '<p class="no-data">Henüz onaylı etkinlik yok.</p>' : ''}
          <div class="mod-featured-scroll-list">
            ${approvedEvents.map(ev => buildFeaturedListItemHtml(ev, 'event')).join('')}
          </div>
        </div>

        <!-- Projeler -->
        <div class="mod-featured-col">
          <h4>Onaylı Projeler (${approvedProjects.length})</h4>
          ${approvedProjects.length === 0 ? '<p class="no-data">Henüz onaylı proje yok.</p>' : ''}
          <div class="mod-featured-scroll-list">
            ${approvedProjects.map(proj => buildFeaturedListItemHtml(proj, 'project')).join('')}
          </div>
        </div>
      </div>
    </div>
  `;

  // Checkbox tıklama olaylarını bağla
  container.querySelectorAll('.feat-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', async (e) => {
      const id = e.target.getAttribute('data-id');
      const type = e.target.getAttribute('data-type');
      const isChecked = e.target.checked;
      const { db, doc, updateDoc } = getAtlas();
      const coll = type === 'event' ? 'events' : 'projects';

      try {
        await updateDoc(doc(db, coll, id), {
          oneCikan: isChecked
        });
        // Yerel veriyi güncelle ki stats/counts bozulmasın
        const targetList = type === 'event' ? allEvents : allProjects;
        const idx = targetList.findIndex(item => item.id === id);
        if (idx !== -1) targetList[idx].oneCikan = isChecked;

        // Feedback
        const label = e.target.closest('label');
        if (label) {
          label.classList.toggle('featured-active', isChecked);
        }
      } catch (err) {
        alert(`Öne çıkarma kaydedilemedi: ${err.message}`);
        e.target.checked = !isChecked; // Geri al
      }
    });
  });
}

function buildFeaturedListItemHtml(item, type) {
  const isFeatured = !!item.oneCikan;
  const title = type === 'event' ? item.etkinlikAdi : item.projeAdi;
  const sub = type === 'event' ? getCityName(item.il) : (item.takimAdi || '—');

  return `
    <div class="mod-featured-list-item">
      <label class="mod-feat-label ${isFeatured ? 'featured-active' : ''}">
        <input type="checkbox" class="feat-checkbox" data-id="${item.id}" data-type="${type}" ${isFeatured ? 'checked' : ''}>
        <div class="feat-info">
          <span class="feat-title">${escapeHtml(title)}</span>
          <span class="feat-subtitle">${escapeHtml(sub)}</span>
        </div>
      </label>
    </div>
  `;
}

// ── Genel Yardımcı Metotlar ──────────────────────────────────────────
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
