// Kur: yaz (docs/oyun-tasarimi.md §2.2, §3). Anlatım alanı açık ve odaklıdır (3. dokunuş). Geçerli olunca
// "Bağlantıyı oluştur": bulmaca kodu üretilir, gönderilenlere ve son 100 sözcüğe yazılır, sayaçlar
// (kurdu; rövanşta ayrıca rovans_kurdu) gider, Gönder ekranı açılır.

import { h, toast } from '../arayuz/dom.js';
import { topBar } from '../arayuz/bilesen.js';
import { deckById } from '../deste.js';
import { makePuzzle, imposedLetterFor } from '../akis.js';
import { addSent, rememberRecent } from '../depo.js';
import { contextNote } from './kur-ortak.js';
import { writePanel } from './yazma-paneli.js';

export function render(app) {
  const { t, data } = app;
  const draft = app.draft;
  if (!draft || !draft.picked) return { redirect: ['create', {}] };
  const { record, letter, deckCode, lang } = draft.picked;
  const deck = deckById(draft.picked.deckId);
  const context = draft.context || { kind: 'new' };
  const imposed = imposedLetterFor(context, lang);
  const bar = topBar(app, { title: t('writeTitle'), back: () => app.go('words', { deckId: draft.picked.deckId }) });

  const panel = writePanel(app, {
    lang,
    letter,
    record,
    text: draft.text || '',
    onText: (v) => {
      draft.text = v;
    },
    rematch: true,
    rematchLetter: draft.rematchLetter || null,
    onRematchLetter: (v) => {
      draft.rematchLetter = v;
    },
    submitLabel: t('createLink'),
    imposedNote: contextNote(app, context),
    onSubmit: (check) => {
      let made;
      try {
        made = makePuzzle({
          lang,
          deck: deckCode,
          letter,
          answer: record.word,
          description: check.text,
          senderTag: data.senderTag,
          rng: app.rng,
          rematchLetter: draft.rematchLetter || null,
          prev: context.prev || null,
          match: context.match || null,
        });
      } catch (e) {
        console.error(e);
        toast(t('linkFailed'));
        return;
      }
      addSent(data, {
        ref: made.ref,
        code: made.code,
        date: app.today(),
        lang,
        deck: deckCode,
        letter,
        words: check.words,
        description: check.text,
        day: null,
        match: context.match || null,
        rematchLetter: draft.rematchLetter || null,
        imposed: Boolean(imposed && imposed === letter),
        prev: context.prev ? { solved: context.prev.solved, attempts: context.prev.attempts } : null,
      });
      rememberRecent(data, record.word);
      app.played();
      app.count('kurdu', '-');
      if (context.kind === 'rematch') app.count('rovans_kurdu', '-');
      app.save();
      app.draft = null;
      app.go('send', { ref: made.ref, fresh: true });
    },
  });

  const main = h('main', { class: 'screen write' }, bar.el, deck ? h('p', { class: 'deck-tag' }, t('deckTag', deck.name[app.lang])) : null, panel.el);
  return {
    root: main,
    focus: panel.input,
    enter: () => {
      if (document.activeElement !== panel.input) panel.input.focus({ preventScroll: true });
    },
  };
}
