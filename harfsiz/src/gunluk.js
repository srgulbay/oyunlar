// Günün sözcüğü: herkese aynı gün aynı sözcük ve aynı yasak harf; tohumlu takvim.
// Saat okumaz: bugünü arayüz verir (localDate(new Date())). Saf modüldür; sunucuya kopyalanabilir.
//
// Takvim: gün sırası d (0'dan), havuz büyüklüğü P. Havuz her P günlük dönemde tohumla karılır
// (`harfsiz/<sürüm>/<dil>/donem/<e>`); dönem içinde hiçbir sözcük yinelenmez. Dönem sınırında yeni dönemin
// ilk G sözcüğü önceki dönemin son G sözcüğüyle çakışmaz; böylece iki yineleme arası en az G gündür.

import { rngFromSeed, shuffled, xmur3 } from './rng.js';
import { deckRecords, deckById, dealLetter } from './deste.js';

// Harfsiz #1 (aile oyunlarıyla aynı N: Kat, Taç).
export const START = '2026-10-05';
// Havuz ya da kural değişirse yeni sürüm yalnız ileri bir tarihten yürürlüğe girer; eski günler değişmez.
export const VERSION_SCHEDULE = Object.freeze([Object.freeze({ from: '2026-10-05', version: 1 })]);
// Günün sözcüğü ücretsiz temel desteden gelir.
export const DAILY_DECK = Object.freeze({ tr: 'temel', en: 'basic' });
// Dönem sınırında yinelenmeme aralığı (gün).
export const MIN_GAP = 60;

const DAY_MS = 86400000;

export function isValidDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

function utc(s) {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fmt(ms) {
  const t = new Date(ms);
  const p = n => String(n).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`;
}

// Cihazın yerel takvim günü (Date nesnesinden; saat okumaz).
export function localDate(date) {
  const p = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

// Harfsiz #N: START = 1; UTC gün farkıyla (yaz saatinden etkilenmez).
export function dayNumber(s) {
  if (!isValidDate(s)) throw new Error('geçersiz tarih: ' + s);
  return Math.round((utc(s) - utc(START)) / DAY_MS) + 1;
}

export function dateForNumber(n) {
  return fmt(utc(START) + (n - 1) * DAY_MS);
}

export function addDays(s, n) {
  return fmt(utc(s) + n * DAY_MS);
}

export function versionFor(s) {
  let v = VERSION_SCHEDULE[0].version;
  for (const row of VERSION_SCHEDULE) if (row.from <= s) v = row.version;
  return v;
}

// Sürümün havuzu: temel destenin "gunluk" işaretli sözcükleri, içerikteki sırasıyla.
// Yayın günü bu liste dondurulur (docs/icerik-bicimi.md §7); sonraki değişiklik yeni sürümle girer.
export function dailyPool(lang, version = 1) {
  if (version !== 1) throw new Error('bilinmeyen günlük sürüm: ' + version);
  return deckRecords(DAILY_DECK[lang]).filter(r => r.daily);
}

// Havuzun parmak izi: "adet:özet". Özet, sözcükleri ve önerilen harfleri (günün harfini belirler) sırasıyla kapsar.
export function poolFingerprint(lang, version = 1) {
  const pool = dailyPool(lang, version);
  const h = xmur3(pool.map(r => `${r.word}/${r.letters.join('')}`).join('|'))();
  return `${pool.length}:${h.toString(16).padStart(8, '0')}`;
}

// Yayın günü dondurulan havuzların parmak izi (sürüm → dil). null: henüz dondurulmadı (yayından önce içerik
// büyür). Dondurulmuş havuz değişirse gunluk.test.js kırılır; değişiklik VERSION_SCHEDULE'da yeni sürümle girer.
export const FROZEN_POOLS = Object.freeze({ 1: Object.freeze({ tr: null, en: null }) });

const permCache = new Map();

function rawPermutation(lang, version, epoch, pool) {
  return shuffled(pool, rngFromSeed(`harfsiz/${version}/${lang}/donem/${epoch}`));
}

function permutation(lang, version, epoch) {
  const key = `${lang}/${version}/${epoch}`;
  if (permCache.has(key)) return permCache.get(key);
  const pool = dailyPool(lang, version);
  const perm = rawPermutation(lang, version, epoch, pool);
  if (epoch > 0) {
    const gap = Math.min(MIN_GAP, Math.floor(pool.length / 3));
    // Önceki dönemin kuyruğu, onun ham karışımının son G öğesidir (baş düzeltmesi kuyruğa dokunmaz).
    const prev = rawPermutation(lang, version, epoch - 1, pool);
    const tail = new Set(prev.slice(prev.length - gap).map(r => r.word));
    let swap = gap;
    for (let i = 0; i < gap; i++) {
      if (!tail.has(perm[i].word)) continue;
      while (swap < perm.length - gap && tail.has(perm[swap].word)) swap++;
      const t = perm[i]; perm[i] = perm[swap]; perm[swap] = t;
      swap++;
    }
  }
  permCache.set(key, perm);
  return perm;
}

// Günün bulmacası: { date, no, lang, version, word, letter, deckId, deckCode (yük için), record }.
export function dailyPuzzle(s, lang) {
  const no = dayNumber(s);
  if (no < 1) throw new Error('başlangıçtan önce: ' + s);
  const version = versionFor(s);
  const pool = dailyPool(lang, version);
  const d = no - 1;
  const epoch = Math.floor(d / pool.length);
  const record = permutation(lang, version, epoch)[d % pool.length];
  const letter = dealLetter(record, lang, rngFromSeed(`harfsiz/${version}/${lang}/${s}/harf`));
  const deck = deckById(DAILY_DECK[lang]);
  return Object.freeze({ date: s, no, lang, version, word: record.word, letter, deckId: deck.id, deckCode: deck.code, record });
}
