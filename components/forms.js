/**
 * GençTek Atlas — Etkinlik & Proje Kayıt Formları
 *
 * Firebase Firestore + Storage ile çalışır.
 * Bağımlılık: window.Atlas (EKİP 1 tarafından public/index.html'de tanımlanır)
 *
 * Kullanım:
 *   import { renderEventForm, renderProjectForm } from './forms.js';
 *   renderEventForm('content-area');
 *   renderProjectForm('content-area');
 */

// ── Sabitler ────────────────────────────────────────────────────────
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_EVENT_DESC = 500;
const MAX_PROJECT_DESC = 1000;
const URL_PATTERN = /^https?:\/\/.+\..+/i;
const GITHUB_PATTERN = /^https:\/\/github\.com\/.+/i;

const FORMAT_OPTIONS = [
  { value: 'yuz-yuze', label: 'Yüz yüze' },
  { value: 'cevrimici', label: 'Çevrimiçi' },
  { value: 'hibrit', label: 'Hibrit' },
];

// ── Veri Yükleme ────────────────────────────────────────────────────
let themesCache = null;
let citiesCache = null;

async function loadThemes() {
  if (themesCache) return themesCache;
  const res = await fetch('./data/themes.json');
  themesCache = await res.json();
  return themesCache;
}

async function loadCities() {
  if (citiesCache) return citiesCache;
  const res = await fetch('./data/cities.json');
  citiesCache = await res.json();
  return citiesCache;
}


// ═══════════════════════════════════════════════════════════════════
//  ETKİNLİK KAYIT FORMU
// ═══════════════════════════════════════════════════════════════════

/**
 * Etkinlik kayıt formunu belirtilen container'a render eder.
 * @param {string} containerId - Formun yerleştirileceği div id'si
 */
export async function renderEventForm(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`renderEventForm: #${containerId} bulunamadı`);
    return;
  }

  const [themes, cities] = await Promise.all([loadThemes(), loadCities()]);
  container.innerHTML = '';
  container.appendChild(buildEventForm(themes, cities));
}

