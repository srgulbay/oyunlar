// Uygulama çatısı: depo, dil, tema ve hareket ayarı, ekran geçişleri (dinamik içe aktarım), bağlantı
// açılışı (#p= / #r=), gönderilenlerin eşlenmesi, sayaç (bağlantı başına bir kez), elde tutma olayları,
// iOS köprüsü (haklar, ödeme, açılış) ve service worker. Ekranların gördüğü yüzey `app` nesnesidir.
// Kural ve akış kararları saf modüllerdedir (akis.js, depo.js; testli); burada yalnız bağlanır.

import { openStore, memoryStorage, recordResult, addPlayDay, firstTime } from './depo.js';
import { detectLang, translator } from './metinler.js';
import { createPlatform } from './platform.js';
import { createNetwork, networkMode } from './ag.js';
import { cryptoRng } from './rastgele.js';
import { routeForHash, sentUpdateFromRoute, shareRoot as rootFor } from './akis.js';
import { localDate, isValidDate, dailyPuzzle, dayNumber } from './gunluk.js';
import { channelFromSearch, onceKey, retentionDue } from './sayac.js';
import { newSenderTag } from './yuk.js';
import { gameName } from './paylas.js';
import { THEMES, DEFAULT_THEME } from './kart.js';
import { PAYLASIM_TABANI } from './yapilandirma.js';
import { STORE_FEATURES, TIP_FEATURES, pickOwned, isKnownTip, markSupporter } from './magaza-urun.js';
import { h, toast, reduceMotion } from './arayuz/dom.js';

// --- Ekranlar: ad → modül (her modül `render(app, arg)` dışa açar) ---
export const SCREENS = Object.freeze({
  home: () => import('./ekranlar/ana.js'),
  create: () => import('./ekranlar/kur.js'),
  words: () => import('./ekranlar/sozcuk.js'),
  write: () => import('./ekranlar/yaz.js'),
  send: () => import('./ekranlar/gonder.js'),
  sentList: () => import('./ekranlar/gonderilenler.js'),
  solve: () => import('./ekranlar/coz.js'),
  result: () => import('./ekranlar/sonuc.js'),
  creatorResult: () => import('./ekranlar/kurucu-sonuc.js'),
  linkState: () => import('./ekranlar/durum.js'),
  daily: () => import('./ekranlar/gunun-sozcugu.js'),
  dailyArchive: () => import('./ekranlar/gunluk-arsiv.js'),
  archive: () => import('./ekranlar/arsiv.js'),
  deck: () => import('./ekranlar/deste-sayfasi.js'),
  store: () => import('./ekranlar/magaza.js'),
  tips: () => import('./ekranlar/destekle.js'),
  settings: () => import('./ekranlar/ayarlar.js'),
  hidden: () => import('./ekranlar/gizlenenler.js'),
  help: () => import('./ekranlar/yardim.js'),
});

/** Bağlantı ekranları: bunlardan çıkılınca adresteki # parçası temizlenir. */
const LINK_SCREENS = new Set(['solve', 'result', 'creatorResult', 'linkState']);

// --- Yerel hata ayıklama bayrakları (yalnız localhost): ?tarih=YYYY-AA-GG ?dil=tr|en ?temiz (bellek içi depo).
// Koyu tema, büyük yazı ve Hareketi Azalt tarayıcı öykünmesiyle denenir (tmp/harfsiz-web/surucu.mjs). ---
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
const PARAMS = new URLSearchParams(location.search);
const DEBUG = LOCAL
  ? {
      date: isValidDate(PARAMS.get('tarih') || '') ? PARAMS.get('tarih') : null,
      lang: ['tr', 'en'].includes(PARAMS.get('dil')) ? PARAMS.get('dil') : null,
      clean: PARAMS.has('temiz'),
    }
  : { date: null, lang: null, clean: false };

const platform = createPlatform();
const store = openStore(DEBUG.clean ? memoryStorage() : undefined);
const data = store.data;
const container = document.getElementById('app');
const net = createNetwork({ mode: networkMode(location), platform: platform.info.platform, origin: location.origin });
const rng = cryptoRng();

let active = null; // { name, arg, root, focus, close? }
let navSeq = 0;
let firstPaint = true;
let saveTimer = null;

