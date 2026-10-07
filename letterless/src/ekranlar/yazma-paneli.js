// Anlatım yazma paneli (Kur: yaz ve Günün sözcüğü ortak; docs/oyun-tasarimi.md §3, §8): gizli sözcük, yasak
// harf rozeti, yönerge, yerel <textarea> (dikte edilebilir), işaretli önizleme (dalgalı alt çizgi + ⚠),
// uyarı listesi (aciklama.js → issueText), kelime sayacı, tek canlı bölgeden duraklamada okunan durum
// ("3 kelime, gönderilebilir" ya da "2 sorun: …"), isteğe bağlı rövanş harfi seçimi, gönder düğmesi.
// Denetim her tuş vuruşunda çalışır (denetim.js → checkDescription, ~0,4 ms).

import { h, icon, announce } from '../arayuz/dom.js';
import { letterBadge, markedPreview } from '../arayuz/bilesen.js';
import { checkDescription, MAX_WORDS, MAX_CHARS } from '../denetim.js';
import { issueText, describeInstruction } from '../aciklama.js';
import { displayLetter } from '../turkce.js';
import { rematchLetterChoices, FREQUENT_COUNT } from '../deste.js';

const LIVE_DELAY = 900;
let panelSeq = 0;

/** Uyarıların tekilleştirilmiş cümleleri. */
export function issueSentences(check, uiLang, ctx) {
  const out = [];
  for (const issue of check.issues) {
    if (issue.type === 'empty') continue;
    const text = issueText(issue, uiLang, ctx);
    if (!out.includes(text)) out.push(text);
  }
  return out;
}

/** Canlı bölge cümlesi. */
export function liveText(t, check, sentences) {
  if (check.ok) return t('liveOk', check.words);
  if (!sentences.length) return t('liveEmpty');
  return t('liveIssues', sentences.length, sentences.join(' '));
}

/**
 * opts: { lang, letter, record, text, onText, rematch (bool), rematchLetter, onRematchLetter, submitLabel,
 *         onSubmit(check), imposedNote (öğe ya da null) }
 * Dönen: { el, input }
 */
export function writePanel(app, opts) {
  const { t } = app;
  const id = `w${++panelSeq}`;
  const { lang, letter, record } = opts;
  const ctx = { letter, lang };
  const check = (text) => checkDescription(text, { lang, letter, answer: record.word, extra: record.extra, allowed: record.allowed, translation: record.translation });

  const secret = h(
    'div',
    { class: 'secret-card', id: `${id}-secret` },
    letterBadge(t, letter, lang, { size: 'l' }),
    h('div', { class: 'secret-text' }, h('p', { class: 'secret-label' }, t('secretWord')), h('p', { class: 'secret-word', lang }, record.word), h('p', { class: 'instruction' }, describeInstruction(letter, lang, app.lang))),
  );

  const input = h('textarea', {
    id: `${id}-input`,
    class: 'text-area clue-input',
    rows: '3',
    maxlength: '200',
    autocomplete: 'off',
    autocapitalize: 'sentences',
    spellcheck: 'false',
    enterkeyhint: 'done',
    lang,
    'aria-describedby': `${id}-secret ${id}-counter ${id}-status`,
  });
  input.value = opts.text || '';
  const preview = h('div', { class: 'preview-box', 'aria-hidden': 'true' });
  const counter = h('p', { class: 'counter', id: `${id}-counter` });
  const status = h('p', { class: 'write-status', id: `${id}-status` });
  const issues = h('ul', { class: 'issues', 'aria-label': t('issuesLabel') });

  const submit = h('button', { class: 'button button-primary submit-button', type: 'button' }, icon('link'), opts.submitLabel);

  let last = null;
  let liveTimer = null;
  function update({ announceNow = false } = {}) {
    const c = check(input.value);
    last = c;
    const sentences = issueSentences(c, app.lang, ctx);
    preview.replaceChildren(input.value.trim() ? markedPreview(c) : h('p', { class: 'preview-placeholder' }, t('previewPlaceholder')));
    const chars = Array.from(c.text).length;
    counter.replaceChildren(
      h('span', { class: c.words > MAX_WORDS ? 'count is-over' : 'count' }, t('wordCounter', c.words, MAX_WORDS)),
      h('span', { class: chars > MAX_CHARS ? 'count is-over' : 'count' }, t('charCounter', chars, MAX_CHARS)),
    );
    if (c.ok) {
      status.className = 'write-status is-ok';
      status.replaceChildren(h('span', { class: 'status-icon', 'aria-hidden': 'true' }, '✓'), ' ', t('canSend'));
    } else if (!sentences.length) {
      status.className = 'write-status is-empty';
      status.replaceChildren(t('liveEmpty'));
    } else {
      status.className = 'write-status is-bad';
      status.replaceChildren(h('span', { class: 'status-icon', 'aria-hidden': 'true' }, '⚠'), ' ', t('issueCount', sentences.length));
    }
    issues.replaceChildren(...sentences.map((s) => h('li', { class: 'issue' }, h('span', { class: 'issue-icon', 'aria-hidden': 'true' }, '⚠'), h('span', {}, s))));
    issues.hidden = sentences.length === 0;
    if (c.ok) submit.removeAttribute('aria-disabled');
    else submit.setAttribute('aria-disabled', 'true');
    clearTimeout(liveTimer);
    const say = () => announce(liveText(t, c, sentences));
    if (announceNow) say();
    else if (input.value.trim()) liveTimer = setTimeout(say, LIVE_DELAY);
    if (opts.onText) opts.onText(input.value);
    return c;
  }
  input.addEventListener('input', () => update());

  submit.addEventListener('click', () => {
    const c = update({ announceNow: !last || !last.ok });
    if (!c.ok) {
      input.focus();
      return;
    }
    opts.onSubmit(c);
  });

  const parts = [
    secret,
    opts.imposedNote || null,
    h('div', { class: 'field' }, h('label', { class: 'field-label', for: `${id}-input` }, t('yourClue')), input),
    h('div', { class: 'preview-wrap' }, preview),
    counter,
    status,
    issues,
  ];

  if (opts.rematch) parts.push(rematchChooser(app, { lang, chosen: opts.rematchLetter, onChange: opts.onRematchLetter, id }));
  parts.push(submit);

  update({ announceNow: false });
  const el = h('div', { class: 'write-panel' }, parts);
  return { el, input };
}

