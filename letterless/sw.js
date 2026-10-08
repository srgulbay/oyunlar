// Service worker: sürümlü önbellek, çevrimdışı ilk açılış ve çevrimdışı oyun (bulmaca bağlantının içinde,
// denetim ve tahmin cihazda). Yayında herhangi bir web dosyası değişince VERSION artırılır; eski önbellek
// etkinleşmede silinir. Başka kökenlere giden istekler (sayaç, bildir) ve GET dışı istekler ele alınmaz.
//
// İki düzende çalışır (K-1; scripts/site-yayinla.sh):
// - web/ kökü (yerel geliştirme): kapsam köktür; /harfsiz/ ve /letterless/ girişleri kökün altındadır.
// - Oyunlar sitesi (GitHub Pages): /oyunlar/harfsiz/ ve /oyunlar/letterless/ ayrı birer uygulama kopyasıdır,
//   her birinin kendi sw.js'i ve kapsamı vardır; kapsam öteki oyunların sayfalarına taşmaz. Aynı kökendeki
//   başka uygulamalarla ve öbür Harfsiz kopyasıyla karışmasın diye önbellek adı kapsamı da taşır.
// Kapsam içindeki site sayfaları (gizlilik/, destek/, kosullar/) ve tanınmayan her yol uygulama kabuğuyla
// örtülmez: gezinme yalnız kapsamın kökünde (ve yerelde iki giriş sayfasında) kabuğu alır, gerisi ağa gider.
// Uygulamanın dosyaları dışındaki istekler (ör. sitenin ortak site.css'i) de ele alınmaz.
//
// Modül listesi elle tutulmaz: kurulumda src/app.js'ten başlayarak göreli `import … from './…'`,
// `import('./…')` ve `import './…'` bağlantıları izlenir; böylece içerik ya da iOS görevlisinin eklediği
// modüller listeden düşmez (şablon §7.10). web/tests/arayuz-pwa.test.js bu kurulumu diskle ve yayın
// düzeniyle çalıştırır. Görseller (B, web/assets) süsleyicidir: eksik olan atlanır. iOS'ta (harfsiz://
// şeması) kaydedilmez.

const VERSION = 'harfsiz-1.0.0-3';

// Uygulama kabuğu: biri eksikse kurulum başarısız olur (yarım önbellek olmaz). Kapsamın index.html'i o
// kopyanın dil girişidir (sitede /harfsiz/ Türkçe, /letterless/ İngilizce; yerelde kök Türkçe).
const SHELL = ['index.html', 'manifest.webmanifest', 'styles/app.css', 'styles/ekranlar.css'];
// Yalnız web/ kökü düzeninde var olan giriş sayfaları: varsa önbelleğe girer, yoksa atlanır.
const SHELL_OPTIONAL = ['harfsiz/index.html', 'letterless/index.html', 'letterless/manifest.webmanifest'];
const ENTRY_MODULES = ['src/app.js'];
const OPTIONAL = [
  'assets/icons/favicon.svg',
  'assets/icons/favicon-32.png',
  'assets/icons/apple-touch-icon.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-maskable-512.png',
];

// Uygulamanın dosyaları (kapsama göre yol): yalnız bunlar önbellekten sunulur ve önbelleğe eklenir.
const APP_FILE = /^(?:src\/|styles\/|assets\/|(?:letterless\/)?manifest\.webmanifest$|(?:(?:harfsiz|letterless)\/)?index\.html$)/;

const IMPORT_RE = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"](\.{1,2}\/[^'"]+)['"]/g;

/** Kaynak metindeki göreli içe aktarımlar. */
function importsOf(source) {
  const out = [];
  for (const m of source.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(IMPORT_RE)) out.push(m[1]);
  return out;
}

const scopeUrl = (path) => new URL(path, self.registration ? self.registration.scope : self.location.href).href;
const scopePath = () => new URL(scopeUrl('./')).pathname;
const CACHE_PREFIX = 'harfsiz-';
/** Önbellek adı: sürüm + kapsam ("harfsiz-1.0.0-3 /oyunlar/harfsiz/"). */
const cacheName = () => `${VERSION} ${scopePath()}`;

/** Modül grafiğini gezip önbelleğe koyar. Dönen: önbelleğe giren adresler. */
async function cacheModules(cache, entries) {
  const seen = new Set();
  const queue = entries.map(scopeUrl);
  while (queue.length) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    const res = await fetch(new Request(url, { cache: 'reload' }));
    if (!res.ok) throw new Error(`önbellek: ${url} ${res.status}`);
    await cache.put(url, res.clone());
    for (const spec of importsOf(await res.text())) {
      const next = new URL(spec, url).href;
      if (!seen.has(next)) queue.push(next);
    }
  }
  return seen;
}

const addOptional = (cache, list) => Promise.all(list.map((p) => cache.add(new Request(scopeUrl(p), { cache: 'reload' })).catch(() => {})));

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(cacheName());
      await cache.addAll(SHELL.map((p) => new Request(scopeUrl(p), { cache: 'reload' })));
      await cacheModules(cache, ENTRY_MODULES);
      await addOptional(cache, SHELL_OPTIONAL);
      await addOptional(cache, OPTIONAL);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const current = cacheName();
      const mine = ` ${scopePath()}`;
      // Bu kapsamın eski sürümleri ve kapsamsız eski ad biçimi ("harfsiz-1.0.0-1") silinir; öbür kopyanın ve
      // başka uygulamaların önbelleklerine dokunulmaz.
      const stale = (n) => n !== current && n.startsWith(CACHE_PREFIX) && (n.endsWith(mine) || !n.includes(' '));
      const names = await caches.keys();
      await Promise.all(names.filter(stale).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

/** Kapsama göre yol ("" kök). Kapsam dışıysa null. */
function inScope(url) {
  const scope = scopePath();
  return url.pathname.startsWith(scope) ? url.pathname.slice(scope.length) : null;
}

/** Gezinmenin kabuğu: kök ve index.html kapsamın girişini, yerelde /harfsiz/ ve /letterless/ kendi girişini alır. */
function shellFor(rest) {
  if (rest === '' || rest === 'index.html') return scopeUrl('index.html');
  const m = /^(harfsiz|letterless)\/(?:index\.html)?$/.exec(rest);
  return m ? scopeUrl(`${m[1]}/index.html`) : null;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const rest = inScope(url);
  if (rest === null) return;

  if (req.mode === 'navigate') {
    // Site sayfaları ve tanınmayan yollar ağdan gelir (kabuk onları örtmez).
    const shell = shellFor(rest);
    if (!shell) return;
    event.respondWith(
      (async () => {
        const cache = await caches.open(cacheName());
        const hit = await cache.match(shell);
        if (!hit) return fetch(req);
        if (!hit.redirected) return hit;
        return new Response(await hit.blob(), { status: hit.status, headers: hit.headers });
      })(),
    );
    return;
  }

  if (!APP_FILE.test(rest)) return;
  // Uygulama dosyaları: önce önbellek, yoksa ağ (başarılı aynı köken yanıtı önbelleğe eklenir).
  event.respondWith(
    (async () => {
      const cache = await caches.open(cacheName());
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') cache.put(req, res.clone()).catch(() => {});
      return res;
    })(),
  );
});
