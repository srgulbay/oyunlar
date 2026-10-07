// Mağaza (yalnız iOS, StoreKit köprüsüyle) ve Destekle (bahşiş) için saf yardımcılar: ürün kimlikleri,
// köprü yanıtlarının sözleşmedeki tek duruma indirgenmesi, ürün listesinin ayıklanması, görünüm durumu.
// DOM, saat ve ağ yoktur. Fiyat her zaman StoreKit'in displayPrice'ıdır; uygulama fiyat yazmaz.
// Katalog ve hak kuralları C'nin haklar.js'indedir (KOORDINASYON.md §8); burada yalnız köprü tarafı var.

import { PRODUCT } from './haklar.js';

/** Mağazanın çalışması için kabuğun bildirmesi gereken özellikler (KOORDINASYON.md §8). */
export const STORE_FEATURES = Object.freeze(['urunler', 'satinAl', 'haklar', 'geriYukle']);
/** Destekle (Taç'taki bahşiş kalıbı). */
export const TIP_FEATURES = Object.freeze(['tipProducts', 'tip']);

export const TIPS = Object.freeze([
  Object.freeze({ key: 'cay', id: PRODUCT.TIP_TEA }),
  Object.freeze({ key: 'kahve', id: PRODUCT.TIP_COFFEE }),
  Object.freeze({ key: 'yemek', id: PRODUCT.TIP_LUNCH }),
]);
export const TIP_IDS = Object.freeze(TIPS.map((x) => x.id));

/** Sözleşmedeki yanıt durumları (ileti türüne göre). */
export const RESPONSE_STATES = Object.freeze({
  urunler: Object.freeze(['tamam', 'hata']),
  satinAl: Object.freeze(['tamam', 'iptal', 'bekliyor', 'hata']),
  haklar: Object.freeze(['tamam', 'hata']),
  geriYukle: Object.freeze(['tamam', 'iptal', 'hata']),
  iadeIste: Object.freeze(['tamam', 'iptal', 'hata']),
  tipProducts: Object.freeze(['tamam', 'hata']),
  tip: Object.freeze(['tamam', 'iptal', 'bekliyor', 'hata']),
  share: Object.freeze(['acildi', 'iptal', 'kurulu_degil', 'hata']),
  kanallar: Object.freeze(['tamam', 'hata']),
});

/**
 * Yerel yanıtı tek duruma indirger. Gönderilemeyen ileti (null) 'gonderilemedi', eski kabuğun tanımadığı
 * ileti 'desteklenmiyor', JS'in kendi zaman aşımı 'zaman-asimi'; listede olmayan her durum 'hata'.
 */
export function responseState(type, response) {
  if (!response) return 'gonderilemedi';
  if (response.durum === 'zaman-asimi' || response.durum === 'desteklenmiyor') return response.durum;
  return (RESPONSE_STATES[type] || []).includes(response.durum) ? response.durum : 'hata';
}

/**
 * Ürün yanıtının verisi: [{ id, ad?, fiyat }] (Taç'taki tipProducts biçimi; `displayPrice` adı da kabul
 * edilir). Yalnız istenen kimlikler ve fiyatı olanlar; sıra istenen sıradır. Ad 80, fiyat 40 karakter.
 */
export function pickProducts(data, wanted) {
  if (!Array.isArray(data)) return [];
  const found = new Map();
  for (const p of data) {
    if (!p || typeof p !== 'object' || !wanted.includes(p.id)) continue;
    const price = typeof p.fiyat === 'string' ? p.fiyat : typeof p.displayPrice === 'string' ? p.displayPrice : '';
    if (!price.trim()) continue;
    found.set(p.id, { id: p.id, name: typeof p.ad === 'string' ? p.ad.slice(0, 80) : '', price: price.trim().slice(0, 40) });
  }
  return wanted.filter((id) => found.has(id)).map((id) => found.get(id));
}

/** Hak yanıtının verisi: { haklar: [ürün kimliği] } ya da doğrudan dizi. Bilinmeyen biçim → null. */
export function pickOwned(data) {
  const list = Array.isArray(data) ? data : data && Array.isArray(data.haklar) ? data.haklar : null;
  if (!list) return null;
  return [...new Set(list.filter((x) => typeof x === 'string' && x.startsWith('app.algomed.harfsiz.') && x.length <= 100))];
}

/**
 * Ürün kartının durumu.
 *   prices: null (yükleniyor) · [] (mağazaya ulaşılamadı) · [{ id, price }]
 * Dönen: 'owned' | 'loading' | 'unavailable' | 'busy' | 'ready'
 */
export function productState(id, { prices, owned = [], busy = null }) {
  if (owned.includes(id)) return 'owned';
  if (prices === null) return 'loading';
  const p = prices.find((x) => x.id === id);
  if (!p) return 'unavailable';
  if (busy) return busy === id ? 'busy' : 'ready-locked';
  return 'ready';
}

export const priceOf = (id, prices) => (prices && prices.find((x) => x.id === id)?.price) || null;

/** Destekçi kaydı (cihazda; sunucuya gitmez). */
export function markSupporter(data, date) {
  data.support = { supporter: true, lastTip: /^\d{4}-\d{2}-\d{2}$/.test(String(date)) ? date : null };
}

export const isKnownTip = (id) => TIP_IDS.includes(id);
