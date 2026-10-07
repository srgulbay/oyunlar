// Cihazdan çıkan iki şey (KOORDINASYON.md §13): sayaç olayları (§9) ve kullanıcının başlattığı bildirim (§10).
// Gövdeleri C'nin sayac.js ve bildir.js'i kurar; burada yalnız gönderilir.
//
// Sayaç: navigator.sendBeacon ile, yanıt beklenmez. sendBeacon başlık taşıyamadığı için herkese açık anahtar
// `?apikey=` sorgusunda, gövde text/plain JSON'dır (CORS ön isteği olmasın). Uç yoksa sessizce düşer.
// Bildir: fetch POST (başlık apikey, gövde JSON, 8 sn zaman aşımı). Sonuç 'ok' | 'offline' | 'error';
// her durumda arayüz bulmacayı bu cihazda gizler.
//
// Kipler: 'live' (yayın), 'off' (yerel geliştirme: hiçbir istek gitmez), 'local' (yerel geliştirme sunucusunun
// sahte ucu: <origin>/__uc/<ad>). Yerelde gerçek sunucuya istek gitmez.

import { counterBody, counterEnabled } from './sayac.js';
import { reportBody, REPORT_ENDPOINT } from './bildir.js';
import { SUPABASE_KEY, SAYAC_IOS, functionUrl } from './yapilandirma.js';

export const COUNTER_ENDPOINT = 'sayac';
export const REPORT_TIMEOUT_MS = 8000;

/** Yerel geliştirmede ağ kipi: varsayılan kapalı; ?uc=yerel ile yerel sahte uç. */
export function networkMode({ hostname, protocol, search }) {
  const local = protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(hostname || '');
  if (!local) return 'live';
  return /[?&]uc=yerel\b/.test(search || '') ? 'local' : 'off';
}

export function createNetwork({ mode = 'live', platform = 'web', origin = '', nav = globalThis.navigator, fetchFn = globalThis.fetch, timers = globalThis } = {}) {
  const endpoint = (name) => (mode === 'live' ? functionUrl(name) : mode === 'local' ? `${origin}/__uc/${name}` : null);
  const enabled = counterEnabled({ platform, iosFlag: SAYAC_IOS });

  /** Sayaç olayı; gönderildiyse (ya da kuyruğa girdiyse) true. */
  function count(event, { date, channel = '-' }) {
    if (!enabled) return false;
    const body = counterBody({ platform, date, channel, event });
    const url = endpoint(COUNTER_ENDPOINT);
    if (!body || !url) return false;
    const target = `${url}?apikey=${encodeURIComponent(SUPABASE_KEY)}`;
    const payload = JSON.stringify(body);
    try {
      if (nav && typeof nav.sendBeacon === 'function' && nav.sendBeacon(target, payload)) return true;
    } catch {
      /* fetch'e düş */
    }
    try {
      if (typeof fetchFn !== 'function') return false;
      fetchFn(target, { method: 'POST', body: payload, keepalive: true, mode: 'no-cors', credentials: 'omit', headers: { 'Content-Type': 'text/plain;charset=UTF-8' } }).catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  /** Bildirim gönderir. Dönen: 'ok' | 'offline' | 'error' (geçersiz gövde ve uç yokluğu 'error'). */
  async function report({ code, reason, uiLang }) {
    const body = reportBody({ code, reason, uiLang });
    if (!body) return 'error';
    if (nav && nav.onLine === false) return 'offline';
    const url = endpoint(REPORT_ENDPOINT);
    if (!url || typeof fetchFn !== 'function') return 'error';
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl ? timers.setTimeout(() => ctrl.abort(), REPORT_TIMEOUT_MS) : null;
    try {
      const res = await fetchFn(url, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'omit',
        signal: ctrl ? ctrl.signal : undefined,
      });
      let json = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }
      return res.ok && json && json.ok === true ? 'ok' : 'error';
    } catch {
      return nav && nav.onLine === false ? 'offline' : 'error';
    } finally {
      if (timer) timers.clearTimeout(timer);
    }
  }

  return Object.freeze({ mode, enabled, endpoint, count, report });
}
