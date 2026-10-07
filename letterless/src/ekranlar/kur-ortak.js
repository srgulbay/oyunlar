// Kurma yolunun ortak parçaları: bağlam notu (rövanş: önceki turun sonucu, dayatılan harf, skor; devam: skor).

import { h } from '../arayuz/dom.js';
import { letterBadge, scoreLine } from '../arayuz/bilesen.js';
import { imposedLetterText } from '../aciklama.js';

/** Rövanş ya da devam bağlamının notu; yeni bulmacada null. */
export function contextNote(app, context) {
  const { t } = app;
  if (!context || context.kind === 'new') return null;
  const parts = [];
  if (context.kind === 'rematch' && context.prev) {
    parts.push(h('p', { class: 'context-prev' }, context.prev.solved ? t('youSolvedTheirs', context.prev.attempts) : t('youMissedTheirs')));
  }
  if (context.imposed) {
    parts.push(
      h(
        'p',
        { class: 'context-imposed' },
        letterBadge(t, context.imposed, context.imposedLang, { size: 's', decorative: true }),
        h('span', {}, imposedLetterText(context.imposed, context.imposedLang, app.lang)),
      ),
    );
  }
  if (context.match) parts.push(scoreLine(t, { me: context.match.me, them: context.match.them }));
  return parts.length ? h('div', { class: 'context-note', role: 'note' }, parts) : null;
}