function buildEventForm(themes, cities) {
  const form = el('form', {
    id: 'event-form',
    class: 'atlas-form',
    noValidate: true,
  });

  // Başlık
  form.appendChild(el('div', { class: 'form-header' },
    el('h2', { class: 'form-title' }, '📋 Etkinlik Kayıt'),
    el('p', { class: 'form-subtitle' }, 'Etkinliğinizi ekleyin, inceleme sonrası yayınlansın.')
  ));

  const body = el('div', { class: 'form-body' });

  // Etkinlik Adı
  body.appendChild(fieldGroup('ev-etkinlikAdi', 'Etkinlik Adı', () =>
    el('input', {
      type: 'text', id: 'ev-etkinlikAdi', name: 'etkinlikAdi',
      placeholder: 'ör. GençTek Ankara Buluşması', maxLength: '120', autocomplete: 'off',
    })
  ));

  // Tema
  body.appendChild(fieldGroup('ev-tema', 'Tema', () => {
    const select = el('select', { id: 'ev-tema', name: 'tema' });
    select.appendChild(el('option', { value: '', disabled: true, selected: true }, '— Tema seçin —'));
    themes.forEach((t) => select.appendChild(el('option', { value: t.id }, t.name)));
    return select;
  }));

  // Format
  body.appendChild(fieldGroup('ev-format', 'Etkinlik Formatı', () => {
    const select = el('select', { id: 'ev-format', name: 'format' });
    select.appendChild(el('option', { value: '', disabled: true, selected: true }, '— Format seçin —'));
    FORMAT_OPTIONS.forEach((f) => select.appendChild(el('option', { value: f.value }, f.label)));
    return select;
  }));

  // İl
  body.appendChild(fieldGroup('ev-il', 'İl', () => {
    const select = el('select', { id: 'ev-il', name: 'il' });
    select.appendChild(el('option', { value: '', disabled: true, selected: true }, '— İl seçin —'));
    cities.forEach((c) => select.appendChild(el('option', { value: c.id }, c.name)));
    return select;
  }));

  // Tarih
  body.appendChild(fieldGroup('ev-tarih', 'Tarih', () =>
    el('input', {
      type: 'date', id: 'ev-tarih', name: 'tarih',
      min: new Date().toISOString().split('T')[0],
    })
  ));

  // Katılımcı Sayısı
  body.appendChild(fieldGroup('ev-katilimciSayisi', 'Katılımcı Sayısı', () =>
    el('input', {
      type: 'number', id: 'ev-katilimciSayisi', name: 'katilimciSayisi',
      placeholder: 'ör. 50', min: '1', step: '1',
    })
  ));

  // Açıklama
  body.appendChild(fieldGroup('ev-aciklama', 'Açıklama', () => {
    const wrapper = el('div', { class: 'textarea-wrapper' });
    const textarea = el('textarea', {
      id: 'ev-aciklama', name: 'aciklama',
      placeholder: 'Etkinlik hakkında kısa bir açıklama…',
      maxLength: String(MAX_EVENT_DESC), rows: '4',
    });
    const counter = el('span', { class: 'char-counter', id: 'ev-aciklama-counter' }, `0 / ${MAX_EVENT_DESC}`);
    textarea.addEventListener('input', () => {
      const len = textarea.value.length;
      counter.textContent = `${len} / ${MAX_EVENT_DESC}`;
      counter.classList.toggle('near-limit', len > MAX_EVENT_DESC * 0.9);
      counter.classList.toggle('at-limit', len >= MAX_EVENT_DESC);
    });
    wrapper.appendChild(textarea);
    wrapper.appendChild(counter);
    return wrapper;
  }));

  // Bağlantı
  body.appendChild(fieldGroup('ev-baglanti', 'Bağlantı (URL)', () =>
    el('input', {
      type: 'url', id: 'ev-baglanti', name: 'baglanti',
      placeholder: 'https://...', autocomplete: 'off',
    })
  ));

  // Görsel
  body.appendChild(buildFileField('ev-gorsel', 'Görsel', true));

  form.appendChild(body);
  form.appendChild(el('div', { class: 'form-message', id: 'ev-form-message' }));

  const footer = el('div', { class: 'form-footer' });
  footer.appendChild(el('button', { type: 'submit', class: 'btn-submit', id: 'ev-btn-submit' }, 'Etkinliği Gönder'));
  form.appendChild(footer);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleEventSubmit(form);
  });

  return form;
}

// ── Etkinlik Doğrulama ──────────────────────────────────────────────
function validateEventForm(form) {
  let valid = true;
  clearAllErrors(form);

  if (!val(form, 'ev-etkinlikAdi')) { showFieldError('ev-etkinlikAdi', 'Etkinlik adı zorunludur.'); valid = false; }
  if (!selVal(form, 'ev-tema'))     { showFieldError('ev-tema', 'Lütfen bir tema seçin.'); valid = false; }
  if (!selVal(form, 'ev-format'))   { showFieldError('ev-format', 'Lütfen bir format seçin.'); valid = false; }
  if (!selVal(form, 'ev-il'))       { showFieldError('ev-il', 'Lütfen bir il seçin.'); valid = false; }
  if (!val(form, 'ev-tarih'))       { showFieldError('ev-tarih', 'Tarih zorunludur.'); valid = false; }

  const ks = parseInt(document.getElementById('ev-katilimciSayisi')?.value, 10);
  if (isNaN(ks) || ks < 1) { showFieldError('ev-katilimciSayisi', 'En az 1 katılımcı girilmelidir.'); valid = false; }

  const desc = val(form, 'ev-aciklama');
  if (!desc) { showFieldError('ev-aciklama', 'Açıklama zorunludur.'); valid = false; }
  else if (desc.length > MAX_EVENT_DESC) { showFieldError('ev-aciklama', `En fazla ${MAX_EVENT_DESC} karakter.`); valid = false; }

  const url = val(form, 'ev-baglanti');
  if (!url) { showFieldError('ev-baglanti', 'Bağlantı zorunludur.'); valid = false; }
  else if (!URL_PATTERN.test(url)) { showFieldError('ev-baglanti', 'Geçerli bir URL girin (http:// veya https://).'); valid = false; }

  if (!validateFileField('ev-gorsel', true)) valid = false;

  if (!valid) scrollToFirstError(form);
  return valid;
}

