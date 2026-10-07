// Deste sayfası (docs/oyun-tasarimi.md §3, §6): ad, tanım, sözcük sayısı, üç örnek sözcük (gün içinde
// değişmez), "Kuran öder, oynayan ödemez" açıklaması; iOS'ta satın alma (displayPrice) ve "Satın alımları
// geri yükle"; webde satış yok: "Bu desteyle anlatmak yalnız iOS uygulamasında…". Kullanıcının başlattığı
// teklif anıdır (kilitli desteye dokunmak).

import { h } from '../arayuz/dom.js';
import { topBar, note, primaryButton, quietButton } from '../arayuz/bilesen.js';
import { deckById, deckRecords } from '../deste.js';
import { deckAccess, deckProductId, PRODUCT } from '../haklar.js';
import { rngFromSeed, shuffled } from '../rng.js';
import { productState, priceOf } from '../magaza-urun.js';
import { loadPrices, buy, productCard, restoreButton, storeUnavailableNote, pricesState } from './magaza-ortak.js';

/** Üç örnek sözcük: gün ve deste tohumlu (gün içinde değişmez). */
export function sampleWords(deckId, date, n = 3) {
  const records = deckRecords(deckId) || [];
  return shuffled(records, rngFromSeed(`harfsiz/ornek/${deckId}/${date}`))
    .slice(0, n)
    .map((r) => r.word);
}

export function deckBullets(t, deck) {
  return [t('deckBullet1', deck.size), t('deckBullet2'), t('deckBullet3')];
}

export function render(app, arg = {}) {
  const { t } = app;
  const deck = deckById(arg.deckId);
  if (!deck) return { redirect: ['create', {}] };
  const store = app.storeAvailable();
  const bar = topBar(app, { title: deck.name[app.lang], back: () => app.go('create') });
  const main = h('main', { class: 'screen deck-page' }, bar.el);
  main.append(
    h(
      'div',
      { class: 'deck-hero' },
      h('p', { class: 'deck-description' }, deck.description[app.lang]),
      h('p', { class: 'deck-size' }, t('deckSize', deck.size)),
      h('p', { class: 'deck-samples' }, h('span', { class: 'samples-label' }, t('sampleWords')), ' ', h('span', { lang: deck.lang }, sampleWords(deck.id, app.today()).join(', '))),
    ),
    note(t('creatorPays'), { kind: 'info', cls: 'creator-pays' }),
  );
  const area = h('div', { class: 'deck-buy' });
  main.append(area);
  let prices = store ? null : [];
  let busy = null;

  function draw() {
    const owned = app.owned();
    const access = deckAccess(deck, { owned, store });
    if (access === 'free' || access === 'owned') {
      const use = primaryButton(t('useDeck'), () => app.go('words', { deckId: deck.id }), { iconName: 'pencil' });
      if (access === 'owned') area.replaceChildren(h('p', { class: 'product-owned' }, h('span', { 'aria-hidden': 'true' }, '✓ '), t('owned')), use);
      else area.replaceChildren(use);
      return;
    }
    if (access === 'app-only') {
      area.replaceChildren(note(t('appOnlyDeck'), { kind: 'info', cls: 'app-only' }), primaryButton(t('pickFreeDeck'), () => app.go('create'), { iconName: 'back' }));
      return;
    }
    const id = deckProductId(deck.id);
    const children = [];
    if (pricesState(prices) === 'unavailable') children.push(storeUnavailableNote(app, refresh));
    children.push(
      productCard(
        app,
        { id, title: t('deckProduct', deck.name[app.lang]), bullets: deckBullets(t, deck) },
        {
          state: productState(id, { prices, owned, busy }),
          price: priceOf(id, prices),
          onBuy: async () => {
            busy = id;
            draw();
            await buy(app, id);
            busy = null;
            draw();
          },
        },
      ),
    );
    children.push(h('p', { class: 'all-hint' }, t('allHint')), quietButton(t('openStore'), () => app.go('store'), { iconName: 'bag' }), restoreButton(app, draw));
    area.replaceChildren(...children.filter(Boolean));
  }

  async function refresh() {
    prices = null;
    draw();
    prices = await loadPrices(app, [deckProductId(deck.id), PRODUCT.HEPSI]);
    draw();
  }
  draw();
  if (store) refresh();
  return { root: main, focus: bar.title };
}
