// Küçük DOM yardımcıları (Taç kalıbı): öğe kurucu, satır içi SVG simgeler, tek canlı bölge (#announcer),
// kısa bildirim, kipli pencere, bölümlü seçim ve anahtar.

/**
 * Öğe oluşturur. props: { class, text, on: { olay: işlev }, style: {...}, ...nitelikler }.
 * Nitelik değeri false/null/undefined ise yazılmaz, true ise boş yazılır.
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'on') for (const [ev, f] of Object.entries(v)) el.addEventListener(ev, f);
    else if (k === 'style' && typeof v === 'object') {
      for (const [name, value] of Object.entries(v)) {
        if (name.startsWith('--')) el.style.setProperty(name, value);
        else el.style[name] = value;
      }
    } else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

// Çizgi simgeler (24 × 24, stroke). Hepsi dekoratiftir (aria-hidden); adı düğmenin metnindedir.
const PATHS = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  settings:
    '<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  share: '<path d="M12 3v12M7.5 7.5L12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.1"/>',
  warning: '<path d="M12 3.8l9 16H3z"/><path d="M12 10v4.2M12 17.2v.1"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6L20 8.5"/><path d="M20 3.5v5h-5"/>',
  offline: '<path d="M3.5 3.5l17 17"/><path d="M8.8 16.3a4.6 4.6 0 0 1 6.4 0M5.2 12.7a9.6 9.6 0 0 1 4.7-2.6M14.6 10.2a9.6 9.6 0 0 1 4.2 2.5M12 20h.01"/>',
  flag: '<path d="M5 21V4.5"/><path d="M5 4.5h11l-2 4 2 4H5"/>',
  hide: '<path d="M3.5 3.5l17 17"/><path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-2.7 3.4M6.6 7.6A16.6 16.6 0 0 0 2.5 12S6 18 12 18a9.4 9.4 0 0 0 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M8.5 3v4M15.5 3v4"/>',
  book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5zM5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3"/>',
  pencil: '<path d="M4 20l1.2-4.6L16.4 4.2a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z"/><path d="M14.5 6l3.5 3.5"/>',
  send: '<path d="M21 3L10 14"/><path d="M21 3l-6.5 18-4.5-7-7-4.5z"/>',
  chat: '<path d="M20.5 11.6a8.4 8.4 0 0 1-12.4 7.4L3.5 20.5l1.6-4.4A8.4 8.4 0 1 1 20.5 11.6z"/>',
  plane: '<path d="M21 4L3 11l6 2.2L19 6l-8 8.6V20l3.2-3.6L18 19z"/>',
  xmark: '<path d="M5 4h4.2l9.8 16h-4.2z"/><path d="M19 4l-6 6.6M5 20l6-6.6"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8.5 8.5"/>',
  download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M5 19.5h14"/>',
  rematch: '<path d="M4 9h12.5l-3-3"/><path d="M20 15H7.5l3 3"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M8.6 8.6h.01M15.4 8.6h.01M12 12h.01M8.6 15.4h.01M15.4 15.4h.01"/>',
  flame: '<path d="M12 21c-3.6 0-6-2.5-6-5.8 0-2.6 1.6-4.4 3-5.8.7-.7 1.8-.3 1.8.7 0 .9.4 1.6 1.1 1.6.6 0 1-.5.9-1.2-.3-2 .4-4 1.7-5.7.4-.5 1.3-.4 1.5.2C17.2 7.7 18 9.8 18 13c0 4.5-2.4 8-6 8z"/>',
  bag: '<path d="M5.5 8h13l-1 12.5h-11z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
  heart: '<path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.5 3.6 5.3 3.6 8.5s-1.2 6-3.6 8.5c-2.4-2.5-3.6-5.3-3.6-8.5s1.2-6 3.6-8.5z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.6"/><path d="M12 17.2v.1"/>',
  shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8-7.5 9.5-4.3-1.5-7.5-4.9-7.5-9.5V6z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
};

export const ICON_NAMES = Object.freeze(Object.keys(PATHS));

/** Satır içi SVG simge (dekoratif; aria-hidden). */
export function icon(name, cls = '') {
  const t = document.createElement('template');
  t.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${cls ? ` class="${cls}"` : ''}>${PATHS[name] || ''}</svg>`;
  return t.content.firstChild;
}

/** Ekran okuyucuya duyuru (tek canlı bölge). Aynı metin art arda gelse de okunur. */
export function announce(text) {
  const region = document.getElementById('announcer');
  if (!region || !text) return;
  region.textContent = '';
  const write = () => {
    region.textContent = text;
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(write);
  else setTimeout(write, 0);
}

let toastTimer = null;
/**
 * Kısa süreli görsel bildirim ("Kopyalandı"). Ekran okuyucuya tek canlı bölgeden bir kez okunur;
 * görsel kutu erişilebilirlik ağacının dışındadır (çift okuma olmasın).
 */
export function toast(text) {
  const el = document.getElementById('toast');
  announce(text);
  if (!el) return;
  el.textContent = text;
  el.hidden = false;
  el.classList.remove('toast-in');
  void el.offsetWidth;
  el.classList.add('toast-in');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.hidden = true;
  }, 2600);
}

export const reduceMotion = () =>
  (typeof document !== 'undefined' && document.documentElement.dataset.motion === 'reduced') ||
  (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

/**
 * Bölümlü seçim: radyo grubu (ok tuşlarıyla gezilir, seçili olan tek sekme durağıdır).
 * options: [[kod, etiket], …]; value: kod; onChange(kod).
 */
export function segmented({ options, value, label, onChange, cls = '' }) {
  let current = value;
  const buttons = options.map(([code, text]) =>
    h(
      'button',
      {
        type: 'button',
        role: 'radio',
        'aria-checked': code === current ? 'true' : 'false',
        tabindex: code === current ? '0' : '-1',
        'data-value': String(code),
        on: { click: () => select(code, true) },
      },
      text,
    ),
  );
  const group = h('div', { class: `segmented ${cls}`.trim(), role: 'radiogroup', 'aria-label': label }, buttons);
  function select(code, notify) {
    if (code === current) return;
    current = code;
    buttons.forEach((b, i) => {
      const on = options[i][0] === code;
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });
    if (notify && onChange) onChange(code);
  }
  group.addEventListener('keydown', (e) => {
    const i = buttons.indexOf(document.activeElement);
    const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (i < 0 || !dir) return;
    e.preventDefault();
    const next = buttons[(i + dir + buttons.length) % buttons.length];
    next.focus();
    next.click();
  });
  return { el: group, select: (code) => select(code, false), value: () => current };
}

/** Anahtar (role="switch"): görünen etiket düğmenin içindedir, durum topuzun konumu ve aria-checked. */
export function toggle({ label, on, onChange, note = null, id }) {
  const noteEl = note ? h('span', { class: 'switch-note', id: `${id}-not` }, note) : null;
  const b = h(
    'button',
    {
      class: 'switch',
      type: 'button',
      role: 'switch',
      'aria-checked': on ? 'true' : 'false',
      'aria-describedby': noteEl ? `${id}-not` : null,
      id,
      on: {
        click: () => {
          const next = b.getAttribute('aria-checked') !== 'true';
          b.setAttribute('aria-checked', next ? 'true' : 'false');
          onChange(next);
        },
      },
    },
    h('span', { class: 'switch-label' }, label),
    h('span', { class: 'switch-track', 'aria-hidden': 'true' }, h('span', { class: 'switch-thumb' })),
  );
  return h('div', { class: 'setting-row switch-row' }, b, noteEl);
}

let dialogCount = 0;
/**
 * Kipli pencere (showModal): arka plan etkisizdir, Esc kapatır, odak açan öğeye döner.
 * content(close) pencerenin gövdesini döndürür. Dönen: { el, close }.
 */
export function openDialog({ title, content, cls = '', onClose = null }) {
  const opener = document.activeElement;
  const titleId = `pb-${++dialogCount}`;
  const dlg = h('dialog', { class: `dialog ${cls}`.trim(), 'aria-labelledby': titleId });
  let closed = false;
  const close = (value) => {
    if (closed) return;
    closed = true;
    try {
      dlg.close();
    } catch {
      /* zaten kapalı */
    }
    dlg.remove();
    if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus({ preventScroll: true });
    if (onClose) onClose(value);
  };
  const titleEl = h('h2', { class: 'dialog-title', id: titleId, tabindex: '-1' }, title);
  dlg.append(...[titleEl, content(close)].flat().filter(Boolean));
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    close(null);
  });
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) close(null);
  });
  document.body.append(dlg);
  if (typeof dlg.showModal === 'function') dlg.showModal();
  else dlg.setAttribute('open', '');
  titleEl.focus({ preventScroll: true });
  return { el: dlg, close, title: titleEl };
}