// ── Etkinlik Gönderme ───────────────────────────────────────────────
async function handleEventSubmit(form) {
  if (!validateEventForm(form)) return;

  const btn = document.getElementById('ev-btn-submit');
  const msg = document.getElementById('ev-form-message');

  if (!window.Atlas) { showMessage(msg, 'error', 'Firebase bağlantısı bulunamadı.'); return; }
  const { db, storage, collection, addDoc, serverTimestamp, ref, uploadBytes, getDownloadURL } = window.Atlas;

  btn.disabled = true; btn.textContent = 'Gönderiliyor…'; btn.classList.add('loading');
  showMessage(msg, 'info', 'Etkinliğiniz kaydediliyor…');

  try {
    const file = document.getElementById('ev-gorsel').files[0];
    const gorselUrl = await uploadImage(file, 'events', storage, ref, uploadBytes, getDownloadURL);

    await addDoc(collection(db, 'events'), {
      etkinlikAdi: val(form, 'ev-etkinlikAdi'),
      tema: selVal(form, 'ev-tema'),
      format: selVal(form, 'ev-format'),
      il: selVal(form, 'ev-il'),
      tarih: val(form, 'ev-tarih'),
      katilimciSayisi: parseInt(document.getElementById('ev-katilimciSayisi').value, 10),
      aciklama: val(form, 'ev-aciklama'),
      baglanti: val(form, 'ev-baglanti'),
      gorselUrl,
      onaylandi: false,
      olusturulmaTarihi: serverTimestamp(),
    });

    showMessage(msg, 'success', '✅ Etkinliğiniz incelemeye alındı! Onaylandıktan sonra haritada görünecektir.');
    form.reset();
    resetCounter('ev-aciklama-counter', MAX_EVENT_DESC);
    resetFileField('ev-gorsel');

  } catch (err) {
    console.error('Etkinlik kayıt hatası:', err);
    showMessage(msg, 'error', `❌ ${firebaseErrorMsg(err)}`);
  } finally {
    btn.disabled = false; btn.textContent = 'Etkinliği Gönder'; btn.classList.remove('loading');
  }
}


// ═══════════════════════════════════════════════════════════════════
//  PROJE KAYIT FORMU
// ═══════════════════════════════════════════════════════════════════

/**
 * Proje kayıt formunu belirtilen container'a render eder.
 * @param {string} containerId - Formun yerleştirileceği div id'si
 */
export async function renderProjectForm(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`renderProjectForm: #${containerId} bulunamadı`);
    return;
  }

  const [themes, cities] = await Promise.all([loadThemes(), loadCities()]);
  container.innerHTML = '';
  container.appendChild(buildProjectForm(themes, cities));
}

