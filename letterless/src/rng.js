// Tohumlu rastgele sayı üreteci (aile deseni: xmur3 + mulberry32).
// Yalnız 32 bit tam sayı işlemi kullanır; V8, JavaScriptCore ve Deno aynı diziyi üretir.

// Dizeyi 32 bitlik tohuma çevirir.
export function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

// [0, 1) aralığında sayı döndüren üreteç.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Dize tohumdan üreteç.
export function rngFromSeed(seed) {
  return mulberry32(xmur3(String(seed))());
}

// 0 … n−1 arasında tam sayı.
export function randInt(rng, n) {
  return Math.floor(rng() * n);
}

// Fisher–Yates; yeni dizi döndürür, girdiyi değiştirmez.
export function shuffled(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
