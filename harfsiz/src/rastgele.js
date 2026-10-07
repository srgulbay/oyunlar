// Arayüzün rastgelelik kaynağı: motorun beklediği [0, 1) üreteci crypto.getRandomValues'tan
// (KOORDINASYON.md §14). Gönderen imi, tuz, sözcük ve harf dağıtımı bununla yapılır.

export function cryptoRng(source = globalThis.crypto) {
  if (!source || typeof source.getRandomValues !== 'function') throw new Error('crypto.getRandomValues yok');
  const buffer = new Uint32Array(64);
  let i = buffer.length;
  return () => {
    if (i >= buffer.length) {
      source.getRandomValues(buffer);
      i = 0;
    }
    return buffer[i++] / 4294967296;
  };
}