function buildProjectForm(themes, cities) {
  const form = el('form', {
    id: 'project-form',
    class: 'atlas-form',
    noValidate: true,
  });

  // Başlık
  form.appendChild(el('div', { class: 'form-header' },
    el('h2', { class: 'form-title' }, '🚀 Proje Kayıt'),
    el('p', { class: 'form-subtitle' }, 'Projenizi ekleyin, inceleme sonrası Atlas\'ta yayınlansın.')
  ));

  const body = el('div', { class: 'form-body' });

  // Proje Adı
  body.appendChild(fieldGroup('pj-projeAdi', 'Proje Adı', () =>
    el('input', {
      type: 'text', id: 'pj-projeAdi', name: 'projeAdi',
      placeholder: 'ör. GençTek Çevre Sensörü', maxLength: '120', autocomplete: 'off',
    })
  ));

  // Tema
  body.appendChild(fieldGroup('pj-tema', 'Tema', () => {
    const select = el('select', { id: 'pj-tema', name: 'tema' });
    select.appendChild(el('option', { value: '', disabled: true, selected: true }, '— Tema seçin —'));
    themes.forEach((t) => select.appendChild(el('option', { value: t.id }, t.name)));
    return select;
  }));

  // Takım Adı
  body.appendChild(fieldGroup('pj-takimAdi', 'Takım Adı', () =>
    el('input', {
      type: 'text', id: 'pj-takimAdi', name: 'takimAdi',
      placeholder: 'ör. Kod Korsanları', maxLength: '80', autocomplete: 'off',
    })
  ));

  // Katılımcı İller (çoklu seçim checkbox listesi)
  body.appendChild(buildCityCheckboxes(cities));

  // Açıklama (max 1000)
  body.appendChild(fieldGroup('pj-aciklama', 'Açıklama', () => {
    const wrapper = el('div', { class: 'textarea-wrapper' });
    const textarea = el('textarea', {
      id: 'pj-aciklama', name: 'aciklama',
      placeholder: 'Projenizin amacı, kullandığı teknolojiler ve hedefleri…',
      maxLength: String(MAX_PROJECT_DESC), rows: '5',
    });
    const counter = el('span', { class: 'char-counter', id: 'pj-aciklama-counter' }, `0 / ${MAX_PROJECT_DESC}`);
    textarea.addEventListener('input', () => {
      const len = textarea.value.length;
      counter.textContent = `${len} / ${MAX_PROJECT_DESC}`;
      counter.classList.toggle('near-limit', len > MAX_PROJECT_DESC * 0.9);
      counter.classList.toggle('at-limit', len >= MAX_PROJECT_DESC);
    });
    wrapper.appendChild(textarea);
    wrapper.appendChild(counter);
    return wrapper;
  }));

  // GitHub URL (zorunlu)
  body.appendChild(fieldGroup('pj-githubUrl', 'GitHub Linki', () =>
    el('input', {
      type: 'url', id: 'pj-githubUrl', name: 'githubUrl',
      placeholder: 'https://github.com/kullanici/proje', autocomplete: 'off',
    })
  ));

  // Demo URL (opsiyonel)
  body.appendChild(fieldGroup('pj-demoUrl', 'Demo Linki (opsiyonel)', () =>
    el('input', {
      type: 'url', id: 'pj-demoUrl', name: 'demoUrl',
      placeholder: 'https://proje-demo.netlify.app', autocomplete: 'off',
    })
  ));

  // Görsel (opsiyonel)
  body.appendChild(buildFileField('pj-gorsel', 'Proje Görseli (opsiyonel)', false));

  // Prompt Dosyası URL (opsiyonel)
  body.appendChild(fieldGroup('pj-promptDosyasiUrl', 'Prompt Dosyası Linki (opsiyonel)', () =>
    el('input', {
      type: 'url', id: 'pj-promptDosyasiUrl', name: 'promptDosyasiUrl',
      placeholder: 'https://...', autocomplete: 'off',
    })
  ));

  // Etik Onay (zorunlu checkbox)
  body.appendChild(buildEthicsCheckbox());

  form.appendChild(body);
  form.appendChild(el('div', { class: 'form-message', id: 'pj-form-message' }));

  const footer = el('div', { class: 'form-footer' });
  footer.appendChild(el('button', { type: 'submit', class: 'btn-submit', id: 'pj-btn-submit' }, 'Projeyi Gönder'));
  form.appendChild(footer);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleProjectSubmit(form);
  });

  return form;
}

