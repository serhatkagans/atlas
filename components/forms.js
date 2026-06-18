/**
 * GençTek Atlas — Etkinlik Kayıt Formu
 *
 * Firebase Firestore + Storage ile çalışır.
 * Bağımlılık: window.Atlas (EKİP 1 tarafından public/index.html'de tanımlanır)
 *
 * Kullanım:
 *   import { renderEventForm } from './forms.js';
 *   renderEventForm('content-area');
 */

// ── Sabitler ────────────────────────────────────────────────────────
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_DESC_LENGTH = 500;
const URL_PATTERN = /^https?:\/\/.+\..+/i;

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

// ── Form Render ─────────────────────────────────────────────────────
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

  // Verileri paralel yükle
  const [themes, cities] = await Promise.all([loadThemes(), loadCities()]);

  container.innerHTML = '';
  container.appendChild(buildForm(themes, cities));
}

// ── Form Oluşturucu ─────────────────────────────────────────────────
function buildForm(themes, cities) {
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

  // ── Alan: Etkinlik Adı
  body.appendChild(fieldGroup('etkinlikAdi', 'Etkinlik Adı', () =>
    el('input', {
      type: 'text',
      id: 'etkinlikAdi',
      name: 'etkinlikAdi',
      placeholder: 'ör. GençTek Ankara Buluşması',
      maxLength: 120,
      autocomplete: 'off',
    })
  ));

  // ── Alan: Tema
  body.appendChild(fieldGroup('tema', 'Tema', () => {
    const select = el('select', { id: 'tema', name: 'tema' });
    select.appendChild(el('option', { value: '', disabled: true, selected: true }, '— Tema seçin —'));
    themes.forEach((t) => {
      select.appendChild(el('option', { value: t.id }, t.name));
    });
    return select;
  }));

  // ── Alan: Format
  body.appendChild(fieldGroup('format', 'Etkinlik Formatı', () => {
    const select = el('select', { id: 'format', name: 'format' });
    select.appendChild(el('option', { value: '', disabled: true, selected: true }, '— Format seçin —'));
    FORMAT_OPTIONS.forEach((f) => {
      select.appendChild(el('option', { value: f.value }, f.label));
    });
    return select;
  }));

  // ── Alan: İl
  body.appendChild(fieldGroup('il', 'İl', () => {
    const select = el('select', { id: 'il', name: 'il' });
    select.appendChild(el('option', { value: '', disabled: true, selected: true }, '— İl seçin —'));
    cities.forEach((c) => {
      select.appendChild(el('option', { value: c.id }, c.name));
    });
    return select;
  }));

  // ── Alan: Tarih
  body.appendChild(fieldGroup('tarih', 'Tarih', () =>
    el('input', {
      type: 'date',
      id: 'tarih',
      name: 'tarih',
      min: new Date().toISOString().split('T')[0],
    })
  ));

  // ── Alan: Katılımcı Sayısı
  body.appendChild(fieldGroup('katilimciSayisi', 'Katılımcı Sayısı', () =>
    el('input', {
      type: 'number',
      id: 'katilimciSayisi',
      name: 'katilimciSayisi',
      placeholder: 'ör. 50',
      min: 1,
      step: 1,
    })
  ));

  // ── Alan: Açıklama (karakter sayacı ile)
  body.appendChild(fieldGroup('aciklama', 'Açıklama', () => {
    const wrapper = el('div', { class: 'textarea-wrapper' });
    const textarea = el('textarea', {
      id: 'aciklama',
      name: 'aciklama',
      placeholder: 'Etkinlik hakkında kısa bir açıklama…',
      maxLength: MAX_DESC_LENGTH,
      rows: 4,
    });
    const counter = el('span', {
      class: 'char-counter',
      id: 'aciklama-counter',
    }, `0 / ${MAX_DESC_LENGTH}`);

    textarea.addEventListener('input', () => {
      const len = textarea.value.length;
      counter.textContent = `${len} / ${MAX_DESC_LENGTH}`;
      counter.classList.toggle('near-limit', len > MAX_DESC_LENGTH * 0.9);
      counter.classList.toggle('at-limit', len >= MAX_DESC_LENGTH);
    });

    wrapper.appendChild(textarea);
    wrapper.appendChild(counter);
    return wrapper;
  }));

  // ── Alan: Bağlantı
  body.appendChild(fieldGroup('baglanti', 'Bağlantı (URL)', () =>
    el('input', {
      type: 'url',
      id: 'baglanti',
      name: 'baglanti',
      placeholder: 'https://...',
      autocomplete: 'off',
    })
  ));

  // ── Alan: Görsel
  body.appendChild(fieldGroup('gorsel', 'Görsel', () => {
    const wrapper = el('div', { class: 'file-upload-wrapper' });

    const fileInput = el('input', {
      type: 'file',
      id: 'gorsel',
      name: 'gorsel',
      accept: 'image/*',
      class: 'file-input-hidden',
    });

    const label = el('label', {
      for: 'gorsel',
      class: 'file-upload-label',
    },
      el('span', { class: 'file-upload-icon' }, '📁'),
      el('span', { class: 'file-upload-text', id: 'gorsel-text' }, 'Görsel seçin (max 5 MB)')
    );

    const preview = el('div', { class: 'file-preview', id: 'gorsel-preview' });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      const textEl = document.getElementById('gorsel-text');
      const previewEl = document.getElementById('gorsel-preview');
      previewEl.innerHTML = '';

      if (!file) {
        textEl.textContent = 'Görsel seçin (max 5 MB)';
        return;
      }

      textEl.textContent = file.name;

      // Dosya türü kontrolü
      if (!file.type.startsWith('image/')) {
        showFieldError('gorsel', 'Yalnızca resim dosyası seçilebilir.');
        fileInput.value = '';
        textEl.textContent = 'Görsel seçin (max 5 MB)';
        return;
      }

      // Dosya boyutu kontrolü
      if (file.size > MAX_FILE_SIZE) {
        showFieldError('gorsel', `Dosya boyutu çok büyük (${(file.size / 1024 / 1024).toFixed(1)} MB). Maksimum 5 MB.`);
        fileInput.value = '';
        textEl.textContent = 'Görsel seçin (max 5 MB)';
        return;
      }

      clearFieldError('gorsel');

      // Önizleme
      const img = el('img', { class: 'file-preview-img' });
      img.src = URL.createObjectURL(file);
      previewEl.appendChild(img);
    });

    wrapper.appendChild(fileInput);
    wrapper.appendChild(label);
    wrapper.appendChild(preview);
    return wrapper;
  }));

  form.appendChild(body);

  // ── Durum mesajı alanı
  form.appendChild(el('div', { class: 'form-message', id: 'form-message' }));

  // ── Gönder butonu
  const footer = el('div', { class: 'form-footer' });
  const submitBtn = el('button', {
    type: 'submit',
    class: 'btn-submit',
    id: 'btn-submit',
  }, 'Etkinliği Gönder');
  footer.appendChild(submitBtn);
  form.appendChild(footer);

  // ── Form submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSubmit(form);
  });

  return form;
}

