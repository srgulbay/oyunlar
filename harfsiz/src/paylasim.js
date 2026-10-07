// Paylaşım yüzeyi (KOORDINASYON.md §6, viral.md §4–§5): kanal düğmeleri ve kart görseli.
//   Web: WhatsApp (wa.me), Telegram (t.me/share/url) ve X (x.com/intent) gerçek bağlantılardır (açılır pencere
//   engellenmez, Sesle Denetim bağlantı olarak görür); "Diğer" Web Share API (yoksa düğme çizilmez, Kopyala
//   aynı işi yapar); "Kopyala" panoya, olmazsa "Metni elle seç" penceresi.
//   iOS: köprünün `share` iletisi (kanal, metin, govde, url, alt, baslik, png?); kanal düğmeleri `kanallar`
//   yanıtına göre çizilir.
// Metin paylas.js'ten, bağlantı kanal koduyla (?k=) her kanal için ayrı kurulur. Sayaç: düğmeye dokunuş.

import { whatsappUrl, telegramUrl, xUrl } from './paylas.js';
import { h, icon, toast, openDialog } from './arayuz/dom.js';
import { renderCard, canvasBlob, canvasBase64 } from './kart-cizim.js';

/** Sayaç kanal kodu → iOS köprüsünün kanal adı. */
const NATIVE_CHANNEL = Object.freeze({ wa: 'whatsapp', tg: 'telegram', x: 'x', sys: 'sistem', ig: 'igStory', wd: 'durum' });

/**
 * Kanal düğmeleri. build(kanalKodu) → { text, body, url } (paylas.js mesajı). event: sayaç olayı
 * ('paylasti' | 'sonuc_paylasti' | null). Dönen öğe hemen çizilir; iOS'ta kanal yoklaması gelince güncellenir.
 */
export function channelButtons(app, { build, event = null, title = '', alt = '', primaryLabel = null, onShared = null }) {
  const { t, platform } = app;
  const wrap = h('div', { class: 'channels' });
  const done = (channel) => {
    if (event) app.count(event, channel);
    if (onShared) onShared(channel);
  };

  const nativeButton = (channel, label, iconName, cls) =>
    h(
      'button',
      {
        class: `button ${cls}`,
        type: 'button',
        on: {
          click: async () => {
            const msg = build(channel);
            const state = await platform.nativeShare({ kanal: NATIVE_CHANNEL[channel], metin: msg.text, govde: msg.body, url: msg.url, alt, baslik: title });
            if (state === 'acildi') done(channel);
            else if (state === 'kurulu_degil') toast(t('appMissing', label));
            else if (state !== 'iptal') copyFallback(app, msg.text, channel, done);
          },
        },
      },
      icon(iconName),
      label,
    );

  const webLink = (channel, label, iconName, cls, href) =>
    h('a', { class: `button ${cls}`, href, target: '_blank', rel: 'noopener noreferrer', on: { click: () => done(channel) } }, icon(iconName), label);

  const copyButton = h(
    'button',
    {
      class: 'button button-secondary channel-copy',
      type: 'button',
      on: { click: () => copyFallback(app, build('kopya').text, 'kopya', done, true) },
    },
    icon('copy'),
    t('copy'),
  );

  const systemButton = h(
    'button',
    {
      class: 'button button-secondary channel-sys',
      type: 'button',
      on: {
        click: async () => {
          const msg = build('sys');
          if (platform.isNative) {
            const state = await platform.nativeShare({ kanal: 'sistem', metin: msg.text, govde: msg.body, url: msg.url, alt, baslik: title });
            if (state === 'acildi') done('sys');
            else if (state !== 'iptal') copyFallback(app, msg.text, 'sys', done);
            return;
          }
          const state = await platform.webShare({ text: msg.text, title });
          if (state === 'paylasildi') done('sys');
          else if (state === 'kopyalandi') {
            toast(t('copied'));
            done('sys');
          } else if (state === 'basarisiz') manualCopy(app, msg.text);
        },
      },
    },
    icon('share'),
    t('otherApps'),
  );

  function draw(avail) {
    const items = [];
    const primary = primaryLabel || t('whatsapp');
    if (avail.whatsapp) {
      items.push(
        platform.isNative
          ? nativeButton('wa', primary, 'chat', 'button-primary channel-wa')
          : webLink('wa', primary, 'chat', 'button-primary channel-wa', whatsappUrl(build('wa'))),
      );
    }
    const row = [];
    if (avail.telegram) row.push(platform.isNative ? nativeButton('tg', t('telegram'), 'plane', 'button-secondary channel-tg') : webLink('tg', t('telegram'), 'plane', 'button-secondary channel-tg', telegramUrl(build('tg'))));
    if (avail.x) row.push(platform.isNative ? nativeButton('x', t('xName'), 'xmark', 'button-secondary channel-x') : webLink('x', t('xName'), 'xmark', 'button-secondary channel-x', xUrl(build('x'))));
    if (avail.system) row.push(systemButton);
    row.push(copyButton);
    items.push(h('div', { class: 'channel-row' }, row));
    wrap.replaceChildren(...items);
  }

  draw({ whatsapp: true, telegram: true, x: true, system: platform.isNative ? platform.has('share') : Boolean(globalThis.navigator && typeof navigator.share === 'function') });
  if (platform.isNative && platform.has('kanallar')) platform.channels().then(draw);
  return wrap;
}

