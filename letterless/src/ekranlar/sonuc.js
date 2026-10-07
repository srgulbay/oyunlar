// Sonuç, alıcı (docs/oyun-tasarimi.md §2.1, §3): "Bildin: 2. hakta" / "Bilemedin", gizli sözcük, kabul notu,
// puanlar, skor (rövanşta), kart önizlemesi. Birincil "Rövanş: şimdi sen anlat" (rakibin seçtiği harf
// yazılı); ikincil "Sonucu gönder" (#r=). Günün sözcüğünde "Şimdi sen anlat", arşivde "Şimdi sen birine
// anlat". Webde tek satırlık uygulama önerisi. Bildir ve gizle burada da. Teklif hiçbir zaman yok.
// Alıcı yolu hak okumaz: bu modül haklar.js'i içe aktarmaz.

import { h, openDialog, reduceMotion } from '../arayuz/dom.js';
import { topBar, attemptStrip, letterBadge, scoreLine, primaryButton, secondaryButton, quietButton, note, section } from '../arayuz/bilesen.js';
import { verdictNote, pointsText } from '../aciklama.js';
import { displayLetter } from '../turkce.js';
import { resultMessage } from '../paylas.js';
import { archiveEntries } from '../deste.js';
import { readRound } from '../depo.js';
import { restoreRound, roundStore, roundOutcome, rematchContext, makeResult, resultData, linkFor, addressFor, archiveContext } from '../akis.js';
import { channelButtons, cardPreview, shareCard } from '../paylasim.js';
import { safetyActions, hiddenNotice } from './ortak.js';
import { todaysDaily } from './ana.js';
import { APP_STORE_URL, safeUrl } from '../yapilandirma.js';

/** Kart verisi (çözenin gözünden; cevap yok). */
export function solverCard(app, ctx, outcome) {
  const p = ctx.puzzle;
  return {
    kind: 'result',
    perspective: 'solver',
    lang: p.lang,
    uiLang: app.lang,
    letter: p.letter,
    words: ctx.words,
    description: p.description,
    solved: outcome.solved,
    attempts: outcome.attempts,
    day: p.day || null,
    match: outcome.totals ? { me: outcome.totals.me, them: outcome.totals.them } : null,
    address: addressFor(app.root, app.lang),
    theme: app.data.settings.theme,
  };
}

function sendResultDialog(app, ctx, round) {
  const { t } = app;
  let made;
  try {
    made = makeResult(ctx, round);
  } catch (e) {
    console.error(e);
    return;
  }
  const build = (channel) => resultMessage(resultData(ctx, round, linkFor({ root: app.root, uiLang: app.lang, kind: 'r', code: made.code, channel })), app.lang);
  openDialog({
    title: t('sendResultTitle'),
    cls: 'dialog-share',
    content: (close) => [
      h('p', { class: 'message-text dialog-message' }, build(null).text),
      channelButtons(app, { build, event: 'sonuc_paylasti', title: app.name(), alt: build(null).body.split('\n')[0], onShared: () => setTimeout(() => close(true), 300) }),
      h('div', { class: 'dialog-buttons' }, h('button', { class: 'button button-quiet', type: 'button', on: { click: () => close(false) } }, t('close'))),
    ],
  });
}

function nextArchive(app, ctx) {
  const list = archiveEntries(ctx.puzzle.lang);
  const start = list.findIndex((e) => e.no === ctx.archiveNo);
  for (let i = 1; i <= list.length; i++) {
    const e = list[(start + i) % list.length];
    if (!app.data.archive[e.no] || !app.data.archive[e.no].done) return e;
  }
  return null;
}

