// Kur: deste listesi (docs/oyun-tasarimi.md §3). Ücretsiz desteler; ücretli desteler adı, sözcük sayısı ve
// kilit durumuyla. iOS'ta fiyat StoreKit'in displayPrice'ı; webde "yalnız iOS uygulamasında" (satış yok).
// Kilitli desteye dokunmak deste sayfasını açar. Haklar yalnız kurma yolunda okunur (haklar.js).

import { h, icon } from '../arayuz/dom.js';
import { topBar, note, secondaryButton, section } from '../arayuz/bilesen.js';
import { deckList } from '../deste.js';
import { deckAccess, deckProductId } from '../haklar.js';
import { NEW_CONTEXT } from '../akis.js';
import { contextNote } from './kur-ortak.js';
import { loadPrices, pricesState } from './magaza-ortak.js';

/** Desteler: arayüz dilinin ücretsiz destesi önde, sonra öteki ücretsiz, sonra ücretliler. */
export function orderedDecks(uiLang) {
  const all = deckList();
  const rank = (d) => (d.paid ? 2 : d.lang === uiLang ? 0 : 1);
  return all.map((d, i) => ({ d, i })).sort((a, b) => rank(a.d) - rank(b.d) || a.i - b.i).map((x) => x.d);
}

function accessLine(app, deck, access, prices) {
  const { t } = app;
  if (access === 'free') return h('span', { class: 'deck-access access-free' }, t('deckFree'));
  if (access === 'owned') return h('span', { class: 'deck-access access-owned' }, h('span', { 'aria-hidden': 'true' }, '✓ '), t('deckOwned'));
  if (access === 'app-only') return h('span', { class: 'deck-access access-locked' }, icon('lock', 'inline-icon'), t('deckAppOnly'));
  const ps = pricesState(prices);
  const price = ps === 'ready' ? (prices.find((p) => p.id === deckProductId(deck.id)) || {}).price : null;
  return h('span', { class: 'deck-access access-locked' }, icon('lock', 'inline-icon'), price ? t('deckPrice', price) : ps === 'loading' ? t('priceLoading') : t('storeUnavailableShort'));
}

export async function render(app, arg = {}) {
  const { t } = app;
  if (arg.fresh || !app.draft) app.draft = { context: arg.context || NEW_CONTEXT };
  else if (arg.context) app.draft.context = arg.context;
  const context = app.draft.context;
  const bar = topBar(app, { title: t('createTitle'), back: 'home' });
  const store = app.storeAvailable();
  const owned = app.owned();
  const main = h('main', { class: 'screen create' }, bar.el);
  const cn = contextNote(app, context);
  if (cn) main.append(cn);

  const list = h('ul', { class: 'deck-list' });
  const offline = h('div', { class: 'deck-offline' });
  let prices = store ? null : [];

  function draw() {
    list.replaceChildren(
      ...orderedDecks(app.lang).map((deck) => {
        const access = deckAccess(deck, { owned, store });
        const open = access === 'free' || access === 'owned';
        return h(
          'li',
          {},
          h(
            'button',
            {
              class: `row-button deck-row${open ? '' : ' is-locked'}`,
              type: 'button',
              on: { click: () => (open ? app.go('words', { deckId: deck.id }) : app.go('deck', { deckId: deck.id })) },
            },
            h('span', { class: 'row-text' }, h('span', { class: 'row-title' }, deck.name[app.lang]), h('span', { class: 'row-sub' }, `${deck.description[app.lang]} · ${t('deckSize', deck.size)}`), accessLine(app, deck, access, prices)),
            h('span', { class: 'row-chevron', 'aria-hidden': 'true' }, icon('next')),
          ),
        );
      }),
    );
    if (store && pricesState(prices) === 'unavailable') {
      offline.replaceChildren(note(t('storeUnavailable'), { kind: 'warning' }), secondaryButton(t('retry'), refreshPrices, { iconName: 'refresh' }));
    } else offline.replaceChildren();
  }

  async function refreshPrices() {
    prices = null;
    draw();
    prices = await loadPrices(app, deckList().filter((d) => d.paid).map((d) => deckProductId(d.id)));
    draw();
  }

  main.append(section(t('pickDeck'), 'deck-section', list, offline));
  if (!app.platform.isNative) main.append(note(t('webDeckNote'), { kind: 'info', cls: 'web-deck-note' }));
  draw();
  if (store) refreshPrices();
  return { root: main, focus: bar.title };
}
