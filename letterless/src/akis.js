// Oyun akışının saf çekirdeği (DOM, saat ve depolama yok; testli): bağlantı açılış kararı, çözme bağlamı,
// tur durumu, sonuç ve puan, rövanş ve devam bağlamları, bulmaca ve sonuç kodu, paylaşım verisi,
// gönderilenlerin eşlenmesi. Kurallar motorundur (KOORDINASYON.md §2–§5); burada yalnız bağlanır.
//
// Çözme bağlamı (solve context): { source: 'link' | 'own' | 'archive', puzzle, ref, code, words, archiveNo, channel }
//   puzzle: yuk.js → decodePuzzle alanları (arşivde aynı biçimde kurulur).

import { openFragment, parseFragment, encodePuzzle, encodeResult, refOf, buildLink, newSalt, shareBase } from './yuk.js';
import { newRound, applyGuess, giveUp, roundSummary, MAX_ATTEMPTS } from './tahmin.js';
import { roundPoints, totalsAfter, rematchMatch, resultMatch } from './puan.js';
import { tokenize, countWords, letterIndex, normalizeLetter } from './turkce.js';
import { firstScreenExamples } from './deste.js';
import { findSent } from './depo.js';

// ---------------------------------------------------------------------------
// Açılış

/**
 * location.hash'ten ekran kararı. Gizlenenler ve kendi bağlantısı burada ayrılır.
 * Dönen: { screen: 'home' } · { screen: 'solve', ctx } · { screen: 'creatorResult', view } · { screen: 'linkState', state, reason }
 */
export function routeForHash(hash, data, { channel = 'dogrudan' } = {}) {
  const hiddenRefs = new Set(data.hidden.refs.map((r) => r.ref));
  const blockedSenders = new Set(data.hidden.senders.map((r) => r.tag));
  const opened = openFragment(hash, { hiddenRefs, blockedSenders });
  const { code } = parseFragment(hash);
  if (opened.state === 'home') return { screen: 'home' };
  if (opened.state === 'puzzle') {
    const p = opened.puzzle;
    const own = Boolean(findSent(data, opened.ref)) || (p.sender !== null && p.sender === data.senderTag);
    return { screen: 'solve', ctx: { source: own ? 'own' : 'link', puzzle: p, ref: opened.ref, code, words: opened.words, archiveNo: null, channel } };
  }
  if (opened.state === 'result') {
    return { screen: 'creatorResult', view: { result: opened.result, ref: opened.ref, code, words: opened.words, channel, known: Boolean(findSent(data, opened.result.ref)) } };
  }
  return { screen: 'linkState', state: opened.state, reason: opened.reason || null };
}

/** Arşiv kaydından çözme bağlamı (deste.js → archiveEntries biçimi). */
export function archiveContext(entry) {
  const puzzle = {
    lang: entry.lang,
    deck: entry.deckCode,
    letter: entry.letter,
    answer: entry.word,
    description: entry.description,
    rematchLetter: null,
    sender: null,
    day: null,
    prev: null,
    match: null,
    salt: 0,
  };
  return { source: 'archive', puzzle, ref: null, code: null, words: countWords(tokenize(entry.description)), archiveNo: entry.no, channel: '-' };
}

// "Sen dene" sözcüğü örneğin yasak harfini içerir; örnek değişirse test uyarır (arayuz-akis.test.js).
const TRY_WORDS = Object.freeze({ tr: 'evcil', en: 'pet' });

/** Ana ekran ve Nasıl oynanır örneği: içeriğin ilk ekran örneği (deste.js → firstScreenExamples, ilki). */
export function homeExample(lang) {
  const l = Object.hasOwn(TRY_WORDS, lang) ? lang : 'tr';
  const e = firstScreenExamples(l)[0];
  return { lang: l, letter: e.letter, answer: e.word, clue: e.description, tryWord: TRY_WORDS[l] };
}

/** Turun saklandığı yer: arşivde numara, bağlantıda ref. */
export const roundStore = (ctx) => (ctx.source === 'archive' ? { kind: 'archive', key: String(ctx.archiveNo) } : { kind: 'link', key: String(ctx.ref) });

