// Platform bağdaştırıcısı (KOORDINASYON.md §14 iOS köprüsü; Taç'taki tek `sor` yolu). iOS uygulamasında
// `window.harfsizNative = { platform: 'ios', version, features }` sayfa betiklerinden önce gelir. İletiler
// `window.webkit.messageHandlers.harfsiz.postMessage(ileti)` ile gider:
//   yanıtsız:  ready · haptic { style } · widgetDurum { tarih, no, harf, dil, anlatildi }
//   yanıtlı:   share { kanal, metin, url, alt, baslik, png?, pngHikaye?, kaynakRect? } · kanallar
//              urunler { productIds } · satinAl { productId } · haklar · geriYukle · iadeIste { productId }
//              tipProducts { productIds } · tip { productId }
// Yanıt: harfsizNative.yerelYanit({ id, ok, durum, veri? }). Yerelden kendiliğinden gelenler:
//   harfsizNative.haklarDegisti({ haklar }) · harfsizNative.destekGeldi({ productId }) (geç onaylanan bahşiş)
//   harfsizNative.acilis({ hedef: 'baglanti', dil, search, hash }) (Universal Link; ayrıca hashchange dinlenir)
//   harfsizNative.acilis({ hedef: 'gunluk' | 'kur' | … }) (widget ve derin bağlantı; yalnız sayfanın
//   harfsizNative.acilisEkranlari dizisinde bildirdiği hedefler gelir, ios/Harfsiz/BaglantiMantigi.swift).
// Webde karşılıklar: navigator.vibrate, Web Share API ya da pano; mağaza ve Destekle webde yoktur.
// Her ileti özellik algılamayla gönderilir (`features`). Fabrika biçimindedir: bağımlılıklar dışarıdan.

/** `features` gelmeyen eski kabukta var sayılan iletiler. */
export const BASE_FEATURES = Object.freeze(['haptic', 'share', 'ready']);

/** Yanıtlı iletilerin zaman aşımı (ms). Ödeme ve paylaşım sayfası uzun açık kalabilir. */
export const TIMEOUT_MS = Object.freeze({ share: 120000, satinAl: 300000, tip: 300000, iadeIste: 300000, geriYukle: 60000, urunler: 15000, tipProducts: 15000, kanallar: 4000, default: 10000 });
export const timeoutFor = (type) => TIMEOUT_MS[type] || TIMEOUT_MS.default;

/** Web titreşim karşılıkları (ms). */
export const VIBRATION = Object.freeze({ selection: 6, light: 10, medium: 18, success: [14, 60, 22], warning: [22, 50, 22], error: [30, 40, 30] });

const PAYMENT_TYPES = new Set(['satinAl', 'tip']);

/** Derin bağlantı hedefi (kabuğun adı) → ekran adı (app.js → SCREENS). */
export const OPEN_TARGETS = Object.freeze({ gunluk: 'daily', kur: 'create', arsiv: 'archive', ayarlar: 'settings', magaza: 'store', gizlenenler: 'hidden' });

/**
 * Yerelden gelen açılış isteği → { kind: 'link', hash, search } | { kind: 'screen', screen } | null.
 * Eski biçim ({ hash }) bağlantı sayılır. Sorgu yalnız ?k= kanalı için okunur.
 */
export function parseOpen(x) {
  if (!x || typeof x !== 'object') return null;
  const target = typeof x.hedef === 'string' ? x.hedef : 'baglanti';
  if (target === 'baglanti') {
    const hash = typeof x.hash === 'string' ? x.hash.slice(0, 4000) : '';
    const search = typeof x.search === 'string' ? x.search.slice(0, 400) : '';
    return { kind: 'link', hash: hash && !hash.startsWith('#') ? `#${hash}` : hash, search: search && !search.startsWith('?') ? `?${search}` : search };
  }
  return Object.hasOwn(OPEN_TARGETS, target) ? { kind: 'screen', screen: OPEN_TARGETS[target] } : null;
}

