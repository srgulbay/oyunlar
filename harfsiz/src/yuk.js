// Bağlantı yükü (Faz A, sunucusuz): bulmaca `#p=`, sonuç `#r=` parçasında taşınır; parça sunucuya gitmez.
// Biçim: bit paketli ikili kayıt → base64url → "." → 5 simgelik sağlama. Ayrıntı: KOORDINASYON.md §5.
// Cevap gizlenir ama şifrelenmez (meraklı biri çözebilir); bu yüzden Faz A sonuçları sıralamaya girmez.
// Saf modüldür; sunucuya kopyalanabilir (kurma-bildir yükü bu modülle çözer).

import { toLower, toUpper, tokenize, letterIndex, letterFromIndex, normalizeLetter, isLang } from './turkce.js';
import { xmur3, mulberry32 } from './rng.js';
import { canonicalDescription, safetyCheck, answerSafe, MAX_CHARS, MAX_WORDS, MAX_ANSWER_CHARS, MAX_ANSWER_WORDS } from './denetim.js';
import { canonicalAnswer } from './ekler.js';

export const PAYLOAD_VERSION = 1;
// Yük türleri (4 bit). 3–6 ayrılmıştır (3 Emoji kipi bulmacası, 4 grup, Faz B); eski istemci bunlara "güncelle" der.
export const KIND = Object.freeze({ PUZZLE: 1, RESULT: 2 });
export const CHECKSUM_LENGTH = 5;
const CHECKSUM_MOD = 36 ** CHECKSUM_LENGTH; // 60 466 176 < 2^26
const DOMAIN = 'harfsiz|';

// 6 bitlik simge tablosu. 50–63 ayrılmıştır (ileride é gibi harfler); sıra değişmez.
export const SYMBOLS = Object.freeze([
  ' ', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v',
  'w', 'x', 'y', 'z', 'ç', 'ğ', 'ı', 'ö', 'ş', 'ü', 'â', 'î', 'û',
  '.', ',', ':', ';', '!', '?', "'", '"', '-', '…', '(', ')', '«', '»',
]);
const SYMBOL_INDEX = new Map(SYMBOLS.map((s, i) => [s, i]));
const LETTER_SYMBOL_MAX = 35; // 0 (boşluk) … 35 (û): cevapta yalnız bunlar

// ---------------------------------------------------------------------------
// Bit yazıcı ve okuyucu

class BitWriter {
  constructor() { this.bytes = []; this.acc = 0; this.n = 0; }
  write(value, bits) {
    if (!Number.isInteger(value) || value < 0 || value >= 2 ** bits) throw new Error(`alan sığmıyor: ${value} (${bits} bit)`);
    for (let i = bits - 1; i >= 0; i--) {
      this.acc = (this.acc << 1) | (Math.floor(value / 2 ** i) & 1);
      this.n += 1;
      if (this.n === 8) { this.bytes.push(this.acc); this.acc = 0; this.n = 0; }
    }
  }
  finish() {
    if (this.n) { this.bytes.push((this.acc << (8 - this.n)) & 0xff); this.acc = 0; this.n = 0; }
    return this.bytes;
  }
}

class BitReader {
  constructor(bytes) { this.bytes = bytes; this.pos = 0; this.total = bytes.length * 8; }
  read(bits) {
    if (this.pos + bits > this.total) throw new RangeError('kısa');
    let v = 0;
    for (let i = 0; i < bits; i++) {
      const byte = this.bytes[(this.pos + i) >> 3];
      v = v * 2 + ((byte >> (7 - ((this.pos + i) & 7))) & 1);
    }
    this.pos += bits;
    return v;
  }
  // Kalan bitler yalnız sıfır dolgu olabilir (en çok 7 bit).
  atCleanEnd() {
    const rest = this.total - this.pos;
    if (rest >= 8) return false;
    return rest === 0 || this.read(rest) === 0;
  }
}

// ---------------------------------------------------------------------------
// base64url ve sağlama

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const B64_INDEX = new Map(Array.from(B64, (c, i) => [c, i]));

export function toBase64Url(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    const chars = i + 1 >= bytes.length ? 2 : i + 2 >= bytes.length ? 3 : 4;
    for (let k = 0; k < chars; k++) out += B64[(n >> (18 - 6 * k)) & 63];
  }
  return out;
}

