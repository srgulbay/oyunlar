// Mağaza (Ayarlar → Mağaza; yalnız iOS, StoreKit köprüsüyle): Harfsiz Hepsi, desteler, Kart temaları,
// geri yükle, iade iste; Destekle'ye bağlantı. Her ürün kartında ne verdiği (3 madde), displayPrice,
// "Aile Paylaşımı ile paylaşılır" ve görünür "Satın alımları geri yükle". Geri sayım, sahte indirim ve ön
// seçili paket yok (docs/oyun-tasarimi.md §6). Webde bu ekran yoktur.

import { h } from '../arayuz/dom.js';
import { topBar, section, quietButton } from '../arayuz/bilesen.js';
import { deckList } from '../deste.js';
import { THEMES } from '../kart.js';
import { catalog, deckProductId, PRODUCT } from '../haklar.js';
import { productState, priceOf } from '../magaza-urun.js';
import { loadPrices, buy, productCard, restoreButton, storeUnavailableNote, pricesState, requestRefund } from './magaza-ortak.js';
import { deckBullets } from './deste-sayfasi.js';

/** Ücretli temaların örnek kartları (B'nin önizlemeleri, web/assets/kart/<tema>-<dil>.webp; 480×480). */
function themePreviews(app) {
  const lang = app.lang === 'tr' ? 'tr' : 'en';
  return h(
    'ul',
    { class: 'theme-previews' },
    THEMES.filter((th) => th.paid).map((th) =>
      h('li', {}, h('img', { src: new URL(`../../assets/kart/${th.id}-${lang}.webp`, import.meta.url).href, alt: app.t('themePreviewAlt', th.name[lang]), width: '480', height: '480', loading: 'lazy', decoding: 'async' })),
    ),
  );
}

export function render(app) {
  const { t } = app;
  if (!app.storeAvailable()) return { redirect: ['settings'] };
  const bar = topBar(app, { title: t('storeTitle'), back: 'settings' });
  const main = h('main', { class: 'screen store' }, bar.el, h('p', { class: 'screen-intro' }, t('storeIntro')));
  const body = h('div', { class: 'store-body' });
  main.append(body);
  const ids = catalog().filter((p) => p.inV1 && p.kind !== 'tip').map((p) => p.id);
  let prices = null;
  let busy = null;

  const card = (id, title, bullets, extra = null) =>
    productCard(
      app,
      { id, title, bullets, extra },
      {
        state: productState(id, { prices, owned: app.owned(), busy }),
        price: priceOf(id, prices),
        onBuy: async () => {
          busy = id;
          draw();
          await buy(app, id);
          busy = null;
          draw();
        },
        onRefund: () => requestRefund(app, id),
      },
    );

  function draw() {
    const parts = [];
    if (pricesState(prices) === 'unavailable') parts.push(storeUnavailableNote(app, refresh));
    parts.push(section(t('allTitle'), 'store-all', card(PRODUCT.HEPSI, t('allProduct', app.name()), [t('allBullet1'), t('allBullet2'), t('allBullet3')], h('p', { class: 'product-note' }, t('allNote')))));
    parts.push(
      section(
        t('decksTitle'),
        'store-decks',
        deckList()
          .filter((d) => d.paid)
          .map((d) => card(deckProductId(d.id), t('deckProduct', d.name[app.lang]), deckBullets(t, d))),
      ),
    );
    parts.push(section(t('themesTitle'), 'store-themes', card(PRODUCT.THEMES, t('themesProduct'), [t('themesBullet1'), t('themesBullet2'), t('themesBullet3')], themePreviews(app))));
    parts.push(restoreButton(app, draw));
    if (app.tipsAvailable()) parts.push(quietButton(t('tipsRow'), () => app.go('tips'), { iconName: 'heart' }));
    body.replaceChildren(...parts);
  }

  async function refresh() {
    prices = null;
    draw();
    prices = await loadPrices(app, ids);
    draw();
  }
  draw();
  refresh();
  return { root: main, focus: bar.title };
}
