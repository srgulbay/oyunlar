// Destekle (Ayarlar → Destekle; yalnız iOS; Taç'taki bahşiş kalıbı): bir çay / kahve / öğle yemeği
// ısmarla. Tüketilebilir, hiçbir şey açmaz; fiyat displayPrice. Ödemeden sonra kısa teşekkür ve cihazdaki
// "Destekçi" rozeti. Oyun sırasında hiçbir zaman istenmez; bu ekran Ayarlar dışında yoktur.

import { h, announce, toast } from '../arayuz/dom.js';
import { topBar, note, secondaryButton } from '../arayuz/bilesen.js';
import { TIPS, TIP_IDS, responseState, pickProducts, markSupporter } from '../magaza-urun.js';

export function render(app) {
  const { t, data } = app;
  if (!app.tipsAvailable()) return { redirect: ['settings'] };
  const bar = topBar(app, { title: t('tipsTitle'), back: 'settings' });
  const head = h('div', { class: 'tips-head' });
  const list = h('div', { class: 'tips-list' });
  const main = h('main', { class: 'screen tips' }, bar.el, head, list);
  let products = null;
  let busy = null;
  let thanked = false;

  function drawHead() {
    const intro = h('p', { class: 'tips-intro' }, thanked ? t('tipThanks', app.name()) : data.support.supporter ? t('tipSupporter') : t('tipIntro', app.name()));
    if (data.support.supporter) head.replaceChildren(intro, h('p', { class: 'supporter-badge' }, h('span', { 'aria-hidden': 'true' }, '♥ '), t('supporter')));
    else head.replaceChildren(intro);
  }

  function draw() {
    drawHead();
    if (products === null) {
      list.replaceChildren(...TIPS.map((x) => h('button', { class: 'button button-secondary tip-button', type: 'button', 'aria-disabled': 'true', 'aria-label': t('priceLoadingName', t(`tip_${x.key}`)) }, t(`tip_${x.key}`), h('span', { class: 'tip-price' }, t('priceLoading')))));
      return;
    }
    if (!products.length) {
      list.replaceChildren(note(t('storeUnavailable'), { kind: 'warning' }), secondaryButton(t('retry'), load, { iconName: 'refresh' }));
      return;
    }
    list.replaceChildren(
      ...TIPS.map((x) => {
        const p = products.find((y) => y.id === x.id);
        const open = Boolean(p) && (!busy || busy === x.id);
        return h(
          'button',
          {
            class: 'button button-secondary tip-button',
            type: 'button',
            'aria-disabled': open && !busy ? null : 'true',
            on: {
              click: async () => {
                if (!p || busy) return;
                busy = x.id;
                draw();
                const r = await app.platform.ask({ type: 'tip', productId: x.id });
                const state = responseState('tip', r);
                busy = null;
                if (state === 'tamam') {
                  markSupporter(data, app.today());
                  app.save();
                  thanked = true;
                  announce(t('tipThanks', app.name()));
                } else if (state === 'bekliyor') toast(t('purchasePending'));
                // Zaman aşımında ödeme sayfası açık kalmış olabilir: geç onay app.js'te teşekkürle gelir.
                else if (state !== 'iptal' && state !== 'zaman-asimi') toast(t('purchaseFailed'));
                draw();
              },
            },
          },
          h('span', {}, t(`tip_${x.key}`)),
          h('span', { class: 'tip-price' }, busy === x.id ? t('purchaseBusy') : p ? p.price : '—'),
        );
      }),
    );
  }

  async function load() {
    products = null;
    draw();
    const r = await app.platform.ask({ type: 'tipProducts', productIds: [...TIP_IDS] });
    products = responseState('tipProducts', r) === 'tamam' ? pickProducts(r.veri, TIP_IDS) : [];
    draw();
  }
  draw();
  load();
  return { root: main, focus: bar.title };
}