export function fromBase64Url(s) {
  if (typeof s !== 'string' || s.length % 4 === 1) return null;
  const bytes = [];
  for (let i = 0; i < s.length; i += 4) {
    const chunk = s.slice(i, i + 4);
    let n = 0;
    for (let k = 0; k < 4; k++) {
      const v = k < chunk.length ? B64_INDEX.get(chunk[k]) : 0;
      if (v === undefined) return null;
      n = (n << 6) | v;
    }
    bytes.push((n >> 16) & 0xff);
    if (chunk.length > 2) bytes.push((n >> 8) & 0xff);
    if (chunk.length > 3) bytes.push(n & 0xff);
  }
  // Kanonik olmayan kodlamayı reddet (son simgenin artık bitleri sıfır olmalı).
  return toBase64Url(bytes) === s ? bytes : null;
}

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

// Gövdenin sağlama sayısı (0 … 36^5 − 1). Sonuç bağlantısı bulmacayı bu sayıyla anar (ref).
export function checksumValue(body) {
  return fnv1a(DOMAIN + body) % CHECKSUM_MOD;
}

export function checksum(body) {
  return checksumValue(body).toString(36).padStart(CHECKSUM_LENGTH, '0');
}

// Kodun (gövde.sağlama) ref sayısı; biçim bozuksa null.
export function refOf(code) {
  const split = splitCode(code);
  return split ? checksumValue(split.body) : null;
}

function splitCode(code) {
  if (typeof code !== 'string') return null;
  const m = /^([A-Za-z0-9_-]+)\.([0-9a-z]{5})$/.exec(code);
  if (!m || checksum(m[1]) !== m[2]) return null;
  return { body: m[1], sum: m[2] };
}

// ---------------------------------------------------------------------------
// Metin alanları

function textToSymbols(text, { lettersOnly }) {
  const out = [];
  for (const ch of text) {
    const i = SYMBOL_INDEX.get(ch);
    if (i === undefined || (lettersOnly && i > LETTER_SYMBOL_MAX)) throw new Error('alfabe dışı karakter: ' + ch);
    out.push(i);
  }
  return out;
}

function symbolsToText(symbols) {
  let s = '';
  for (const i of symbols) {
    if (i >= SYMBOLS.length) return null;
    s += SYMBOLS[i];
  }
  return s;
}

// Gizleme anahtar akışı: her simge 1–63 arası bir sayıyla XOR'lanır, yani hiçbir simge kendi yerinde kalmaz.
export function keystream(salt, n) {
  const r = mulberry32(xmur3('harfsiz-gizle|' + salt)());
  return Array.from({ length: n }, () => 1 + Math.floor(r() * 63));
}

function writeDescription(w, description, lang) {
  const canon = canonicalDescription(description, lang);
  if (canon !== description) throw new Error('anlatım kanonik değil');
  const lower = toLower(canon, lang);
  const tokens = tokenize(canon);
  if (tokens.length < 1 || tokens.length > MAX_WORDS) throw new Error('kelime sayısı geçersiz');
  let caps = 0;
  tokens.forEach((t, i) => { if (t.text[0] !== lower[t.start]) caps |= 1 << (7 - i); });
  const symbols = textToSymbols(lower, { lettersOnly: false });
  if (symbols.length < 1 || symbols.length > MAX_CHARS) throw new Error('anlatım uzunluğu geçersiz');
  w.write(symbols.length, 7);
  w.write(caps, 8);
  for (const s of symbols) w.write(s, 6);
}

function readDescription(r, lang) {
  const n = r.read(7);
  const caps = r.read(8);
  if (n < 1 || n > MAX_CHARS) return null;
  const symbols = [];
  for (let i = 0; i < n; i++) symbols.push(r.read(6));
  const lower = symbolsToText(symbols);
  if (lower === null) return null;
  const tokens = tokenize(lower);
  if (tokens.length < 1 || tokens.length > MAX_WORDS) return null;
  if (caps & ((1 << (8 - tokens.length)) - 1)) return null; // kullanılmayan bitler sıfır olmalı
  let text = lower;
  tokens.forEach((t, i) => {
    if (caps & (1 << (7 - i))) {
      const first = lower[t.start];
      text = text.slice(0, t.start) + toUpper(first, lang) + text.slice(t.start + 1);
    }
  });
  if (canonicalDescription(text, lang) !== text) return null;
  return text;
}

function writeAnswer(w, answer, salt) {
  const symbols = textToSymbols(answer, { lettersOnly: true });
  if (symbols.length < 1 || symbols.length > MAX_ANSWER_CHARS) throw new Error('cevap uzunluğu geçersiz');
  const ks = keystream(salt, symbols.length);
  w.write(symbols.length, 5);
  symbols.forEach((s, i) => w.write(s ^ ks[i], 6));
}

