// Ana ekran (docs/oyun-tasarimi.md §2.2, §3): günün sözcüğü kartı (sözcük dokunmadan görünmez), seri,
// "Arkadaşına anlat", ilk açılışta örnek anlatım ve canlı denetimli "Sen dene" alanı (öğretici budur),
// gönderdiklerin (sonucu gelenler işaretli), çözme arşivi, Ayarlar.

import { h, icon, announce } from '../arayuz/dom.js';
import { iconButton, primaryButton, quietButton, section, emptyState, letterBadge, markedPreview } from '../arayuz/bilesen.js';
import { dailyPuzzle, dayNumber } from '../gunluk.js';
import { letterSuffix } from '../turkce.js';
import { checkDescription } from '../denetim.js';
import { issueText } from '../aciklama.js';
import { archiveEntries } from '../deste.js';
import { dailyStreak } from '../depo.js';
import { sentNewestFirst, homeExample } from '../akis.js';
import { sentRow } from './ortak.js';

const HOME_SENT = 5;

/** Günün sözcüğü (bugün, arayüz dilinde); saat yanlışsa (başlangıçtan önce) null. */
export function todaysDaily(app) {
  const today = app.today();
  try {
    if (dayNumber(today) < 1) return null;
    return dailyPuzzle(today, app.lang);
  } catch {
    return null;
  }
}

function dailyCard(app) {
  const { t, data } = app;
  const today = app.today();
  const daily = todaysDaily(app);
  if (!daily) {
    return h('section', { class: 'daily-card daily-error' }, h('h2', { class: 'daily-title' }, t('dailyTitle')), h('p', {}, t('checkClock')));
  }
  const mine = data.daily[today] && data.daily[today].lang === daily.lang ? data.daily[today] : null;
  const streak = dailyStreak(data, today);
  const head = h(
    'div',
    { class: 'daily-head' },
    letterBadge(t, daily.letter, daily.lang, { size: 'm' }),
    h('div', { class: 'daily-text' }, h('h2', { class: 'daily-title' }, t('dailyHeading', daily.no)), h('p', { class: 'daily-sub' }, mine ? t('dailyDone', mine.words) : t('dailyLetter', daily.letter, daily.lang))),
  );
  const streakEl = streak > 0 ? h('p', { class: 'streak' }, icon('flame', 'streak-icon'), t('streakDays', streak)) : null;
  const button = mine
    ? primaryButton(t('dailyShareAgain'), () => app.go('daily'), { iconName: 'share', cls: 'daily-button' })
    : primaryButton(t('dailyReveal'), () => app.go('daily'), { iconName: 'calendar', cls: 'daily-button' });
  return h('section', { class: 'daily-card', 'aria-label': t('dailyTitle') }, head, mine ? h('p', { class: 'daily-own' }, `«${mine.description}»`) : null, streakEl, button);
}