const app = {
  data,
  t: translator('tr'),
  lang: 'tr',
  platform,
  net,
  rng,
  root: rootFor(location, PAYLASIM_TABANI),
  persistent: store.persistent,
  storeNewer: store.newer,
  local: LOCAL,
  /** Yaratma akışının taslağı (bellekte): { context, deckId, dealt, picked, text, rematchLetter }. */
  draft: null,
  /** Günün sözcüğü yazılırken taslak: { date, text }. */
  draftDaily: null,
  /** Bu oturumda gösterilen günün sözcüğü (tarih → true); sözcük dokunmadan görünmez. */
  revealed: new Set(),
  /** Android Chrome'un ertelenen kurulum isteği (beforeinstallprompt); yoksa null. */
  installPrompt: null,

  go,
  refresh: () => (active ? go(active.name, active.arg, { same: true }) : go('home')),
  current: () => (active ? active.name : null),
  save() {
    clearTimeout(saveTimer);
    saveTimer = null;
    return store.save();
  },
  saveSoon(ms = 500) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      store.save();
    }, ms);
  },
  today: () => DEBUG.date || localDate(new Date()),
  name: () => gameName(app.lang),

  /** Sayaç olayı (web her zaman; iOS SAYAC_IOS ile). Kendi bağlantısında ve arşivde çağrılmaz. */
  count(event, channel = '-') {
    return net.count(event, { date: app.today(), channel });
  },
  /** Bağlantı başına cihazda bir kez (sayac.js → onceKey; bayrak cihazdan çıkmaz). */
  countOnce(event, ref, channel) {
    if (!firstTime(data, onceKey(event, ref))) return false;
    app.saveSoon();
    return app.count(event, channel);
  },
  /** Oynanan gün: teklif kuralı ve elde tutma olayları (aktif_gun_0/1/7/30). */
  played() {
    const today = app.today();
    addPlayDay(data, today);
    if (data.firstDay) {
      for (const due of retentionDue({ firstDay: data.firstDay, today, sent: data.counter.retention })) {
        net.count(due.event, { date: today, channel: due.channel });
        data.counter.retention.push(Number(due.event.split('_').pop()));
      }
    }
    app.saveSoon();
  },
  setSettings(patch) {
    Object.assign(data.settings, patch);
    applySettings();
    app.save();
    if ('lang' in patch) pushWidget();
  },
  pushWidget: () => pushWidget(),
  storeAvailable: () => STORE_FEATURES.every((f) => platform.has(f)),
  tipsAvailable: () => TIP_FEATURES.every((f) => platform.has(f)),
  /** iOS hak önbelleği (yalnız kurma yolunda okunur; alıcı yolu çağırmaz). */
  owned: () => (platform.isNative ? data.owned : []),
  setOwned(list) {
    const clean = pickOwned(list);
    if (!clean) return;
    data.owned = clean;
    app.save();
    revalidateTheme();
  },
  /** Bağlantı ekranından çıkış: adresteki # ve ?k= temizlenir (yeniden yükleme ana ekranı açar). */
  clearLink() {
    if (location.hash || location.search.includes('k=')) {
      const keep = new URLSearchParams(location.search);
      keep.delete('k');
      const q = keep.toString();
      history.replaceState(null, '', location.pathname + (q ? `?${q}` : ''));
    }
  },
  openHash,
};

// --- Ayarlar: dil, tema, hareket ---

function applyLang() {
  const lang = DEBUG.lang || detectLang(data.settings.lang);
  app.lang = lang;
  app.t = translator(lang);
  document.documentElement.lang = lang;
  document.title = gameName(lang);
}

function applyTheme() {
  const theme = THEMES.some((x) => x.id === data.settings.theme) ? data.settings.theme : DEFAULT_THEME;
  const root = document.documentElement;
  if (theme === DEFAULT_THEME) delete root.dataset.look;
  else root.dataset.look = theme;
}

function applyMotion() {
  const root = document.documentElement;
  if (data.settings.reduceMotion) root.dataset.motion = 'reduced';
  else delete root.dataset.motion;
}

function applySettings() {
  applyLang();
  applyTheme();
  applyMotion();
}

/** Hak değişince (iade) açık olmayan tema varsayılana döner. haklar.js yalnız burada, gerektiğinde yüklenir. */
async function revalidateTheme() {
  if (data.settings.theme === DEFAULT_THEME) return;
  const { themeUnlocked } = await import('./haklar.js');
  if (!themeUnlocked(data.settings.theme, app.owned())) {
    data.settings.theme = DEFAULT_THEME;
    app.save();
    applyTheme();
  }
}

// --- Ekran geçişi ---

function fallbackScreen() {
  const { t } = app;
  const title = h('h1', { class: 'top-title', tabindex: '-1' }, app.name());
  const root = h(
    'main',
    { class: 'screen' },
    h('header', { class: 'top-bar' }, h('div', { class: 'top-left' }), title, h('div', { class: 'top-right' })),
    h('div', { class: 'empty-state' }, h('p', { class: 'empty-text' }, t('screenFailed')), h('button', { class: 'button button-primary', type: 'button', on: { click: () => location.reload() } }, t('reload'))),
  );
  return { root, focus: title };
}

/**
 * Ekran değiştirir (Promise; çizilince çözülür). Modül ada göre dinamik yüklenir; açılamayan ekran
 * çatıyı düşürmez: bildirim + ana ekran (ana da açılmazsa yedek ekran). Art arda çağrıda son istek geçerlidir.
 */