// ── Katılımcı İller Checkbox Listesi ────────────────────────────────
function buildCityCheckboxes(cities) {
  const group = el('div', { class: 'field-group' });
  group.appendChild(el('label', { class: 'field-label' }, 'Katılımcı İller'));

  // Arama kutusu
  const search = el('input', {
    type: 'text', id: 'pj-city-search', class: 'city-search-input',
    placeholder: 'İl ara…', autocomplete: 'off',
  });
  group.appendChild(search);

  // Seçim sayacı
  const selectedCount = el('span', {
    class: 'city-selected-count', id: 'pj-city-count',
  }, '0 il seçili');
  group.appendChild(selectedCount);

  // Checkbox container
  const container = el('div', {
    class: 'city-checkbox-container', id: 'pj-katilimciIller-container',
  });

  // Bölgelere göre grupla
  const regions = {};
  cities.forEach((c) => {
    if (!regions[c.region]) regions[c.region] = [];
    regions[c.region].push(c);
  });

  Object.entries(regions).sort().forEach(([region, regionCities]) => {
    const regionGroup = el('div', { class: 'city-region-group' });
    regionGroup.appendChild(el('div', { class: 'city-region-label' }, region));

    const regionGrid = el('div', { class: 'city-checkbox-grid' });
    regionCities.forEach((c) => {
      const item = el('label', { class: 'city-checkbox-item', 'data-city-name': c.name.toLowerCase() });
      const cb = el('input', {
        type: 'checkbox', name: 'katilimciIller', value: c.id,
        class: 'city-checkbox',
      });
      cb.addEventListener('change', () => {
        updateCityCount();
        clearFieldError('pj-katilimciIller-container');
      });
      item.appendChild(cb);
      item.appendChild(el('span', { class: 'city-checkbox-text' }, c.name));
      regionGrid.appendChild(item);
    });

    regionGroup.appendChild(regionGrid);
    container.appendChild(regionGroup);
  });

  group.appendChild(container);
  group.appendChild(el('span', { class: 'field-error', id: 'pj-katilimciIller-container-error' }));

  // Arama filtresi
  search.addEventListener('input', () => {
    const query = search.value.toLowerCase().trim();
    container.querySelectorAll('.city-checkbox-item').forEach((item) => {
      const name = item.getAttribute('data-city-name');
      item.style.display = name.includes(query) ? '' : 'none';
    });
    // Boş bölge gruplarını gizle
    container.querySelectorAll('.city-region-group').forEach((rg) => {
      const visible = rg.querySelectorAll('.city-checkbox-item[style=""], .city-checkbox-item:not([style])');
      rg.style.display = visible.length > 0 ? '' : 'none';
    });
  });

  return group;
}

function updateCityCount() {
  const checked = document.querySelectorAll('#pj-katilimciIller-container .city-checkbox:checked');
  const counter = document.getElementById('pj-city-count');
  if (counter) counter.textContent = `${checked.length} il seçili`;
}

function getSelectedCityIds() {
  const checked = document.querySelectorAll('#pj-katilimciIller-container .city-checkbox:checked');
  return Array.from(checked).map((cb) => cb.value);
}

// ── Etik Onay Checkbox ──────────────────────────────────────────────
function buildEthicsCheckbox() {
  const group = el('div', { class: 'field-group' });
  const wrapper = el('label', { class: 'ethics-checkbox-wrapper' });
  const cb = el('input', {
    type: 'checkbox', id: 'pj-etikOnay', name: 'etikOnay',
    class: 'ethics-checkbox',
  });
  cb.addEventListener('change', () => clearFieldError('pj-etikOnay'));
  wrapper.appendChild(cb);
  wrapper.appendChild(el('span', { class: 'ethics-label-text' },
    'Bu projenin yapay zeka kullanımı etik kurallara uygundur.'
  ));
  group.appendChild(wrapper);
  group.appendChild(el('span', { class: 'field-error', id: 'pj-etikOnay-error' }));
  return group;
}

