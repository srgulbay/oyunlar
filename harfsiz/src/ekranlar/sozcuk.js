// Kur: sözcük (docs/oyun-tasarimi.md §3). Üç sözcük (zorluk etiketiyle; son 100 sözcük gelmez), her birinin
// dağıtılan yasak harfi; "Başka üç sözcük" ekrandakileri dışarıda bırakır. Rövanşta "Rakibin sana R'yi
// yasakladı." ve harf bütün sözcüklerde odur. iOS'ta kendiliğinden tek küçük teklif kartı (haklar.js →
// shouldShowSoftOffer: en az 3 farklı gün, günde bir kez, ilk oturumda hiç).

import { h } from '../arayuz/dom.js';
import { topBar, letterBadge, secondaryButton, section, note } from '../arayuz/bilesen.js';
import { deckById, deckRecords, dealWords, dealLetter } from '../deste.js';
import { canCreateWithDeck, shouldShowSoftOffer } from '../haklar.js';
import { imposedLetterFor } from '../akis.js';
import { contextNote } from './kur-ortak.js';

function deal(app, deck, exclude = []) {
  const records = deckRecords(deck.id);
  const words = dealWords(records, { recent: app.data.recent, exclude, rng: app.rng });
  const imposed = imposedLetterFor(app.draft.context, deck.lang);
  return words.map((record) => ({ record, letter: imposed || dealLetter(record, deck.lang, app.rng) }));
}

function softOffer(app) {
  const { t, data } = app;
  const today = app.today();
  const show = shouldShowSoftOffer({
    screen: 'kur',
    playDays: data.playDays.length,
    today,
    lastOfferDate: data.offer.last,
    firstSession: data.sessions <= 1,
    tutorial: false,
    owned: app.owned(),
    store: app.storeAvailable(),
  });
  if (!show) return null;
  data.offer.last = today;
  app.save();
  app.count('teklif_goruldu', '-');
  const card = h(
    'aside',
    { class: 'offer-card', 'aria-labelledby': 'offer-title' },
    h('p', { class: 'offer-title', id: 'offer-title' }, t('offerTitle')),
    h(
      'div',
      { class: 'offer-actions' },
      h('button', { class: 'button button-secondary', type: 'button', on: { click: () => app.go('store') } }, t('offerSee')),
      h(
        'button',
        {
          class: 'button button-secondary',
          type: 'button',
          on: {
            click: () => {
              card.remove();
            },
          },
        },
        t('offerNotNow'),
      ),
    ),
  );
  return card;
}

export function render(app, arg = {}) {
  const { t } = app;
  if (!app.draft) app.draft = { context: { kind: 'new' } };
  const deckId = arg.deckId || app.draft.deckId || 'temel';
  const deck = deckById(deckId);
  // Kilitli desteyle doğrudan gelinirse (eski bağlantı, hak iadesi) deste sayfası açılır.
  if (!deck || !canCreateWithDeck(deck, app.owned())) return { redirect: deck ? ['deck', { deckId }] : ['create', {}] };
  if (app.draft.deckId !== deckId || !app.draft.dealt) {
    app.draft.deckId = deckId;
    app.draft.dealt = deal(app, deck);
  }
  const bar = topBar(app, { title: deck.name[app.lang], back: () => app.go('create') });
  const main = h('main', { class: 'screen words' }, bar.el);
  const cn = contextNote(app, app.draft.context);
  if (cn) main.append(cn);
  const offer = softOffer(app);
  if (offer) main.append(offer);

  const list = h('ul', { class: 'word-list' });
  const levels = { 1: t('easy'), 2: t('medium'), 3: t('hard') };
  function draw() {
    list.replaceChildren(
      ...app.draft.dealt.map(({ record, letter }) =>
        h(
          'li',
          {},
          h(
            'button',
            {
              class: 'word-card',
              type: 'button',
              lang: deck.lang,
              on: {
                click: () => {
                  app.draft.picked = { record, letter, deckId: deck.id, deckCode: deck.code, lang: deck.lang };
                  app.draft.text = '';
                  app.draft.rematchLetter = null;
                  app.go('write');
                },
              },
            },
            h('span', { class: 'word-text' }, record.word),
            h(
              'span',
              { class: 'word-meta', lang: app.lang },
              h('span', { class: `level level-${record.difficulty}` }, levels[record.difficulty]),
              h('span', { class: 'word-letter' }, letterBadge(t, letter, deck.lang, { size: 's', decorative: true }), t('letterPhrase', letter, deck.lang)),
            ),
          ),
        ),
      ),
    );
  }
  draw();
  const again = secondaryButton(
    t('dealAgain'),
    () => {
      app.draft.dealt = deal(
        app,
        deck,
        app.draft.dealt.map((x) => x.record.word),
      );
      draw();
      list.querySelector('button')?.focus();
    },
    { iconName: 'dice', cls: 'deal-again' },
  );
  main.append(section(t('pickWord'), 'word-section', h('p', { class: 'section-hint' }, t('pickWordHint')), list, again));
  if (deck.lang !== app.lang) main.append(note(t('otherLangDeck'), { kind: 'info' }));
  return { root: main, focus: bar.title };
}
