// Ekranların ortak parçaları: üst çubuk, simge düğmesi, birincil/ikincil düğme, boş durum, bölüm,
// yasak harf rozeti, hak şeridi (✕ ● ○), işaretli anlatım önizlemesi (dalgalı alt çizgi + ⚠), skor satırı.
// Bilgi hiçbir yerde yalnız renkle verilmez: şekil, simge ve metin birlikte (erişilebilirlik §8).

import { h, icon } from './dom.js';
import { displayLetter } from '../turkce.js';
import { attemptMarks, MAX_ATTEMPTS } from '../tahmin.js';
import { attemptMarkLabel } from '../aciklama.js';

/** Üst çubuk: geri, başlık (h1; ekran değişince odak alır), sağ öğeler. back: ekran adı | işlev | null. */
export function topBar(app, { title, back = 'home', right = [], titleHidden = false }) {
  const { t } = app;
  // title null: ekran kendi h1'ini çizer (sonuç ekranları); çubukta boş yer kalır.
  const titleEl = title === null ? h('span', { class: 'top-title' }) : h('h1', { class: `top-title${titleHidden ? ' visually-hidden' : ''}`, tabindex: '-1' }, title);
  const left = back ? iconButton('back', t('back'), () => (typeof back === 'function' ? back() : app.go(back)), 'back-button') : null;
  return { el: h('header', { class: 'top-bar' }, h('div', { class: 'top-left' }, left), titleEl, h('div', { class: 'top-right' }, right)), title: titleEl };
}

/** Simge düğmesi: erişilebilir ad, görünen ipucu olarak da durur (Voice Control "Adları göster"). */
export function iconButton(name, label, onClick, cls = '') {
  return h('button', { class: `icon-button ${cls}`.trim(), type: 'button', 'aria-label': label, title: label, on: { click: onClick } }, icon(name));
}

export const primaryButton = (text, onClick, { iconName = null, cls = '', id = null, sub = null } = {}) =>
  h(
    'button',
    { class: `button button-primary ${cls}`.trim(), type: 'button', id, on: { click: onClick } },
    iconName ? icon(iconName) : null,
    sub ? h('span', { class: 'button-stack' }, h('span', { class: 'button-main' }, text), h('span', { class: 'button-sub' }, sub)) : text,
  );

export const secondaryButton = (text, onClick, { iconName = null, cls = '', id = null } = {}) =>
  h('button', { class: `button button-secondary ${cls}`.trim(), type: 'button', id, on: { click: onClick } }, iconName ? icon(iconName) : null, text);

export const quietButton = (text, onClick, { iconName = null, cls = '', id = null } = {}) =>
  h('button', { class: `button button-quiet ${cls}`.trim(), type: 'button', id, on: { click: onClick } }, iconName ? icon(iconName) : null, text);

/** Boş durum: tek cümle ve (isteğe bağlı) tek eylem. */
export const emptyState = ({ iconName = 'info', text, button = null, cls = '' }) =>
  h('div', { class: `empty-state ${cls}`.trim() }, h('span', { class: 'empty-icon', 'aria-hidden': 'true' }, icon(iconName)), h('p', { class: 'empty-text' }, text), button);

/** Bölüm (h2 başlıklı). */
export const section = (title, cls, ...children) => h('section', { class: `section ${cls || ''}`.trim() }, title ? h('h2', { class: 'section-title' }, title) : null, ...children);

/** Kart kutusu. */
export const panel = (cls, ...children) => h('div', { class: `panel ${cls || ''}`.trim() }, ...children);

/** Bilgi notu (simge + metin; renk tek taşıyıcı değil). kind: info | warning | success */
export const note = (text, { kind = 'info', cls = '' } = {}) =>
  h('p', { class: `note note-${kind} ${cls}`.trim() }, h('span', { class: 'note-icon', 'aria-hidden': 'true' }, icon(kind === 'warning' ? 'warning' : kind === 'success' ? 'check' : 'info')), h('span', { class: 'note-text' }, text));

/**
 * Yasak harf rozeti: harf karosu ve üstünden geçen çizgi. Ekran okuyucuya "Yasak harf E".
 * size: 'xl' | 'l' | 'm' | 's'. decorative: true ise aria-hidden (yanında aynı bilgi metin olarak varsa).
 */
export function letterBadge(t, letter, lang, { size = 'm', decorative = false, cls = '' } = {}) {
  const shown = displayLetter(letter, lang);
  return h(
    'span',
    {
      class: `badge badge-${size} ${cls}`.trim(),
      role: decorative ? null : 'img',
      'aria-label': decorative ? null : t('bannedLetter', shown),
      'aria-hidden': decorative ? 'true' : null,
      lang: lang,
    },
    h('span', { class: 'badge-letter', 'aria-hidden': 'true' }, shown),
    h('span', { class: 'badge-strike', 'aria-hidden': 'true' }),
  );
}

/**
 * Hak şeridi: ✕ harcanan · ● bilinen · ○ kullanılmayan (şekil ve renk). Ekran okuyucuya
 * "3 haktan 2 hak kullanıldı" ve her işaretin adı.
 */
export function attemptStrip(t, { solved, attempts }, { cls = '' } = {}) {
  const marks = attemptMarks({ solved, attempts });
  const used = marks.filter((m) => m !== 'empty').length;
  const items = marks.map((m) =>
    h('li', { class: `mark mark-${m}` }, h('span', { class: 'mark-shape', 'aria-hidden': 'true' }, m === 'miss' ? '✕' : m === 'hit' ? '●' : '○'), h('span', { class: 'visually-hidden' }, attemptMarkLabel(m, t.lang))),
  );
  return h('div', { class: `strip ${cls}`.trim() }, h('ol', { class: 'strip-marks', 'aria-label': t('attemptsUsed', used, MAX_ATTEMPTS) }, items));
}

/**
 * İşaretli anlatım önizlemesi: denetimden (denetim.js → checkDescription) gelen sözcük konumlarıyla,
 * sorunlu sözcük dalgalı alt çizgi, açık kırmızı zemin ve ⚠ ile. Ekran okuyucudan gizlidir; aynı bilgi
 * uyarı listesinde ve canlı bölgededir.
 */
export function markedPreview(check, { cls = '' } = {}) {
  const el = h('p', { class: `marked ${cls}`.trim(), 'aria-hidden': 'true' });
  const text = check.normalized;
  let pos = 0;
  for (const tok of check.tokens) {
    if (tok.start > pos) el.append(text.slice(pos, tok.start));
    const bad = tok.issues.length > 0;
    el.append(bad ? h('mark', { class: 'flagged' }, text.slice(tok.start, tok.end), h('span', { class: 'flag-icon' }, '⚠')) : h('span', { class: 'word-ok' }, text.slice(tok.start, tok.end)));
    pos = tok.end;
  }
  if (pos < text.length) el.append(text.slice(pos));
  return el;
}

/** Skor satırı: "Sen 9 – Rakibin 7" (tur 2'den sonra). totals: { me, them, round } kullanıcının gözünden. */
export function scoreLine(t, totals, { cls = '' } = {}) {
  if (!totals) return null;
  return h('p', { class: `score ${cls}`.trim() }, h('span', { class: 'score-label' }, t('scoreLabel')), ' ', h('span', { class: 'score-value' }, t('scoreValue', totals.me, totals.them)));
}

/** Görünmez metin (ekran okuyucu için). */
export const srOnly = (text) => h('span', { class: 'visually-hidden' }, text);
