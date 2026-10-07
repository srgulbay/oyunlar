// Ayarlar (docs/oyun-tasarimi.md §3): Dil, Hareketi azalt, Tema (Kart temaları alınmışsa; iOS), Mağaza ve
// Destekle (yalnız iOS), Gizlenenler, Nasıl oynanır, Gizlilik (politika ve koşullar), destek sayfası ve
// e-postası, Arkadaşına öner, sürüm.
// Bölüm adları inceleme notuyla aynıdır: Ayarlar > Mağaza / Gizlenenler / Destekle (docs/magaza-taslak.md §7).

import { h, icon, segmented, toggle, openDialog } from '../arayuz/dom.js';
import { topBar, section, note } from '../arayuz/bilesen.js';
import { THEMES, DEFAULT_THEME } from '../kart.js';
import { themeUnlocked } from '../haklar.js';
import { appInviteMessage } from '../paylas.js';
import { VERSION, SUPPORT_EMAIL, PRIVACY_URL, SUPPORT_URL, TERMS_URL, sitePage } from '../yapilandirma.js';
import { channelButtons } from '../paylasim.js';
import { shareBase } from '../yuk.js';

const row = (app, { iconName, title, sub = null, onClick }) =>
  h(
    'button',
    { class: 'row-button setting-link', type: 'button', on: { click: onClick } },
    h('span', { class: 'row-icon', 'aria-hidden': 'true' }, icon(iconName)),
    h('span', { class: 'row-text' }, h('span', { class: 'row-title' }, title), sub ? h('span', { class: 'row-sub' }, sub) : null),
    h('span', { class: 'row-chevron', 'aria-hidden': 'true' }, icon('next')),
  );

function themePicker(app) {
  const { t, data } = app;
  const owned = app.owned();
  const wrap = h('div', { class: 'theme-picker' });
  const name = 'theme-choice';
  for (const th of THEMES) {
    const open = themeUnlocked(th.id, owned);
    const input = h('input', { type: 'radio', name, value: th.id, class: 'chip-input', id: `theme-${th.id}` });
    input.checked = data.settings.theme === th.id;
    input.addEventListener('change', () => {
      if (!open) {
        input.checked = false;
        const cur = wrap.querySelector(`#theme-${data.settings.theme}`);
        if (cur) cur.checked = true;
        app.go('store');
        return;
      }
      app.setSettings({ theme: th.id });
    });
    wrap.append(h('label', { class: `chip theme-chip theme-${th.id}${open ? '' : ' is-locked'}`, for: `theme-${th.id}` }, input, h('span', { class: 'theme-swatch', 'aria-hidden': 'true' }), h('span', { class: 'chip-text' }, th.name[app.lang === 'tr' ? 'tr' : 'en'], open ? '' : h('span', { class: 'visually-hidden' }, `, ${t('locked')}`)), open ? null : icon('lock', 'inline-icon')));
  }
  return h('fieldset', { class: 'theme-fieldset' }, h('legend', { class: 'field-label' }, t('themeLabel')), wrap, h('p', { class: 'field-hint' }, t('themeHint')));
}

/**
 * Oyunlar sitesindeki sayfalara bağlantılar (arayüz dilinde: İngilizcede #en bölümü). Adresi boş ya da geçersiz
 * olan atlanır; hiçbiri yoksa null. iOS'ta kabuk http(s) bağlantısını Safari'de açar.
 */
function siteLinks(app, pages) {
  const links = pages.map(([url, label]) => [sitePage(url, app.lang), label]).filter(([href]) => href);
  if (!links.length) return null;
  return h('p', { class: 'site-links' }, ...links.map(([href, label]) => h('a', { href, rel: 'noopener' }, label)));
}

function recommend(app) {
  const { t } = app;
  const build = (channel) => appInviteMessage(shareBase(app.root, app.lang) + (channel ? `?k=${channel}` : ''), app.lang);
  openDialog({
    title: t('recommendTitle'),
    cls: 'dialog-share',
    content: (close) => [h('p', { class: 'message-text dialog-message' }, build(null).text), channelButtons(app, { build, event: null, title: app.name() }), h('div', { class: 'dialog-buttons' }, h('button', { class: 'button button-quiet', type: 'button', on: { click: () => close(false) } }, t('close')))],
  });
}

export function render(app) {
  const { t, data } = app;
  const bar = topBar(app, { title: t('settings'), back: 'home' });
  const main = h('main', { class: 'screen settings' }, bar.el);

  const lang = segmented({
    options: [
      ['auto', t('langAuto')],
      ['tr', 'Türkçe'],
      ['en', 'English'],
    ],
    value: data.settings.lang,
    label: t('language'),
    onChange: (v) => {
      app.setSettings({ lang: v });
      app.refresh();
    },
  });
  main.append(section(t('language'), 'settings-lang', lang.el));

  const look = [
    toggle({
      id: 'reduce-motion',
      label: t('reduceMotion'),
      on: data.settings.reduceMotion,
      note: t('reduceMotionNote'),
      onChange: (v) => app.setSettings({ reduceMotion: v }),
    }),
  ];
  if (app.storeAvailable()) look.push(themePicker(app));
  else if (data.settings.theme !== DEFAULT_THEME) app.setSettings({ theme: DEFAULT_THEME });
  main.append(section(t('appearance'), 'settings-look', look));

  if (app.storeAvailable() || app.tipsAvailable()) {
    const rows = [];
    if (app.storeAvailable()) rows.push(row(app, { iconName: 'bag', title: t('storeTitle'), sub: t('storeRowSub'), onClick: () => app.go('store') }));
    if (app.tipsAvailable()) rows.push(row(app, { iconName: 'heart', title: t('tipsTitle'), sub: t('tipsRowSub'), onClick: () => app.go('tips') }));
    main.append(section(t('purchases'), 'settings-store', rows));
  }

  const hiddenCount = data.hidden.refs.length + data.hidden.senders.length;
  main.append(
    section(
      t('safety'),
      'settings-safety',
      row(app, { iconName: 'hide', title: t('hiddenTitle'), sub: hiddenCount ? t('hiddenCount', hiddenCount) : t('hiddenNone'), onClick: () => app.go('hidden') }),
      h('div', { class: 'privacy-text' }, h('h3', { class: 'small-title' }, t('privacyTitle')), h('p', {}, t('privacyBody', app.net.enabled)), siteLinks(app, [[PRIVACY_URL, t('privacyLink')], [TERMS_URL, t('termsLink')]])),
    ),
  );

  main.append(
    section(
      t('helpSection'),
      'settings-help',
      row(app, { iconName: 'help', title: t('howToPlay'), onClick: () => app.go('help') }),
      row(app, { iconName: 'share', title: t('recommendTitle'), onClick: () => recommend(app) }),
      siteLinks(app, [[SUPPORT_URL, t('supportPage')]]),
      h('p', { class: 'support-line' }, icon('mail', 'inline-icon'), h('span', {}, t('supportEmail')), ' ', h('a', { href: `mailto:${SUPPORT_EMAIL}` }, SUPPORT_EMAIL)),
    ),
  );

  if (!app.persistent) main.append(note(app.storeNewer ? t('storeNewer') : t('notPersistent'), { kind: 'warning' }));
  main.append(h('p', { class: 'version' }, t('versionLine', app.name(), app.platform.info.version || VERSION)));
  return { root: main, focus: bar.title };
}
