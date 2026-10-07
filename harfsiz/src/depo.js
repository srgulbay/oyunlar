// Cihazdaki kayıt (localStorage 'harfsiz.veri'). Cihazdan çıkmaz (KOORDINASYON.md §13): son 100 sözcük,
// gönderilen bulmacalar (sonuçları eşlemek için), çözülen turlar, gizlenen ref'ler ve gönderen imleri,
// kendi gönderen imi, günün sözcüğü kayıtları, oynanan günler, sayaç bayrakları, iOS hak önbelleği.
//
// Bozuk kayıt güvenli sıfırlanır (ham veri yedek anahtarda kalır, arayüz tek cümle söyler). Daha yeni
// bir şema sürümünün kaydı okunmaz ve silinmez: oyun bellek içi depoyla oynanır. Depolama kapalıysa
// (özel pencere) bellek içi depo kullanılır ve Ayarlar bunu söyler.
//
// Buradaki işlevler saf veri dönüşümleridir (kayıt nesnesini yerinde günceller); DOM ve saat yoktur.

import { RECENT_LIMIT, rememberWord } from './deste.js';
import { THEMES, DEFAULT_THEME } from './kart.js';

export const STORE_KEY = 'harfsiz.veri';
export const BACKUP_KEY = 'harfsiz.veri.yedek';
export const SCHEMA_VERSION = 1;