/** "Rövanşta rakibine hangi harfi yasaklıyorsun?" (isteğe bağlı; sık harfler önde). Yerel radyo düğmeleri. */
function rematchChooser(app, { lang, chosen, onChange, id }) {
  const { t } = app;
  const letters = rematchLetterChoices(lang);
  const name = `${id}-rematch`;
  const option = (value, label, extraCls = '') => {
    const input = h('input', { type: 'radio', name, value, class: 'chip-input', id: `${name}-${value || 'none'}`, lang: value ? lang : null });
    input.checked = (chosen || '') === value;
    input.addEventListener('change', () => onChange(value || null));
    return h('label', { class: `chip ${extraCls}`.trim(), for: `${name}-${value || 'none'}` }, input, h('span', { class: 'chip-text' }, label));
  };
  const frequent = letters.slice(0, FREQUENT_COUNT);
  const rest = letters.slice(FREQUENT_COUNT);
  const restWrap = h('div', { class: 'chip-row chip-rest', hidden: !(chosen && rest.includes(chosen)) }, rest.map((l) => option(l, displayLetter(l, lang))));
  const more = h(
    'button',
    {
      class: 'button button-quiet more-letters',
      type: 'button',
      'aria-expanded': restWrap.hidden ? 'false' : 'true',
      on: {
        click: () => {
          restWrap.hidden = !restWrap.hidden;
          more.setAttribute('aria-expanded', restWrap.hidden ? 'false' : 'true');
          more.lastChild.textContent = restWrap.hidden ? t('moreLetters') : t('fewerLetters');
        },
      },
    },
    icon('plus'),
    h('span', {}, restWrap.hidden ? t('moreLetters') : t('fewerLetters')),
  );
  return h(
    'fieldset',
    { class: 'rematch-chooser' },
    h('legend', { class: 'field-label' }, t('rematchQuestion')),
    h('p', { class: 'field-hint' }, t('rematchHint')),
    h('div', { class: 'chip-row' }, option('', t('rematchNone'), 'chip-none'), frequent.map((l) => option(l, displayLetter(l, lang)))),
    restWrap,
    more,
  );
}
