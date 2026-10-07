// Kart temalarının görsel dili (B; docs/sanat-yonu.md §5): renk, yazı, desen, yasak harf rozeti, hak
// şeridi ve alt bant. Yalnız veri ve iki saf yardımcı (desen noktaları, yazı dizgisi); çizim A'nındır
// (kart.js → cardLayout'un verdiği konum ve boyların üstüne). Kimlikler kart.js → THEMES ile aynıdır
// (tools/kart/temalar.test.mjs sınar). Önizlemeler bu dosyadan çizilir: tools/kart/onizleme.py →
// web/assets/kart/<tema>-<tr|en>.webp (480×480; mağazanın tema seçicisi).
//
// Çizim sırası (her tema): zemin → desen → bant (ve bant deseni) → metinler ve rozet → hak şeridi.
// Ölçüler 1080 genişliğe göredir (kare 1080×1080, hikâye 1080×1920); `y` değerleri cardLayout'ta olduğu
// gibi metnin taban çizgisidir (canvas textBaseline 'alphabetic').
//
// Renk tek taşıyıcı değildir: hak şeridi ✕ ● ○ şekilleriyle, sonuç metniyle okunur. Bütün metin renkleri
// kendi zeminlerinde ≥ 4,5:1, şekiller ≥ 3:1 (ölçüm docs/sanat-yonu.md §5.7; test tools/kart/temalar.test.mjs).

import { rngFromSeed } from '../rng.js';

// Yazı aileleri (CSS font-family listeleri; canvas `ctx.font` ile de kullanılır). Ücretli temalar yalnız
// iOS uygulamasında çizilir (web satış yapmaz, KOORDINASYON.md §8), bu yüzden Apple yazıları güvencededir;
// ücretsiz Mürekkep her platformda çizilir ve genel ailelere düşer. Hepsinde Türkçe harfler var (ölçüldü).
export const YAZI = Object.freeze({
  yuvarlak: "ui-rounded, 'SF Pro Rounded', 'Arial Rounded MT Bold', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  tirnakli: "ui-serif, 'New York', Georgia, 'Noto Serif', 'Times New Roman', serif",
  sistem: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  esaralik: "ui-monospace, 'SF Mono', Menlo, Consolas, 'Roboto Mono', monospace",
  daktilo: "'American Typewriter', 'Courier New', ui-monospace, monospace",
  daktiloEsaralik: "'Courier New', 'American Typewriter', ui-monospace, monospace",
  tebesir: "'Chalkboard SE', 'Marker Felt', ui-rounded, 'Comic Sans MS', sans-serif",
  gazeteBaslik: "'Bodoni 72', Didot, 'Times New Roman', ui-serif, serif",
  gazete: "Georgia, 'Times New Roman', ui-serif, serif",
});

