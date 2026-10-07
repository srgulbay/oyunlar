// Desteler: kayıt, sözcük kayıtlarının normalleştirilmesi, 3 sözcük dağıtımı ("son 100 tekrar etmez")
// ve yasak harf dağıtımı. Hak denetimi burada değil, haklar.js'tedir ("kuran öder").
// Saf modüldür; rastgelelik dışarıdan verilen üreteçle gelir.

import { DESTELER } from './icerik/desteler.js';
import { COZME_ARSIVI, ILK_EKRAN } from './icerik/cozme-arsivi.js';
import { canonicalAnswer } from './ekler.js';
import { randInt, shuffled } from './rng.js';
import { alphabet, normalizeLetter, isLang } from './turkce.js';

export const RECENT_LIMIT = 100;
export const DEAL_SIZE = 3;
export const BUNDLE_ID = 'app.algomed.harfsiz';

// Harf sıklığı sırası (en sıktan en seyreğe). İlk 10 harf ilk turda yasaklanabilecek "sık harfler"dir.
export const LETTERS_BY_FREQUENCY = Object.freeze({
  tr: Object.freeze(['a', 'e', 'i', 'n', 'r', 'l', 'ı', 'k', 'd', 'm', 'y', 'u', 't', 's', 'b', 'o', 'ü', 'ş', 'z', 'g', 'ç', 'h', 'ğ', 'v', 'c', 'ö', 'p', 'f', 'j']),
  en: Object.freeze(['e', 't', 'a', 'o', 'i', 'n', 's', 'h', 'r', 'd', 'l', 'c', 'u', 'm', 'w', 'f', 'g', 'y', 'p', 'b', 'v', 'k', 'j', 'x', 'q', 'z']),
});
export const FREQUENT_COUNT = 10;
export const frequentLetters = lang => LETTERS_BY_FREQUENCY[lang].slice(0, FREQUENT_COUNT);

// ---------------------------------------------------------------------------
// Kayıtlar

// İçerik kaydını tek biçime getirir: dizi [sözcük, karşılık, zorluk] ya da nesne.
// extra: anlatımda engellenen ek kökler: kaydın `kokler`i ve `esler`i (eş ad cevap gibi engellenir; checkDescription'a
// `extra` olarak verilir) · alternates: eş adlar (`esler`; tahminde doğru sayılır, tahmin.js) · display: cevabın gösterim
// biçimi (`gosterim`, anlam ayıran şapkayla "hâkim"; yoksa sözcüğün kendisi). Denetim ve tahmin şapkasız `word` ile çalışır.
export function normalizeRecord(entry, lang) {
  const o = Array.isArray(entry) ? { soz: entry[0], ceviri: entry[1], zorluk: entry[2] } : entry;
  const word = canonicalAnswer(o.soz, lang);
  const letters = (o.harf || []).map(l => normalizeLetter(l, lang)).filter(Boolean);
  return Object.freeze({
    word,
    translation: o.ceviri ? String(o.ceviri) : null,
    difficulty: [1, 2, 3].includes(o.zorluk) ? o.zorluk : 2,
    letters: Object.freeze(letters),
    extra: Object.freeze([...(o.kokler || []), ...(o.esler || [])]),
    allowed: Object.freeze([...(o.serbest || [])]),
    alternates: Object.freeze((o.esler || []).map(e => canonicalAnswer(e, lang)).filter(Boolean)),
    display: o.gosterim ? String(o.gosterim).normalize('NFC') : word,
    daily: o.gunluk !== false,
  });
}

const cache = new Map();

function deckEntry(id) {
  return DESTELER.find(d => d.id === id) || null;
}

// Deste bilgisi (sözcükler olmadan): { id, code, lang, paid, name, description, size, productId }.
function deckInfo(d) {
  return Object.freeze({
    id: d.id,
    code: d.kod,
    lang: d.dil,
    paid: d.ucretli === true,
    name: d.ad,
    description: d.tanim,
    size: d.sozcukler.length,
    productId: d.ucretli ? `${BUNDLE_ID}.deste.${d.id}` : null,
  });
}

export function deckList(lang = null) {
  return DESTELER.filter(d => !lang || d.dil === lang).map(deckInfo);
}

export function deckById(id) {
  const d = deckEntry(id);
  return d ? deckInfo(d) : null;
}

// Yükteki deste kodundan deste; bilinmeyen kod (daha yeni bir deste) için null. Alıcı yolu bunu yalnız
// destenin adını göstermek için kullanır; hak okumaz.
export function deckByCode(code) {
  const d = DESTELER.find(x => x.kod === code);
  return d ? deckInfo(d) : null;
}

export function deckRecords(id) {
  if (cache.has(id)) return cache.get(id);
  const d = deckEntry(id);
  if (!d) return null;
  const records = Object.freeze(d.sozcukler.map(e => normalizeRecord(e, d.dil)));
  cache.set(id, records);
  return records;
}

export function findRecord(id, word) {
  const recs = deckRecords(id);
  if (!recs) return null;
  const w = canonicalAnswer(word, deckEntry(id).dil);
  return recs.find(r => r.word === w) || null;
}

