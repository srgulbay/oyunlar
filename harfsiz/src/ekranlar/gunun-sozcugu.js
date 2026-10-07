// Günün sözcüğü (docs/oyun-tasarimi.md §3, §5, §7): herkese aynı gün aynı sözcük ve aynı yasak harf
// (gunluk.js). Önce kart ("Sözcüğü gör"); sözcük dokunmadan görünmez. Sonra sözcük, harf ve yazma paneli;
// paylaşım "Önce bil, sonra sen anlat". Bugün anlatıldıysa kendi anlatımı ve paylaşım. Seri. Saat
// başlangıçtan önceyse "Cihaz saatini denetle". Widget'a yalnız gün, harf ve "anlatıldı mı" gider.
// Geçmiş günler (Harfsiz Hepsi, yalnız iOS) aynı ekranı tarihle açar.

import { h, toast } from '../arayuz/dom.js';
import { topBar, letterBadge, primaryButton, quietButton, section, note, emptyState } from '../arayuz/bilesen.js';
import { dailyPuzzle, dayNumber } from '../gunluk.js';
import { inviteMessage } from '../paylas.js';
import { saveDaily, addSent, dailyStreak } from '../depo.js';
import { makePuzzle, inviteData, linkFor, addressFor } from '../akis.js';
import { channelButtons, cardPreview, shareCard } from '../paylasim.js';
import { writePanel } from './yazma-paneli.js';
import { formatDate } from '../metinler.js';

function dailyMessage(app, mine, channel) {
  const url = linkFor({ root: app.root, uiLang: app.lang, kind: 'p', code: mine.code, channel });
  return inviteMessage(inviteData({ lang: mine.lang, letter: mine.letter, words: mine.words, description: mine.description, url, day: mine.no }), app.lang);
}

export function render(app, arg = {}) {
  const { t, data } = app;
  const today = app.today();
  const date = arg.date || today;
  const past = date !== today;
  let daily = null;
  try {
    if (dayNumber(today) >= 1 && dayNumber(date) >= 1) daily = dailyPuzzle(date, app.lang);
  } catch {
    daily = null;
  }
  const bar = topBar(app, { title: daily ? t('dailyHeading', daily.no) : t('dailyTitle'), back: past ? 'dailyArchive' : 'home' });
  const main = h('main', { class: 'screen daily' }, bar.el);
  if (!daily) {
    main.append(emptyState({ iconName: 'warning', text: t('checkClock'), button: primaryButton(t('backHome'), () => app.go('home'), { iconName: 'back' }) }));
    return { root: main, focus: bar.title };
  }
  const mine = data.daily[date] && data.daily[date].lang === daily.lang ? data.daily[date] : null;
  const streak = dailyStreak(data, today);
  if (past) main.append(h('p', { class: 'daily-date' }, formatDate(date, app.lang, { year: true })));

  if (mine) {
    main.append(
      h('div', { class: 'daily-done' }, letterBadge(t, daily.letter, daily.lang, { size: 'l' }), h('div', {}, h('p', { class: 'daily-done-title' }, past ? t('dailyDonePast', mine.words) : t('dailyDone', mine.words)), h('p', { class: 'daily-own clue-text', lang: mine.lang }, `«${mine.description}»`))),
    );
    if (streak > 0 && !past) main.append(h('p', { class: 'streak' }, t('streakDays', streak)));
    main.append(
      section(
        t('dailyShareTitle'),
        'channel-section',
        h('p', { class: 'section-hint' }, t('dailyShareHint')),
        channelButtons(app, { build: (c) => dailyMessage(app, mine, c), event: 'paylasti', title: app.name(), alt: dailyMessage(app, mine, null).body.split('\n')[0] }),
      ),
    );
    const card = { kind: 'invite', lang: mine.lang, uiLang: app.lang, letter: mine.letter, words: mine.words, description: mine.description, day: mine.no, address: addressFor(app.root, app.lang), theme: data.settings.theme };
    const preview = cardPreview(card, 'story', { cls: 'story-thumb' });
    main.append(
      section(
        t('storyTitle'),
        'story-section',
        h('div', { class: 'story-layout' }, preview.el, h('div', { class: 'story-side' }, h('p', { class: 'section-hint' }, t('storyHint')), quietButton(t('storyShare'), () => shareCard(app, { card, format: 'story', nativeChannel: 'sistem', text: dailyMessage(app, mine, 'sys').text, url: dailyMessage(app, mine, 'sys').url, title: app.name() }), { iconName: 'image' }))),
      ),
    );
    if (!past) main.append(note(t('dailyTomorrow'), { kind: 'info' }));
  } else if (!app.revealed.has(date)) {
    const reveal = primaryButton(t('dailyRevealShort'), () => {
      app.revealed.add(date);
      app.refresh();
    }, { iconName: 'calendar', cls: 'reveal-button' });
    main.append(
      h(
        'section',
        { class: 'daily-cover', 'aria-labelledby': 'daily-cover-title' },
        letterBadge(t, daily.letter, daily.lang, { size: 'xl' }),
        h('h2', { class: 'daily-cover-title', id: 'daily-cover-title' }, t('dailyLetter', daily.letter, daily.lang)),
        h('p', { class: 'daily-cover-text' }, t('dailyExplain')),
        reveal,
      ),
    );
    if (streak > 0) main.append(h('p', { class: 'streak' }, t('streakDays', streak)));
  } else {
    const panel = writePanel(app, {
      lang: daily.lang,
      letter: daily.letter,
      record: daily.record,
      text: app.draftDaily && app.draftDaily.date === date ? app.draftDaily.text : '',
      onText: (v) => {
        app.draftDaily = { date, text: v };
      },
      rematch: false,
      submitLabel: t('createLink'),
      onSubmit: (check) => {
        let made;
        try {
          made = makePuzzle({ lang: daily.lang, deck: daily.deckCode, letter: daily.letter, answer: daily.word, description: check.text, senderTag: data.senderTag, rng: app.rng, day: daily.no });
        } catch (e) {
          console.error(e);
          toast(t('linkFailed'));
          return;
        }
        saveDaily(data, date, { no: daily.no, lang: daily.lang, code: made.code, ref: made.ref, words: check.words, description: check.text, letter: daily.letter });
        addSent(data, { ref: made.ref, code: made.code, date: today, lang: daily.lang, deck: daily.deckCode, letter: daily.letter, words: check.words, description: check.text, day: daily.no });
        app.draftDaily = null;
        app.played();
        app.count('kurdu', '-');
        app.count('gunluk_kurdu', '-');
        app.save();
        app.pushWidget();
        app.refresh();
      },
    });
    main.append(panel.el);
    return { root: main, focus: panel.input, enter: () => panel.input.focus({ preventScroll: true }) };
  }
  if (!past && app.storeAvailable()) main.append(quietButton(t('pastDays'), () => app.go('dailyArchive'), { iconName: 'calendar', cls: 'past-days' }));
  return { root: main, focus: bar.title };
}
