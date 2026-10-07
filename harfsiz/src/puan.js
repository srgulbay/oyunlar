// Puan ve rövanş skoru. Kurallar: docs/kurallar.md §10.
// Tahmin eden: 1. hakta 3, 2. hakta 2, 3. hakta 1 puan; bilemezse 0.
// Anlatan: anlatım bilinirse 9 − kelime sayısı (en az 1); bilinmezse 0. Az kelime çok puan getirir.
// Saf modüldür; sunucuya kopyalanabilir.

import { MAX_ATTEMPTS } from './tahmin.js';

export const CREATOR_BASE = 9;
export const SCORE_CAP = 1023; // yükte 10 bit
export const ROUND_CAP = 255; // yükte 8 bit

export function solverPoints({ solved, attempts }) {
  if (!solved || !Number.isInteger(attempts) || attempts < 1 || attempts > MAX_ATTEMPTS) return 0;
  return MAX_ATTEMPTS + 1 - attempts;
}

export function creatorPoints({ solved, words }) {
  if (!solved || !Number.isInteger(words) || words < 1) return 0;
  return Math.max(1, CREATOR_BASE - words);
}

export function roundPoints({ solved, attempts, words }) {
  return { solver: solverPoints({ solved, attempts }), creator: creatorPoints({ solved, words }) };
}

// Rövanş skoru. Bulmacadaki `match` alanı, o turdan ÖNCEKİ toplamları kurucunun gözünden taşır:
// { me: kurucunun toplamı, them: alıcının toplamı, round: bu bulmacanın tur numarası }. Alan yoksa ilk turdur.
export const FIRST_MATCH = Object.freeze({ me: 0, them: 0, round: 1 });

const clampScore = n => Math.min(SCORE_CAP, Math.max(0, n));

// Tur bitince iki tarafın toplamı.
export function totalsAfter(match, result) {
  const m = match || FIRST_MATCH;
  const p = roundPoints(result);
  return { creator: clampScore(m.me + p.creator), solver: clampScore(m.them + p.solver), round: m.round };
}

// Alıcı rövanş kurarken yeni bulmacaya yazılacak skor (bakış açısı döner: yeni kurucu eski alıcıdır).
export function rematchMatch(match, result) {
  const t = totalsAfter(match, result);
  return { me: t.solver, them: t.creator, round: Math.min(ROUND_CAP, t.round + 1) };
}

// Sonuç bağlantısına (#r) yazılacak skor: gönderen (alıcı) gözünden, bu tur dahil.
export function resultMatch(match, result) {
  const t = totalsAfter(match, result);
  return { me: t.solver, them: t.creator, round: t.round };
}