// ── Proje Doğrulama ─────────────────────────────────────────────────
function validateProjectForm(form) {
  let valid = true;
  clearAllErrors(form);

  if (!val(form, 'pj-projeAdi'))  { showFieldError('pj-projeAdi', 'Proje adı zorunludur.'); valid = false; }
  if (!selVal(form, 'pj-tema'))   { showFieldError('pj-tema', 'Lütfen bir tema seçin.'); valid = false; }
  if (!val(form, 'pj-takimAdi'))  { showFieldError('pj-takimAdi', 'Takım adı zorunludur.'); valid = false; }

  // Katılımcı İller
  const selectedCities = getSelectedCityIds();
  if (selectedCities.length === 0) {
    showFieldError('pj-katilimciIller-container', 'En az 1 il seçmelisiniz.');
    valid = false;
  }

  // Açıklama
  const desc = val(form, 'pj-aciklama');
  if (!desc) { showFieldError('pj-aciklama', 'Açıklama zorunludur.'); valid = false; }
  else if (desc.length > MAX_PROJECT_DESC) { showFieldError('pj-aciklama', `En fazla ${MAX_PROJECT_DESC} karakter.`); valid = false; }

  // GitHub URL (zorunlu, github.com ile başlamalı)
  const github = val(form, 'pj-githubUrl');
  if (!github) {
    showFieldError('pj-githubUrl', 'GitHub linki zorunludur.');
    valid = false;
  } else if (!GITHUB_PATTERN.test(github)) {
    showFieldError('pj-githubUrl', 'URL https://github.com/ ile başlamalıdır.');
    valid = false;
  }

  // Demo URL (opsiyonel ama girilmişse geçerli olmalı)
  const demo = val(form, 'pj-demoUrl');
  if (demo && !URL_PATTERN.test(demo)) {
    showFieldError('pj-demoUrl', 'Geçerli bir URL girin (http:// veya https://).');
    valid = false;
  }

  // Görsel (opsiyonel ama seçilmişse geçerli olmalı)
  if (!validateFileField('pj-gorsel', false)) valid = false;

  // Prompt Dosyası URL (opsiyonel ama girilmişse geçerli olmalı)
  const prompt = val(form, 'pj-promptDosyasiUrl');
  if (prompt && !URL_PATTERN.test(prompt)) {
    showFieldError('pj-promptDosyasiUrl', 'Geçerli bir URL girin (http:// veya https://).');
    valid = false;
  }

  // Etik Onay (zorunlu)
  const ethics = document.getElementById('pj-etikOnay');
  if (!ethics?.checked) {
    showFieldError('pj-etikOnay', 'Etik onay kutusu işaretlenmelidir.');
    valid = false;
  }

  if (!valid) scrollToFirstError(form);
  return valid;
}

