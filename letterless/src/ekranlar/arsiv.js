// Çözme arşivi (docs/oyun-tasarimi.md §3, §7): ekibin yazdığı numaralı anlatımlar; çözülenler işaretli.
// Açılan arşiv bulmacası çöz ekranında oynanır; ücretsizdir ve sayaçlara bağlantı açılışı olarak girmez.
// Dil seçimi: arayüz dilinin anlatımları önde; öteki dil tek dokunuşla.

import { h, icon, segmented } from '../arayuz/dom.js';
import { topBar, letterBadge, emptyState } from '../arayuz/bilesen.js';
import { archiveEntries } from '../deste.js';
import { archiveContext } from '../akis.js';

function statusOf(app, no) {
  const r = app.data.archive[no];
  const { t } = app;
  if (!r) return null;
  if (r.done && r.solved) return { kind: 'hit', mark: '●', text: t('archiveSolved', r.guesses.length) };
  if (r.done) return { kind: 'miss', mark: '✕', text: t('archiveMissed') };
  if (r.guesses.length) return { kind: 'wait', mark: '◐', text: t('archiveInProgress') };
  return null;
}

export function render(app, arg = {}) {
  const { t } = app;
  const bar = topBar(app, { title: t('archiveTitle'), back: 'home' });
  const langs = ['tr', 'en'].filter((l) => archiveEntries(l).length);
  let lang = arg.lang && langs.includes(arg.lang) ? arg.lang : langs.includes(app.lang) ? app.lang : langs[0];
  const list = h('ul', { class: 'archive-list' });
  const levels = { 1: t('easy'), 2: t('medium'), 3: t('hard') };
  function draw() {
    const entries = archiveEntries(lang);
    if (!entries.length) {
      list.replaceChildren(h('li', {}, emptyState({ iconName: 'book', text: t('archiveEmpty') })));
      return;
    }
    list.replaceChildren(
      ...entries.map((e) => {
        const st = statusOf(app, e.no);
        return h(
          'li',
          {},
          h(
            'button',
            { class: 'row-button archive-row', type: 'button', on: { click: () => app.go('solve', archiveContext(e)) } },
            h('span', { class: 'archive-no', 'aria-hidden': 'true' }, `#${e.no}`),
            h(
              'span',
              { class: 'row-text' },
              h('span', { class: 'visually-hidden' }, t('archiveNo', e.no)),
              h('span', { class: 'row-title clue-text', lang: e.lang }, `«${e.description}»`),
              h('span', { class: 'row-sub' }, letterBadge(t, e.letter, e.lang, { size: 'xs', decorative: true }), ` ${t('letterPhrase', e.letter, e.lang)} · ${levels[e.difficulty] || ''}`),
              st ? h('span', { class: `status status-${st.kind}` }, h('span', { class: 'status-mark', 'aria-hidden': 'true' }, st.mark), ' ', st.text) : null,
            ),
            h('span', { class: 'row-chevron', 'aria-hidden': 'true' }, icon('next')),
          ),
        );
      }),
    );
  }
  const main = h('main', { class: 'screen archive' }, bar.el, h('p', { class: 'screen-intro' }, t('archiveIntro')));
  if (langs.length > 1) {
    const seg = segmented({
      options: langs.map((l) => [l, t(`langName_${l}`)]),
      value: lang,
      label: t('archiveLang'),
      onChange: (v) => {
        lang = v;
        draw();
      },
    });
    main.append(seg.el);
  }
  draw();
  main.append(list);
  return { root: main, focus: bar.title };
}