// Bir dilin bütün destelerinde cevabın kaydı (cevap her dilde tekildir: deste.test.js). Bilinmeyen sözcük (ör. daha
// yeni bir destenin sözcüğü) için null. Alıcı yolu bunu eş adlar ve gösterim biçimi için kullanır; hak okumaz.
const byWord = new Map();
export function recordByWord(word, lang) {
  if (!isLang(lang)) return null;
  if (!byWord.has(lang)) {
    const m = new Map();
    for (const d of DESTELER) if (d.dil === lang) for (const r of deckRecords(d.id)) if (!m.has(r.word)) m.set(r.word, r);
    byWord.set(lang, m);
  }
  return byWord.get(lang).get(canonicalAnswer(word, lang)) || null;
}

// Sonuç ekranında gösterilecek cevap: kaydın `gosterim` biçimi ("hakim" → "hâkim"); kayıt yoksa cevabın kendisi.
export function displayWord(word, lang) {
  const r = recordByWord(word, lang);
  return r ? r.display : String(word ?? '');
}

// ---------------------------------------------------------------------------
// Dağıtım

// "Son 100" listesine sözcük ekler (en yeni sonda). Yeni dizi döndürür.
export function rememberWord(recent, word, limit = RECENT_LIMIT) {
  const list = (recent || []).filter(w => w !== word);
  list.push(word);
  return list.slice(Math.max(0, list.length - limit));
}

// Desteden 3 farklı sözcük dağıtır. Son 100'de olanlar ve `exclude` (ekranda duranlar, "Başka üç sözcük")
// dağıtılmaz; havuz yetmezse son listenin en eskilerinden tamamlanır. Mümkünse üç farklı zorluk gelir.
export function dealWords(records, { recent = [], exclude = [], rng, size = DEAL_SIZE } = {}) {
  if (typeof rng !== 'function') throw new Error('rng gerekli');
  const skip = new Set(exclude);
  const recentSet = new Set(recent);
  const fresh = shuffled(records.filter(r => !skip.has(r.word) && !recentSet.has(r.word)), rng);
  const picked = [];
  // Önce taze sözcüklerden, mümkünse üç farklı zorluk.
  for (const level of shuffled([1, 2, 3], rng)) {
    if (picked.length >= size) break;
    const r = fresh.find(x => x.difficulty === level && !picked.includes(x));
    if (r) picked.push(r);
  }
  for (const r of fresh) {
    if (picked.length >= size) break;
    if (!picked.includes(r)) picked.push(r);
  }
  // Taze sözcük yetmezse son listenin en eskilerinden.
  for (const w of recent) {
    if (picked.length >= size) break;
    if (skip.has(w)) continue;
    const r = records.find(x => x.word === w);
    if (r && !picked.includes(r)) picked.push(r);
  }
  return picked.sort((a, b) => a.difficulty - b.difficulty || (a.word < b.word ? -1 : 1));
}

// İlk turun yasak harfi: kaydın önerdiği harflerden ya da gizli sözcükte geçen sık harflerden biri;
// ikisi de yoksa sık harflerden biri.
export function dealLetter(record, lang, rng) {
  if (typeof rng !== 'function') throw new Error('rng gerekli');
  const word = typeof record === 'string' ? canonicalAnswer(record, lang) : record.word;
  const suggested = typeof record === 'string' ? [] : record.letters;
  const frequent = frequentLetters(lang);
  const inWord = frequent.filter(l => word.includes(l));
  const pool = suggested.length ? suggested : inWord.length ? inWord : frequent;
  return pool[randInt(rng, pool.length)];
}

// Rövanşta rakibe yasaklanabilecek harfler (sıklık sırasıyla; arayüz ilk 10'u öne çıkarır).
export function rematchLetterChoices(lang) {
  return LETTERS_BY_FREQUENCY[lang].filter(l => alphabet(lang).includes(l));
}

// ---------------------------------------------------------------------------
// Çözme arşivi (ekibin anlatımları; ücretsiz). Numara kalıcıdır: çözülenler cihazda numarayla işaretlenir.

// { no, lang, deckId, deckCode, word, letter, description, difficulty }; dil verilirse yalnız o dil.
export function archiveEntries(lang = null) {
  return COZME_ARSIVI.filter(a => !lang || a.dil === lang).map(a => Object.freeze({
    no: a.no,
    lang: a.dil,
    deckId: a.deste,
    deckCode: deckEntry(a.deste).kod,
    word: canonicalAnswer(a.soz, a.dil),
    letter: normalizeLetter(a.harf, a.dil),
    description: a.anlatim,
    difficulty: a.zorluk,
  }));
}

export function archiveEntry(no) {
  return archiveEntries().find(a => a.no === no) || null;
}

// İlk ekran ve öğretici örnekleri (içerikteki ILK_EKRAN sırasıyla; ilki ana ekranın örneği). Kayıt archiveEntries
// biçimindedir; arayüz içerik dosyasını doğrudan okumaz. Bilinmeyen dil için boş dizi.
export function firstScreenExamples(lang) {
  if (!isLang(lang) || !Object.hasOwn(ILK_EKRAN, lang)) return [];
  const all = archiveEntries(lang);
  return ILK_EKRAN[lang].map(no => all.find(a => a.no === no)).filter(Boolean);
}
