// Anlatım denetimi: kurucu yazarken canlı, bağlantı açılırken güvenlik denetimi.
// Kurallar: docs/kurallar.md. Saf modüldür; sunucuya kopyalanabilir (Faz B: kurma-kaydet aynı denetimi çalıştırır).

import {
  normalizeText, toLower, toUpper, classifyChars, tokenize, countWords, skeleton, letterSkeleton,
  containsLetter, normalizeLetter, reverseString, foldTurkish, isLang,
} from './turkce.js';
import { stemVariants, isSuffixChain, isVerbTail, stretchRemainders, startsWithVowel, canonicalAnswer } from './ekler.js';
import { SUZGEC } from './icerik/suzgec.js';

export const MAX_WORDS = 8;
export const MAX_CHARS = 90;
export const MAX_ANSWER_CHARS = 24;
export const MAX_ANSWER_WORDS = 3;
// Bu uzunluktan (harf) itibaren kök "uzun" sayılır: katı önek ve bitişik yazım kuralı uygulanır.
export const LONG_STEM = 4;
// Öteki dildeki karşılığın engellenmesi için en az uzunluk: Türkçe bulmacada İngilizce karşılık 3 harften
// ("cat"), İngilizce bulmacada Türkçe karşılık 4 harften itibaren ("at", "top", "mum" İngilizcede olağan sözcük).
export const MIN_TRANSLATION = Object.freeze({ en: 3, tr: 4 });
// Harf harf ya da bölünmüş yazım için en çok kaç ardışık sözcük birleştirilir.
const MAX_WINDOW = 12;

export const ISSUE = Object.freeze({
  EMPTY: 'empty',
  TOO_MANY_WORDS: 'too-many-words',
  TOO_LONG: 'too-long',
  DIGIT: 'digit',
  EMOJI: 'emoji',
  HOMOGLYPH: 'homoglyph',
  FOREIGN: 'foreign',
  INVISIBLE: 'invisible',
  SYMBOL: 'symbol',
  LETTER: 'letter',
  AMBIGUOUS_I: 'ambiguous-i',
  ANSWER: 'answer',
  FILTER: 'filter',
});

const CHAR_ISSUE = { digit: ISSUE.DIGIT, emoji: ISSUE.EMOJI, homoglyph: ISSUE.HOMOGLYPH, foreign: ISSUE.FOREIGN, invisible: ISSUE.INVISIBLE, symbol: ISSUE.SYMBOL };

// ---------------------------------------------------------------------------
// Süzgeç

// Süzgeç kipleri (docs/icerik-bicimi.md §5): kok · tam · cekim (kendisi ve çekimleri) · fiil (fiil kökü ve bütün
// çekimleri) · icerir.
export const FILTER_MODES = Object.freeze(['kok', 'tam', 'cekim', 'fiil', 'icerir']);

// İçerik listesini karşılaştırma biçimine derler. allowed: girdinin `serbest` sözcükleri (kendileri ve çekimleri o
// girdiye takılmaz: "bok" girdisinde "boks" → "boksa", "boksu").
export function compileFilter(entries) {
  return entries.map(e => {
    const fold = e.katla !== false;
    const key = w => {
      const x = toLower(String(w).normalize('NFC'), 'tr');
      return fold ? foldTurkish(x) : x;
    };
    const s = toLower(String(e.s).normalize('NFC'), 'tr');
    return {
      s,
      mode: FILTER_MODES.includes(e.kip) ? e.kip : 'kok',
      fold,
      lang: e.dil === 'en' ? 'en' : 'tr',
      scope: e.uygula === 'tr' || e.uygula === 'en' ? e.uygula : '*',
      form: key(s),
      allowed: (e.serbest || []).map(key).filter(Boolean),
    };
  });
}

let defaultFilter = null;
export function getDefaultFilter() {
  if (!defaultFilter) defaultFilter = compileFilter(SUZGEC);
  return defaultFilter;
}

// ---------------------------------------------------------------------------
// Eşleşme kuralları

