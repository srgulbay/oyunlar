// "Bildir" (App Store 1.2): Faz A'da tek uç `kurma-bildir`, yalnız yük ve neden gider; kimlik gitmez.
// Bu modül gövdeyi kurar ve doğrular; gönderimi A yapar. Sunucu sözleşmesi: KOORDINASYON.md §10.
// Saf modüldür; sunucuya kopyalanabilir (uç aynı doğrulamayı yapar).

import { decodePuzzle } from './yuk.js';

export const REPORT_ENDPOINT = 'kurma-bildir';
export const MAX_BODY_BYTES = 2048;

export const REPORT_REASONS = Object.freeze({
  uygunsuz: { tr: 'Müstehcen ya da uygunsuz', en: 'Sexual or inappropriate' },
  taciz: { tr: 'Hakaret, taciz ya da nefret', en: 'Insult, harassment or hate' },
  kisisel: { tr: 'Birinin kişisel bilgisi', en: "Someone's personal information" },
  spam: { tr: 'İstenmeyen ileti ya da reklam', en: 'Spam or advertising' },
  diger: { tr: 'Başka bir neden', en: 'Something else' },
});

// Gövde: { oyun: 'harfsiz', yuk: '<#p= kodu>', neden, dil: '<arayüz dili>' } ya da geçersizse null.
export function reportBody({ code, reason, uiLang = 'tr' }) {
  if (!Object.hasOwn(REPORT_REASONS, reason)) return null;
  if (!decodePuzzle(code).ok) return null;
  const body = { oyun: 'harfsiz', yuk: code, neden: reason, dil: uiLang === 'tr' ? 'tr' : 'en' };
  return JSON.stringify(body).length <= MAX_BODY_BYTES ? body : null;
}
