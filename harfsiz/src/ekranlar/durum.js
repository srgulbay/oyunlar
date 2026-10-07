// Bağlantı açılış durumları (KOORDINASYON.md §5; docs/oyun-tasarimi.md §5): hata sayfası yok.
//   broken  "Bağlantı açılmadı" + "Kendi anlatımını kur"
//   newer   "Bu bağlantı daha yeni bir Harfsiz sürümüyle yapılmış" + (webde) "Sayfayı yenile"
//   blocked "Bu anlatım gösterilmiyor"
//   hidden  gizlenme notu (bildirildi ya da gönderen gizlendi; bildirim durumuna göre cümle)
// Cümleler C'nin aciklama.js → openStateText'inden.

import { h, icon } from '../arayuz/dom.js';
import { topBar, primaryButton, secondaryButton } from '../arayuz/bilesen.js';
import { openStateText } from '../aciklama.js';

const ICONS = { broken: 'link', newer: 'refresh', blocked: 'shield', hidden: 'hide' };

export function render(app, arg = {}) {
  const { t } = app;
  const state = ['broken', 'newer', 'blocked', 'hidden'].includes(arg.state) ? arg.state : 'broken';
  const text = arg.notice || openStateText(state, app.lang, arg.reason || null);
  const bar = topBar(app, { title: null, back: 'home' });
  const title = h('h1', { class: 'state-title', tabindex: '-1' }, text.title);
  const actions = h('div', { class: 'state-actions' });
  if (state === 'newer' && !app.platform.isNative) actions.append(primaryButton(t('reloadPage'), () => location.reload(), { iconName: 'refresh' }));
  actions.append((state === 'newer' && !app.platform.isNative ? secondaryButton : primaryButton)(t('writeYourOwn'), () => app.go('create', { fresh: true }), { iconName: 'pencil' }));
  if (state === 'hidden' && arg.reason === 'sender') actions.append(secondaryButton(t('openHidden'), () => app.go('hidden'), { iconName: 'hide' }));
  actions.append(secondaryButton(t('backHome'), () => app.go('home'), { iconName: 'back' }));
  const main = h(
    'main',
    { class: `screen state state-${state}` },
    bar.el,
    h('div', { class: 'state-body' }, h('span', { class: 'state-icon', 'aria-hidden': 'true' }, icon(ICONS[state])), title, h('p', { class: 'state-text' }, text.body)),
    actions,
  );
  return { root: main, focus: title };
}
