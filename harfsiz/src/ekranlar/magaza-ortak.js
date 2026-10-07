// Mağaza yolunun ortak parçaları (yalnız iOS): fiyatların yüklenmesi, satın alma, geri yükleme, ürün kartı.
// Fiyat her zaman StoreKit'in displayPrice'ıdır. Kart: ne verdiği (3 madde), fiyat, "Aile Paylaşımı ile
// paylaşılır" rozeti ve görünür "Satın alımları geri yükle" (docs/oyun-tasarimi.md §6).

import { h, icon, toast, announce } from '../arayuz/dom.js';
import { note, secondaryButton } from '../arayuz/bilesen.js';
import { responseState, pickProducts, pickOwned } from '../magaza-urun.js';

/** Fiyatlar: başarıda [{ id, name, price }], ulaşılamazsa []. */
export async function loadPrices(app, ids) {
  const r = await app.platform.ask({ type: 'urunler', productIds: [...ids] });
  return responseState('urunler', r) === 'tamam' ? pickProducts(r.veri, ids) : [];
}

/** null → 'loading' · [] → 'unavailable' · dolu → 'ready'. */
export const pricesState = (prices) => (prices === null ? 'loading' : prices.length ? 'ready' : 'unavailable');

/** Satın alma; sonuç bildirilir. Dönen durum: 'tamam' | 'iptal' | 'bekliyor' | 'hata' | 'zaman-asimi' | … */
export async function buy(app, productId) {
  const { t } = app;
  const r = await app.platform.ask({ type: 'satinAl', productId });
  const state = responseState('satinAl', r);
  if (state === 'tamam') {
    const owned = r && r.veri ? pickOwned(r.veri) : null;
    app.setOwned(owned || [...new Set([...app.data.owned, productId])]);
    if (app.platform.isNative) app.count('satin_alindi', '-');
    toast(t('purchaseDone'));
  } else if (state === 'bekliyor') toast(t('purchasePending'));
  else if (state === 'hata' || state === 'gonderilemedi' || state === 'desteklenmiyor') toast(t('purchaseFailed'));
  return state;
}

/** Satın alımları geri yükle. */
export async function restore(app) {
  const { t } = app;
  const r = await app.platform.ask({ type: 'geriYukle' });
  const state = responseState('geriYukle', r);
  if (state === 'tamam') {
    const owned = pickOwned(r.veri);
    if (owned) app.setOwned(owned);
    toast(owned && owned.length ? t('restoreDone') : t('restoreNothing'));
  } else if (state !== 'iptal') toast(t('restoreFailed'));
  return state;
}

/** "Satın alımları geri yükle" düğmesi (her teklif kartında görünür). */
export const restoreButton = (app, after) =>
  secondaryButton(
    app.t('restorePurchases'),
    async () => {
      await restore(app);
      if (after) after();
    },
    { iconName: 'refresh', cls: 'restore-button' },
  );

/**
 * Ürün kartı. product: { id, title, bullets[3], note? }. state: productState (magaza-urun.js).
 * onBuy() satın almayı başlatır.
 */
export function productCard(app, { id, title, bullets, extra = null }, { state, price, onBuy, onRefund = null }) {
  const { t } = app;
  let action;
  if (state === 'owned') {
    action = h('p', { class: 'product-owned' }, h('span', { 'aria-hidden': 'true' }, '✓ '), t('owned'));
  } else if (state === 'loading') {
    action = h('button', { class: 'button button-primary', type: 'button', 'aria-disabled': 'true', 'aria-label': t('priceLoadingName', title) }, t('priceLoading'));
  } else if (state === 'unavailable') {
    action = h('p', { class: 'product-unavailable' }, icon('offline', 'inline-icon'), t('storeUnavailableShort'));
  } else {
    action = h(
      'button',
      {
        class: 'button button-primary buy-button',
        type: 'button',
        'aria-disabled': state === 'ready' ? null : 'true',
        on: {
          click: () => {
            if (state !== 'ready') return;
            onBuy();
          },
        },
      },
      state === 'busy' ? t('purchaseBusy') : t('buyFor', price),
    );
  }
  return h(
    'section',
    { class: 'product-card', 'aria-labelledby': `p-${id.replace(/\W/g, '-')}` },
    h('h3', { class: 'product-title', id: `p-${id.replace(/\W/g, '-')}` }, title),
    h('ul', { class: 'product-bullets' }, bullets.map((b) => h('li', {}, h('span', { class: 'bullet-mark', 'aria-hidden': 'true' }, '✓'), h('span', {}, b)))),
    extra,
    h('p', { class: 'family-badge' }, icon('heart', 'inline-icon'), t('familySharing')),
    action,
    state === 'owned' && onRefund ? h('button', { class: 'button button-quiet refund-button', type: 'button', on: { click: onRefund } }, t('requestRefund')) : null,
  );
}

/** İade isteği (StoreKit iade sayfası; yerel taraf açar). */
export async function requestRefund(app, productId) {
  const r = await app.platform.ask({ type: 'iadeIste', productId });
  const state = responseState('iadeIste', r);
  if (state === 'hata' || state === 'gonderilemedi' || state === 'desteklenmiyor') toast(app.t('refundFailed'));
  else if (state === 'tamam') announce(app.t('refundRequested'));
  return state;
}

export const storeUnavailableNote = (app, retry) => h('div', { class: 'store-unavailable' }, note(app.t('storeUnavailable'), { kind: 'warning' }), secondaryButton(app.t('retry'), retry, { iconName: 'refresh' }));
