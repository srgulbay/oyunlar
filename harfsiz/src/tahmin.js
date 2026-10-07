// Tahmin değerlendirme ve tur durumu (alıcı yolu). Kurallar: docs/kurallar.md §8.
// Alıcı yolu hak (satın alma) okumaz: bu modül haklar.js'i içe aktarmaz (testli).
// Saf modüldür; sunucuya kopyalanabilir (Faz B: kurma-tahmin tahmini sunucuda denetler).

import { normalizeText, classifyChars, isAsciiOnly, foldTurkish } from './turkce.js';
import { stemVariants, isSuffixChain, canonicalAnswer, startsWithVowel } from './ekler.js';
import { deckList, deckRecords, recordByWord } from './deste.js';
import { SOZLUK, SOZLUK_AYRI } from './icerik/sozluk.js';

export const MAX_ATTEMPTS = 3;
export const MAX_GUESS_CHARS = 40;
// Yazım hatası payı bu uzunluktan (harf) itibaren uygulanır.
export const TYPO_MIN_LENGTH = 5;
// Bu uzunluğa kadar (harf) kök "kısa" sayılır: yalnız çoğul ve 3. kişi iyelik kabul edilir.
export const SHORT_ROOT_MAX = 3;

export const VERDICT = Object.freeze({
  EXACT: 'exact', // tam
  INFLECTED: 'inflected', // ekli biçim
  ASCII: 'ascii', // Türkçe karaktersiz yazım (kopek → köpek)
  TYPO: 'typo', // tek harf yazım hatası
  ALTERNATE: 'alternate', // kaydın eş adı (havaalanı → havalimanı), kendisi ya da ekli/karaktersiz/tek harf hatalı hâli
  WRONG: 'wrong',
  EMPTY: 'empty', // hak harcanmaz
  INVALID: 'invalid', // rakam, emoji, simge ya da çok uzun; hak harcanmaz
});

const CORRECT = new Set([VERDICT.EXACT, VERDICT.INFLECTED, VERDICT.ASCII, VERDICT.TYPO, VERDICT.ALTERNATE]);
export const isCorrect = verdict => CORRECT.has(verdict);

// Çok sözcüklü tahminin başındaki tanımlık atılır ("bir kedi", "the moon").
const ARTICLES = { tr: new Set(['bir']), en: new Set(['a', 'an', 'the']) };

