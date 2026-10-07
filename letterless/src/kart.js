// Sonuç kartının saf düzen verisi. Çizim (canvas ya da yerel) A'nındır; renkler tema kimliğinden A'nın
// CSS belirteçleriyle gelir. Kart cevabı hiçbir zaman taşımaz: veri cardData() beyaz listesinden geçer.
// Düzenler: A kare 1080×1080 · B hikâye 1080×1920 (üst 250, alt 340 px boş) · C OG 1200×630 (statik).

import { letterSuffix, displayLetter } from './turkce.js';
import { gameName, brandText } from './paylas.js';
import { attemptMarks, MAX_ATTEMPTS } from './tahmin.js';

export const FORMATS = Object.freeze({
  square: Object.freeze({ width: 1080, height: 1080, safeTop: 0, safeBottom: 0 }),
  story: Object.freeze({ width: 1080, height: 1920, safeTop: 250, safeBottom: 340 }),
  og: Object.freeze({ width: 1200, height: 630, safeTop: 0, safeBottom: 0 }),
});
export const MIN_FONT = 32;
export const MARGIN = 72;
const BAND_HEIGHT = 200;

// Kart temaları. "murekkep" ücretsizdir; ötekiler "Kart temaları" ürünüyle açılır (haklar.js).
export const THEMES = Object.freeze([
  Object.freeze({ id: 'murekkep', paid: false, name: { tr: 'Mürekkep', en: 'Ink' } }),
  Object.freeze({ id: 'daktilo', paid: true, name: { tr: 'Daktilo', en: 'Typewriter' } }),
  Object.freeze({ id: 'tebesir', paid: true, name: { tr: 'Tebeşir', en: 'Chalk' } }),
  Object.freeze({ id: 'neon', paid: true, name: { tr: 'Neon', en: 'Neon' } }),
  Object.freeze({ id: 'gazete', paid: true, name: { tr: 'Gazete', en: 'Newsprint' } }),
]);
export const DEFAULT_THEME = 'murekkep';

// Karta girebilecek alanlar. Cevap, tuz, gönderen imi ve deste burada yoktur.
// kind: 'result' (tur bitti) | 'invite' (anlatımın hikâye kartı) · perspective: 'solver' | 'creator'
export function cardData(input) {
  const i = input || {};
  const kind = ['result', 'invite'].includes(i.kind) ? i.kind : 'result';
  return Object.freeze({
    kind,
    perspective: i.perspective === 'creator' ? 'creator' : 'solver',
    lang: i.lang === 'en' ? 'en' : 'tr',
    uiLang: i.uiLang === 'tr' ? 'tr' : 'en',
    letter: String(i.letter || ''),
    words: Number(i.words) || 0,
    description: String(i.description || ''),
    solved: !!i.solved,
    attempts: Math.max(0, Math.min(MAX_ATTEMPTS, Number(i.attempts) || 0)),
    day: Number.isInteger(i.day) && i.day > 0 ? i.day : null,
    match: i.match && Number.isInteger(i.match.me) && Number.isInteger(i.match.them) ? { me: i.match.me, them: i.match.them } : null,
    address: typeof i.address === 'string' && i.address ? i.address : null,
    theme: THEMES.some(t => t.id === i.theme) ? i.theme : DEFAULT_THEME,
  });
}

// Varsayılan ölçü: kalın sans yazıda ortalama harf genişliği ≈ 0,58 em. A gerçek ölçüyü verir.
export function approxMeasure(text, size) {
  return Array.from(text).length * size * 0.58;
}

export function wrapLines(text, size, width, measure = approxMeasure) {
  const words = text.split(' ').filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const tryLine = line ? line + ' ' + w : w;
    if (line && measure(tryLine, size) > width) { lines.push(line); line = w; } else line = tryLine;
  }
  if (line) lines.push(line);
  return lines;
}