/** Liste sınırları: kayıt sınırsız büyümesin. */
export const LIMITS = Object.freeze({ sent: 60, rounds: 300, archive: 1000, daily: 400, hidden: 500, playDays: 400, once: 800 });

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isDate = (x) => typeof x === 'string' && DATE.test(x);
const isObject = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const isInt = (x, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isInteger(x) && x >= min && x <= max;
const isLang = (x) => x === 'tr' || x === 'en';
const isText = (x, max = 400) => typeof x === 'string' && x.length <= max;

export function emptyData() {
  return {
    version: SCHEMA_VERSION,
    settings: { lang: 'auto', reduceMotion: false, theme: DEFAULT_THEME },
    senderTag: null,
    recent: [],
    sent: [],
    rounds: {},
    archive: {},
    daily: {},
    hidden: { refs: [], senders: [] },
    playDays: [],
    firstDay: null,
    counter: { once: [], retention: [] },
    offer: { last: null },
    sessions: 0,
    exampleClosed: false,
    owned: [],
    support: { supporter: false, lastTip: null },
  };
}

// --- Doğrulama: bozuk alan varsayılana döner (bütün kayıt atılmaz) ---

function cleanMatch(m) {
  if (!isObject(m) || !isInt(m.me, 0, 1023) || !isInt(m.them, 0, 1023) || !isInt(m.round, 1, 255)) return null;
  return { me: m.me, them: m.them, round: m.round };
}

function cleanResult(s) {
  if (!isObject(s) || typeof s.solved !== 'boolean' || !isInt(s.attempts, 0, 3)) return null;
  if (s.solved && s.attempts < 1) return null;
  return { solved: s.solved, attempts: s.attempts, match: cleanMatch(s.match), date: isDate(s.date) ? s.date : null };
}

function cleanSent(g) {
  if (!isObject(g) || !isInt(g.ref) || !isText(g.code, 300) || !g.code || !isLang(g.lang) || !isText(g.letter, 2) || !g.letter || !isText(g.description, 120) || !g.description) return null;
  return {
    ref: g.ref,
    code: g.code,
    date: isDate(g.date) ? g.date : null,
    lang: g.lang,
    deck: isInt(g.deck, 0, 255) ? g.deck : 0,
    letter: g.letter,
    words: isInt(g.words, 1, 8) ? g.words : 1,
    description: g.description,
    day: isInt(g.day, 1, 65535) ? g.day : null,
    match: cleanMatch(g.match),
    rematchLetter: isText(g.rematchLetter, 2) && g.rematchLetter ? g.rematchLetter : null,
    imposed: g.imposed === true,
    prev: isObject(g.prev) && typeof g.prev.solved === 'boolean' && isInt(g.prev.attempts, 0, 3) ? { solved: g.prev.solved, attempts: g.prev.attempts } : null,
    result: cleanResult(g.result),
  };
}

function cleanRound(t) {
  if (!isObject(t) || !Array.isArray(t.guesses) || t.guesses.length > 3) return null;
  const guesses = [];
  for (const x of t.guesses) {
    if (!isObject(x) || !isText(x.text, 60) || !isText(x.key, 60) || !isText(x.verdict, 20)) return null;
    guesses.push({ text: x.text, key: x.key, verdict: x.verdict });
  }
  const solved = t.solved === true;
  const gaveUp = t.gaveUp === true;
  const done = t.done === true || solved || gaveUp || guesses.length >= 3;
  return { guesses, done, solved, gaveUp, date: isDate(t.date) ? t.date : null };
}

function cleanMap(x, keyOk, clean, limit) {
  const out = {};
  if (!isObject(x)) return out;
  for (const [k, v] of Object.entries(x).filter(([key]) => keyOk(key)).slice(-limit)) {
    const t = clean(v);
    if (t) out[k] = t;
  }
  return out;
}

function cleanDaily(g) {
  if (!isObject(g) || !isInt(g.no, 1, 65535) || !isLang(g.lang) || !isText(g.code, 300) || !g.code || !isText(g.description, 120) || !isText(g.letter, 2)) return null;
  return { no: g.no, lang: g.lang, code: g.code, ref: isInt(g.ref) ? g.ref : null, words: isInt(g.words, 1, 8) ? g.words : 1, description: g.description, letter: g.letter };
}

function cleanHiddenRef(r) {
  if (!isObject(r) || !isInt(r.ref)) return null;
  return {
    ref: r.ref,
    date: isDate(r.date) ? r.date : null,
    lang: isLang(r.lang) ? r.lang : 'tr',
    letter: isText(r.letter, 2) ? r.letter : '',
    words: isInt(r.words, 1, 8) ? r.words : null,
    reason: r.reason === 'report' ? 'report' : 'hide',
  };
}

/** Depodan okunan ham nesneyi doğrular; tanınmayan ya da bozuk alanlar varsayılana döner. */
export function cleanData(raw) {
  const v = emptyData();
  if (!isObject(raw)) return v;
  const a = isObject(raw.settings) ? raw.settings : {};
  v.settings.lang = ['auto', 'tr', 'en'].includes(a.lang) ? a.lang : 'auto';
  v.settings.reduceMotion = a.reduceMotion === true;
  v.settings.theme = THEMES.some((t) => t.id === a.theme) ? a.theme : DEFAULT_THEME;
  v.senderTag = isInt(raw.senderTag, 1, 0xffffff) ? raw.senderTag : null;
  v.recent = Array.isArray(raw.recent) ? raw.recent.filter((w) => isText(w, 40) && w).slice(-RECENT_LIMIT) : [];
  v.sent = Array.isArray(raw.sent) ? raw.sent.map(cleanSent).filter(Boolean).slice(-LIMITS.sent) : [];
  v.rounds = cleanMap(raw.rounds, (k) => /^\d+$/.test(k), cleanRound, LIMITS.rounds);
  v.archive = cleanMap(raw.archive, (k) => /^\d+$/.test(k), cleanRound, LIMITS.archive);
  v.daily = cleanMap(raw.daily, isDate, cleanDaily, LIMITS.daily);
  const h = isObject(raw.hidden) ? raw.hidden : {};
  v.hidden.refs = Array.isArray(h.refs) ? h.refs.map(cleanHiddenRef).filter(Boolean).slice(-LIMITS.hidden) : [];
  v.hidden.senders = Array.isArray(h.senders)
    ? h.senders.filter((r) => isObject(r) && isInt(r.tag, 1, 0xffffff)).map((r) => ({ tag: r.tag, date: isDate(r.date) ? r.date : null })).slice(-LIMITS.hidden)
    : [];
  v.playDays = Array.isArray(raw.playDays) ? [...new Set(raw.playDays.filter(isDate))].sort().slice(-LIMITS.playDays) : [];
  v.firstDay = isDate(raw.firstDay) ? raw.firstDay : v.playDays[0] || null;
  const c = isObject(raw.counter) ? raw.counter : {};
  v.counter.once = Array.isArray(c.once) ? c.once.filter((k) => isText(k, 80)).slice(-LIMITS.once) : [];
  v.counter.retention = Array.isArray(c.retention) ? [...new Set(c.retention.filter((n) => [0, 1, 7, 30].includes(n)))] : [];
  v.offer.last = isObject(raw.offer) && isDate(raw.offer.last) ? raw.offer.last : null;
  v.sessions = isInt(raw.sessions) ? raw.sessions : 0;
  v.exampleClosed = raw.exampleClosed === true;
  v.owned = Array.isArray(raw.owned) ? raw.owned.filter((x) => isText(x, 100)).slice(0, 50) : [];
  const d = isObject(raw.support) ? raw.support : {};
  v.support = { supporter: d.supporter === true, lastTip: d.supporter === true && isDate(d.lastTip) ? d.lastTip : null };
  return v;
}

// --- Depolama ---

/** Bellek içi depolama (özel pencere, hata ayıklama, ileri sürüm). localStorage arayüzünün alt kümesi. */
export function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
  };
}