// Bir kökün nasıl aranacağı (docs/kurallar.md §4–§5, §12). Alanlar:
// form · lang · folded (katlanmış iskelette mi) · long (kaynak parça en az LONG_STEM harf) · needsVowel (ardından
// ünlüyle başlayan ek gelmeli) · selfOk (ek almadan sözcük sayılır) · vowelGate (sözcük başında da ünlü kapısı)
// · strict (uzun kökte katı önek) · insideMin (sözcüğün içinde aranırsa önündeki parçanın en az uzunluğu; 0 aranmaz)
// · insideVowel (önündeki parça ünlü içermeli) · reversed (tersten) · boundary (pencerede kök sözcük sınırında biter)
// · gram (kalan parçanın ek dilbilgisi).
function profileOf({ form, lang, folded, long, needsVowel = false, bound = needsVowel, change = 'none', translation = false }) {
  const drop = change === 'drop';
  const enStem = lang === 'en' && change === 'stem';
  const free = !translation && !drop && !enStem;
  // Fiil kökü bitişik birleşik ad kurmaz; sözcüğün içinde aranmaz ("ısın-" → "kapısında" değil).
  const inside = long && free && change !== 'verb' && !(lang === 'en' && /ing$/.test(form));
  return {
    form, lang, folded, long, needsVowel,
    selfOk: !bound,
    vowelGate: needsVowel && (!long || !free),
    strict: long && free,
    insideMin: inside ? (lang === 'en' ? 3 : 2) : 0,
    insideVowel: true,
    reversed: !translation && !bound,
    boundary: translation || drop,
    gram: {
      lang, folded,
      grammar: translation ? 'inflect' : long ? 'full' : 'short-desc',
      after: lang === 'tr' && bound ? (drop ? 'drop' : change === 'verb' ? 'verb' : 'change') : null,
    },
  };
}

// Uzun kökte "tek harf + ek" istisnası (§4.3): Türkçede bütün ek dilbilgisi ("elmas" + lar); İngilizcede yalnız sık çekim
// sonları ("started", "lightning", "beards" serbest; "firefly", "starfish" fire + f + ly, star + f + ish değil).
// Türkçede iki durum istisna değildir, eylem ekidir: -mA ile biten kökte kalan "k…" (mastar: "dondurma" → "dondurmak",
// "ısınmaktan") ve kalan parçanın bütünüyle bir eylem eki zinciri olması ("unut" → "unutan", "dondur" → "dondurucu";
// yoksa "unut + a + n" diye okunup serbest kalırdı). Ses olayına uğramış ad kökünde eylem eki aranmaz ("kurt" → "kurd"
// + an "kürdan", "kart" → "kardan" rastlantıdır).
const EN_ONE_LETTER_TAILS = new Set(['s', 'es', 'ed', 'ing', 'er', 'ers', 'est', 'y', 'ies', 'ied', 'ier', 'iest']);
const oneLetterException = (r, p) => {
  if (p.lang === 'tr' && r[0] === 'k' && /m[ae]$/.test(p.form)) return false;
  if (p.lang === 'tr' && p.gram.after !== 'change' && p.gram.after !== 'drop' && r.length >= 2 && /^[aeıioöuü]/.test(r) &&
    isVerbTail(r, { folded: p.folded })) return false;
  // Ayrılan harften sonrası ad ekleriyle okunur (fiil kökünde de: "unut" + k + an "unutkan" yakalanır).
  const tail = p.gram.after === 'verb' ? { ...p.gram, after: null } : p.gram;
  return r.length === 1 || (p.lang === 'en' ? EN_ONE_LETTER_TAILS.has(r.slice(1)) : isSuffixChain(r.slice(1), tail));
};

// Gizli sözcüğün kök değişkeni için arama biçimi. Uzun kökler katlanmış iskelette (kedı = kedi, kopek = köpek), kısa
// kökler Türkçe harfleri korunarak karşılaştırılır ("un" kökü "ünlü"yü yakalamaz).
function variantProfile(v) {
  const long = v.base >= LONG_STEM;
  const folded = v.lang === 'en' || long;
  const p = profileOf({
    form: folded ? v.folded : v.form, lang: v.lang, folded, long, needsVowel: v.needsVowel, bound: v.bound,
    change: v.change, translation: v.origin === 'translation',
  });
  // Kısa parçanın iyeliksiz kökü ("deniz kızı" → kız) tahmini bir köktür; tersten aranmaz ("yavru kedi" → ked ≠ "tek").
  return v.change === 'compound' && !long ? { ...p, reversed: false } : p;
}

