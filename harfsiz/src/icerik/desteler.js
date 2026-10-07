// Deste kaydı: yalnız yayımlanan desteler. Biçim: docs/icerik-bicimi.md §2.
// kod   : yükte taşınan kalıcı numara (0–255). Bir kod hiçbir zaman başka desteye verilmez.
// dil   : bulmacanın dili (kurallar bu dile göre işler)
// ucretli: true ise kurmak için deste ürünü ya da "Harfsiz Hepsi" gerekir; çözmek her zaman ücretsiz
// ad    : arayüzde görünen ad (TR/EN)
// tanim : mağaza ve kilitli deste ekranındaki kısa tanım (TR/EN)

import { SOZCUKLER as TEMEL } from './sozcukler/temel.js';
import { SOZCUKLER as BASIC } from './sozcukler/basic.js';
import { SOZCUKLER as MUTFAK } from './sozcukler/mutfak.js';
import { SOZCUKLER as SPOR } from './sozcukler/spor.js';
import { SOZCUKLER as MESLEKLER } from './sozcukler/meslekler.js';
import { SOZCUKLER as COCUK } from './sozcukler/cocuk.js';

export const DESTELER = Object.freeze([
  {
    id: 'temel', kod: 0, dil: 'tr', ucretli: false,
    ad: { tr: 'Temel', en: 'Basics (Turkish)' },
    tanim: { tr: 'Her gün gördüğün şeyler.', en: 'Everyday things, in Turkish.' },
    sozcukler: TEMEL,
  },
  {
    id: 'basic', kod: 1, dil: 'en', ucretli: false,
    ad: { tr: 'Temel (İngilizce)', en: 'Basics' },
    tanim: { tr: 'Her gün gördüğün şeyler, İngilizce.', en: 'Everyday things.' },
    sozcukler: BASIC,
  },
  {
    id: 'mutfak', kod: 10, dil: 'tr', ucretli: true,
    ad: { tr: 'Mutfak', en: 'Kitchen (Turkish)' },
    tanim: { tr: 'Tencereden lahmacuna, mutfağın bütün dili.', en: 'Pots, pans and Turkish dishes.' },
    sozcukler: MUTFAK,
  },
  {
    id: 'spor', kod: 11, dil: 'tr', ucretli: true,
    ad: { tr: 'Spor', en: 'Sports (Turkish)' },
    tanim: { tr: 'Sahadan tribüne, terden madalyaya.', en: 'From the pitch to the podium.' },
    sozcukler: SPOR,
  },
  {
    id: 'meslekler', kod: 12, dil: 'tr', ucretli: true,
    ad: { tr: 'Meslekler', en: 'Jobs (Turkish)' },
    tanim: { tr: 'Aşçıdan astronota, herkes iş başında.', en: 'From chef to astronaut.' },
    sozcukler: MESLEKLER,
  },
  {
    id: 'cocuk', kod: 13, dil: 'tr', ucretli: true,
    ad: { tr: 'Çocuk', en: 'Kids (Turkish)' },
    tanim: { tr: 'Masallar, oyunlar ve oyuncaklar: küçüklerle oynamak için.', en: 'Fairy tales, games and toys.' },
    sozcukler: COCUK,
  },
]);