export async function render(app, arg = {}) {
  const { t, data } = app;
  const ctx = arg.ctx;
  if (!ctx) return { redirect: ['home'] };
  const where = roundStore(ctx);
  const round = restoreRound(readRound(data, where.kind, where.key));
  if (!round.done) return { redirect: ['solve', ctx] };
  const p = ctx.puzzle;
  const outcome = roundOutcome(ctx, round);
  const bar = topBar(app, { title: null, back: ctx.source === 'archive' ? 'archive' : 'home' });
  const main = h('main', { class: `screen result ${outcome.solved ? 'is-solved' : 'is-missed'}` }, bar.el);

  const title = h('h1', { class: 'result-title', tabindex: '-1' }, h('span', { class: 'result-mark', 'aria-hidden': 'true' }, outcome.solved ? '●' : '✕'), ' ', outcome.solved ? t('youGotIt', outcome.attempts) : t('notThisTime'));
  if (arg.justFinished && outcome.solved && !reduceMotion()) title.classList.add('celebrate');
  const lastGuess = round.guesses[round.guesses.length - 1];
  const vnote = outcome.solved && lastGuess ? verdictNote(lastGuess.verdict, lastGuess.text, app.lang) : null;

  main.append(
    title,
    h(
      'div',
      { class: 'answer-block' },
      h('p', { class: 'answer-label' }, t('theAnswerWas')),
      h('p', { class: 'answer-word', lang: p.lang }, p.answer),
      vnote ? h('p', { class: 'verdict-note' }, vnote) : null,
    ),
    h(
      'div',
      { class: 'recap' },
      letterBadge(t, p.letter, p.lang, { size: 's' }),
      h('div', {}, h('p', { class: 'recap-clue clue-text', lang: p.lang }, `«${p.description}»`), h('p', { class: 'recap-meta' }, t('clueMeta', p.letter, p.lang, ctx.words))),
    ),
    attemptStrip(t, { solved: outcome.solved, attempts: outcome.attempts }, { cls: 'result-strip' }),
    h('p', { class: 'points' }, pointsText(outcome.points, app.lang)),
  );
  if (outcome.totals) main.append(scoreLine(t, outcome.totals, { cls: 'result-score' }));
  if (ctx.source === 'own') main.append(note(t('ownResultNote'), { kind: 'info' }));

  const card = solverCard(app, ctx, outcome);
  const actions = h('div', { class: 'result-actions' });
  if (ctx.source === 'link') {
    const daily = p.day ? todaysDaily(app) : null;
    if (daily && daily.no === p.day && daily.lang === p.lang && !data.daily[app.today()]) {
      actions.append(primaryButton(t('nowYouDescribeDaily'), () => app.go('daily'), { iconName: 'pencil' }));
    } else {
      const sub = p.rematchLetter ? t('rematchBanned', displayLetter(p.rematchLetter, p.lang)) : null;
      actions.append(primaryButton(t('rematch'), () => app.go('create', { fresh: true, context: rematchContext(ctx, round) }), { iconName: 'rematch', sub, cls: 'rematch-button' }));
    }
    actions.append(secondaryButton(t('sendResult'), () => sendResultDialog(app, ctx, round), { iconName: 'send' }));
  } else if (ctx.source === 'archive') {
    actions.append(primaryButton(t('nowYouDescribe'), () => app.go('create', { fresh: true }), { iconName: 'pencil' }));
    const next = nextArchive(app, ctx);
    if (next) {
      actions.append(
        secondaryButton(t('nextArchive', next.no), () => app.go('solve', archiveContext(next)), { iconName: 'next' }),
      );
    }
  } else {
    actions.append(primaryButton(t('backHome'), () => app.go('home'), { iconName: 'back' }));
  }
  main.append(actions);

  if (ctx.source !== 'own') {
    const preview = cardPreview(card, 'square');
    main.append(
      section(
        t('cardTitle'),
        'card-section',
        preview.el,
        quietButton(t('shareCard'), () => shareCard(app, { card, format: 'square', title: app.name() }), { iconName: 'image', cls: 'share-card' }),
      ),
    );
  }

  // Tek satırlık öneri (yalnız web, bağlantıyla gelen; docs/oyun-tasarimi.md §2.1): Android'de "Ana ekrana ekle"
  // (tarayıcı kurulum isteği verdiyse tek dokunuş, yoksa menü ipucu), öteki tarayıcılarda iOS uygulaması.
  if (!app.platform.isNative && ctx.source === 'link') {
    if (/Android/i.test(globalThis.navigator ? navigator.userAgent : '')) {
      const prompt = app.installPrompt;
      if (prompt) {
        const button = quietButton(t('addToHome'), async () => {
          app.installPrompt = null;
          button.remove();
          try {
            await prompt.prompt();
          } catch {
            /* istek kullanıldı ya da reddedildi */
          }
        }, { iconName: 'download', cls: 'app-line' });
        main.append(button);
      } else main.append(h('p', { class: 'app-line' }, t('addToHomeHint')));
    } else {
      const url = safeUrl(APP_STORE_URL);
      main.append(h('p', { class: 'app-line' }, url ? h('a', { href: url, rel: 'noopener' }, t('appLine')) : t('appLine')));
    }
  }

  const safety = safetyActions(app, ctx, {
    onHidden: (info) => app.go('linkState', { state: 'hidden', reason: info.reason, notice: hiddenNotice(app, info) }),
  });
  if (safety) main.append(safety);
  return { root: main, focus: title };
}