async function go(name, arg, { same = false } = {}) {
  const seq = ++navSeq;
  if (!Object.hasOwn(SCREENS, name)) name = 'home';
  if (!LINK_SCREENS.has(name)) app.clearLink();
  let mod = null;
  try {
    mod = await SCREENS[name]();
  } catch (e) {
    console.error(e);
  }
  if (seq !== navSeq) return;
  const prev = active;
  if (prev && prev.close) {
    try {
      prev.close();
    } catch (e) {
      console.error(e);
    }
  }
  let screen = null;
  try {
    if (!mod) throw new Error('ekran yüklenemedi: ' + name);
    screen = await mod.render(app, arg);
    if (screen && Array.isArray(screen.redirect)) {
      if (seq !== navSeq) return;
      return go(...screen.redirect);
    }
    if (!screen || !(screen.root instanceof Element)) throw new Error('ekran kök öğe döndürmedi: ' + name);
  } catch (e) {
    console.error(e);
    if (seq !== navSeq) return;
    if (name !== 'home') {
      toast(app.t('screenFailed'));
      return go('home');
    }
    screen = fallbackScreen();
  }
  if (seq !== navSeq) {
    if (screen.close) screen.close();
    return;
  }
  active = { ...screen, name, arg };
  const keepFocusId = same && document.activeElement && document.activeElement.id ? document.activeElement.id : '';
  const scroll = window.scrollY;
  if (!firstPaint && !same && !reduceMotion()) screen.root.classList.add('screen-enter');
  container.replaceChildren(screen.root);
  window.scrollTo(0, same ? scroll : 0);
  if (!firstPaint) {
    const again = keepFocusId ? screen.root.querySelector(`#${CSS.escape(keepFocusId)}`) : null;
    const target = again || screen.focus;
    if (target && typeof target.focus === 'function') target.focus({ preventScroll: true });
  }
  if (screen.enter) requestAnimationFrame(() => active && active.root === screen.root && screen.enter());
  if (firstPaint) {
    firstPaint = false;
    platform.ready();
  }
}

// --- Bağlantı açılışı ---

/** Adresteki ya da yerelden gelen # parçasını açar. */
function openHash(hash, search = location.search) {
  const route = routeForHash(hash, data, { channel: channelFromSearch(search) });
  const update = sentUpdateFromRoute(route);
  if (update && recordResult(data, update.ref, { ...update, date: app.today() })) app.save();
  if (route.screen === 'solve') return go('solve', route.ctx);
  if (route.screen === 'creatorResult') return go('creatorResult', route.view);
  if (route.screen === 'linkState') return go('linkState', { state: route.state, reason: route.reason });
  return go('home');
}

// --- Açılış ---

function boot() {
  data.sessions += 1;
  if (!data.senderTag) data.senderTag = newSenderTag(rng);
  app.save();
  applySettings();

  if (store.corrupt) setTimeout(() => toast(app.t('storeReset')), 400);

  // Geç onaylanan bahşiş (Satın Alma İzni ya da beş dakikadan uzun açık ödeme sayfası): dinleyici
  // platform.ready()'den önce kurulur (Taç'taki kalıp).
  platform.onPayment(({ productId }) => {
    if (!isKnownTip(productId)) return;
    markSupporter(data, app.today());
    app.save();
    toast(app.t('tipThanks', app.name()));
  });
  // Ertelenmiş kayıt (saveSoon) sayfa kapanırken ya da uygulama arka plana geçerken hemen yazılır.
  const flush = () => {
    if (saveTimer) app.save();
  };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  // Android Chrome'un kurulum isteği: kendiliğinden çubuk yerine sonuç ekranındaki tek satırda sunulur.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    app.installPrompt = e;
  });
  window.addEventListener('hashchange', () => openHash(location.hash));
  // Yerelden açılış: Universal Link (bağlantı) ya da widget ve derin bağlantı (ekran).
  platform.onOpen((open) => {
    if (open.kind === 'link') openHash(open.hash, open.search);
    else go(open.screen === 'store' && !app.storeAvailable() ? 'settings' : open.screen);
  });
  platform.onEntitlements((list) => {
    app.setOwned(list);
    if (active && ['create', 'words', 'deck', 'store', 'settings'].includes(active.name)) app.refresh();
  });

  openHash(location.hash);

  if (platform.isNative && platform.has('haklar')) {
    platform.ask({ type: 'haklar' }).then((r) => {
      if (r && r.ok) app.setOwned(r.veri);
    });
  }
  pushWidget();
  platform.registerServiceWorker(new URL('../sw.js', import.meta.url).href);
}

/**
 * Widget durumu (yalnız iOS): gün, yasak harf, bugün anlatıldı mı ve arayüz dili. Gizli sözcük asla gitmez.
 * Açılışta, günün sözcüğü anlatılınca ve dil değişince gönderilir.
 */
function pushWidget() {
  if (!platform.has('widgetDurum')) return;
  const today = app.today();
  try {
    if (dayNumber(today) < 1) return;
    const d = dailyPuzzle(today, app.lang);
    const mine = data.daily[today];
    platform.widgetState({ date: today, no: d.no, letter: d.letter, lang: d.lang, told: Boolean(mine && mine.lang === d.lang), uiLang: app.lang });
  } catch {
    /* saat yanlış: widget güncellenmez */
  }
}

boot();