// ── Proje Gönderme ──────────────────────────────────────────────────
async function handleProjectSubmit(form) {
  if (!validateProjectForm(form)) return;

  const btn = document.getElementById('pj-btn-submit');
  const msg = document.getElementById('pj-form-message');

  if (!window.Atlas) { showMessage(msg, 'error', 'Firebase bağlantısı bulunamadı.'); return; }
  const { db, storage, collection, addDoc, serverTimestamp, ref, uploadBytes, getDownloadURL } = window.Atlas;

  btn.disabled = true; btn.textContent = 'Gönderiliyor…'; btn.classList.add('loading');
  showMessage(msg, 'info', 'Projeniz kaydediliyor…');

  try {
    // 1) Görsel varsa yükle
    const fileInput = document.getElementById('pj-gorsel');
    const file = fileInput?.files?.[0] || null;
    let gorselUrl = '';
    if (file) {
      gorselUrl = await uploadImage(file, 'projects', storage, ref, uploadBytes, getDownloadURL);
    }

    // 2) Firestore'a kaydet
    await addDoc(collection(db, 'projects'), {
      projeAdi: val(form, 'pj-projeAdi'),
      tema: selVal(form, 'pj-tema'),
      takimAdi: val(form, 'pj-takimAdi'),
      katilimciIller: getSelectedCityIds(),
      aciklama: val(form, 'pj-aciklama'),
      githubUrl: val(form, 'pj-githubUrl'),
      demoUrl: val(form, 'pj-demoUrl') || '',
      gorselUrl,
      promptDosyasiUrl: val(form, 'pj-promptDosyasiUrl') || '',
      etikOnay: true,
      onaylandi: false,
      olusturulmaTarihi: serverTimestamp(),
    });

    // 3) Başarılı
    showMessage(msg, 'success', '✅ Projeniz incelemeye alındı, GitHub linkiniz kaydedildi!');
    form.reset();
    resetCounter('pj-aciklama-counter', MAX_PROJECT_DESC);
    resetFileField('pj-gorsel');
    updateCityCount();

  } catch (err) {
    console.error('Proje kayıt hatası:', err);
    showMessage(msg, 'error', `❌ ${firebaseErrorMsg(err)}`);
  } finally {
    btn.disabled = false; btn.textContent = 'Projeyi Gönder'; btn.classList.remove('loading');
  }
}


// ═══════════════════════════════════════════════════════════════════
//  ORTAK YARDIMCI FONKSİYONLAR
// ═══════════════════════════════════════════════════════════════════

// ── Dosya Yükleme Alanı Oluşturucu ─────────────────────────────────
function buildFileField(id, label, required) {
  return fieldGroup(id, label, () => {
    const wrapper = el('div', { class: 'file-upload-wrapper' });

    const fileInput = el('input', {
      type: 'file', id, name: id.replace(/^(ev|pj)-/, ''),
      accept: 'image/*', class: 'file-input-hidden',
    });

    const labelEl = el('label', { for: id, class: 'file-upload-label' },
      el('span', { class: 'file-upload-icon' }, '📁'),
      el('span', { class: 'file-upload-text', id: `${id}-text` },
        required ? 'Görsel seçin (max 5 MB)' : 'Görsel seçin — opsiyonel (max 5 MB)')
    );

    const preview = el('div', { class: 'file-preview', id: `${id}-preview` });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      const textEl = document.getElementById(`${id}-text`);
      const previewEl = document.getElementById(`${id}-preview`);
      previewEl.innerHTML = '';

      if (!file) {
        textEl.textContent = required ? 'Görsel seçin (max 5 MB)' : 'Görsel seçin — opsiyonel (max 5 MB)';
        return;
      }

      textEl.textContent = file.name;

      if (!file.type.startsWith('image/')) {
        showFieldError(id, 'Yalnızca resim dosyası seçilebilir.');
        fileInput.value = '';
        textEl.textContent = required ? 'Görsel seçin (max 5 MB)' : 'Görsel seçin — opsiyonel (max 5 MB)';
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        showFieldError(id, `Dosya çok büyük (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.`);
        fileInput.value = '';
        textEl.textContent = required ? 'Görsel seçin (max 5 MB)' : 'Görsel seçin — opsiyonel (max 5 MB)';
        return;
      }

      clearFieldError(id);
      const img = el('img', { class: 'file-preview-img' });
      img.src = URL.createObjectURL(file);
      previewEl.appendChild(img);
    });

    wrapper.appendChild(fileInput);
    wrapper.appendChild(labelEl);
    wrapper.appendChild(preview);
    return wrapper;
  });
}

function validateFileField(id, required) {
  const input = document.getElementById(id);
  if (!input) return true;

  if (required && (!input.files || input.files.length === 0)) {
    showFieldError(id, 'Lütfen bir görsel seçin.');
    return false;
  }

  if (input.files && input.files.length > 0) {
    const file = input.files[0];
    if (!file.type.startsWith('image/')) { showFieldError(id, 'Yalnızca resim dosyası.'); return false; }
    if (file.size > MAX_FILE_SIZE) { showFieldError(id, 'Max 5 MB.'); return false; }
  }
  return true;
}