function defaultStorage() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

/**
 * Kaydı açar. Dönen: { data, save(), persistent, corrupt, newer }.
 *   persistent: false → depolama yazılamıyor (bellek içi); corrupt: kayıt okunamadı, sıfırlandı;
 *   newer: kayıt daha yeni bir sürümün (okunmadı, silinmedi; bellek içi oynanır).
 */
export function openStore(storage = defaultStorage()) {
  let persistent = false;
  if (storage) {
    try {
      storage.setItem('harfsiz.yoklama', '1');
      storage.removeItem('harfsiz.yoklama');
      persistent = true;
    } catch {
      persistent = false;
    }
  }
  const area = persistent ? storage : memoryStorage();
  let raw = null;
  let corrupt = false;
  try {
    const text = area.getItem(STORE_KEY);
    if (text !== null) {
      raw = JSON.parse(text);
      if (!isObject(raw)) throw new Error('kayıt nesne değil');
    }
  } catch {
    corrupt = true;
    try {
      area.setItem(BACKUP_KEY, String(area.getItem(STORE_KEY)));
    } catch {
      /* yedek de yazılamadı */
    }
    raw = null;
  }
  const newer = Boolean(raw && isInt(raw.version) && raw.version > SCHEMA_VERSION);
  const data = newer ? emptyData() : cleanData(raw);
  const target = newer ? memoryStorage() : area;
  function save() {
    try {
      target.setItem(STORE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }
  if (corrupt) save();
  return { data, save, persistent: persistent && !newer, corrupt, newer };
}

// --- Kayıt işlemleri ---

/** Son 100 sözcüğe ekler (deste.js → rememberWord). */
export function rememberRecent(data, word) {
  data.recent = rememberWord(data.recent, word);
}

/** Gönderilen bulmacayı ekler (aynı ref yinelenmez; en yeni sonda). */
export function addSent(data, entry) {
  const clean = cleanSent(entry);
  if (!clean) return null;
  data.sent = data.sent.filter((g) => g.ref !== clean.ref);
  data.sent.push(clean);
  if (data.sent.length > LIMITS.sent) data.sent = data.sent.slice(-LIMITS.sent);
  return clean;
}

export const findSent = (data, ref) => data.sent.find((g) => g.ref === ref) || null;

/** Gönderilen bulmacanın sonucunu işler (#r= ya da rövanş yükündeki prev). Bulunamazsa false. */
export function recordResult(data, ref, { solved, attempts, match = null, date = null }) {
  const g = findSent(data, ref);
  if (!g) return false;
  const next = cleanResult({ solved, attempts, match, date });
  if (!next) return false;
  // Skorlu sonuç skorsuzun yerini alır; skorsuz sonuç bilinen skoru silmez.
  if (g.result && g.result.match && !next.match) next.match = g.result.match;
  g.result = next;
  return true;
}

export const isHiddenRef = (data, ref) => data.hidden.refs.some((r) => r.ref === ref);
export const isHiddenSender = (data, tag) => data.hidden.senders.some((r) => r.tag === tag);

export function hideRef(data, { ref, date, lang, letter, words, reason = 'hide' }) {
  if (isHiddenRef(data, ref)) return;
  const clean = cleanHiddenRef({ ref, date, lang, letter, words, reason });
  if (!clean) return;
  data.hidden.refs.push(clean);
  data.hidden.refs = data.hidden.refs.slice(-LIMITS.hidden);
}

export function hideSender(data, tag, date) {
  if (!isInt(tag, 1, 0xffffff) || isHiddenSender(data, tag)) return;
  data.hidden.senders.push({ tag, date: isDate(date) ? date : null });
  data.hidden.senders = data.hidden.senders.slice(-LIMITS.hidden);
}

export function unhideRef(data, ref) {
  data.hidden.refs = data.hidden.refs.filter((r) => r.ref !== ref);
}

export function unhideSender(data, tag) {
  data.hidden.senders = data.hidden.senders.filter((r) => r.tag !== tag);
}

/** Bağlantı bulmacasının turu (ref ile) ya da arşiv turu (no ile). */
export function saveRound(data, kind, key, round, date) {
  const map = kind === 'archive' ? data.archive : data.rounds;
  const t = cleanRound({ ...round, date: round.date || date });
  if (!t) return;
  delete map[key];
  map[key] = t;
  const limit = kind === 'archive' ? LIMITS.archive : LIMITS.rounds;
  const keys = Object.keys(map);
  if (keys.length > limit) for (const k of keys.slice(0, keys.length - limit)) delete map[k];
}

export const readRound = (data, kind, key) => (kind === 'archive' ? data.archive : data.rounds)[key] || null;

/** Oyun günü (teklif kuralı ve elde tutma eşiği için). Yeni günse true. */
export function addPlayDay(data, date) {
  if (!isDate(date)) return false;
  if (!data.firstDay) data.firstDay = date;
  if (data.playDays.includes(date)) return false;
  data.playDays.push(date);
  data.playDays.sort();
  data.playDays = data.playDays.slice(-LIMITS.playDays);
  return true;
}

/** Sayaç bayrağı: anahtar ilk kez görülüyorsa işaretler ve true döner (bağlantı başına bir kez). */
export function firstTime(data, key) {
  if (data.counter.once.includes(key)) return false;
  data.counter.once.push(key);
  data.counter.once = data.counter.once.slice(-LIMITS.once);
  return true;
}

export function saveDaily(data, date, entry) {
  const t = cleanDaily(entry);
  if (!isDate(date) || !t) return null;
  delete data.daily[date];
  data.daily[date] = t;
  const keys = Object.keys(data.daily).sort();
  if (keys.length > LIMITS.daily) for (const k of keys.slice(0, keys.length - LIMITS.daily)) delete data.daily[k];
  return t;
}

const DAY_MS = 86400000;
const utcMs = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};
const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);

/**
 * Günün sözcüğü serisi: bugünden (bugün anlatılmadıysa dünden) geriye, ara vermeden anlatılan gün sayısı.
 * Kırılınca ceza yok; seri satılmaz.
 */
export function dailyStreak(data, today) {
  if (!isDate(today)) return 0;
  const days = new Set(Object.keys(data.daily));
  let t = utcMs(today);
  if (!days.has(isoDay(t))) t -= DAY_MS;
  let n = 0;
  while (days.has(isoDay(t))) {
    n++;
    t -= DAY_MS;
  }
  return n;
}
