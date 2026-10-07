// Düzensiz kök tabloları: kuralla üretilemeyen kök değişkenleri. Biçim: docs/icerik-bicimi.md §4.
// Ünsüz yumuşaması ve birleşik sözcük iyeliği kuralla üretilir; ünlü düşmesi ve ikizleşme motorun kendi sözlüğündedir
// (ekler.js: TR_VOWEL_DROP, TR_DOUBLING; yalnız gerçekten olan sözcükte). Burada yalnız öteki istisnalar durur.
// Sözcüğe özgü ek kökler ve eş adlar deste kaydındaki `kokler` ve `esler` alanlarındadır.
// Bu dosyayı ekler.js içe aktarır; sunucu kopyasına (KOORDINASYON.md §18) dahildir.

const freeze = table => Object.freeze(Object.fromEntries(Object.entries(table).map(([k, v]) => [k, Object.freeze(v)])));

// Türkçe: kök → ünlüyle başlayan ekten önceki biçim(ler) ("su" → "suyu", "ne" → "neyi").
// Deste sözcüklerinin öteki ses olaylarını kural ve motorun sözlüğü üretir (ağız → ağzı, omuz → omzu, burun → burnu,
// resim → resmi, kalp → kalbi, renk → rengi; ekler.test.js); bu yüzden 2026-10-07 gözden geçirmesinde yeni girdi gerekmedi.
export const TR_DUZENSIZ = freeze({
  su: ['suy'],
  ne: ['ney'],
});

// İngilizce: tekil → düzensiz çoğul(lar). -f/-fe → -ves, -y → -ies, -man → -men kuralla üretilir; tohumdaki
// kural kopyaları (knife, wife, life, leaf, wolf, half, loaf, shelf) zararsızdır.
export const EN_DUZENSIZ = freeze({
  mouse: ['mice'], child: ['children'], foot: ['feet'], tooth: ['teeth'], goose: ['geese'], man: ['men'],
  woman: ['women'], person: ['people'], ox: ['oxen'], die: ['dice'], louse: ['lice'], cactus: ['cacti'],
  fungus: ['fungi'], criterion: ['criteria'], phenomenon: ['phenomena'], knife: ['knives'], wife: ['wives'],
  life: ['lives'], leaf: ['leaves'], wolf: ['wolves'], half: ['halves'], loaf: ['loaves'], shelf: ['shelves'],
  octopus: ['octopi'], elf: ['elves'],
});
