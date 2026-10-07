// Ekranlar arası ortak parçalar: gönderilen satırı, bulmaca başlık cümlesi, anlatım bloğu, sonuç durumu,
// "Bildir" ve "Gönderenden gelenleri gizle" (App Store 1.2; KOORDINASYON.md §10).

import { h, icon, announce, openDialog } from '../arayuz/dom.js';
import { letterBadge, note } from '../arayuz/bilesen.js';
import { REPORT_REASONS } from '../bildir.js';
import { openStateText } from '../aciklama.js';
import { hideRef, hideSender } from '../depo.js';
import { formatDate } from '../metinler.js';

/** Gönderilen bulmacanın durum etiketi: { text, kind: 'wait' | 'hit' | 'miss', mark }. */
export function sentStatus(t, entry) {
  const r = entry.result;
  if (!r) return { text: t('statusWaiting'), kind: 'wait', mark: '○' };
  if (r.solved) return { text: t('statusSolved', r.attempts), kind: 'hit', mark: '●' };
  return { text: t('statusMissed'), kind: 'miss', mark: '✕' };
}

/** Gönderdiklerin listesindeki satır (dokununca gönder ekranı: yeniden gönder, durum, skor). */
export function sentRow(app, entry) {
  const { t } = app;
  const st = sentStatus(t, entry);
  const meta = [t('letterPhrase', entry.letter, entry.lang), t('wordCount', entry.words)];
  if (entry.day) meta.unshift(t('dayTag', entry.day));
  if (entry.date) meta.push(formatDate(entry.date, app.lang));
  const score = entry.result && entry.result.match ? t('scoreValue', entry.result.match.me, entry.result.match.them) : null;
  return h(
    'button',
    { class: 'row-button sent-row', type: 'button', on: { click: () => app.go('send', { ref: entry.ref }) } },
    letterBadge(t, entry.letter, entry.lang, { size: 's', decorative: true }),
    h(
      'span',
      { class: 'row-text' },
      h('span', { class: 'row-title clue-text', lang: entry.lang }, `«${entry.description}»`),
      h('span', { class: 'row-sub' }, meta.join(' · ')),
      h('span', { class: `status status-${st.kind}` }, h('span', { class: 'status-mark', 'aria-hidden': 'true' }, st.mark), ' ', st.text, score ? ` · ${score}` : ''),
    ),
    h('span', { class: 'row-chevron', 'aria-hidden': 'true' }, icon('next')),
  );
}

/** Çöz ekranının başlık cümlesi: "Biri sana E harfini hiç kullanmadan 3 kelimeyle anlattı:". */
export function clueHeading(app, ctx) {
  const { t } = app;
  const p = ctx.puzzle;
  if (ctx.source === 'archive') return t('headingArchive', p.letter, p.lang, ctx.words);
  if (p.day) return t('headingDaily', p.letter, p.lang, ctx.words);
  if (p.match && p.match.round > 1) return t('headingRival', p.letter, p.lang, ctx.words);
  return t('headingSomeone', p.letter, p.lang, ctx.words);
}

/** Anlatım bloğu: rozet + iri anlatım. */
export function clueBlock(app, ctx, { size = 'xl' } = {}) {
  const { t } = app;
  const p = ctx.puzzle;
  return h(
    'div',
    { class: 'clue-block' },
    letterBadge(t, p.letter, p.lang, { size }),
    h('blockquote', { class: 'clue clue-text', lang: p.lang }, h('p', {}, `«${p.description}»`)),
  );
}

/**
 * "Bildir" ve "Gönderenden gelenleri gizle". Bildirimde neden seçilir; gönderim başarılı da olsa başarısız da
 * olsa bulmaca bu cihazda gizlenir ve sözleşmedeki cümle gösterilir. onHidden(state) sonrasını çizer.
 * Arşiv anlatımlarında (ekibin) çizilmez.
 */
export function safetyActions(app, ctx, { onHidden }) {
  const { t } = app;
  if (ctx.source === 'archive') return null;
  const p = ctx.puzzle;
  const meta = { ref: ctx.ref, date: app.today(), lang: p.lang, letter: p.letter, words: ctx.words };

  const report = h('button', { class: 'button button-quiet safety-report', type: 'button', on: { click: () => openReport() } }, icon('flag'), t('report'));
  const hide = p.sender
    ? h(
        'button',
        {
          class: 'button button-quiet safety-hide',
          type: 'button',
          on: {
            click: () => {
              hideSender(app.data, p.sender, app.today());
              app.save();
              const text = openStateText('hidden', app.lang, 'sender');
              announce(`${text.title}. ${text.body}`);
              onHidden({ reason: 'sender', status: null });
            },
          },
        },
        icon('hide'),
        t('hideSender'),
      )
    : null;

  function openReport() {
    let chosen = null;
    openDialog({
      title: t('reportTitle'),
      cls: 'dialog-report',
      content: (close) => {
        const name = 'report-reason';
        const options = Object.entries(REPORT_REASONS).map(([code, label]) =>
          h(
            'label',
            { class: 'radio-row' },
            h('input', {
              type: 'radio',
              name,
              value: code,
              on: {
                change: () => {
                  chosen = code;
                  send.removeAttribute('aria-disabled');
                },
              },
            }),
            h('span', {}, label[app.lang === 'tr' ? 'tr' : 'en']),
          ),
        );
        const status = h('p', { class: 'dialog-status', role: 'status' });
        const send = h(
          'button',
          {
            class: 'button button-danger',
            type: 'button',
            'aria-disabled': 'true',
            on: {
              click: async () => {
                if (!chosen) {
                  status.textContent = t('reportPick');
                  return;
                }
                if (send.dataset.busy) return;
                send.dataset.busy = '1';
                send.setAttribute('aria-disabled', 'true');
                status.textContent = t('reportSending');
                const outcome = await app.net.report({ code: ctx.code, reason: chosen, uiLang: app.lang });
                hideRef(app.data, { ...meta, reason: 'report' });
                app.save();
                if (ctx.source !== 'own') app.count('bildirdi', '-');
                close(true);
                onHidden({ reason: 'puzzle', status: outcome });
              },
            },
          },
          t('reportSend'),
        );
        return [
          h('p', { class: 'dialog-text' }, t('reportIntro')),
          h('fieldset', { class: 'radio-group' }, h('legend', { class: 'visually-hidden' }, t('reportReason')), options),
          status,
          h('div', { class: 'dialog-buttons' }, h('button', { class: 'button button-secondary', type: 'button', on: { click: () => close(false) } }, t('cancel')), send),
        ];
      },
    });
  }

  return h('div', { class: 'safety' }, report, hide);
}

/** Gizlenme sonrası gösterilen not: bildirim durumuna göre sözleşmedeki cümle. */
export function hiddenNotice(app, { reason, status }) {
  const { t } = app;
  const base = openStateText('hidden', app.lang, reason);
  const extra = status === 'offline' ? t('reportOffline') : status === 'error' ? t('reportFailed') : null;
  return { title: base.title, body: extra || base.body };
}

/** Kendi bağlantını açtığında gösterilen not. */
export const ownNote = (t) => note(t('ownNote'), { kind: 'info', cls: 'own-note' });
