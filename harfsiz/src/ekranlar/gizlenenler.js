// Gizlenenler (Ayarlar → Gizlenenler; KOORDINASYON.md §10): bildirilen ya da gizlenen bulmacalar ve
// gizlenen gönderenler; her biri geri açılır. Gizlenen anlatımın metni yeniden gösterilmez (yalnız harf,
// kelime sayısı ve tarih). Boşken tek cümle.

import { h, announce } from '../arayuz/dom.js';
import { topBar, section, emptyState, letterBadge } from '../arayuz/bilesen.js';
import { unhideRef, unhideSender } from '../depo.js';
import { formatDate } from '../metinler.js';

export function render(app) {
  const { t, data } = app;
  const bar = topBar(app, { title: t('hiddenTitle'), back: 'settings' });
  const main = h('main', { class: 'screen hidden-list' }, bar.el);
  const body = h('div', { class: 'hidden-body' });
  main.append(h('p', { class: 'screen-intro' }, t('hiddenIntro')), body);

  function draw() {
    const refs = [...data.hidden.refs].reverse();
    const senders = [...data.hidden.senders].reverse();
    if (!refs.length && !senders.length) {
      body.replaceChildren(emptyState({ iconName: 'hide', text: t('hiddenEmpty') }));
      return;
    }
    const parts = [];
    if (refs.length) {
      parts.push(
        section(
          t('hiddenClues'),
          'hidden-clues',
          h(
            'ul',
            { class: 'hidden-items' },
            refs.map((r) =>
              h(
                'li',
                { class: 'hidden-item' },
                r.letter ? letterBadge(t, r.letter, r.lang, { size: 's', decorative: true }) : null,
                h('span', { class: 'row-text' }, h('span', { class: 'row-title' }, r.words ? t('hiddenClueTitle', r.letter, r.lang, r.words) : t('hiddenClueGeneric')), h('span', { class: 'row-sub' }, [r.reason === 'report' ? t('reportedOn') : t('hiddenOn'), r.date ? formatDate(r.date, app.lang) : ''].filter(Boolean).join(' · '))),
                h(
                  'button',
                  {
                    class: 'button button-secondary unhide',
                    type: 'button',
                    on: {
                      click: () => {
                        unhideRef(data, r.ref);
                        app.save();
                        announce(t('unhidden'));
                        draw();
                        bar.title.focus();
                      },
                    },
                  },
                  t('unhide'),
                ),
              ),
            ),
          ),
        ),
      );
    }
    if (senders.length) {
      parts.push(
        section(
          t('hiddenSenders'),
          'hidden-senders',
          h(
            'ul',
            { class: 'hidden-items' },
            senders.map((s, i) =>
              h(
                'li',
                { class: 'hidden-item' },
                h('span', { class: 'row-text' }, h('span', { class: 'row-title' }, t('senderN', senders.length - i)), h('span', { class: 'row-sub' }, [t('hiddenOn'), s.date ? formatDate(s.date, app.lang) : ''].filter(Boolean).join(' · '))),
                h(
                  'button',
                  {
                    class: 'button button-secondary unhide',
                    type: 'button',
                    on: {
                      click: () => {
                        unhideSender(data, s.tag);
                        app.save();
                        announce(t('unhidden'));
                        draw();
                        bar.title.focus();
                      },
                    },
                  },
                  t('unhide'),
                ),
              ),
            ),
          ),
        ),
      );
    }
    body.replaceChildren(...parts);
  }
  draw();
  return { root: main, focus: bar.title };
}
