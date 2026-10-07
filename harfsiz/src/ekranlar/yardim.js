// Nasıl oynanır (Ayarlar → Nasıl oynanır): kural özeti, puan, rövanş, günün sözcüğü, çözme arşivi,
// "kuran öder, oynayan ödemez". Ayrıntılı kurallar docs/kurallar.md; buradaki cümleler oyuncu içindir.

import { h } from '../arayuz/dom.js';
import { topBar, section, letterBadge, primaryButton } from '../arayuz/bilesen.js';
import { homeExample } from '../akis.js';

export function render(app) {
  const { t } = app;
  const bar = topBar(app, { title: t('howToPlay'), back: 'settings' });
  const list = (items) => h('ul', { class: 'help-list' }, items.map((x) => h('li', {}, x)));
  const ex = homeExample(app.lang);
  const main = h(
    'main',
    { class: 'screen help' },
    bar.el,
    h('div', { class: 'help-example' }, letterBadge(t, ex.letter, ex.lang, { size: 'l' }), h('p', { class: 'clue-text help-clue', lang: ex.lang }, `«${ex.clue}»`)),
    section(t('helpRulesTitle'), 'help-rules', list([t('helpRule1'), t('helpRule2'), t('helpRule3'), t('helpRule4'), t('helpRule5')])),
    section(t('helpScoreTitle'), 'help-score', list([t('helpScore1'), t('helpScore2'), t('helpScore3')])),
    section(t('helpDailyTitle'), 'help-daily', list([t('helpDaily1'), t('helpDaily2')])),
    section(t('helpFairTitle'), 'help-fair', list([t('helpFair1'), t('helpFair2'), t('helpFair3')])),
    primaryButton(t('describeForFriend'), () => app.go('create', { fresh: true }), { iconName: 'pencil' }),
  );
  return { root: main, focus: bar.title };
}