// ── Doğrulama ───────────────────────────────────────────────────────
function validateForm(form) {
  let isValid = true;

  // Tüm hataları temizle
  form.querySelectorAll('.field-error').forEach((el) => (el.textContent = ''));
  form.querySelectorAll('.field-group.has-error').forEach((el) => el.classList.remove('has-error'));

  // Etkinlik Adı
  const etkinlikAdi = form.etkinlikAdi.value.trim();
  if (!etkinlikAdi) {
    showFieldError('etkinlikAdi', 'Etkinlik adı zorunludur.');
    isValid = false;
  }

  // Tema
  if (!form.tema.value) {
    showFieldError('tema', 'Lütfen bir tema seçin.');
    isValid = false;
  }

  // Format
  if (!form.format.value) {
    showFieldError('format', 'Lütfen bir format seçin.');
    isValid = false;
  }

  // İl
  if (!form.il.value) {
    showFieldError('il', 'Lütfen bir il seçin.');
    isValid = false;
  }

  // Tarih
  if (!form.tarih.value) {
    showFieldError('tarih', 'Tarih zorunludur.');
    isValid = false;
  }

  // Katılımcı Sayısı
  const katilimci = parseInt(form.katilimciSayisi.value, 10);
  if (!form.katilimciSayisi.value || isNaN(katilimci) || katilimci < 1) {
    showFieldError('katilimciSayisi', 'En az 1 katılımcı girilmelidir.');
    isValid = false;
  }

  // Açıklama
  const aciklama = form.aciklama.value.trim();
  if (!aciklama) {
    showFieldError('aciklama', 'Açıklama zorunludur.');
    isValid = false;
  } else if (aciklama.length > MAX_DESC_LENGTH) {
    showFieldError('aciklama', `Açıklama en fazla ${MAX_DESC_LENGTH} karakter olabilir.`);
    isValid = false;
  }

  // Bağlantı
  const baglanti = form.baglanti.value.trim();
  if (!baglanti) {
    showFieldError('baglanti', 'Bağlantı zorunludur.');
    isValid = false;
  } else if (!URL_PATTERN.test(baglanti)) {
    showFieldError('baglanti', 'Geçerli bir URL girin (http:// veya https:// ile başlamalı).');
    isValid = false;
  }

  // Görsel
  const gorselInput = form.gorsel;
  if (!gorselInput.files || gorselInput.files.length === 0) {
    showFieldError('gorsel', 'Lütfen bir görsel seçin.');
    isValid = false;
  } else {
    const file = gorselInput.files[0];
    if (!file.type.startsWith('image/')) {
      showFieldError('gorsel', 'Yalnızca resim dosyası seçilebilir.');
      isValid = false;
    } else if (file.size > MAX_FILE_SIZE) {
      showFieldError('gorsel', `Dosya boyutu çok büyük. Maksimum 5 MB.`);
      isValid = false;
    }
  }

  // İlk hatalı alana odaklan
  if (!isValid) {
    const firstError = form.querySelector('.field-group.has-error');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = firstError.querySelector('input, select, textarea');
      if (input) input.focus();
    }
  }

  return isValid;
}