function texts(d) {
  const tr = d.uiLang === 'tr';
  const letter = displayLetter(d.letter, d.lang);
  const harf = tr ? letterSuffix(d.letter, 'siz', d.lang) : null;
  const label = d.day
    ? (tr ? `Günün sözcüğü · ${harf} ${d.words} kelime` : `Word of the day · ${d.words} ${d.words === 1 ? 'word' : 'words'}, no ${letter}`)
    : (tr ? `${harf} ${d.words} kelimelik anlatım` : `${d.words}-word clue without ${letter}`);
  let hero;
  let tone;
  if (d.kind === 'invite') {
    hero = tr ? '3 hakta bil' : 'Guess it in 3 tries';
    tone = 'neutral';
  } else if (d.perspective === 'creator') {
    hero = d.solved ? (tr ? `${d.attempts}. hakta bilindi` : `Guessed on try ${d.attempts}`) : (tr ? 'Bilinemedi' : 'Not guessed');
    tone = d.solved ? 'success' : 'fail';
  } else {
    hero = d.solved ? (tr ? `${d.attempts}. hakta bildim` : `Got it on try ${d.attempts}`) : (tr ? 'Bilemedim' : "Didn't get it");
    tone = d.solved ? 'success' : 'fail';
  }
  const cta = d.kind === 'invite'
    ? (tr ? 'Bil bakalım:' : 'Can you guess it?')
    : (tr ? 'Sen de bir harfi yasakla, anlat:' : 'Ban a letter, describe a word:');
  const match = d.match ? (tr ? `Skor ${d.match.me}–${d.match.them}` : `Score ${d.match.me}–${d.match.them}`) : null;
  return { letter, label, hero, tone, cta, match };
}

// Erişilebilir metin karşılığı (img alt, accessibilityLabel, og:image:alt ≤ 420 karakter).
export function cardAltText(input) {
  const d = cardData(input);
  const t = texts(d);
  const name = gameName(d.uiLang);
  const tr = d.uiLang === 'tr';
  const parts = [tr ? `${name}${d.day ? ' #' + d.day : ''} kartı.` : `${name}${d.day ? ' #' + d.day : ''} card.`];
  parts.push(`${t.label}: «${d.description}».`);
  if (d.kind === 'result') {
    const marks = attemptMarks(d);
    const used = marks.filter(m => m !== 'empty').length;
    parts.push(`${t.hero}.`);
    parts.push(tr ? `${MAX_ATTEMPTS} haktan ${used} hak kullanıldı.` : `${used} of ${MAX_ATTEMPTS} tries used.`);
  } else {
    parts.push(`${t.hero}.`);
  }
  if (t.match) parts.push(`${t.match}.`);
  if (d.address) parts.push(tr ? `Adres ${d.address}.` : `Address ${d.address}.`);
  return parts.join(' ').slice(0, 420);
}