// Optimal hizalama uzaklığı (Damerau): ekleme, silme, değiştirme ve yan yana iki harfin yer değişmesi 1 sayılır.
export function editDistance(a, b) {
  const A = Array.from(a);
  const B = Array.from(b);
  const d = Array.from({ length: A.length + 1 }, (_, i) => {
    const row = new Array(B.length + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= B.length; j++) d[0][j] = j;
  for (let i = 1; i <= A.length; i++) {
    for (let j = 1; j <= B.length; j++) {
      const cost = A[i - 1] === B[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && A[i - 1] === B[j - 2] && A[i - 2] === B[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[A.length][B.length];
}

// Tahminin karşılaştırma anahtarı (yinelenen tahmini tanımak için): katlanmış, yalnız harf.
export function guessKey(guess, lang = 'tr') {
  return foldTurkish(canonicalAnswer(normalizeText(guess), lang)).replace(/ /g, '');
}

// Bir dilin bilinen sözcükleri (bitişik, kanonik; katlanmış kopyalarıyla): deste cevapları ve eş adları, çok sözcüklü
// cevapların parçaları ("kumdan", "tavus"), sözlük (icerik/sozluk.js) ve "çekim gibi okunan ama başka sözcük" listesi.
const lexicons = new Map();
function lexicon(lang) {
  if (lexicons.has(lang)) return lexicons.get(lang);
  const key = w => canonicalAnswer(w, lang).replace(/ /g, '');
  const pair = words => {
    const plain = new Set(words.map(key).filter(Boolean));
    return { plain, folded: new Set([...plain].map(foldTurkish)) };
  };
  const deck = [];
  const parts = [];
  for (const d of deckList(lang)) {
    for (const r of deckRecords(d.id)) {
      for (const w of [r.word, ...r.alternates]) {
        deck.push(w);
        if (w.includes(' ')) parts.push(...w.split(' ').filter(p => p.length >= 3));
      }
    }
  }
  const lex = { deck: pair(deck), parts: pair(parts), dict: pair(SOZLUK[lang] || []), apart: pair(SOZLUK_AYRI[lang] || []) };
  lexicons.set(lang, lex);
  return lex;
}

// Tahmin cevabın (ya da eş adın) ekli biçimi mi? Yalnız cevabın bütününden türeyen değişkenler: çok sözcüklü cevabın
// parçası ("kutuya" ← posta kutusu), ek kök ve öteki dildeki karşılık doğru sayılmaz. Ünlü uyumu ve kaynaştırma sıkıdır.
function inflectedOf(word, answer, lang, folded) {
  const grammar = Array.from(canonicalAnswer(answer, lang).replace(/ /g, '')).length <= SHORT_ROOT_MAX ? 'short' : 'inflect';
  for (const v of stemVariants(answer, lang)) {
    if (v.origin !== 'whole') continue;
    const form = folded ? v.folded : v.form;
    if (!word.startsWith(form)) continue;
    const rem = word.slice(form.length);
    if (rem === '') {
      if (v.kind === 'irregular' && !v.needsVowel) return true;
      continue;
    }
    if (v.needsVowel && !startsWithVowel(rem, v.lang)) continue;
    const after = v.lang === 'tr' && v.bound ? (v.change === 'drop' ? 'drop' : 'change') : null;
    if (isSuffixChain(rem, { lang: v.lang, grammar, folded, after, stem: v.form })) return true;
  }
  return false;
}

// Tahmini değerlendirir. opts: { answer, lang, alternates? }. alternates verilmezse cevabın kaydındaki eş adlar
// (`esler`) kullanılır (deste.js → recordByWord).
// Dönen: { verdict, guess (gösterim için kırpılmış metin), alternate? (eş adla bilindiyse eş ad) }
// Tahmin bilinen başka bir sözcükse (başka bir deste cevabı ya da eş adı, çok sözcüklü cevabın parçası, sözlük sözcüğü)
// yazım hatası payı uygulanmaz ("horse" ≠ "house", "havuz" ≠ "havuç", "saati" ≠ "saatçi"); başka bir deste sözcüğüyse
// ya da SOZLUK_AYRI'daysa ek çözümü de uygulanmaz ("kalem" ≠ kale + m, "baloncuk" ≠ balon + cuk, "altında" ≠ altın + da).
export function judgeGuess(guess, { answer, lang = 'tr', alternates = null }) {
  const shown = normalizeText(guess).replace(/ +/g, ' ').trim();
  if (!shown || !/\p{L}/u.test(shown)) {
    return { verdict: shown ? VERDICT.INVALID : VERDICT.EMPTY, guess: shown };
  }
  if (Array.from(shown).length > MAX_GUESS_CHARS ||
    classifyChars(shown).some(c => c.cls !== 'letter' && c.cls !== 'space' && c.cls !== 'punct')) {
    return { verdict: VERDICT.INVALID, guess: shown };
  }
  let words = canonicalAnswer(shown, lang).split(' ').filter(Boolean);
  if (words.length > 1 && ARTICLES[lang].has(words[0])) words = words.slice(1);
  const g = words.join('');
  if (!g) return { verdict: VERDICT.EMPTY, guess: shown };

  const ans = canonicalAnswer(answer, lang).replace(/ /g, '');
  if (g === ans) return { verdict: VERDICT.EXACT, guess: shown };

  const alts = (alternates ?? recordByWord(answer, lang)?.alternates ?? [])
    .map(a => canonicalAnswer(a, lang)).filter(a => a && a.replace(/ /g, '') !== ans);
  const hit = (verdict, i) => (i === 0 ? { verdict, guess: shown } : { verdict: VERDICT.ALTERNATE, guess: shown, alternate: alts[i - 1] });
  const targets = [answer, ...alts];
  const joined = targets.map(t => canonicalAnswer(t, lang).replace(/ /g, ''));
  for (let i = 1; i < joined.length; i++) if (g === joined[i]) return hit(VERDICT.EXACT, i);

  // Türkçe harf içermeyen tahmin katlanarak karşılaştırılır ("kopek" = "köpek"); Türkçe harf
  // içeren tahmin olduğu gibi ("çam" ≠ "cam"). İngilizce kipte her zaman katlanır.
  const folded = lang === 'en' || isAsciiOnly(g);
  const word = folded ? foldTurkish(g) : g;
  const goals = joined.map(t => (folded ? foldTurkish(t) : t));
  for (let i = 0; i < goals.length; i++) {
    if (folded && word === goals[i]) return hit(lang === 'en' ? VERDICT.EXACT : VERDICT.ASCII, i);
  }

  const lex = lexicon(lang);
  const known = set => (folded ? set.folded : set.plain).has(word);
  const otherDeck = known(lex.deck);
  const otherWord = otherDeck || known(lex.parts) || known(lex.dict) || known(lex.apart);
  if (!otherDeck && !known(lex.apart)) {
    for (let i = 0; i < targets.length; i++) {
      if (inflectedOf(word, targets[i], lang, folded)) {
        const strict = !folded || isAsciiOnly(joined[i]) || lang === 'en';
        return hit(strict ? VERDICT.INFLECTED : VERDICT.ASCII, i);
      }
    }
  }

  if (!otherWord) {
    for (let i = 0; i < goals.length; i++) {
      const t = goals[i];
      if (Array.from(t).length >= TYPO_MIN_LENGTH && word[0] === t[0] && editDistance(word, t) <= 1) return hit(VERDICT.TYPO, i);
    }
  }
  return { verdict: VERDICT.WRONG, guess: shown };
}

// ---------------------------------------------------------------------------
// Tur durumu (değişmez nesneler; her işlem yeni durum döndürür)

export function newRound() {
  return Object.freeze({ guesses: Object.freeze([]), done: false, solved: false, gaveUp: false });
}

// Tahmin uygular. Dönen: { round, event }.
// event.type: 'correct' | 'wrong' | 'repeat' (aynı yanlış tahmin, hak harcanmaz) | 'empty' | 'invalid' | 'done'
export function applyGuess(round, guess, { answer, lang = 'tr' }) {
  if (round.done) return { round, event: { type: 'done' } };
  const { verdict, guess: shown } = judgeGuess(guess, { answer, lang });
  if (verdict === VERDICT.EMPTY || verdict === VERDICT.INVALID) {
    return { round, event: { type: verdict, left: MAX_ATTEMPTS - round.guesses.length } };
  }
  const key = guessKey(shown, lang);
  if (round.guesses.some(x => x.key === key)) {
    return { round, event: { type: 'repeat', left: MAX_ATTEMPTS - round.guesses.length } };
  }
  const guesses = Object.freeze([...round.guesses, Object.freeze({ text: shown, key, verdict })]);
  const solved = isCorrect(verdict);
  const done = solved || guesses.length >= MAX_ATTEMPTS;
  const next = Object.freeze({ guesses, done, solved, gaveUp: false });
  return { round: next, event: { type: solved ? 'correct' : 'wrong', verdict, left: MAX_ATTEMPTS - guesses.length } };
}

// Pes etmek: tur biter, bilinmemiş sayılır; kullanılmayan haklar boş kalır.
export function giveUp(round) {
  if (round.done) return round;
  return Object.freeze({ guesses: round.guesses, done: true, solved: false, gaveUp: true });
}

// Sonuç özeti: { solved, attempts } (attempts = yapılan tahmin sayısı, 0–3).
export function roundSummary(round) {
  return { solved: round.solved, attempts: round.guesses.length };
}

// Kart ve erişilebilirlik için hak şeridi: 'miss' (✕ harcanan) · 'hit' (● bilinen) · 'empty' (○ kullanılmayan).
export function attemptMarks({ solved, attempts }) {
  const marks = [];
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    if (i < attempts - 1) marks.push('miss');
    else if (i === attempts - 1) marks.push(solved ? 'hit' : 'miss');
    else marks.push('empty');
  }
  return marks;
}
