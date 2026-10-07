// Arayüz metinleri (TR birincil, EN ikincil; KOORDINASYON.md §11). Tablolar web/src/metinler/*.js
// dosyalarındadır; burada tek tabloya katılır. Aynı anahtar iki kez tanımlanırsa açılışta hata verir.
// Değerler düz metin ya da parametre alan işlevdir. Kurallarla birlikte sınanan cümleler (uyarılar, tahmin
// geri bildirimi, açılış durumları, deste notu, puan) C'nin aciklama.js'indedir; paylaşım metni paylas.js'te,
// kart metni kart.js'te. Oyunun adı dile göredir ve paylas.js → gameName'den gelir.

import { COMMON } from './metinler/genel.js';
import { CREATE } from './metinler/kur.js';
import { SOLVE } from './metinler/coz.js';
import { STORE } from './metinler/magaza.js';
import { SETTINGS } from './metinler/ayarlar.js';

export const SUPPORTED = Object.freeze(['tr', 'en']);

/** Tabloları dil dil birleştirir; aynı anahtar iki kez tanımlıysa hata. */
export function mergeTables(parts) {
  const out = { tr: {}, en: {} };
  for (const part of parts) {
    for (const lang of SUPPORTED) {
      for (const [k, v] of Object.entries(part[lang] || {})) {
        if (k in out[lang]) throw new Error(`metinler: '${k}' anahtarı iki kez tanımlı (${lang})`);
        out[lang][k] = v;
      }
    }
  }
  return out;
}

export const TEXT_PARTS = Object.freeze({ COMMON, CREATE, SOLVE, STORE, SETTINGS });
export const TEXTS = mergeTables(Object.values(TEXT_PARTS));

/**
 * Ayar 'tr' ya da 'en' ise o; 'auto' ise cihazın dil listesindeki ilk desteklenen dil; hiçbiri yoksa
 * İngilizce (Türkçe bilmeyen cihazda İngilizce daha anlaşılırdır; ad da "Letterless" olur).
 */
export function detectLang(setting, langs) {
  if (SUPPORTED.includes(setting)) return setting;
  const list = langs || (typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : []);
  for (const l of list || []) {
    const code = String(l || '').toLowerCase().slice(0, 2);
    if (SUPPORTED.includes(code)) return code;
  }
  return 'en';
}

/** Dil için çeviri işlevi: t('anahtar', ...argümanlar). Eksik anahtar Türkçeye düşer. */
export function translator(lang) {
  const table = TEXTS[lang] || TEXTS.tr;
  const t = (key, ...args) => {
    const v = key in table ? table[key] : TEXTS.tr[key];
    if (v === undefined) throw new Error(`metinler: '${key}' anahtarı yok`);
    return typeof v === 'function' ? v(...args) : v;
  };
  t.lang = SUPPORTED.includes(lang) ? lang : 'tr';
  return t;
}

export const localeOf = (lang) => (lang === 'en' ? 'en-US' : 'tr-TR');

/** 'YYYY-AA-GG' → yerel takvimde Date (öğlen; yaz saati kaymasın). */
export function dateObject(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

/** "7 Ekim" / "October 7". Ay adları elle yazılmaz. */
export function formatDate(date, lang, { year = false } = {}) {
  if (!date) return '';
  try {
    return new Intl.DateTimeFormat(localeOf(lang), { day: 'numeric', month: 'long', ...(year ? { year: 'numeric' } : {}) }).format(dateObject(date));
  } catch {
    return date;
  }
}

/** Çoğul yalnız İngilizcede anlam taşır (TR'de sayıdan sonra çoğul eki gelmez). */
export const plural = (n, one, many) => (n === 1 ? one : many);