function readAnswer(r, salt) {
  const n = r.read(5);
  if (n < 1 || n > MAX_ANSWER_CHARS) return null;
  const ks = keystream(salt, n);
  const symbols = [];
  for (let i = 0; i < n; i++) symbols.push(r.read(6) ^ ks[i]);
  if (symbols.some(s => s > LETTER_SYMBOL_MAX)) return null;
  const text = symbolsToText(symbols);
  if (!text || text !== text.trim() || text.includes('  ') || text.split(' ').length > MAX_ANSWER_WORDS) return null;
  return text;
}

// ---------------------------------------------------------------------------
// Bulmaca yükü

// Bulmacayı koda çevirir. Girdi alanları:
//   lang 'tr'|'en' · deck 0–255 (deste kodu) · letter (yasak harf) · answer (gizli sözcük, kipin küçük harfiyle)
//   description (canonicalDescription biçiminde) · salt 0–65535
//   isteğe bağlı: rematchLetter (rövanşta alıcıya yasaklanan harf) · sender 1–16 777 215 (gönderen imi)
//   day 1–65535 (Günün sözcüğü no) · prev { solved, attempts, ref } (önceki turun sonucu)
//   match { me, them, round } (rövanş skoru, puan.js)
export function encodePuzzle(p) {
  if (!isLang(p.lang)) throw new Error('dil');
  const lang = p.lang;
  const li = letterIndex(p.letter, lang);
  if (li < 0) throw new Error('yasak harf');
  const ri = p.rematchLetter ? letterIndex(p.rematchLetter, lang) : -1;
  if (p.rematchLetter && ri < 0) throw new Error('rövanş harfi');
  const w = new BitWriter();
  w.write(KIND.PUZZLE, 4);
  w.write(PAYLOAD_VERSION, 4);
  w.write(lang === 'en' ? 1 : 0, 1);
  w.write(ri >= 0 ? 1 : 0, 1);
  w.write(p.sender ? 1 : 0, 1);
  w.write(p.day ? 1 : 0, 1);
  w.write(p.prev ? 1 : 0, 1);
  w.write(p.match ? 1 : 0, 1);
  w.write(0, 2); // ayrılmış
  w.write(p.deck, 8);
  w.write(li, 5);
  if (ri >= 0) w.write(ri, 5);
  if (p.sender) w.write(p.sender, 24);
  if (p.day) w.write(p.day, 16);
  if (p.prev) {
    w.write(p.prev.solved ? 1 : 0, 1);
    w.write(p.prev.attempts, 2);
    w.write(p.prev.ref, 26);
  }
  if (p.match) {
    w.write(p.match.me, 10);
    w.write(p.match.them, 10);
    w.write(p.match.round, 8);
  }
  w.write(p.salt, 16);
  if (canonicalAnswer(p.answer, lang) !== p.answer) throw new Error('cevap kanonik değil');
  writeAnswer(w, p.answer, p.salt);
  writeDescription(w, p.description, lang);
  const body = toBase64Url(w.finish());
  return body + '.' + checksum(body);
}

function readHeader(code, expectedKind) {
  const split = splitCode(code);
  if (!split) return { error: 'bozuk' };
  const bytes = fromBase64Url(split.body);
  if (!bytes || bytes.length < 2) return { error: 'bozuk' };
  const r = new BitReader(bytes);
  const kind = r.read(4);
  const version = r.read(4);
  // Bilinen türün daha yeni sürümü ya da ayrılmış tür (3–6: Emoji kipi, grup…) → "güncelle"; ötekiler bozuk.
  const known = kind === KIND.PUZZLE || kind === KIND.RESULT;
  if ((known && version > PAYLOAD_VERSION) || (kind >= 3 && kind <= 6 && version >= 1)) return { error: 'yeni-surum' };
  if (version !== PAYLOAD_VERSION || kind !== expectedKind) return { error: 'bozuk' };
  return { r, ref: checksumValue(split.body) };
}