/** Panoya kopyalar; olmazsa metni elle seçtiren pencere (docs/oyun-tasarimi.md §5). */
export async function copyFallback(app, text, channel, done, explicit = false) {
  const ok = await app.platform.copyText(text);
  if (ok) {
    toast(explicit ? app.t('copied') : app.t('copiedInstead'));
    if (done) done(channel);
  } else manualCopy(app, text);
}

export function manualCopy(app, text) {
  const { t } = app;
  openDialog({
    title: t('selectManually'),
    content: (close) => {
      const area = h('textarea', { class: 'manual-copy', readonly: true, rows: '6', 'aria-label': t('messageText') });
      area.value = text;
      setTimeout(() => {
        area.focus();
        area.select();
      }, 0);
      return [h('p', { class: 'dialog-text' }, t('selectManuallyHint')), area, h('div', { class: 'dialog-buttons' }, h('button', { class: 'button button-primary', type: 'button', on: { click: () => close(true) } }, t('done')))];
    },
  });
}

/**
 * Kart görselini paylaşır. card: kart-cizim.js → renderCard girdisi; format 'square' | 'story'.
 * iOS: köprü (kanal 'sistem' | 'igStory' | 'durum' | 'kaydet'; png ve pngHikaye); web: dosyalı Web Share, yoksa indirme.
 * Sayaç: kart_paylasti (kanal ig | wd | sys).
 */
export async function shareCard(app, { card, format = 'square', nativeChannel = 'sistem', text = '', url = '', title = '' }) {
  const { t, platform } = app;
  const { canvas, alt } = renderCard(card, format);
  const counterChannel = nativeChannel === 'igStory' ? 'ig' : nativeChannel === 'durum' ? 'wd' : 'sys';
  if (platform.isNative && platform.has('share')) {
    const png = canvasBase64(canvas);
    const payload = { kanal: nativeChannel, metin: text, url, alt, baslik: title };
    if (format === 'story') payload.pngHikaye = png;
    else payload.png = png;
    const state = await platform.nativeShare(payload);
    if (state === 'acildi') app.count('kart_paylasti', counterChannel);
    else if (state === 'kurulu_degil') toast(t('appMissing', nativeChannel === 'igStory' ? 'Instagram' : t('whatsapp')));
    else if (state !== 'iptal') toast(t('shareFailed'));
    return state;
  }
  const blob = await canvasBlob(canvas);
  if (!blob) {
    toast(t('shareFailed'));
    return 'basarisiz';
  }
  const state = await platform.webShareImage({ blob, fileName: format === 'story' ? 'harfsiz-hikaye.png' : 'harfsiz-kart.png' });
  if (state === 'paylasildi' || state === 'indirildi') app.count('kart_paylasti', 'sys');
  if (state === 'indirildi') toast(t('cardSaved'));
  else if (state === 'basarisiz') toast(t('shareFailed'));
  return state;
}

/**
 * Kart önizlemesi: <img alt> (alt metin kart.js → cardAltText). Görsel, kapsayıcısına sığar.
 * Dönen: { el, refresh(card) }.
 */
export function cardPreview(card, format = 'square', { cls = '' } = {}) {
  const img = h('img', { class: `card-image card-${format}`, alt: '', decoding: 'async' });
  const fig = h('figure', { class: `card-preview ${cls}`.trim() }, img);
  let url = null;
  async function refresh(next) {
    const { canvas, alt } = renderCard(next, format);
    img.alt = alt;
    img.width = canvas.width;
    img.height = canvas.height;
    const blob = await canvasBlob(canvas);
    if (url) URL.revokeObjectURL(url);
    url = blob ? URL.createObjectURL(blob) : null;
    if (url) img.src = url;
    else img.src = canvas.toDataURL('image/png');
  }
  refresh(card);
  return { el: fig, refresh };
}