/** Saklanan turdan (yoksa yeni) tur durumu. */
export function restoreRound(saved) {
  if (!saved) return newRound();
  const guesses = Object.freeze(saved.guesses.slice(0, MAX_ATTEMPTS).map((g) => Object.freeze({ text: g.text, key: g.key, verdict: g.verdict })));
  return Object.freeze({ guesses, done: Boolean(saved.done), solved: Boolean(saved.solved), gaveUp: Boolean(saved.gaveUp) });
}

/** Tahmin uygular (tahmin.js). Dönen: { round, event }. */
export const guess = (ctx, round, text) => applyGuess(round, text, { answer: ctx.puzzle.answer, lang: ctx.puzzle.lang });

export const surrender = (round) => giveUp(round);

// ---------------------------------------------------------------------------
// Sonuç

/**
 * Bitmiş turun özeti: { solved, attempts, words, points: { solver, creator }, totals?: { me, them, round } }.
 * totals çözenin gözündendir (me = çözen); yalnız rövanş zincirinde (bulmacada skor varsa) dolu.
 */
export function roundOutcome(ctx, round) {
  const { solved, attempts } = roundSummary(round);
  const result = { solved, attempts, words: ctx.words };
  const points = roundPoints(result);
  let totals = null;
  if (ctx.puzzle.match) {
    const t = totalsAfter(ctx.puzzle.match, result);
    totals = { me: t.solver, them: t.creator, round: t.round };
  }
  return { solved, attempts, words: ctx.words, points, totals };
}

/**
 * Alıcının "Rövanş"ı: yeni bulmacanın bağlamı. Yükte önceki turun sonucu (prev) ve bakış açısı dönmüş
 * skor (match) taşınır; kurucunun seçtiği harf dayatılır (imposed).
 */
export function rematchContext(ctx, round) {
  const { solved, attempts } = roundSummary(round);
  return {
    kind: 'rematch',
    prev: { solved, attempts, ref: ctx.ref },
    match: rematchMatch(ctx.puzzle.match, { solved, attempts, words: ctx.words }),
    imposed: ctx.puzzle.rematchLetter || null,
    imposedLang: ctx.puzzle.lang,
  };
}

/** Kurucunun #r= sonucundan sonra "Yeni anlatım gönder": skor devam eder (bakış açısı kurucuya döner). */
export function continueContext(result) {
  const m = result.match;
  return { kind: 'continue', prev: null, match: m ? { me: m.them, them: m.me, round: Math.min(255, m.round + 1) } : null, imposed: null, imposedLang: null };
}

export const NEW_CONTEXT = Object.freeze({ kind: 'new', prev: null, match: null, imposed: null, imposedLang: null });

/** Dayatılan harf bu destenin dilinde geçerliyse o harf; değilse null (harf dağıtılır). */
export function imposedLetterFor(context, lang) {
  if (!context || !context.imposed) return null;
  return letterIndex(context.imposed, lang) >= 0 ? normalizeLetter(context.imposed, lang) : null;
}

/** Kurucu gözünden skor (#r= çözenin gözündendir). */
export const creatorTotals = (resultMatchValue) => (resultMatchValue ? { me: resultMatchValue.them, them: resultMatchValue.me, round: resultMatchValue.round } : null);

/** Rövanş yükündeki skor (yeni kurucunun gözünden, o turdan önce) → önceki turun kurucusunun gözünden sonrası. */
export const previousRoundTotals = (match) => (match ? { me: match.them, them: match.me, round: Math.max(1, match.round - 1) } : null);

// ---------------------------------------------------------------------------
// Kodlar ve bağlantılar

/**
 * Bulmaca kodu üretir. Girdi: { lang, deck, letter, answer, description (kanonik), senderTag, rng,
 *   rematchLetter?, day?, prev?, match? }. Dönen: { code, ref }.
 */