// Süzgeç girdisinin arama biçimleri (kok, cekim ve fiil kiplerinde).
// kok: sözcük içinde her yerde (tek harf önekle saklama da yakalanır), uzun kökte katı önek; 4 harf ve uzun Türkçe
// girdide ünsüz yumuşaması da ("salak" → "salağı", "pezevenk" → "pezevengi").
// cekim: yalnız kendisi ve çekim ekleri (Türkçede çoğul, iyelik, durum, ek eylem; İngilizcede -s, -es, -ies).
// fiil: Türkçe fiil kökü; eylem çekimleri (sikti, sikmek, sikiyor, siksin) ve adın çekimleri (sikim).
const FILTER_SOFTEN = { p: 'b', ç: 'c', t: 'd', k: 'ğ' };
const filterProfileCache = new WeakMap();
function filterProfiles(e) {
  if (filterProfileCache.has(e)) return filterProfileCache.get(e);
  const fold = s => (e.fold ? foldTurkish(s) : s);
  const soft = [];
  if (e.lang === 'tr' && e.form.length >= LONG_STEM) {
    const raw = e.s;
    const last = raw[raw.length - 1];
    if (FILTER_SOFTEN[last]) soft.push(fold(raw.slice(0, -1) + FILTER_SOFTEN[last]));
    if (last === 'k' && raw[raw.length - 2] === 'n') soft.push(fold(raw.slice(0, -1) + 'g'));
  }
  const exact = (form, gram, extra = {}) => ({
    form, lang: e.lang, folded: e.fold, long: false, needsVowel: false, selfOk: true, vowelGate: false, strict: false,
    insideMin: 0, insideVowel: false, reversed: false, boundary: false, gram: { lang: e.lang, folded: e.fold, ...gram }, ...extra,
  });
  const bound = { needsVowel: true, selfOk: false, vowelGate: true };
  const list = [];
  if (e.mode === 'kok') {
    const long = e.form.length >= LONG_STEM;
    const base = { form: e.form, lang: e.lang, folded: e.fold, long };
    list.push({ ...profileOf(base), insideMin: long ? 1 : 0, insideVowel: false, reversed: false });
    for (const f of soft) {
      if (f !== e.form) list.push({ ...profileOf({ ...base, form: f, needsVowel: true, change: 'soft' }), insideMin: long ? 1 : 0, insideVowel: false, reversed: false });
    }
  } else if (e.mode === 'cekim') {
    list.push(exact(e.form, { grammar: 'inflect' }));
    for (const f of soft) if (f !== e.form) list.push(exact(f, { grammar: 'inflect', after: 'change' }, bound));
    if (e.lang === 'en' && /[^aeiou]y$/.test(e.form)) list.push(exact(e.form.slice(0, -1) + 'i', { grammar: 'inflect' }, bound));
  } else if (e.mode === 'fiil') {
    list.push(exact(e.form, { grammar: 'verb' }));
    list.push(exact(e.form, { grammar: 'inflect' }));
  }
  filterProfileCache.set(e, list);
  return list;
}

// Girdinin `serbest` sözcüğü ya da onun çekimi mi?
function filterAllowed(word, e) {
  return e.allowed.some(a => word === a ||
    (word.startsWith(a) && isSuffixChain(word.slice(a.length), { lang: e.lang, grammar: 'inflect', folded: e.fold })));
}

const hasVowel = s => /[aeıioöuüy]/.test(s);

// Sözcük, kökle (ya da süzgeç girdisiyle) nasıl eşleşiyor?
// 'self' kendisi · 'inflected' ekli · 'derived' türemiş/uzatılmış · 'compound' bitişik · 'reversed' ters · null eşleşmez
// vowelPair: tek ünlünün iki katı uzatma sayılır mı (stretchRemainders).
function stemHit(word, p, vowelPair) {
  if (!word || !p.form) return null;
  for (const r of stretchRemainders(word, p.form, { vowelPair })) {
    if (p.vowelGate && !startsWithVowel(r, p.lang)) continue;
    if (r === '') {
      if (p.selfOk) return 'self';
      if (p.strict) return 'derived'; // yumuşamış uzun kök tek başına: "kitab"
      continue;
    }
    if (isSuffixChain(r, p.gram)) return 'inflected';
    // Uzun kökte: tek harflik ayrılık ("masal", "elmas") ve tek harf + ek ("elmaslar") serbest; öteki her uzantı yakalanır.
    if (p.strict && !oneLetterException(r, p)) return 'derived';
  }
  // Bitişik yazılmış birleşik sözcük: kök sözcüğün içinde, önünde ünlülü ve yeterince uzun bir parça varken
  // ("minikkedi", "Akdeniz"; "koyun" ⊃ oyun, "making" ⊃ king rastlantıdır).
  if (p.insideMin) {
    for (let i = p.insideMin; i < word.length; i++) {
      if (word[i] !== p.form[0] || (p.insideVowel && !hasVowel(word.slice(0, i)))) continue;
      for (const r of stretchRemainders(word.slice(i), p.form, { vowelPair })) {
        if (p.needsVowel && !startsWithVowel(r, p.lang)) continue;
        if (r === '' || isSuffixChain(r, p.gram)) return 'compound';
      }
    }
  }
  if (p.reversed && p.form.length >= 3 && reverseString(word) === p.form) return 'reversed';
  return null;
}