function resetFileField(id) {
  const text = document.getElementById(`${id}-text`);
  if (text) text.textContent = 'Görsel seçin (max 5 MB)';
  const preview = document.getElementById(`${id}-preview`);
  if (preview) preview.innerHTML = '';
}

// ── Firebase Storage Yükleme ────────────────────────────────────────
async function uploadImage(file, folder, storage, ref, uploadBytes, getDownloadURL) {
  const ext = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const storageRef = ref(storage, fileName);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return await getDownloadURL(storageRef);
}

// ── Hata Gösterimi ──────────────────────────────────────────────────
function showFieldError(fieldId, message) {
  const errorEl = document.getElementById(`${fieldId}-error`);
  const group = errorEl?.closest('.field-group') || document.getElementById(fieldId)?.closest('.field-group');
  if (group) group.classList.add('has-error');
  if (errorEl) errorEl.textContent = message;
}

function clearFieldError(fieldId) {
  const errorEl = document.getElementById(`${fieldId}-error`);
  const group = errorEl?.closest('.field-group') || document.getElementById(fieldId)?.closest('.field-group');
  if (group) group.classList.remove('has-error');
  if (errorEl) errorEl.textContent = '';
}

function clearAllErrors(form) {
  form.querySelectorAll('.field-error').forEach((e) => (e.textContent = ''));
  form.querySelectorAll('.field-group.has-error').forEach((e) => e.classList.remove('has-error'));
}

function scrollToFirstError(form) {
  const first = form.querySelector('.field-group.has-error');
  if (first) {
    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const input = first.querySelector('input, select, textarea');
    if (input) input.focus();
  }
}

function showMessage(msgEl, type, text) {
  if (!msgEl) return;
  msgEl.className = `form-message ${type}`;
  msgEl.textContent = text;
  msgEl.style.display = 'block';
  if (type === 'success') msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function firebaseErrorMsg(err) {
  if (err.code === 'permission-denied') return 'Yetkilendirme hatası. Sayfayı yenileyip tekrar deneyin.';
  if (err.code === 'storage/unauthorized') return 'Görsel yükleme yetkisi yok.';
  if (err.message?.includes('network')) return 'İnternet bağlantınızı kontrol edin.';
  return 'Bir hata oluştu. Lütfen tekrar deneyin.';
}

// ── Değer Okuma ─────────────────────────────────────────────────────
function val(form, id) {
  return document.getElementById(id)?.value?.trim() || '';
}

function selVal(form, id) {
  return document.getElementById(id)?.value || '';
}

function resetCounter(id, max) {
  const c = document.getElementById(id);
  if (c) { c.textContent = `0 / ${max}`; c.classList.remove('near-limit', 'at-limit'); }
}

// ── DOM Yardımcıları ────────────────────────────────────────────────
function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  if (attrs) {
    Object.entries(attrs).forEach(([key, val]) => {
      if (key === 'class') node.className = val;
      else if (key === 'for') node.htmlFor = val;
      else if (typeof val === 'boolean') { if (val) node.setAttribute(key, ''); }
      else node.setAttribute(key, val);
    });
  }
  children.forEach((child) => {
    if (typeof child === 'string') node.appendChild(document.createTextNode(child));
    else if (child instanceof Node) node.appendChild(child);
  });
  return node;
}

function fieldGroup(id, label, inputFactory) {
  const group = el('div', { class: 'field-group' });
  group.appendChild(el('label', { for: id, class: 'field-label' }, label));
  group.appendChild(inputFactory());
  group.appendChild(el('span', { class: 'field-error', id: `${id}-error` }));

  const input = group.querySelector(`#${id}`);
  if (input) {
    const clear = () => clearFieldError(id);
    input.addEventListener('input', clear);
    input.addEventListener('change', clear);
  }

  return group;
}