// Kart temaları. Alanlar:
//   zemin   { renk, desen? }                 desen türleri: cizgili, tahta, tugla, yok (ayrıntı her temada)
//   marka   { aile, kalinlik, renk, aralik (px harf aralığı), altCizgi?, isilti? }
//   rozet   { tur: tas|tus|tebesir|neon|damga, … }   kare: kenar 2r, merkez (cx, cy); daire: yarıçap r
//   etiket, anlatim, skor { aile, kalinlik?, renk, aralik?, donusum?, isilti? }   kalinlik yoksa düzeninki
//   sonuc   { aile, kalinlik?, renk: { success, fail, neutral }, isilti? }
//   haklar  { miss, hit, empty, cizgi (kalınlık / boy), isilti? }  miss ✕ iki çizgi · hit ● dolu · empty ○ halka
//   bant    { renk, ustCizgi?, desen?, cta { aile, kalinlik?, renk }, adres { aile, kalinlik?, renk, isilti? } }
//   isilti  { renk, bulaniklik }: canvas shadowColor/shadowBlur; aynı metin iki kez çizilir (önce ışıltılı).
export const KART_TEMALARI = Object.freeze({
  // Mürekkep (ücretsiz, varsayılan): kâğıt, mürekkep ve kırmızı kalem. Uygulamanın kendi dili.
  murekkep: Object.freeze({
    id: 'murekkep',
    zemin: { renk: '#FBF7F0', desen: null },
    marka: { aile: YAZI.yuvarlak, kalinlik: 800, renk: '#1D2433', aralik: 2,
      altCizgi: { renk: '#C2381F', kalinlik: 8, uzaklik: 22 } },
    rozet: { tur: 'tas', zemin: '#1D2433', alt: '#0B0F17', harf: '#FBF7F0', cizgi: '#FF6B4A', bosluk: true,
      aile: YAZI.tirnakli, kalinlik: 900 },
    etiket: { aile: YAZI.yuvarlak, kalinlik: 600, renk: '#5A6072' },
    anlatim: { aile: YAZI.tirnakli, kalinlik: 700, renk: '#1D2433' },
    sonuc: { aile: YAZI.yuvarlak, kalinlik: 800, renk: { success: '#1F7A3D', fail: '#C2381F', neutral: '#1D2433' } },
    haklar: { miss: '#C2381F', hit: '#1F7A3D', empty: '#8A8173', cizgi: 0.12 },
    skor: { aile: YAZI.yuvarlak, kalinlik: 600, renk: '#5A6072' },
    bant: { renk: '#1D2433',
      cta: { aile: YAZI.yuvarlak, kalinlik: 600, renk: '#C9CED9' },
      adres: { aile: YAZI.esaralik, kalinlik: 700, renk: '#FBF7F0' } },
  }),

  // Daktilo: sararmış daktilo kâğıdı, satır çizgileri, kırmızı kenar boşluğu, daktilo tuşu rozet.
  daktilo: Object.freeze({
    id: 'daktilo',
    zemin: { renk: '#F3EAD3', desen: { tur: 'cizgili', renk: '#E9DFC6', kalinlik: 2, aralik: 56, ilk: 140,
      kenar: { x: [44, 52], renk: '#D9897C', kalinlik: 2 } } },
    marka: { aile: YAZI.daktilo, kalinlik: 700, renk: '#2A2420', aralik: 6 },
    rozet: { tur: 'tus', kenar: '#2A2420', kenarKalinlik: 10, zemin: '#F7F1E1', alt: '#14110E', harf: '#2A2420',
      cizgi: '#B3261E', bosluk: true, aile: YAZI.daktilo, kalinlik: 700 },
    etiket: { aile: YAZI.daktilo, kalinlik: 400, renk: '#62553F', aralik: 1 },
    anlatim: { aile: YAZI.daktilo, kalinlik: 600, renk: '#2A2420', isilti: { renk: 'rgba(42,36,32,0.35)', bulaniklik: 1.5 } },
    sonuc: { aile: YAZI.daktilo, kalinlik: 700, renk: { success: '#2E6B34', fail: '#B3261E', neutral: '#2A2420' } },
    haklar: { miss: '#B3261E', hit: '#2E6B34', empty: '#7E7058', cizgi: 0.12 },
    skor: { aile: YAZI.daktilo, kalinlik: 400, renk: '#62553F' },
    bant: { renk: '#2A2420',
      desen: { tur: 'delik', renk: '#F3EAD3', yaricap: 6, aralik: 28 },  // bandın üst kenarında koparma delikleri
      cta: { aile: YAZI.daktilo, kalinlik: 400, renk: '#E8DDC2' },
      adres: { aile: YAZI.daktiloEsaralik, kalinlik: 700, renk: '#F7C873' } },
  }),

  // Tebeşir: yeşil yazı tahtası, tebeşir tozu, tahta kenarı bant ve iki tebeşir.
  tebesir: Object.freeze({
    id: 'tebesir',
    zemin: { renk: '#22372E', desen: { tur: 'tahta', ic: '#2A4237', dis: '#1B2C24',
      toz: { renk: '#FFFFFF', sayi: 1400, yaricap: [0.8, 2.4], saydamlik: [0.03, 0.09] },
      leke: { renk: '#FFFFFF', sayi: 3, yaricap: [160, 320], saydamlik: 0.035 } } },
    marka: { aile: YAZI.tebesir, kalinlik: 700, renk: '#F2F0E6', aralik: 3 },
    rozet: { tur: 'tebesir', cizgiRenk: '#F2F0E6', halkaKalinlik: 7, harf: '#F2F0E6', cizgi: '#FF8A75', bosluk: false,
      aile: YAZI.tebesir, kalinlik: 700 },
    etiket: { aile: YAZI.tebesir, kalinlik: 400, renk: '#F3D77A' },
    anlatim: { aile: YAZI.tebesir, kalinlik: 700, renk: '#F2F0E6' },
    sonuc: { aile: YAZI.tebesir, kalinlik: 700, renk: { success: '#A6E3A8', fail: '#FF9A85', neutral: '#F2F0E6' } },
    haklar: { miss: '#FF9A85', hit: '#A6E3A8', empty: '#C9D3CC', cizgi: 0.13 },
    skor: { aile: YAZI.tebesir, kalinlik: 400, renk: '#C9D3CC' },
    bant: { renk: '#5E4128', ustCizgi: { renk: '#7A5638', kalinlik: 6 },
      desen: { tur: 'tebesirler', parcalar: [
        { x: 862, dy: 150, en: 96, boy: 20, aci: -4, renk: '#F2F0E6' },
        { x: 972, dy: 152, en: 64, boy: 20, aci: 3, renk: '#F3D77A' },
      ] },
      cta: { aile: YAZI.tebesir, kalinlik: 400, renk: '#F2E6D6' },
      adres: { aile: YAZI.esaralik, kalinlik: 700, renk: '#FFFFFF' } },
    // İsteğe bağlı doku: metinler ayrı katmanda çizilip üstünden `destination-out` ile toz noktaları silinir.
    doku: { sayi: 900, yaricap: [0.6, 1.6], saydamlik: [0.25, 0.6] },
  }),

  // Neon: gece mavisi-mor tuğla duvar, ışıltılı tüp yazılar.
  neon: Object.freeze({
    id: 'neon',
    zemin: { renk: '#0E0B1F', desen: { tur: 'tugla', renk: '#1B1636', kalinlik: 2, en: 120, boy: 44,
      parilti: { renk: '#3A1F6B', saydamlik: 0.45, yaricap: 560 } } },
    marka: { aile: YAZI.yuvarlak, kalinlik: 900, renk: '#FF6FB5', aralik: 4, isilti: { renk: '#FF4FA3', bulaniklik: 26 } },
    rozet: { tur: 'neon', halka: '#FF6FB5', halkaKalinlik: 8, harf: '#7DF4FF', cizgi: '#FF6FB5', bosluk: true,
      zemin: '#0E0B1F', isilti: { renk: '#FF4FA3', bulaniklik: 18 }, harfIsilti: { renk: '#5CF0FF', bulaniklik: 14 },
      aile: YAZI.yuvarlak, kalinlik: 900 },
    etiket: { aile: YAZI.yuvarlak, kalinlik: 600, renk: '#C9C3E6' },
    anlatim: { aile: YAZI.yuvarlak, kalinlik: 800, renk: '#7DF4FF', isilti: { renk: '#5CF0FF', bulaniklik: 18 } },
    sonuc: { aile: YAZI.yuvarlak, kalinlik: 900, renk: { success: '#8CFFA8', fail: '#FF7A92', neutral: '#EDE9FF' },
      isilti: { bulaniklik: 16 } },
    haklar: { miss: '#FF7A92', hit: '#8CFFA8', empty: '#7A73A8', cizgi: 0.12, isilti: { bulaniklik: 10 } },
    skor: { aile: YAZI.yuvarlak, kalinlik: 600, renk: '#C9C3E6' },
    bant: { renk: '#160F2E', ustCizgi: { renk: '#FF6FB5', kalinlik: 4, isilti: { renk: '#FF4FA3', bulaniklik: 16 } },
      cta: { aile: YAZI.yuvarlak, kalinlik: 600, renk: '#EDE9FF' },
      adres: { aile: YAZI.esaralik, kalinlik: 700, renk: '#7DF4FF', isilti: { renk: '#5CF0FF', bulaniklik: 8 } } },
  }),

  // Gazete: gazete kâğıdı, Bodoni manşet ve çift çizgi, damga rozet, yarım ton noktalı bant.
  gazete: Object.freeze({
    id: 'gazete',
    zemin: { renk: '#F1ECE1', desen: null },
    marka: { aile: YAZI.gazeteBaslik, kalinlik: 700, renk: '#141414', aralik: 3,
      // Manşet çizgisi markanın x'inden rozetin sol kenarına (cx − r − rozetPayi) kadar; rozetin altına girmez.
      ciftCizgi: { renk: '#141414', kalin: 6, ince: 2, arada: 6, uzaklik: 22, rozetPayi: 20 } },
    rozet: { tur: 'damga', kenar: '#141414', kenarKalinlik: 6, icKenar: 2, zemin: '#F1ECE1', harf: '#141414',
      cizgi: '#A3271C', bosluk: true, aile: YAZI.gazeteBaslik, kalinlik: 700 },
    etiket: { aile: YAZI.gazete, kalinlik: 700, renk: '#4A4740', aralik: 3, donusum: 'buyuk' },
    anlatim: { aile: YAZI.gazete, kalinlik: 700, renk: '#141414' },
    sonuc: { aile: YAZI.gazeteBaslik, kalinlik: 700, renk: { success: '#1E5E3A', fail: '#A3271C', neutral: '#141414' } },
    haklar: { miss: '#A3271C', hit: '#141414', empty: '#857E70', cizgi: 0.11 },
    skor: { aile: YAZI.gazete, kalinlik: 400, renk: '#4A4740' },
    bant: { renk: '#141414',
      desen: { tur: 'yarimTon', renk: '#3A3835', aralik: 18, yaricap: [0, 4.5] },  // soldan sağa büyüyen noktalar
      cta: { aile: YAZI.gazete, kalinlik: 400, renk: '#E6DFD0' },
      adres: { aile: YAZI.esaralik, kalinlik: 700, renk: '#F1ECE1' } },
  }),
});