// Birleştirilmiş sözcükler (harf harf ya da bölünmüş yazım) kökle eşleşiyor mu? ends: birleşimde sözcük sonlarının
// konumları; karşılık ve düşmüş kök yalnız bir sözcüğün sonunda biterse sayılır ("c a t s" evet, "bu ses" → bus + es hayır).
function joinedHit(joined, ends, p, vowelPair) {
  for (const r of stretchRemainders(joined, p.form, { vowelPair })) {
    if (p.needsVowel && !startsWithVowel(r, p.lang)) continue;
    if (p.boundary && !ends.includes(joined.length - r.length)) continue;
    if ((r === '' && p.selfOk) || isSuffixChain(r, p.gram)) return 'split';
  }
  if (p.reversed && p.form.length >= 3 && reverseString(joined) === p.form) return 'reversed';
  return null;
}

// Tek ünlünün iki katı uzatmadır ("saalak", "fuuck"); ama "oo" ya da "ee" içeren sözcük İngilizce yazımlıdır ve onda
// çift ünlü ayrı bir sestir ("book" ≠ "bok", "shoot" ≠ "shoe").
const vowelPairFor = forms => !forms.eng;

function filterHitWord(forms, e) {
  const word = e.fold ? forms.folded : forms.plain;
  if (!word || filterAllowed(word, e)) return false;
  const vowelPair = vowelPairFor(forms);
  if (e.mode === 'tam') return stretchRemainders(word, e.form, { vowelPair }).includes('');
  if (e.mode === 'icerir') {
    for (let i = 0; i < word.length; i++) if (word[i] === e.form[0] && stretchRemainders(word.slice(i), e.form, { vowelPair }).length) return true;
    return false;
  }
  return filterProfiles(e).some(p => stemHit(word, p, vowelPair) !== null);
}

function filterHitJoined(joinedForms, e) {
  const word = e.fold ? joinedForms.folded : joinedForms.plain;
  if (filterAllowed(word, e)) return false;
  const vowelPair = vowelPairFor(joinedForms);
  if (e.mode === 'tam') return stretchRemainders(word, e.form, { vowelPair }).includes('');
  if (e.mode === 'icerir') return stretchRemainders(word, e.form, { vowelPair }).length > 0;
  return filterProfiles(e).some(p => stretchRemainders(word, p.form, { vowelPair }).some(r => (r === '' ? p.selfOk
    : (!p.needsVowel || startsWithVowel(r, p.lang)) && isSuffixChain(r, p.gram))));
}

// Bir sözcüğün karşılaştırma biçimleri. eng: İngilizce yazımlı (oo, ee); çift ünlüsü uzatma sayılmaz.
function wordForms(text) {
  const plain = letterSkeleton(text, 'tr');
  return { folded: skeleton(text), plain, eng: /oo|ee/.test(plain) };
}

// ---------------------------------------------------------------------------
// Biçim

// Kanonik anlatım: boşluklar teke iner, baştaki ve sondaki boşluk atılır; her sözcüğün ilk harfinin
// büyüklüğü korunur, geri kalanı küçük harfe iner ("İSTANBUL'da" → "İstanbul'da"). Yükte bu biçim taşınır.
export function canonicalDescription(raw, lang = 'tr') {
  const text = normalizeText(raw).replace(/ +/g, ' ').trim();
  const tokens = tokenize(text);
  const lower = toLower(text, lang);
  if (lower.length !== text.length) return lower;
  let out = '';
  let pos = 0;
  for (const t of tokens) {
    out += lower.slice(pos, t.start);
    const first = Array.from(t.text)[0];
    const rest = lower.slice(t.start + first.length, t.end);
    const isUpper = first !== toLower(first, lang) && /\p{Lu}/u.test(first);
    out += (isUpper ? toUpper(toLower(first, lang), lang) : toLower(first, lang)) + rest;
    pos = t.end;
  }
  return out + lower.slice(pos);
}