// Kodu bulmacaya çevirir. Dönen: { ok: true, puzzle, ref } ya da { ok: false, error: 'bozuk' | 'yeni-surum' }.
export function decodePuzzle(code) {
  const h = readHeader(code, KIND.PUZZLE);
  if (h.error) return { ok: false, error: h.error };
  const { r } = h;
  try {
    const lang = r.read(1) ? 'en' : 'tr';
    const hasRematch = r.read(1);
    const hasSender = r.read(1);
    const hasDay = r.read(1);
    const hasPrev = r.read(1);
    const hasMatch = r.read(1);
    if (r.read(2) !== 0) return { ok: false, error: 'bozuk' };
    const deck = r.read(8);
    const letter = letterFromIndex(r.read(5), lang);
    if (letter === null) return { ok: false, error: 'bozuk' };
    let rematchLetter = null;
    if (hasRematch) {
      rematchLetter = letterFromIndex(r.read(5), lang);
      if (rematchLetter === null) return { ok: false, error: 'bozuk' };
    }
    const sender = hasSender ? r.read(24) : null;
    if (hasSender && sender === 0) return { ok: false, error: 'bozuk' };
    const day = hasDay ? r.read(16) : null;
    if (hasDay && day === 0) return { ok: false, error: 'bozuk' };
    let prev = null;
    if (hasPrev) {
      prev = { solved: r.read(1) === 1, attempts: r.read(2), ref: r.read(26) };
      if (prev.ref >= CHECKSUM_MOD || (prev.solved && prev.attempts === 0)) return { ok: false, error: 'bozuk' };
    }
    let match = null;
    if (hasMatch) {
      match = { me: r.read(10), them: r.read(10), round: r.read(8) };
      if (match.round < 1) return { ok: false, error: 'bozuk' };
    }
    const salt = r.read(16);
    const answer = readAnswer(r, salt);
    if (answer === null) return { ok: false, error: 'bozuk' };
    const description = readDescription(r, lang);
    if (description === null || !r.atCleanEnd()) return { ok: false, error: 'bozuk' };
    const puzzle = { lang, deck, letter, answer, description, rematchLetter, sender, day, prev, match, salt };
    return { ok: true, puzzle, ref: h.ref };
  } catch (e) {
    if (e instanceof RangeError) return { ok: false, error: 'bozuk' };
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Sonuç yükü (alıcıdan kurucuya). Cevabı hiçbir biçimde taşımaz.
// Alanlar: lang · solved · attempts 0–3 · letter · ref (bulmacanın ref sayısı) · description
//          isteğe bağlı day · match { me (gönderen), them, round }

export function encodeResult(res) {
  if (!isLang(res.lang)) throw new Error('dil');
  const li = letterIndex(res.letter, res.lang);
  if (li < 0) throw new Error('yasak harf');
  if (res.solved && res.attempts < 1) throw new Error('deneme');
  const w = new BitWriter();
  w.write(KIND.RESULT, 4);
  w.write(PAYLOAD_VERSION, 4);
  w.write(res.lang === 'en' ? 1 : 0, 1);
  w.write(res.solved ? 1 : 0, 1);
  w.write(res.day ? 1 : 0, 1);
  w.write(res.match ? 1 : 0, 1);
  w.write(0, 4); // ayrılmış
  w.write(res.attempts, 2);
  w.write(li, 5);
  w.write(res.ref, 26);
  if (res.day) w.write(res.day, 16);
  if (res.match) {
    w.write(res.match.me, 10);
    w.write(res.match.them, 10);
    w.write(res.match.round, 8);
  }
  writeDescription(w, res.description, res.lang);
  const body = toBase64Url(w.finish());
  return body + '.' + checksum(body);
}

export function decodeResult(code) {
  const h = readHeader(code, KIND.RESULT);
  if (h.error) return { ok: false, error: h.error };
  const { r } = h;
  try {
    const lang = r.read(1) ? 'en' : 'tr';
    const solved = r.read(1) === 1;
    const hasDay = r.read(1);
    const hasMatch = r.read(1);
    if (r.read(4) !== 0) return { ok: false, error: 'bozuk' };
    const attempts = r.read(2);
    if (solved && attempts === 0) return { ok: false, error: 'bozuk' };
    const letter = letterFromIndex(r.read(5), lang);
    if (letter === null) return { ok: false, error: 'bozuk' };
    const ref = r.read(26);
    if (ref >= CHECKSUM_MOD) return { ok: false, error: 'bozuk' };
    const day = hasDay ? r.read(16) : null;
    if (hasDay && day === 0) return { ok: false, error: 'bozuk' };
    let match = null;
    if (hasMatch) {
      match = { me: r.read(10), them: r.read(10), round: r.read(8) };
      if (match.round < 1) return { ok: false, error: 'bozuk' };
    }
    const description = readDescription(r, lang);
    if (description === null || !r.atCleanEnd()) return { ok: false, error: 'bozuk' };
    return { ok: true, result: { lang, solved, attempts, letter, ref, description, day, match }, ref: h.ref };
  } catch (e) {
    if (e instanceof RangeError) return { ok: false, error: 'bozuk' };
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Bağlantı

// Bağlantının yolu arayüz diline göredir: TR "/harfsiz/", öteki diller "/letterless/" (statik OG o dildedir).
export function gamePath(uiLang) {
  return uiLang === 'tr' ? 'harfsiz' : 'letterless';
}

// PAYLASIM_TABANI'ndan oyun adresi. Kök alan adıysa yol eklenir; geliştirmede bir .html dosyası ya da
// file:// adresi verilirse olduğu gibi kullanılır.
export function shareBase(root, uiLang) {
  const clean = String(root).split('#')[0].split('?')[0];
  if (/^file:/i.test(clean) || /\.html?$/i.test(clean)) return clean;
  return clean.replace(/\/+$/, '') + '/' + gamePath(uiLang) + '/';
}

// Paylaşım bağlantısı. kind 'p' (bulmaca) ya da 'r' (sonuç); channel sayaç için ('wa', 'tg', …).
export function buildLink({ root, uiLang = 'tr', kind, code, channel = null }) {
  if (kind !== 'p' && kind !== 'r') throw new Error('tür');
  const query = channel ? '?k=' + encodeURIComponent(channel) : '';
  return shareBase(root, uiLang) + query + '#' + kind + '=' + code;
}

// Kartta ve metinde okunur adres ("oyna.algomed.app/harfsiz"); yerel geliştirmede null.
export function displayAddress(root, uiLang = 'tr') {
  const m = /^https?:\/\/([^/?#]+)/i.exec(String(root));
  return m ? m[1].toLowerCase() + '/' + gamePath(uiLang) : null;
}

// `location.hash`'i ayrıştırır: { kind: 'p' | 'r' | null, code }.
export function parseFragment(hash) {
  const s = String(hash ?? '').replace(/^#/, '');
  for (const part of s.split('&')) {
    const m = /^([pr])=(.*)$/.exec(part);
    if (m) return { kind: m[1], code: m[2] };
  }
  return { kind: null, code: null };
}

// Açılış yönlendirmesi (saf). opts: { hiddenRefs?: Set<number>, blockedSenders?: Set<number>, filter? }
// Dönen state:
//   'home'    → bağlantı yok
//   'puzzle'  → { puzzle, ref }       'result' → { result, ref }
//   'broken'  → "Bağlantı açılmadı" (kesik, değiştirilmiş ya da başka oyunun bağlantısı)
//   'newer'   → bağlantı daha yeni bir sürümle yapılmış ("Güncelle")
//   'blocked' → süzgece takıldı, gösterilmez
//   'hidden'  → bu cihazda bildirilmiş ya da göndereni gizlenmiş (reason: 'puzzle' | 'sender')
export function openFragment(hash, opts = {}) {
  const { kind, code } = parseFragment(hash);
  if (!kind) return { state: 'home' };
  if (kind === 'p') {
    const d = decodePuzzle(code);
    if (!d.ok) return { state: d.error === 'yeni-surum' ? 'newer' : 'broken' };
    const p = d.puzzle;
    const safe = safetyCheck(p.description, { lang: p.lang, letter: p.letter, filter: opts.filter });
    if (!safe.ok) return { state: safe.issues.some(i => i.type === 'filter') ? 'blocked' : 'broken' };
    if (!answerSafe(p.answer, { lang: p.lang, filter: opts.filter })) return { state: 'blocked' };
    if (opts.hiddenRefs && opts.hiddenRefs.has(d.ref)) return { state: 'hidden', reason: 'puzzle' };
    if (p.sender && opts.blockedSenders && opts.blockedSenders.has(p.sender)) return { state: 'hidden', reason: 'sender' };
    return { state: 'puzzle', puzzle: p, ref: d.ref, words: safe.words };
  }
  const d = decodeResult(code);
  if (!d.ok) return { state: d.error === 'yeni-surum' ? 'newer' : 'broken' };
  const res = d.result;
  const safe = safetyCheck(res.description, { lang: res.lang, letter: res.letter, filter: opts.filter });
  if (!safe.ok) return { state: safe.issues.some(i => i.type === 'filter') ? 'blocked' : 'broken' };
  return { state: 'result', result: res, ref: d.ref, words: safe.words };
}

// Yeni gönderen imi (cihazda bir kez üretilir ve saklanır). rng: [0,1) üreteci (A crypto tabanlı verir).
export function newSenderTag(rng) {
  return 1 + Math.floor(rng() * 0xfffffe);
}

// Yeni tuz (her bulmacada).
export function newSalt(rng) {
  return Math.floor(rng() * 0x10000);
}

// Harfi yük alanı biçimine getirir (küçük harf); geçersizse null.
export { normalizeLetter };