export function createPlatform({ win = typeof window !== 'undefined' ? window : undefined, nav = typeof navigator !== 'undefined' ? navigator : undefined, timers = globalThis } = {}) {
  const native = win ? win.harfsizNative : undefined;
  const isNative = Boolean(native && native.platform === 'ios');
  const info = Object.freeze(isNative ? { platform: 'ios', version: String(native.version || '') } : { platform: 'web', version: '' });

  function post(msg) {
    try {
      win.webkit.messageHandlers.harfsiz.postMessage(msg);
      return true;
    } catch {
      return false;
    }
  }

  function has(feature) {
    if (!isNative) return false;
    return Array.isArray(native.features) ? native.features.includes(feature) : BASE_FEATURES.includes(feature);
  }

  // --- Yanıtlı iletiler: ask(msg) → { ok, durum, veri? } ya da null (gönderilemedi / web) ---

  const pending = new Map();
  let seq = 0;
  const latePayments = new Map(); // zaman aşımına uğrayan ödeme isteği: id → ürün
  const listeners = { entitlements: new Set(), payment: new Set(), open: new Set() };
  const queuedPayments = [];

  function emitPayment(productId) {
    if (typeof productId !== 'string') return;
    if (!listeners.payment.size) {
      queuedPayments.push(productId);
      return;
    }
    for (const f of listeners.payment) f({ productId });
  }

  if (isNative) {
    if (typeof native.yerelYanit !== 'function') {
      native.yerelYanit = (y) => {
        const id = y && typeof y.id === 'string' ? y.id : null;
        const p = id ? pending.get(id) : null;
        if (!p) {
          const product = id ? latePayments.get(id) : undefined;
          if (product === undefined) return;
          latePayments.delete(id);
          if (y.ok === true && y.durum === 'tamam') emitPayment(product);
          return;
        }
        pending.delete(id);
        timers.clearTimeout(p.timer);
        const out = { ok: y.ok === true, durum: typeof y.durum === 'string' ? y.durum : '' };
        if (y.veri !== undefined) out.veri = y.veri;
        p.resolve(out);
      };
    }
    if (typeof native.haklarDegisti !== 'function') {
      native.haklarDegisti = (x) => {
        for (const f of listeners.entitlements) f(x && x.haklar);
      };
    }
    if (typeof native.destekGeldi !== 'function') native.destekGeldi = (x) => emitPayment(x && x.productId);
    if (typeof native.acilis !== 'function') {
      native.acilis = (x) => {
        const open = parseOpen(x);
        if (!open) return;
        for (const f of listeners.open) f(open);
      };
      native.acilisEkranlari = Object.keys(OPEN_TARGETS);
    }
  }

  function ask(msg) {
    if (!isNative) return Promise.resolve(null);
    return new Promise((resolve) => {
      const id = `y${++seq}`;
      const timer = timers.setTimeout(() => {
        if (!pending.has(id)) return;
        pending.delete(id);
        if (PAYMENT_TYPES.has(msg.type) && typeof msg.productId === 'string') latePayments.set(id, msg.productId);
        resolve({ ok: false, durum: 'zaman-asimi' });
      }, timeoutFor(msg.type));
      pending.set(id, { resolve, timer });
      if (!post({ ...msg, id })) {
        pending.delete(id);
        timers.clearTimeout(timer);
        resolve(null);
      }
    });
  }

  /** Yerelden gelen hak değişikliği: f(haklar dizisi). Dönen: aboneliği bırakan işlev. */
  function onEntitlements(f) {
    listeners.entitlements.add(f);
    return () => listeners.entitlements.delete(f);
  }

  /** Sonradan onaylanan ödeme: f({ productId }). Bekletilenler hemen iletilir. */
  function onPayment(f) {
    listeners.payment.add(f);
    while (queuedPayments.length) f({ productId: queuedPayments.shift() });
    return () => listeners.payment.delete(f);
  }

  /** Yerelden gelen açılış (bağlantı ya da ekran): f(parseOpen sonucu). */
  function onOpen(f) {
    listeners.open.add(f);
    return () => listeners.open.delete(f);
  }

  /** style: selection | light | medium | success | warning | error */
  function haptic(style) {
    if (!(style in VIBRATION)) return;
    if (isNative) {
      if (has('haptic')) post({ type: 'haptic', style });
      return;
    }
    try {
      if (!nav || typeof nav.vibrate !== 'function') return;
      if (nav.userActivation && !nav.userActivation.hasBeenActive) return;
      nav.vibrate(VIBRATION[style]);
    } catch {
      /* titreşim yok */
    }
  }

  /** Metni panoya kopyalar (Clipboard API; yoksa gizli metin alanıyla). */
  async function copyText(text) {
    try {
      if (nav && nav.clipboard && win && win.isSecureContext) {
        await nav.clipboard.writeText(text);
        return true;
      }
    } catch {
      /* aşağıdaki yönteme düş */
    }
    try {
      const doc = win.document;
      const area = doc.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.setAttribute('aria-hidden', 'true');
      area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
      doc.body.appendChild(area);
      area.select();
      const ok = doc.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }

  /**
   * Kullanılabilir kanallar. iOS'ta `kanallar` iletisi (canOpenURL sonuçları); webde bağlantı kanalları her
   * zaman, sistem paylaşımı Web Share API varsa. Dönen: { whatsapp, telegram, x, igStory, system }.
   */
  async function channels() {
    if (isNative) {
      const base = { whatsapp: true, telegram: true, x: true, igStory: false, system: has('share') };
      if (!has('kanallar')) return base;
      const r = await ask({ type: 'kanallar' });
      if (!r || !r.ok || !r.veri || typeof r.veri !== 'object') return base;
      const v = r.veri;
      return { whatsapp: v.whatsapp !== false, telegram: v.telegram !== false, x: v.x !== false, igStory: v.igStory === true, system: has('share') };
    }
    return { whatsapp: true, telegram: true, x: true, igStory: false, system: Boolean(nav && typeof nav.share === 'function') };
  }

  /**
   * iOS paylaşımı (viral.md §4.9): kanal 'whatsapp' | 'durum' | 'telegram' | 'igStory' | 'x' | 'sistem' | 'kaydet'.
   * Dönen durum: 'acildi' | 'iptal' | 'kurulu_degil' | 'hata' | 'zaman-asimi' | 'gonderilemedi' | 'desteklenmiyor'.
   */
  async function nativeShare(payload) {
    if (!has('share')) return 'desteklenmiyor';
    const r = await ask({ type: 'share', ...payload });
    if (!r) return 'gonderilemedi';
    if (r.durum === 'zaman-asimi' || r.durum === 'desteklenmiyor') return r.durum;
    return ['acildi', 'iptal', 'kurulu_degil', 'hata'].includes(r.durum) ? r.durum : r.ok ? 'acildi' : 'hata';
  }

  /** Web sistem paylaşımı: 'paylasildi' | 'iptal' | 'kopyalandi' | 'basarisiz'. */
  async function webShare({ text, title = null }) {
    if (nav && typeof nav.share === 'function') {
      try {
        const data = { text };
        if (title) data.title = title;
        await nav.share(data);
        return 'paylasildi';
      } catch (e) {
        if (e && e.name === 'AbortError') return 'iptal';
      }
    }
    return (await copyText(text)) ? 'kopyalandi' : 'basarisiz';
  }

  /** Web görsel paylaşımı (hikâye kartı): dosyalı Web Share; yoksa indirme. 'paylasildi' | 'iptal' | 'indirildi' | 'basarisiz'. */
  async function webShareImage({ blob, fileName }) {
    if (blob && nav && typeof nav.canShare === 'function' && typeof File === 'function') {
      try {
        const file = new File([blob], fileName, { type: 'image/png' });
        if (nav.canShare({ files: [file] })) {
          // iOS Safari metin verilince dosyayı yok sayıyor (viral.md §4.6): yalnız dosya.
          await nav.share({ files: [file] });
          return 'paylasildi';
        }
      } catch (e) {
        if (e && e.name === 'AbortError') return 'iptal';
      }
    }
    try {
      const doc = win.document;
      const href = URL.createObjectURL(blob);
      const a = doc.createElement('a');
      a.href = href;
      a.download = fileName;
      a.rel = 'noopener';
      doc.body.appendChild(a);
      a.click();
      a.remove();
      timers.setTimeout(() => URL.revokeObjectURL(href), 4000);
      return 'indirildi';
    } catch {
      return 'basarisiz';
    }
  }

  /**
   * Widget durumu: yalnız gün numarası, yasak harf, bugün anlatıldı mı ve arayüz dili (widget metni ona
   * uyar). Gizli sözcük asla gitmez; sonraki günleri kabuk gunluk.js'ten kendisi doldurur.
   */
  function widgetState({ date, no, letter, lang, told, uiLang }) {
    if (!has('widgetDurum')) return false;
    return post({ type: 'widgetDurum', tarih: String(date), no: Number(no) || 0, harf: String(letter || '').slice(0, 2), dil: lang === 'en' ? 'en' : 'tr', anlatildi: Boolean(told), arayuz: uiLang === 'en' ? 'en' : 'tr' });
  }

  let readySent = false;
  /** İlk boyamadan sonra: yerel taraf açılış örtüsünü kaldırır. */
  function ready() {
    if (readySent) return;
    readySent = true;
    const send = () => {
      if (isNative) post({ type: 'ready' });
    };
    if (win && typeof win.requestAnimationFrame === 'function') win.requestAnimationFrame(() => win.requestAnimationFrame(send));
    else timers.setTimeout(send, 0);
  }

  /** Service worker yalnız http/https'te kaydedilir (iOS'ta harfsiz:// şemasında değil). */
  function registerServiceWorker(path) {
    if (!win || !nav) return;
    const p = win.location && win.location.protocol;
    if (p !== 'http:' && p !== 'https:') return;
    if (!('serviceWorker' in nav)) return;
    const register = () => nav.serviceWorker.register(path).catch(() => {});
    if (win.document.readyState === 'complete') register();
    else win.addEventListener('load', register, { once: true });
  }

  return Object.freeze({
    isNative,
    info,
    has,
    post,
    ask,
    pendingCount: () => pending.size,
    onEntitlements,
    onPayment,
    onOpen,
    haptic,
    copyText,
    channels,
    nativeShare,
    webShare,
    webShareImage,
    widgetState,
    ready,
    registerServiceWorker,
  });
}