// ---------------------------------------------------------------------------
// Denetim

function charIssues(text) {
  const groups = new Map();
  for (const c of classifyChars(text)) {
    const type = CHAR_ISSUE[c.cls];
    if (!type) continue;
    if (!groups.has(type)) groups.set(type, new Set());
    groups.get(type).add(c.ch);
  }
  return [...groups].map(([type, set]) => ({ type, chars: [...set] }));
}

function baseCheck(raw, { lang, letter, filter, maxWords, maxChars }) {
  if (!isLang(lang)) throw new Error('geçersiz dil: ' + lang);
  const normalized = normalizeText(raw);
  const text = canonicalDescription(raw, lang);
  const tokens = tokenize(normalized).map(t => ({ ...t, issues: [] }));
  const forms = tokens.map(t => wordForms(t.text));
  const issues = [];
  const words = countWords(tokens);
  const flag = (i, type, extra = {}) => {
    if (!tokens[i].issues.includes(type)) tokens[i].issues.push(type);
    issues.push({ type, token: i, text: tokens[i].text, ...extra });
  };

  issues.push(...charIssues(normalized));

  const forbidden = normalizeLetter(letter, lang);
  if (forbidden === null) throw new Error('geçersiz yasak harf: ' + letter);
  tokens.forEach((t, i) => {
    if (containsLetter(t.text, forbidden, lang)) flag(i, ISSUE.LETTER);
    // Türkçe kipte İ yasakken büyük "I" belirsizdir: Türkçe klavyede ı, ötekilerde i demektir.
    if (lang === 'tr' && forbidden === 'i' && t.text.includes('I')) flag(i, ISSUE.AMBIGUOUS_I);
  });

  // Süzgeç: tek sözcük ve ardışık sözcük birleşimleri ("s a l a k", "sa lak").
  const entries = (filter || getDefaultFilter()).filter(e => e.scope === '*' || e.scope === lang);
  tokens.forEach((t, i) => {
    if (entries.some(e => filterHitWord(forms[i], e))) flag(i, ISSUE.FILTER);
  });
  scanWindows(forms, (a, b, joined, hasShort) => {
    if (tokens[a].issues.includes(ISSUE.FILTER)) return true; // ilk sözcük zaten yakalandı; birleşim yeni bilgi vermez
    for (const e of entries) {
      if (!(hasShort || e.form.length >= 5)) continue;
      if (filterHitJoined(joined, e)) {
        for (let i = a; i <= b; i++) if (!tokens[i].issues.includes(ISSUE.FILTER)) tokens[i].issues.push(ISSUE.FILTER);
        issues.push({ type: ISSUE.FILTER, token: a, text: tokens.slice(a, b + 1).map(t => t.text).join(' '), joined: true });
        return true;
      }
    }
    return false;
  });

  if (words === 0) issues.push({ type: ISSUE.EMPTY });
  if (words > maxWords) issues.push({ type: ISSUE.TOO_MANY_WORDS, count: words, max: maxWords });
  if (Array.from(text).length > maxChars) issues.push({ type: ISSUE.TOO_LONG, count: Array.from(text).length, max: maxChars });

  return { normalized, text, tokens, forms, issues, words, flag };
}

// Ardışık sözcük pencerelerini gezer; cb true dönerse o başlangıçtaki daha uzun pencereler atlanır.
// Birleşim: { folded, plain, ends: { folded, plain } (sözcük sonlarının konumları), eng }.
function scanWindows(forms, cb) {
  for (let a = 0; a < forms.length; a++) {
    let folded = forms[a].folded;
    let plain = forms[a].plain;
    let eng = forms[a].eng;
    const ends = { folded: [folded.length], plain: [plain.length] };
    let hasShort = folded.length <= 2;
    for (let b = a + 1; b < forms.length && b - a < MAX_WINDOW; b++) {
      folded += forms[b].folded;
      plain += forms[b].plain;
      ends.folded.push(folded.length);
      ends.plain.push(plain.length);
      eng = eng || forms[b].eng;
      if (forms[b].folded.length <= 2) hasShort = true;
      if (cb(a, b, { folded, plain, ends, eng }, hasShort)) break;
    }
  }
}

