// Gönder (docs/oyun-tasarimi.md §3, §5): mesaj önizlemesi, WhatsApp (birincil) · Telegram · X · Diğer ·
// Kopyala, hikâye kartı (Düzen B, davet), "Arkadaşın böyle görecek" (kendi bağlantısı), yerel geliştirmede
// "Bağlantıyı bu cihazda aç". Çevrimdışıyken de metin ve bağlantı üretilir. Gönderilenler listesinden
// açıldığında durum (sonuç bekleniyor / 2. hakta bilindi) ve skor da görünür.

import { h, icon } from '../arayuz/dom.js';
import { topBar, section, secondaryButton, quietButton, scoreLine, note, letterBadge } from '../arayuz/bilesen.js';
import { inviteMessage } from '../paylas.js';
import { decodePuzzle } from '../yuk.js';
import { findSent } from '../depo.js';
import { inviteData, linkFor, addressFor } from '../akis.js';
import { channelButtons, cardPreview, shareCard } from '../paylasim.js';
import { sentStatus } from './ortak.js';

/** Gönderilen kaydından paylaşım mesajı (kanal koduyla). */
export function sentMessage(app, entry, channel) {
  const url = linkFor({ root: app.root, uiLang: app.lang, kind: 'p', code: entry.code, channel });
  return inviteMessage(inviteData({ ...entry, url }), app.lang);
}

/** Davet kartı verisi (kart.js → cardData). */
export const inviteCard = (app, entry) => ({
  kind: 'invite',
  lang: entry.lang,
  uiLang: app.lang,
  letter: entry.letter,
  words: entry.words,
  description: entry.description,
  day: entry.day,
  address: addressFor(app.root, app.lang),
  theme: app.data.settings.theme,
});

/** Kendi bağlantısının çözme bağlamı ("Arkadaşın böyle görecek"). */
export function ownContext(entry) {
  const d = decodePuzzle(entry.code);
  if (!d.ok) return null;
  return { source: 'own', puzzle: d.puzzle, ref: d.ref, code: entry.code, words: entry.words, archiveNo: null, channel: '-' };
}

export function render(app, arg = {}) {
  const { t } = app;
  const entry = findSent(app.data, arg.ref);
  if (!entry) return { redirect: ['home'] };
  const bar = topBar(app, { title: arg.fresh ? t('sendTitleNew') : t('sendTitle'), back: 'home' });
  const main = h('main', { class: 'screen send' }, bar.el);

  if (arg.fresh) main.append(note(t('linkReady'), { kind: 'success', cls: 'link-ready' }));
  else {
    const st = sentStatus(t, entry);
    main.append(
      h(
        'div',
        { class: 'send-status' },
        h('p', { class: `status status-${st.kind}` }, h('span', { class: 'status-mark', 'aria-hidden': 'true' }, st.mark), ' ', st.text),
        entry.result && entry.result.match ? scoreLine(t, entry.result.match) : null,
      ),
    );
  }

  const preview = sentMessage(app, entry, null);
  main.append(
    section(
      t('messagePreview'),
      'message-section',
      h('div', { class: 'message-preview', lang: app.lang }, h('div', { class: 'message-head' }, letterBadge(t, entry.letter, entry.lang, { size: 's', decorative: true }), h('span', {}, t('messageTo'))), h('p', { class: 'message-text' }, preview.text)),
    ),
  );

  main.append(
    section(
      t('sendVia'),
      'channel-section',
      channelButtons(app, {
        build: (channel) => sentMessage(app, entry, channel),
        event: 'paylasti',
        title: app.name(),
        alt: preview.body.split('\n')[0],
      }),
      h('p', { class: 'section-hint' }, t('sendHint')),
    ),
  );

  // Hikâye kartı (davet; 1080×1920). iOS'ta Instagram ve WhatsApp Durum kanalları köprüyle.
  const card = inviteCard(app, entry);
  const storyPreview = cardPreview(card, 'story', { cls: 'story-thumb' });
  const storyButtons = h('div', { class: 'story-actions' });
  const message = () => sentMessage(app, entry, app.platform.isNative ? 'ig' : 'sys');
  if (app.platform.isNative && app.platform.has('share')) {
    const add = (label, channel, iconName) =>
      storyButtons.append(secondaryButton(label, () => shareCard(app, { card, format: 'story', nativeChannel: channel, text: message().text, url: message().url, title: app.name() }), { iconName }));
    app.platform.channels().then((c) => {
      if (c.igStory) add(t('storyInstagram'), 'igStory', 'image');
      if (c.whatsapp) add(t('storyWhatsapp'), 'durum', 'chat');
      add(t('saveImage'), 'kaydet', 'download');
    });
  } else {
    storyButtons.append(secondaryButton(t('storyShare'), () => shareCard(app, { card, format: 'story', title: app.name() }), { iconName: 'image' }));
  }
  main.append(section(t('storyTitle'), 'story-section', h('div', { class: 'story-layout' }, storyPreview.el, h('div', { class: 'story-side' }, h('p', { class: 'section-hint' }, t('storyHint')), storyButtons))));

  const own = ownContext(entry);
  const extras = h('div', { class: 'send-extras' });
  if (own) extras.append(quietButton(t('seeAsFriend'), () => app.go('solve', own), { iconName: 'link' }));
  if (app.local) {
    const url = linkFor({ root: app.root, uiLang: app.lang, kind: 'p', code: entry.code, channel: null });
    extras.append(h('a', { class: 'button button-quiet dev-open', href: url }, icon('link'), t('openHere')));
  }
  extras.append(quietButton(t('newClue'), () => app.go('create', { fresh: true }), { iconName: 'pencil' }));
  main.append(extras);
  return { root: main, focus: bar.title };
}