// Oyun ekranlarının temaları (Kart temaları ürünü "4 kart ve oyun teması" verir; KOORDINASYON.md §8).
// A'nın CSS belirteçlerine karşılık gelir; açık ve koyu sistem görünümünün ikisi de vardır. Mürekkep, uygulamanın
// varsayılanıdır (tools/simge/palet.py ile aynı değerler).
export const ARAYUZ_TEMALARI = Object.freeze({
  murekkep: Object.freeze({
    yazi: { baslik: YAZI.yuvarlak, govde: YAZI.sistem, anlatim: YAZI.tirnakli },
    acik: { zemin: '#FBF7F0', yuzey: '#FFFDF8', 'yuzey-ikinci': '#F2ECE1', metin: '#1D2433', 'metin-ikincil': '#5A6072',
      cizgi: '#8A8173', vurgu: '#C2381F', basari: '#1F7A3D', eylem: '#1F5FA8',
      'rozet-zemin': '#1D2433', 'rozet-harf': '#FBF7F0', 'rozet-cizgi': '#FF6B4A' },
    koyu: { zemin: '#121722', yuzey: '#1B2230', 'yuzey-ikinci': '#242C3B', metin: '#F3EEE4', 'metin-ikincil': '#A7ADBB',
      cizgi: '#6E7790', vurgu: '#FF7A5C', basari: '#5BD27F', eylem: '#7FB2FF',
      'rozet-zemin': '#F3EEE4', 'rozet-harf': '#1D2433', 'rozet-cizgi': '#C2381F' },
  }),
  daktilo: Object.freeze({
    yazi: { baslik: YAZI.daktilo, govde: YAZI.sistem, anlatim: YAZI.daktilo },
    acik: { zemin: '#F3EAD3', yuzey: '#FBF5E6', 'yuzey-ikinci': '#EADFC4', metin: '#2A2420', 'metin-ikincil': '#62553F',
      cizgi: '#8E7F64', vurgu: '#B3261E', basari: '#2E6B34', eylem: '#2F5A8A',
      'rozet-zemin': '#2A2420', 'rozet-harf': '#F7F1E1', 'rozet-cizgi': '#E0574A' },
    koyu: { zemin: '#1B1916', yuzey: '#24211D', 'yuzey-ikinci': '#2E2A24', metin: '#EFE6D2', 'metin-ikincil': '#B5A98F',
      cizgi: '#7D735F', vurgu: '#FF7B6B', basari: '#7CCB85', eylem: '#8FB8E8',
      'rozet-zemin': '#EFE6D2', 'rozet-harf': '#1B1916', 'rozet-cizgi': '#C0392B' },
  }),
  tebesir: Object.freeze({
    yazi: { baslik: YAZI.tebesir, govde: YAZI.sistem, anlatim: YAZI.tebesir },
    acik: { zemin: '#EEF2EC', yuzey: '#F8FAF6', 'yuzey-ikinci': '#E1E8E0', metin: '#1E3A2E', 'metin-ikincil': '#4F6A5D',
      cizgi: '#6F8879', vurgu: '#B23A2A', basari: '#1A6B35', eylem: '#2C6A8A',
      'rozet-zemin': '#22372E', 'rozet-harf': '#F2F0E6', 'rozet-cizgi': '#FF8A75' },
    koyu: { zemin: '#22372E', yuzey: '#2A4237', 'yuzey-ikinci': '#31493E', metin: '#F2F0E6', 'metin-ikincil': '#C9D3CC',
      cizgi: '#8FA89A', vurgu: '#FF9A85', basari: '#A6E3A8', eylem: '#F3D77A',
      'rozet-zemin': '#F2F0E6', 'rozet-harf': '#22372E', 'rozet-cizgi': '#C8402F' },
  }),
  neon: Object.freeze({
    yazi: { baslik: YAZI.yuvarlak, govde: YAZI.sistem, anlatim: YAZI.yuvarlak },
    acik: { zemin: '#F6F3FF', yuzey: '#FFFFFF', 'yuzey-ikinci': '#ECE6FF', metin: '#1B1530', 'metin-ikincil': '#574F7A',
      cizgi: '#8C84B5', vurgu: '#C2185B', basari: '#18703D', eylem: '#6A1BB0',
      'rozet-zemin': '#1B1530', 'rozet-harf': '#7DF4FF', 'rozet-cizgi': '#FF6FB5' },
    koyu: { zemin: '#0E0B1F', yuzey: '#171230', 'yuzey-ikinci': '#201A3D', metin: '#EDE9FF', 'metin-ikincil': '#B7AFE0',
      cizgi: '#6E64A3', vurgu: '#FF7A92', basari: '#8CFFA8', eylem: '#7DF4FF',
      'rozet-zemin': '#EDE9FF', 'rozet-harf': '#0E0B1F', 'rozet-cizgi': '#D81B60' },
  }),
  gazete: Object.freeze({
    yazi: { baslik: YAZI.gazeteBaslik, govde: YAZI.gazete, anlatim: YAZI.gazete },
    acik: { zemin: '#F1ECE1', yuzey: '#F8F5EE', 'yuzey-ikinci': '#E6DFD0', metin: '#141414', 'metin-ikincil': '#4A4740',
      cizgi: '#857E70', vurgu: '#A3271C', basari: '#1E5E3A', eylem: '#1F4E8C',
      'rozet-zemin': '#141414', 'rozet-harf': '#F1ECE1', 'rozet-cizgi': '#E04A3A' },
    koyu: { zemin: '#161513', yuzey: '#1F1D1A', 'yuzey-ikinci': '#2A2724', metin: '#EDE7DA', 'metin-ikincil': '#B3AB9C',
      cizgi: '#7A7366', vurgu: '#FF7A66', basari: '#79C99A', eylem: '#8FB4E8',
      'rozet-zemin': '#EDE7DA', 'rozet-harf': '#161513', 'rozet-cizgi': '#C0392B' },
  }),
});