/** İlk açılış örneği (içeriğin ilk ekran örneği, ör. «Miyavlayan tüylü dost») ve canlı denetimli "Sen dene" alanı. */
function exampleCard(app, onClose) {
  const { t } = app;
  const ex = homeExample(app.lang);
  const input = h('input', {
    id: 'example-try',
    class: 'text-input',
    type: 'text',
    autocomplete: 'off',
    autocapitalize: 'none',
    spellcheck: 'false',
    'aria-describedby': 'example-result',
    maxlength: '60',
  });
  const preview = h('div', { class: 'example-preview' });
  const result = h('p', { id: 'example-result', class: 'example-result' }, t('exampleHint'));
  let timer = null;
  input.addEventListener('input', () => {
    const value = input.value;
    if (!value.trim()) {
      preview.replaceChildren();
      result.textContent = t('exampleHint');
      result.className = 'example-result';
      return;
    }
    const check = checkDescription(value, { lang: ex.lang, letter: ex.letter, answer: ex.answer });
    preview.replaceChildren(markedPreview(check));
    const first = check.issues.find((i) => i.type !== 'empty');
    if (first) {
      result.className = 'example-result is-bad';
      result.replaceChildren(h('span', { 'aria-hidden': 'true' }, '⚠ '), issueText(first, app.lang, { letter: ex.letter, lang: ex.lang }));
    } else {
      result.className = 'example-result is-ok';
      result.replaceChildren(h('span', { 'aria-hidden': 'true' }, '✓ '), t('exampleOk'));
    }
    clearTimeout(timer);
    timer = setTimeout(() => announce(result.textContent.replace(/^[⚠✓] /, '')), 700);
  });
  return h(
    'section',
    { class: 'example-card', 'aria-labelledby': 'example-title' },
    h('h2', { id: 'example-title', class: 'section-title' }, t('exampleTitle')),
    h('p', { class: 'example-setup' }, t('exampleSetup', ex.answer, ex.letter, ex.lang)),
    h('div', { class: 'example-clue-row' }, letterBadge(t, ex.letter, ex.lang, { size: 's' }), h('p', { class: 'example-clue clue-text', lang: ex.lang }, `«${ex.clue}»`)),
    h('label', { class: 'field-label', for: 'example-try' }, t('exampleTry', ex.tryWord)),
    input,
    preview,
    result,
    h('div', { class: 'example-actions' }, quietButton(t('gotIt'), onClose, { iconName: 'check' })),
  );
}

function sentSection(app) {
  const { t, data } = app;
  const list = sentNewestFirst(data);
  const body = list.length
    ? h('ul', { class: 'sent-list' }, list.slice(0, HOME_SENT).map((e) => h('li', {}, sentRow(app, e))))
    : emptyState({ iconName: 'send', text: t('sentEmpty'), cls: 'sent-empty' });
  const more = list.length > HOME_SENT ? quietButton(t('sentAll', list.length), () => app.go('sentList'), { iconName: 'next', cls: 'more-button' }) : null;
  return section(t('sentTitle'), 'sent-section', body, more);
}

function archiveCard(app) {
  const { t, data } = app;
  const entries = archiveEntries(app.lang).length ? archiveEntries(app.lang) : archiveEntries();
  const done = entries.filter((e) => data.archive[e.no] && data.archive[e.no].done).length;
  return h(
    'button',
    { class: 'row-button archive-entry', type: 'button', on: { click: () => app.go('archive') } },
    h('span', { class: 'row-icon', 'aria-hidden': 'true' }, icon('book')),
    h('span', { class: 'row-text' }, h('span', { class: 'row-title' }, t('archiveTitle')), h('span', { class: 'row-sub' }, t('archiveProgress', done, entries.length))),
    h('span', { class: 'row-chevron', 'aria-hidden': 'true' }, icon('next')),
  );
}

export function render(app) {
  const { t, data } = app;
  const title = h('h1', { class: 'brand-name', tabindex: '-1' }, app.name());
  const head = h(
    'header',
    { class: 'home-head' },
    h('div', { class: 'brand' }, h('span', { class: 'brand-tile', 'aria-hidden': 'true' }, h('span', { class: 'brand-tile-letter' }, app.name()[0]), h('span', { class: 'badge-strike' })), h('div', { class: 'brand-text' }, title, h('p', { class: 'slogan' }, t('slogan')))),
    iconButton('settings', t('settings'), () => app.go('settings'), 'settings-button'),
  );
  const showExample = !data.exampleClosed && data.sent.length === 0;
  const main = h('main', { class: 'screen home' });
  const example = showExample
    ? exampleCard(app, () => {
        data.exampleClosed = true;
        app.save();
        example.remove();
        create.focus();
      })
    : null;
  const create = primaryButton(t('describeForFriend'), () => app.go('create', { fresh: true }), { iconName: 'pencil', cls: 'create-button', sub: t('describeForFriendSub') });
  main.append(head, dailyCard(app), create, ...(example ? [example] : []), sentSection(app), archiveCard(app));
  return { root: main, focus: title };
}