// Kart düzeni. format: 'square' | 'story'. opts.measure(text, size) → genişlik (px).
// Dönen: { width, height, safeTop, safeBottom, theme, elements[], alt }
// Öğe türleri: brand, letterBadge, label, description, hero, attempts, match, band, cta, address.
export function cardLayout(input, format = 'square', opts = {}) {
  const d = cardData(input);
  const f = FORMATS[format];
  if (!f || format === 'og') throw new Error('bilinmeyen kart biçimi: ' + format);
  const measure = opts.measure || approxMeasure;
  const story = format === 'story';
  const t = texts(d);
  const inner = f.width - 2 * MARGIN;
  const els = [];
  let y = f.safeTop + 110;
  els.push({ type: 'brand', text: brandText(d.uiLang) + (d.day ? ` #${d.day}` : ''), x: MARGIN, y, size: 56, weight: 800, align: 'left' });
  const r = 64;
  els.push({ type: 'letterBadge', letter: t.letter, cx: f.width - MARGIN - r, cy: y - 20, r, size: 72, struck: true, label: d.uiLang === 'tr' ? `Yasak harf ${t.letter}` : `Banned letter ${t.letter}` });

  // Anlatım: yazı boyu, satır sınırına sığana dek küçülür (en az 44 / 52 px).
  const maxLines = story ? 6 : 4;
  let size = story ? 80 : 68;
  const minSize = story ? 52 : 44;
  let lines = wrapLines(`«${d.description}»`, size, inner, measure);
  while ((lines.length > maxLines || lines.some(l => measure(l, size) > inner)) && size > minSize) {
    size -= 2;
    lines = wrapLines(`«${d.description}»`, size, inner, measure);
  }
  const lineHeight = Math.round(size * 1.24);
  const heroSize = story ? 104 : 92;
  const attemptsSize = 60;
  const bandTop = f.height - f.safeBottom - BAND_HEIGHT;
  const blockHeight = 44 + 36 + lines.length * lineHeight + 40 + heroSize + 40 + attemptsSize + (t.match ? 40 + 44 : 0);
  const free = bandTop - (y + 60);
  y = y + 60 + Math.max(30, Math.floor((free - blockHeight) / 2)) + 44;
  els.push({ type: 'label', text: t.label, x: MARGIN, y, size: 44, weight: 600, align: 'left' });
  y += 36;
  const descStart = y + lineHeight;
  els.push({ type: 'description', lines, x: MARGIN, y: descStart, lineHeight, size, weight: 700, align: 'left' });
  y += lines.length * lineHeight + 40 + heroSize;
  els.push({ type: 'hero', text: t.hero, x: MARGIN, y, size: heroSize, weight: 800, tone: t.tone, align: 'left' });
  y += 40 + attemptsSize / 2;
  const marks = d.kind === 'invite' ? ['empty', 'empty', 'empty'] : attemptMarks(d);
  els.push({ type: 'attempts', marks, x: MARGIN + attemptsSize / 2, y, size: attemptsSize, gap: 96 });
  if (t.match) {
    y += attemptsSize / 2 + 40 + 44;
    els.push({ type: 'match', text: t.match, x: MARGIN, y, size: 44, weight: 600, align: 'left' });
  }
  els.push({ type: 'band', x: 0, y: bandTop, width: f.width, height: BAND_HEIGHT });
  els.push({ type: 'cta', text: t.cta, x: MARGIN, y: bandTop + 78, size: 44, weight: 600, align: 'left' });
  if (d.address) els.push({ type: 'address', text: d.address, x: MARGIN, y: bandTop + 150, size: 48, weight: 700, mono: true, align: 'left' });

  return Object.freeze({ width: f.width, height: f.height, safeTop: f.safeTop, safeBottom: f.safeBottom, theme: d.theme, elements: els, alt: cardAltText(d) });
}

// Düzen C (OG, 1. aşama): oyun başına statik görsel ve etiketler; kullanıcı metni görsele basılmaz.
export function ogMeta(uiLang) {
  const tr = uiLang === 'tr';
  return Object.freeze({
    title: tr ? 'Harfsiz · Yasak harfle anlattım, 3 hakta bil' : 'Letterless · A clue without one letter. Guess it in 3 tries',
    description: tr ? 'Kurulum yok, hesap yok. Tarayıcıda hemen tahmin et, sonra sen anlat.' : 'No install, no account. Guess right in your browser, then write one back.',
    imageAlt: tr ? 'Harfsiz: üstü çizili bir harf ve "3 hakta bil" yazısı.' : 'Letterless: a crossed-out letter and the words "guess it in 3 tries".',
    image: tr ? 'og-harfsiz.png' : 'og-letterless.png',
    width: FORMATS.og.width,
    height: FORMATS.og.height,
    twitterCard: 'summary_large_image',
  });
}

// OG görselinin düzeni (B görseli üretirken ölçü kılavuzu olarak kullanır).
export function ogLayout(uiLang) {
  const f = FORMATS.og;
  return Object.freeze({
    width: f.width,
    height: f.height,
    elements: [
      { type: 'letterBadge', letter: uiLang === 'tr' ? 'H' : 'L', cx: 300, cy: 315, r: 190, size: 220, struck: true },
      { type: 'brand', text: brandText(uiLang), x: 560, y: 290, size: 96, weight: 800, align: 'left' },
      { type: 'label', text: uiLang === 'tr' ? 'Yasak harfle anlat, 3 hakta bil' : 'Ban a letter. Guess in 3 tries.', x: 560, y: 380, size: 44, weight: 600, align: 'left' },
    ],
  });
}