// Canvas yazı dizgisi: `ctx.font = yaziDizgisi(stil, oge)`; kalınlık stilde yoksa düzenin (cardLayout) değeri.
export function yaziDizgisi(stil, oge) {
  const kalinlik = stil.kalinlik ?? oge.weight ?? 400;
  return `${kalinlik} ${oge.size}px ${stil.aile}`;
}

// Zemin ve doku noktaları: tohumlu, her cihazda ve her çizimde aynı (rng.js → rngFromSeed). Tohum
// `harfsiz/kart/<tema>/<ad>`; dönen { x, y, r, a } listesi (a: saydamlık). Temadaki `sayi` 1080×1080 içindir;
// hikâye kartında boy/1080 ile çarpılır ve ad `toz/1920` gibi boyu taşır (tools/kart/veri.mjs).
export function desenNoktalari(temaId, ad, { en, boy, sayi, yaricap: [rMin, rMax], saydamlik: [aMin, aMax] }) {
  const rng = rngFromSeed(`harfsiz/kart/${temaId}/${ad}`);
  const noktalar = [];
  for (let i = 0; i < sayi; i++) {
    noktalar.push({
      x: Math.round(rng() * en * 10) / 10,
      y: Math.round(rng() * boy * 10) / 10,
      r: Math.round((rMin + rng() * (rMax - rMin)) * 100) / 100,
      a: Math.round((aMin + rng() * (aMax - aMin)) * 1000) / 1000,
    });
  }
  return noktalar;
}

// Tebeşir lekeleri (radyal geçişli büyük daireler): { x, y, r, a }.
export function tebesirLekeleri(boy) {
  const leke = KART_TEMALARI.tebesir.zemin.desen.leke;
  const rng = rngFromSeed(`harfsiz/kart/tebesir/leke/${boy}`);
  return Array.from({ length: leke.sayi }, () => ({
    x: Math.round(120 + rng() * 840),
    y: Math.round(200 + rng() * (boy - 400)),
    r: Math.round(leke.yaricap[0] + rng() * (leke.yaricap[1] - leke.yaricap[0])),
    a: leke.saydamlik,
  }));
}
