// Gönderdiklerin (tamamı): en yeni önce; sonucu gelenler işaretli. Boşken tek cümle ve tek eylem.

import { h } from '../arayuz/dom.js';
import { topBar, emptyState, primaryButton } from '../arayuz/bilesen.js';
import { sentNewestFirst } from '../akis.js';
import { sentRow } from './ortak.js';

export function render(app) {
  const { t } = app;
  const bar = topBar(app, { title: t('sentTitle'), back: 'home' });
  const list = sentNewestFirst(app.data);
  const body = list.length
    ? h('ul', { class: 'sent-list' }, list.map((e) => h('li', {}, sentRow(app, e))))
    : emptyState({ iconName: 'send', text: t('sentEmpty'), button: primaryButton(t('describeForFriend'), () => app.go('create', { fresh: true }), { iconName: 'pencil' }) });
  return { root: h('main', { class: 'screen sent-all' }, bar.el, body), focus: bar.title };
}
