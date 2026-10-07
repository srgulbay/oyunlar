// Sonuç, kurucu (#r=; docs/oyun-tasarimi.md §3): "Anlatımın 2. hakta bilindi", anlatım, puanlar, skor, kart
// (kurucu gözünden), "Yeni anlatım gönder" (skor devam eder). Gönderdiklerin listesinde ref ile eşlenir
// (app.js açılışta işaretler). Bu cihazdan gönderilmemiş bir bulmacanın sonucuysa not düşülür.
// Sayaç: sonuc_acildi, bağlantı başına bir kez.

import { h } from '../arayuz/dom.js';
import { topBar, attemptStrip, letterBadge, scoreLine, primaryButton, quietButton, note, section } from '../arayuz/bilesen.js';
import { roundPoints } from '../puan.js';
import { creatorTotals, continueContext, addressFor } from '../akis.js';
import { cardPreview, shareCard } from '../paylasim.js';

export function creatorCard(app, view) {
  const r = view.result;
  const totals = creatorTotals(r.match);
  return {
    kind: 'result',
    perspective: 'creator',
    lang: r.lang,
    uiLang: app.lang,
    letter: r.letter,
    words: view.words,
    description: r.description,
    solved: r.solved,
    attempts: r.attempts,
    day: r.day || null,
    match: totals ? { me: totals.me, them: totals.them } : null,
    address: addressFor(app.root, app.lang),
    theme: app.data.settings.theme,
  };
}

export function render(app, view) {
  const { t } = app;
  if (!view || !view.result) return { redirect: ['home'] };
  const r = view.result;
  app.countOnce('sonuc_acildi', view.ref, view.channel);
  const bar = topBar(app, { title: null, back: 'home' });
  const main = h('main', { class: `screen result creator ${r.solved ? 'is-solved' : 'is-missed'}` }, bar.el);
  const title = h('h1', { class: 'result-title', tabindex: '-1' }, h('span', { class: 'result-mark', 'aria-hidden': 'true' }, r.solved ? '●' : '✕'), ' ', r.solved ? t('yoursSolved', r.attempts) : t('yoursMissed'));
  const points = roundPoints({ solved: r.solved, attempts: r.attempts, words: view.words });
  const totals = creatorTotals(r.match);
  main.append(
    title,
    h(
      'div',
      { class: 'recap' },
      letterBadge(t, r.letter, r.lang, { size: 'm' }),
      h('div', {}, h('p', { class: 'recap-clue clue-text', lang: r.lang }, `«${r.description}»`), h('p', { class: 'recap-meta' }, t('clueMeta', r.letter, r.lang, view.words))),
    ),
    attemptStrip(t, { solved: r.solved, attempts: r.attempts }, { cls: 'result-strip' }),
    h('p', { class: 'points' }, t('creatorPoints', points.creator, points.solver)),
  );
  if (totals) main.append(scoreLine(t, totals, { cls: 'result-score' }));
  if (!view.known) main.append(note(t('unknownResult'), { kind: 'info' }));

  const actions = h('div', { class: 'result-actions' }, primaryButton(t('sendNewClue'), () => app.go('create', { fresh: true, context: continueContext(r) }), { iconName: 'pencil' }));
  main.append(actions);

  const card = creatorCard(app, view);
  const preview = cardPreview(card, 'square');
  main.append(section(t('cardTitle'), 'card-section', preview.el, quietButton(t('shareCard'), () => shareCard(app, { card, format: 'square', title: app.name() }), { iconName: 'image', cls: 'share-card' })));
  return { root: main, focus: title };
}
