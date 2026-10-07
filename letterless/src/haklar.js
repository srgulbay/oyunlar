// Satın alma hakları ve teklif kuralları. İlke: KURAN ÖDER, OYNAYAN ÖDEMEZ.
// - Haklar yalnız kurma ekranında okunur. Alıcı yolu (bağlantıyla gelen bulmaca, tahmin, sonuç) bu modülü
//   içe aktarmaz (tahmin.js, yuk.js, puan.js; testli).
// - Web hiçbir şey satmaz: satın alma yalnız iOS'ta, StoreKit ile; fiyat her zaman mağazanın displayPrice'ıdır.
// Katalog: KOORDINASYON.md §8.

import { deckList, BUNDLE_ID } from './deste.js';
import { THEMES } from './kart.js';

export const PRODUCT = Object.freeze({
  HEPSI: `${BUNDLE_ID}.hepsi`,
  THEMES: `${BUNDLE_ID}.gorunum.1`,
  EMOJI: `${BUNDLE_ID}.kip.emoji`,
  TIP_TEA: `${BUNDLE_ID}.destek.cay`,
  TIP_COFFEE: `${BUNDLE_ID}.destek.kahve`,
  TIP_LUNCH: `${BUNDLE_ID}.destek.yemek`,
});

export const deckProductId = deckId => `${BUNDLE_ID}.deste.${deckId}`;

// Ürün kataloğu. refPrice yalnız belgeleme ve App Store Connect kaydı içindir; arayüz fiyat yazmaz.
// inV1: ilk sürümde satışta mı (Emoji kipi sonraki sürümde; kimliği şimdiden ayrılmıştır).
export function catalog() {
  const decks = deckList().filter(d => d.paid).map(d => Object.freeze({
    id: d.productId, kind: 'deck', deckId: d.id, type: 'non-consumable', familyShareable: true,
    refPrice: { TRY: '29,99', USD: '0.99' }, inV1: true,
  }));
  return Object.freeze([
    ...decks,
    Object.freeze({ id: PRODUCT.THEMES, kind: 'themes', type: 'non-consumable', familyShareable: true, refPrice: { TRY: '49,99', USD: '0.99' }, inV1: true }),
    Object.freeze({ id: PRODUCT.HEPSI, kind: 'all', type: 'non-consumable', familyShareable: true, refPrice: { TRY: '99,99', USD: '1.99' }, inV1: true }),
    Object.freeze({ id: PRODUCT.EMOJI, kind: 'mode', type: 'non-consumable', familyShareable: true, refPrice: { TRY: '49,99', USD: '0.99' }, inV1: false }),
    Object.freeze({ id: PRODUCT.TIP_TEA, kind: 'tip', type: 'consumable', familyShareable: false, refPrice: { TRY: '29,99' }, inV1: true }),
    Object.freeze({ id: PRODUCT.TIP_COFFEE, kind: 'tip', type: 'consumable', familyShareable: false, refPrice: { TRY: '79,99' }, inV1: true }),
    Object.freeze({ id: PRODUCT.TIP_LUNCH, kind: 'tip', type: 'consumable', familyShareable: false, refPrice: { TRY: '199,99' }, inV1: true }),
  ]);
}

// StoreKit'in bildirdiği kalıcı ürün kimliklerinden (iade edilenler düşmüş) hak kümesi.
// Bilinmeyen kimlik yok sayılır. Bahşişler hak vermez.
export function entitlements(ownedProductIds = []) {
  const owned = new Set(ownedProductIds);
  const all = owned.has(PRODUCT.HEPSI);
  const decks = new Set();
  for (const d of deckList()) if (d.paid && (all || owned.has(d.productId))) decks.add(d.id);
  return Object.freeze({
    decks, // kurulabilecek ücretli desteler (bugünkü); gelecekteki desteler Hepsi'yle kendiliğinden açılır
    allDecks: all,
    themes: owned.has(PRODUCT.THEMES),
    emojiMode: all || owned.has(PRODUCT.EMOJI),
    dailyArchive: all,
  });
}

// Bu desteyle KURMAK serbest mi? (Çözmek her zaman serbesttir; bu işlev alıcı yolunda çağrılmaz.)
export function canCreateWithDeck(deck, ownedProductIds = []) {
  if (!deck) return false;
  if (!deck.paid) return true;
  const e = entitlements(ownedProductIds);
  return e.allDecks || e.decks.has(deck.id);
}

// Kurma ekranında destenin durumu:
//   'free' ücretsiz · 'owned' alınmış · 'buy' iOS'ta satın alınabilir · 'app-only' web: yalnız iOS uygulamasında
// store: kabuk 'urunler' ve 'satinAl' özelliklerini bildiriyorsa true.
export function deckAccess(deck, { owned = [], store = false } = {}) {
  if (!deck.paid) return 'free';
  if (canCreateWithDeck(deck, owned)) return 'owned';
  return store ? 'buy' : 'app-only';
}

export function themeUnlocked(themeId, ownedProductIds = []) {
  const t = THEMES.find(x => x.id === themeId);
  if (!t) return false;
  return !t.paid || entitlements(ownedProductIds).themes;
}

// ---------------------------------------------------------------------------
// Teklif anları (dürüst, karanlık desensiz). Ayrıntı: docs/oyun-tasarimi.md §6.
//   Kullanıcının başlattığı: kilitli desteye dokunmak, Ayarlar → Mağaza. Her zaman açılabilir.
//   Kendiliğinden küçük kart: yalnız kurma ekranında, en az 3 farklı günde oynamış oyuncuya, günde en çok
//   bir kez; ilk oturumda, öğreticide ve alıcı yolunda (tahmin, sonuç) hiçbir zaman. Geri sayım yok.

export const OFFER_MIN_PLAY_DAYS = 3;

export function shouldShowSoftOffer({ screen, playDays = 0, today, lastOfferDate = null, firstSession = true, tutorial = false, owned = [], store = false }) {
  if (screen !== 'kur') return false;
  if (!store) return false; // web satış yapmaz
  if (tutorial || firstSession) return false;
  if (playDays < OFFER_MIN_PLAY_DAYS) return false;
  if (lastOfferDate === today) return false;
  const e = entitlements(owned);
  const paid = deckList().filter(d => d.paid);
  if (e.allDecks || paid.every(d => e.decks.has(d.id))) return false;
  return true;
}
