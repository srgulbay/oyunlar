// Çöz (docs/oyun-tasarimi.md §2.1, §3): ilk ekran bulmacanın kendisidir. Rozet, "Biri sana E harfini hiç
// kullanmadan 3 kelimeyle anlattı:", iri anlatım, tek alan ve tek düğme, hak şeridi (○ ○ ○), yanlış
// tahminler, deste notu (ücretli desteden geldiyse), "Pes et", "Bildir", "Gönderenden gelenleri gizle";
// rövanşta önceki turun sonucu ve skor. Kendi bağlantısında "Bu anlatımı sen yazdın…" notu; sayaç yazılmaz.
// Alıcı yolu hak okumaz: bu modül haklar.js'i içe aktarmaz (arayuz-akis.test.js sınar).

import { h, announce, openDialog, reduceMotion } from '../arayuz/dom.js';
import { topBar, attemptStrip, note, scoreLine, quietButton } from '../arayuz/bilesen.js';
import { deckByCode } from '../deste.js';
import { deckNote, guessEventText } from '../aciklama.js';
import { MAX_ATTEMPTS } from '../tahmin.js';
import { readRound, saveRound } from '../depo.js';
import { restoreRound, roundStore, guess as applyGuessTo, surrender } from '../akis.js';
import { clueHeading, clueBlock, safetyActions, ownNote, hiddenNotice } from './ortak.js';

/** Bağlam başlığı (üst çubuk). */
export function solveTitle(app, ctx) {
  const { t } = app;
  if (ctx.source === 'archive') return t('archiveItemTitle', ctx.archiveNo);
  if (ctx.puzzle.day) return t('dayTitle', app.name(), ctx.puzzle.day);
  return app.name();
}

export function render(app, ctx) {
  const { t, data } = app;
  if (!ctx || !ctx.puzzle) return { redirect: ['home'] };
  const p = ctx.puzzle;
  const where = roundStore(ctx);
  let round = restoreRound(readRound(data, where.kind, where.key));
  if (round.done) return { redirect: ['result', { ctx }] };

  if (ctx.source === 'link') app.countOnce('acildi', ctx.ref, ctx.channel);

  const bar = topBar(app, { title: solveTitle(app, ctx), back: 'home' });
  const main = h('main', { class: 'screen solve' }, bar.el);
  const heading = h('h2', { class: 'clue-heading', id: 'clue-heading' }, clueHeading(app, ctx));

  if (ctx.source === 'own') main.append(ownNote(t));
  if (p.prev && ctx.source !== 'archive') {
    main.append(h('p', { class: 'prev-line' }, h('span', { 'aria-hidden': 'true' }, p.prev.solved ? '✅ ' : '😅 '), p.prev.solved ? t('theySolvedYours', p.prev.attempts) : t('theyMissedYours')));
  }
  if (p.match && p.match.round > 1) main.append(scoreLine(t, { me: p.match.them, them: p.match.me }, { cls: 'solve-score' }));
  main.append(heading, clueBlock(app, ctx));
  const dn = deckNote(deckByCode(p.deck), app.lang);
  if (dn) main.append(note(dn, { kind: 'info', cls: 'deck-note' }));

  // Tahmin formu: tek alan, tek düğme. Boş, geçersiz ve yinelenen tahmin hak harcamaz.
  const input = h('input', {
    id: 'guess-input',
    class: 'text-input guess-input',
    type: 'text',
    autocomplete: 'off',
    autocapitalize: 'none',
    autocorrect: 'off',
    spellcheck: 'false',
    enterkeyhint: 'go',
    maxlength: '60',
    lang: p.lang,
    'aria-describedby': 'guess-feedback attempts-left',
  });
  const feedback = h('p', { class: 'guess-feedback', id: 'guess-feedback' });
  const left = h('p', { class: 'attempts-left', id: 'attempts-left' });
  const strip = h('div', { class: 'strip-wrap' });
  const tried = h('ul', { class: 'tried', 'aria-label': t('triedLabel') });
  const form = h(
    'form',
    { class: 'guess-form', novalidate: true },
    h('label', { class: 'field-label', for: 'guess-input' }, t('yourGuess')),
    h('div', { class: 'guess-row' }, input, h('button', { class: 'button button-primary guess-button', type: 'submit' }, t('guessButton'))),
    feedback,
  );

  function drawRound() {
    const attempts = round.guesses.length;
    strip.replaceChildren(attemptStrip(t, { solved: round.solved, attempts }));
    left.textContent = t('triesLeftShort', MAX_ATTEMPTS - attempts, MAX_ATTEMPTS);
    tried.replaceChildren(...round.guesses.map((g) => h('li', { class: 'tried-item', lang: p.lang }, h('span', { class: 'tried-mark', 'aria-hidden': 'true' }, '✕'), h('span', {}, g.text))));
    tried.hidden = round.guesses.length === 0;
  }

  function finish() {
    saveRound(data, where.kind, where.key, round, app.today());
    if (ctx.source === 'link') {
      app.countOnce('cozuldu', ctx.ref, ctx.channel);
      if (round.solved) app.countOnce('bildi', ctx.ref, ctx.channel);
    }
    if (ctx.source !== 'own') app.played();
    app.save();
    app.go('result', { ctx, justFinished: true });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = input.value;
    const { round: next, event } = applyGuessTo(ctx, round, value);
    round = next;
    if (event.type === 'correct' || (event.type === 'wrong' && round.done)) {
      if (event.type === 'wrong') announce(guessEventText(event, value.trim(), app.lang));
      finish();
      return;
    }
    const text = guessEventText(event, value.trim(), app.lang);
    feedback.textContent = text;
    feedback.className = `guess-feedback ${event.type === 'wrong' ? 'is-wrong' : 'is-info'}`;
    announce(text);
    if (event.type === 'wrong') {
      saveRound(data, where.kind, where.key, round, app.today());
      app.saveSoon();
      app.platform.haptic('warning');
      input.value = '';
      if (!reduceMotion()) {
        form.classList.remove('shake');
        void form.offsetWidth;
        form.classList.add('shake');
      }
    }
    drawRound();
    input.focus();
  });

  const giveUpButton = quietButton(t('giveUp'), () => {
    openDialog({
      title: t('giveUpTitle'),
      content: (close) => [
        h('p', { class: 'dialog-text' }, t('giveUpText')),
        h(
          'div',
          { class: 'dialog-buttons' },
          h('button', { class: 'button button-secondary', type: 'button', on: { click: () => close(false) } }, t('keepGuessing')),
          h(
            'button',
            {
              class: 'button button-primary',
              type: 'button',
              on: {
                click: () => {
                  close(true);
                  round = surrender(round);
                  finish();
                },
              },
            },
            t('giveUp'),
          ),
        ),
      ],
    });
  }, { iconName: 'close', cls: 'give-up' });

  drawRound();
  main.append(h('section', { class: 'guess-section', 'aria-labelledby': 'clue-heading' }, form, h('div', { class: 'attempts' }, strip, left), tried), giveUpButton);

  const safety = safetyActions(app, ctx, {
    onHidden: (info) => {
      const text = hiddenNotice(app, info);
      app.go('linkState', { state: 'hidden', reason: info.reason, notice: text });
    },
  });
  if (safety) main.append(safety);
  if (ctx.source === 'archive') main.append(h('p', { class: 'archive-foot' }, t('archiveFoot')));
  return { root: main, focus: bar.title };
}
