// Günün sözcüğü arşivi (Harfsiz Hepsi ile; yalnız iOS): geçmiş günlerin sözcükleriyle anlatmak.
// Hakkı olmayana kilitli kart ve "Mağaza" (kullanıcının başlattığı teklif anı). Haklar kurma yolundadır.

import { h, icon } from '../arayuz/dom.js';
import { topBar, letterBadge, note, primaryButton } from '../arayuz/bilesen.js';
import { dailyPuzzle, dayNumber, addDays } from '../gunluk.js';
import { entitlements } from '../haklar.js';
import { formatDate } from '../metinler.js';

const SHOWN_DAYS = 60;

export function render(app) {
  const { t, data } = app;
  if (!app.storeAvailable()) return { redirect: ['daily'] };
  const bar = topBar(app, { title: t('pastDays'), back: 'daily' });
  const main = h('main', { class: 'screen daily-archive' }, bar.el);
  const unlocked = entitlements(app.owned()).dailyArchive;
  if (!unlocked) {
    main.append(note(t('pastDaysLocked', app.name()), { kind: 'info' }), primaryButton(t('openStore'), () => app.go('store'), { iconName: 'bag' }));
    return { root: main, focus: bar.title };
  }
  const today = app.today();
  const list = h('ul', { class: 'day-list' });
  const first = Math.max(1, dayNumber(today) - SHOWN_DAYS);
  for (let n = dayNumber(today) - 1; n >= first; n--) {
    const date = addDays(today, n - dayNumber(today));
    let d;
    try {
      d = dailyPuzzle(date, app.lang);
    } catch {
      continue;
    }
    const done = data.daily[date] && data.daily[date].lang === d.lang;
    list.append(
      h(
        'li',
        {},
        h(
          'button',
          { class: 'row-button day-row', type: 'button', on: { click: () => app.go('daily', { date }) } },
          letterBadge(t, d.letter, d.lang, { size: 's', decorative: true }),
          h('span', { class: 'row-text' }, h('span', { class: 'row-title' }, t('dailyHeading', d.no)), h('span', { class: 'row-sub' }, `${formatDate(date, app.lang)} · ${t('letterPhrase', d.letter, d.lang)}`), done ? h('span', { class: 'status status-hit' }, h('span', { 'aria-hidden': 'true' }, '● '), t('dayDone')) : null),
          h('span', { class: 'row-chevron', 'aria-hidden': 'true' }, icon('next')),
        ),
      ),
    );
  }
  main.append(list.childElementCount ? list : note(t('pastDaysEmpty'), { kind: 'info' }));
  return { root: main, focus: bar.title };
}