// Kurucu ekranının denetimi.
// opts: { lang, letter, answer, extra?: [kök], allowed?: [serbest sözcük], translation?, filter?, maxWords?, maxChars? }
// Dönen: { ok, text (yüke giden kanonik anlatım), words, tokens[{text,start,end,issues}], issues[], normalized }
// tokens[].start/end, `normalized` (normalizeText(raw)) içindeki konumlardır.
export function checkDescription(raw, opts) {
  const { lang = 'tr', letter, answer, extra = [], allowed = [], translation = null } = opts;
  const maxWords = opts.maxWords ?? MAX_WORDS;
  const maxChars = opts.maxChars ?? MAX_CHARS;
  const base = baseCheck(raw, { lang, letter, filter: opts.filter, maxWords, maxChars });
  const { tokens, forms, issues, flag } = base;

  if (answer) {
    const variants = stemVariants(answer, lang, { extra, translation })
      .filter(v => v.kind !== 'translation' || v.folded.length >= MIN_TRANSLATION[v.lang])
      .map(v => ({ v, p: variantProfile(v) }));
    const allowedList = [...new Set(allowed.map(a => skeleton(a)).filter(Boolean))];
    // Serbest sözcük çekimli hâlleriyle serbesttir ("kalem" → "kalemler", "kalemi"); yapım ekiyle türeyenler değil.
    const isAllowed = word => allowedList.some(a => word === a ||
      (word.startsWith(a) && isSuffixChain(word.slice(a.length), { lang, grammar: 'inflect', folded: true })));
    tokens.forEach((t, i) => {
      if (isAllowed(forms[i].folded)) return;
      for (const { v, p } of variants) {
        const word = p.folded ? forms[i].folded : forms[i].plain;
        const kind = stemHit(word, p, vowelPairFor(forms[i]));
        if (kind) { flag(i, ISSUE.ANSWER, { kind, source: v.kind }); break; }
      }
    });
    scanWindows(forms, (a, b, joined, hasShort) => {
      if (tokens[a].issues.includes(ISSUE.ANSWER)) return true;
      for (const { v, p } of variants) {
        if (!(hasShort || p.form.length >= 5)) continue;
        const f = p.folded ? 'folded' : 'plain';
        const kind = joinedHit(joined[f], joined.ends[f], p, vowelPairFor(joined));
        if (kind) {
          for (let i = a; i <= b; i++) if (!tokens[i].issues.includes(ISSUE.ANSWER)) tokens[i].issues.push(ISSUE.ANSWER);
          issues.push({ type: ISSUE.ANSWER, token: a, text: tokens.slice(a, b + 1).map(t => t.text).join(' '), kind, source: v.kind, joined: true });
          return true;
        }
      }
      return false;
    });
  }

  return {
    ok: issues.length === 0,
    text: base.text,
    words: base.words,
    tokens: tokens.map(({ text, start, end, issues: is }) => ({ text, start, end, issues: is })),
    issues,
    normalized: base.normalized,
  };
}

// Bağlantı açılırken (alıcı cihazında) güvenlik denetimi: karakter, uzunluk, süzgeç ve yasak harf.
// Kök denetimi burada yapılmaz: ek tabloları sürümle değişebilir ve eski bağlantılar kırılmamalıdır.
export function safetyCheck(raw, { lang = 'tr', letter, filter } = {}) {
  const base = baseCheck(raw, { lang, letter, filter, maxWords: MAX_WORDS, maxChars: MAX_CHARS });
  return { ok: base.issues.length === 0, text: base.text, words: base.words, issues: base.issues };
}

// Gizli sözcüğün kendisi güvenli mi? (açılışta; sonuç ekranında gösterilecek)
export function answerSafe(answer, { lang = 'tr', filter } = {}) {
  if (typeof answer !== 'string') return false;
  const canon = canonicalAnswer(answer, lang);
  if (!canon || canon !== answer) return false;
  const parts = canon.split(' ');
  if (parts.length > MAX_ANSWER_WORDS || canon.length > MAX_ANSWER_CHARS) return false;
  if (parts.some(p => p.length === 0)) return false;
  const entries = (filter || getDefaultFilter()).filter(e => e.scope === '*' || e.scope === lang);
  const forms = parts.map(wordForms);
  if (forms.some(f => entries.some(e => filterHitWord(f, e)))) return false;
  const joined = { folded: forms.map(f => f.folded).join(''), plain: forms.map(f => f.plain).join('') };
  if (parts.length > 1 && entries.some(e => filterHitJoined(joined, e))) return false;
  return true;
}