export function makePuzzle({ lang, deck, letter, answer, description, senderTag = null, rng, rematchLetter = null, day = null, prev = null, match = null }) {
  const code = encodePuzzle({
    lang,
    deck,
    letter,
    answer,
    description,
    salt: newSalt(rng),
    rematchLetter: rematchLetter || null,
    sender: senderTag || null,
    day: day || null,
    prev: prev || null,
    match: match || null,
  });
  return { code, ref: refOf(code) };
}

/** Çözenin sonuç kodu (#r=): cevabı taşımaz; skor çözenin gözünden, bu tur dahil. */
export function makeResult(ctx, round) {
  const { solved, attempts } = roundSummary(round);
  const code = encodeResult({
    lang: ctx.puzzle.lang,
    solved,
    attempts,
    letter: ctx.puzzle.letter,
    ref: ctx.ref,
    description: ctx.puzzle.description,
    day: ctx.puzzle.day || null,
    match: resultMatch(ctx.puzzle.match, { solved, attempts, words: ctx.words }),
  });
  return { code, ref: refOf(code) };
}

/** Paylaşım kökü: yerel geliştirmede açılan adres, yayında PAYLASIM_TABANI. */
export function shareRoot({ protocol, hostname, origin, href, pathname }, configured) {
  if (protocol === 'file:') return String(href).split('#')[0].split('?')[0];
  if (protocol === 'http:' || protocol === 'https:') {
    if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(hostname)) {
      // web/ kökü: /harfsiz/ ve /letterless/ girişlerinden bir üst klasör.
      const base = String(pathname || '/').replace(/[^/]*$/, '').replace(/(harfsiz|letterless)\/$/, '');
      return origin + base.replace(/\/$/, '');
    }
  }
  return configured;
}

export const linkFor = ({ root, uiLang, kind, code, channel = null }) => buildLink({ root, uiLang, kind, code, channel });

/**
 * Kartta ve alt metinde okunur adres: bağlantının şemasız ve sondaki eğik çizgisiz kökü
 * ("srgulbay.github.io/oyunlar/harfsiz"). yuk.js → displayAddress yalnız alan adını aldığından yollu tabanda
 * (K-1, GitHub Pages) yolu düşürür; adres bu yüzden bağlantının kendisinden (shareBase) kurulur.
 */
export function addressFor(root, uiLang) {
  const base = shareBase(root, uiLang);
  const m = /^https?:\/\/([^/?#]+)(.*)$/i.exec(base);
  return m ? m[1].toLowerCase() + m[2].replace(/\/+$/, '') : base.replace(/^[a-z]+:\/\//i, '');
}

/** paylas.js → inviteMessage girdisi (beyaz listede olmayan alan zaten atılır). */
export function inviteData({ lang, letter, words, description, url, day = null, imposed = false, prev = null }) {
  return { lang, letter, words, description, url, day, imposed: Boolean(imposed), prev: prev ? { solved: prev.solved, attempts: prev.attempts } : null };
}

/** paylas.js → resultMessage girdisi. */
export function resultData(ctx, round, url) {
  const { solved, attempts } = roundSummary(round);
  return { lang: ctx.puzzle.lang, letter: ctx.puzzle.letter, words: ctx.words, description: ctx.puzzle.description, url, solved, attempts, day: ctx.puzzle.day || null };
}

// ---------------------------------------------------------------------------
// Gönderilenler

/**
 * Açılan bağlantının gönderilenlere etkisi: #r= sonucu ya da rövanş yükündeki prev, bu cihazın gönderdiği
 * bulmacayı işaretler. Dönen: { ref, solved, attempts, match } ya da null.
 */
export function sentUpdateFromRoute(route) {
  if (route.screen === 'creatorResult') {
    const r = route.view.result;
    return { ref: r.ref, solved: r.solved, attempts: r.attempts, match: creatorTotals(r.match) };
  }
  if (route.screen === 'solve' && route.ctx.source === 'link' && route.ctx.puzzle.prev) {
    const p = route.ctx.puzzle.prev;
    return { ref: p.ref, solved: p.solved, attempts: p.attempts, match: previousRoundTotals(route.ctx.puzzle.match) };
  }
  return null;
}

/** Gönderilenler, en yeni önce. */
export const sentNewestFirst = (data) => [...data.sent].reverse();