// ── Gönderme ────────────────────────────────────────────────────────
async function handleSubmit(form) {
  if (!validateForm(form)) return;

  const btn = document.getElementById('btn-submit');
  const msg = document.getElementById('form-message');

  // Atlas nesnesini kontrol et
  if (!window.Atlas) {
    showMessage(msg, 'error', 'Firebase bağlantısı bulunamadı. Sayfayı yenileyin.');
    return;
  }

  const { db, storage, collection, addDoc, serverTimestamp, ref, uploadBytes, getDownloadURL } = window.Atlas;

  // Buton durumu
  btn.disabled = true;
  btn.textContent = 'Gönderiliyor…';
  btn.classList.add('loading');
  showMessage(msg, 'info', 'Etkinliğiniz kaydediliyor…');

  try {
    // 1) Görseli Storage'a yükle
    const file = form.gorsel.files[0];
    const ext = file.name.split('.').pop();
    const fileName = `events/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const storageRef = ref(storage, fileName);

    await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: { uploadedBy: 'event-form' },
    });
    const gorselUrl = await getDownloadURL(storageRef);

    // 2) Firestore'a kaydet
    const docData = {
      etkinlikAdi: form.etkinlikAdi.value.trim(),
      tema: form.tema.value,
      format: form.format.value,
      il: form.il.value,
      tarih: form.tarih.value,
      katilimciSayisi: parseInt(form.katilimciSayisi.value, 10),
      aciklama: form.aciklama.value.trim(),
      baglanti: form.baglanti.value.trim(),
      gorselUrl,
      onaylandi: false,
      olusturulmaTarihi: serverTimestamp(),
    };

    await addDoc(collection(db, 'events'), docData);

    // 3) Başarılı
    showMessage(msg, 'success', '✅ Etkinliğiniz incelemeye alındı! Onaylandıktan sonra haritada görünecektir.');
    form.reset();
    // Karakter sayacını sıfırla
    const counter = document.getElementById('aciklama-counter');
    if (counter) counter.textContent = `0 / ${MAX_DESC_LENGTH}`;
    // Dosya label'ını sıfırla
    const fileText = document.getElementById('gorsel-text');
    if (fileText) fileText.textContent = 'Görsel seçin (max 5 MB)';
    // Önizlemeyi temizle
    const preview = document.getElementById('gorsel-preview');
    if (preview) preview.innerHTML = '';

  } catch (err) {
    console.error('Etkinlik kayıt hatası:', err);

    let userMsg = 'Bir hata oluştu. Lütfen tekrar deneyin.';
    if (err.code === 'permission-denied') {
      userMsg = 'Yetkilendirme hatası. Sayfayı yenileyip tekrar deneyin.';
    } else if (err.code === 'storage/unauthorized') {
      userMsg = 'Görsel yükleme yetkisi yok. Sayfayı yenileyip tekrar deneyin.';
    } else if (err.message?.includes('network')) {
      userMsg = 'İnternet bağlantınızı kontrol edin.';
    }

    showMessage(msg, 'error', `❌ ${userMsg}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Etkinliği Gönder';
    btn.classList.remove('loading');
  }
}

// ── Hata Gösterimi ──────────────────────────────────────────────────
function showFieldError(fieldId, message) {
  const group = document.getElementById(fieldId)?.closest('.field-group');
  if (!group) return;
  group.classList.add('has-error');
  const errorEl = group.querySelector('.field-error');
  if (errorEl) errorEl.textContent = message;
}

function clearFieldError(fieldId) {
  const group = document.getElementById(fieldId)?.closest('.field-group');
  if (!group) return;
  group.classList.remove('has-error');
  const errorEl = group.querySelector('.field-error');
  if (errorEl) errorEl.textContent = '';
}

function showMessage(msgEl, type, text) {
  if (!msgEl) return;
  msgEl.className = `form-message ${type}`;
  msgEl.textContent = text;
  msgEl.style.display = 'block';

  if (type === 'success') {
    msgEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// ── DOM Yardımcıları ────────────────────────────────────────────────
function el(tag, attrs, ...children) {
  const node = document.createElement(tag);

  if (attrs) {
    Object.entries(attrs).forEach(([key, val]) => {
      if (key === 'class') node.className = val;
      else if (key === 'for') node.htmlFor = val;
      else if (typeof val === 'boolean') {
        if (val) node.setAttribute(key, '');
      } else {
        node.setAttribute(key, val);
      }
    });
  }

  children.forEach((child) => {
    if (typeof child === 'string') {
      node.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      node.appendChild(child);
    }
  });

  return node;
}

function fieldGroup(id, label, inputFactory) {
  const group = el('div', { class: 'field-group' });
  group.appendChild(el('label', { for: id, class: 'field-label' }, label));
  group.appendChild(inputFactory());
  group.appendChild(el('span', { class: 'field-error', id: `${id}-error` }));

  // Canlı doğrulama: alan değiştiğinde hatayı temizle
  const input = group.querySelector(`#${id}`);
  if (input) {
    const clearOnChange = () => clearFieldError(id);
    input.addEventListener('input', clearOnChange);
    input.addEventListener('change', clearOnChange);
  }

  return group;
}
