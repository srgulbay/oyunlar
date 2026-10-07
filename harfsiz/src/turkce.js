// Türkçe (ve İngilizce kip) metin işleme: normalleştirme, büyük/küçük harf (İ/ı),
// şapka, kesme işareti, görünmez karakter, homoglif iskeleti, karakter sınıfları,
// sözcüklere ayırma ve harf eki ("E'siz", "A'sız").
// Saf modüldür: DOM, saat, depo, ağ ve arayüz metni kullanmaz (sunucuya kopyalanabilir).

export const LANGS = Object.freeze(['tr', 'en']);

// Türk alfabesi (29 harf) ve İngiliz alfabesi (26 harf); yasak harf yalnız bunlardan seçilir.
export const TR_ALPHABET = Object.freeze(['a', 'b', 'c', 'ç', 'd', 'e', 'f', 'g', 'ğ', 'h', 'ı', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'ö', 'p', 'r', 's', 'ş', 't', 'u', 'ü', 'v', 'y', 'z']);
export const EN_ALPHABET = Object.freeze('abcdefghijklmnopqrstuvwxyz'.split(''));

// Anlatımda kullanılabilen harfler (iki kipte aynı): Türk alfabesi + q w x + şapkalı â î û.
const LETTER_RE = /^[a-zçğıöşüâîûA-ZÇĞİÖŞÜÂÎÛ]$/u;
// Anlatımda kullanılabilen noktalama.
export const PUNCTUATION = Object.freeze(['.', ',', ':', ';', '!', '?', "'", '"', '-', '…', '(', ')', '«', '»']);
const PUNCT_SET = new Set(PUNCTUATION);

export const VOWELS = 'aeıioöuü';

export function isLang(lang) { return lang === 'tr' || lang === 'en'; }
export function alphabet(lang) { return lang === 'en' ? EN_ALPHABET : TR_ALPHABET; }

// ---------------------------------------------------------------------------
// Normalleştirme

const APOSTROPHES = /[\u{2019}\u{2018}\u{201A}\u{201B}\u{02BC}\u{02B9}\u{02BB}\u{02BD}\u{0060}\u{00B4}\u{2032}\u{FF07}\u{055A}]/gu;
const QUOTES = /[\u{201C}\u{201D}\u{201E}\u{201F}\u{2033}\u{FF02}\u{2039}\u{203A}]/gu;
const DASHES = /[\u{2010}\u{2011}\u{2012}\u{2013}\u{2014}\u{2015}\u{2212}\u{FE58}\u{FE63}\u{FF0D}]/gu;
const SPACES = /[\t\n\r\v\f\u{00A0}\u{1680}\u{2000}-\u{200A}\u{2028}\u{2029}\u{202F}\u{205F}\u{3000}]/gu;

// NFC, kesme/tırnak/tire ve boşluk türlerini tek biçime indirir. Görünmez karakterleri
// SİLMEZ (denetim onları yakalamalı); uzunluk yalnız NFC birleştirmesiyle değişebilir.
export function normalizeText(raw) {
  return String(raw ?? '').normalize('NFC')
    .replace(APOSTROPHES, "'")
    .replace(QUOTES, '"')
    .replace(DASHES, '-')
    .replace(SPACES, ' ');
}

// Dile göre küçük harf. Yerel ayara bağımlı değildir (JavaScriptCore, V8, Deno aynı sonucu verir):
// TR'de İ → i, I → ı; EN'de İ → i, I → i.
export function toLower(s, lang = 'tr') {
  const t = String(s).replace(/İ/g, 'i');
  return (lang === 'tr' ? t.replace(/I/g, 'ı') : t).toLowerCase();
}

// Dile göre büyük harf: TR'de i → İ, ı → I.
export function toUpper(s, lang = 'tr') {
  const t = String(s);
  return (lang === 'tr' ? t.replace(/i/g, 'İ') : t.replace(/ı/g, 'I')).toUpperCase();
}

// Şapkayı kaldırır: â → a, î → i, û → u (Türkçede ayrı harf değildir).
export function foldCircumflex(s) {
  return String(s).replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
    .replace(/Â/g, 'A').replace(/Î/g, 'İ').replace(/Û/g, 'U');
}

// Türkçe harfleri ASCII karşılığına indirir (küçük harfli girdi için): ç→c ğ→g ı→i ö→o ş→s ü→u.
export function foldTurkish(s) {
  return foldCircumflex(String(s)).replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
    .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');
}

// Girdi yalnız ASCII harflerden mi oluşuyor (Türkçe klavyesi olmayan yazım)?
export function isAsciiOnly(s) {
  return !/[çğıöşüâîûÇĞİÖŞÜÂÎÛ]/u.test(String(s));
}

// ---------------------------------------------------------------------------
// Karakter sınıfları

const RE_EMOJI = /[\p{Extended_Pictographic}\p{Regional_Indicator}\u{20E3}\u{1F3FB}-\u{1F3FF}]/u;
const RE_EMOJI_GLUE = /[\u{200D}\u{FE0E}\u{FE0F}]/u;
const RE_DIGIT = /\p{N}/u;
const RE_INVISIBLE = /[\p{Cf}\p{M}\u{115F}\u{1160}\u{3164}\u{FFA0}]/u;
const RE_HOMOGLYPH = /[\p{Script=Cyrillic}\p{Script=Greek}\p{Script=Armenian}\p{Script=Cherokee}\u{FF21}-\u{FF3A}\u{FF41}-\u{FF5A}\u{1D00}-\u{1D2B}\u{1D2C}-\u{1D6A}\u{1D400}-\u{1D7FF}\u{249C}-\u{24E9}\u{0250}-\u{02AF}\u{02B0}-\u{02FF}\u{A730}-\u{A7FF}]/u;
const RE_LETTER_ANY = /\p{L}/u;

// Her kod noktasının sınıfı:
// 'letter' | 'space' | 'punct' | 'digit' | 'emoji' | 'invisible' | 'homoglyph' | 'foreign' | 'symbol'
export function classifyChars(text) {
  const out = [];
  let index = 0;
  let prev = null;
  for (const ch of String(text)) {
    let cls;
    if (LETTER_RE.test(ch)) cls = 'letter';
    else if (ch === ' ') cls = 'space';
    else if (PUNCT_SET.has(ch)) cls = 'punct';
    else if (RE_EMOJI.test(ch)) cls = 'emoji';
    else if (RE_EMOJI_GLUE.test(ch) && prev === 'emoji') cls = 'emoji';
    else if (RE_DIGIT.test(ch)) cls = 'digit';
    else if (RE_INVISIBLE.test(ch)) cls = 'invisible';
    else if (RE_HOMOGLYPH.test(ch)) cls = 'homoglyph';
    else if (RE_LETTER_ANY.test(ch)) cls = 'foreign';
    else cls = 'symbol';
    out.push({ ch, index, cls });
    index += ch.length;
    prev = cls;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Sözcüklere ayırma
// Sözcük = harf, rakam, birleşik işaret ve görünmez karakterlerden oluşan en uzun dizi;
// iki sözcük karakteri arasındaki kesme işareti sözcüğü bölmez ("Ankara'da" tek sözcük).
// Tire, boşluk, öteki noktalama ve emoji sözcükleri ayırır ("tüylü-dost" iki sözcük). Harf yerine geçen
// simgeler ($ @ € £ |) sözcüğü bölmez ki "$alak" iskelette "salak" olsun (simge ayrıca uyarı alır).

const RE_WORD_CHAR = /[\p{L}\p{M}\p{N}\p{Cf}\u{115F}\u{1160}\u{3164}\u{FFA0}$@€£|]/u;

export function tokenize(text) {
  const s = String(text);
  const cps = Array.from(s);
  const tokens = [];
  let i = 0;
  let pos = 0;
  const isWord = ch => ch !== undefined && RE_WORD_CHAR.test(ch) && !RE_EMOJI.test(ch);
  while (i < cps.length) {
    if (!isWord(cps[i])) { pos += cps[i].length; i++; continue; }
    const start = pos;
    let j = i;
    let end = pos;
    while (j < cps.length) {
      if (isWord(cps[j])) { end += cps[j].length; j++; continue; }
      if (cps[j] === "'") {
        let k = j;
        let len = 0;
        while (k < cps.length && cps[k] === "'") { len += 1; k++; }
        if (isWord(cps[k])) { end += len; j = k; continue; }
      }
      break;
    }
    tokens.push({ text: s.slice(start, end), start, end });
    pos = end;
    i = j;
  }
  return tokens;
}

// Sayılan sözcük: en az bir harf ya da rakam içeren parça.
export function countWords(tokens) {
  return tokens.filter(t => /[\p{L}\p{N}]/u.test(t.text)).length;
}

// ---------------------------------------------------------------------------
// İskelet: homoglif, görünmez karakter, rakam yerine harf ve aksan oyunlarını sökerek
// karşılaştırma biçimi üretir.

// Latin harfine benzeyen öteki alfabe ve biçim harfleri (küçük harfe çevrildikten sonra).
const CONFUSABLE_PAIRS = [
  // Kiril
  ['а', 'a'], ['б', 'b'], ['в', 'b'], ['г', 'r'], ['д', 'd'], ['е', 'e'], ['ё', 'e'], ['з', 'e'], ['и', 'u'],
  ['й', 'u'], ['к', 'k'], ['л', 'n'], ['м', 'm'], ['н', 'h'], ['о', 'o'], ['п', 'n'], ['р', 'p'], ['с', 'c'],
  ['т', 't'], ['у', 'y'], ['х', 'x'], ['ц', 'u'], ['ш', 'w'], ['щ', 'w'], ['ъ', 'b'], ['ь', 'b'], ['э', 'e'],
  ['я', 'r'], ['і', 'i'], ['ї', 'i'], ['ј', 'j'], ['ѕ', 's'], ['ԁ', 'd'], ['ԛ', 'q'], ['ԝ', 'w'], ['һ', 'h'],
  ['ӏ', 'l'], ['ү', 'y'], ['ұ', 'y'], ['ҡ', 'k'], ['ғ', 'f'], ['ә', 'e'], ['ө', 'o'], ['ҫ', 'c'], ['є', 'e'],
  ['ґ', 'r'], ['ӧ', 'o'], ['ӱ', 'u'], ['ӑ', 'a'], ['ӓ', 'a'], ['ӗ', 'e'], ['ѵ', 'v'], ['ԍ', 'g'], ['ԃ', 'd'],
  // Yunan
  ['α', 'a'], ['β', 'b'], ['γ', 'y'], ['δ', 'd'], ['ε', 'e'], ['ζ', 'z'], ['η', 'n'], ['θ', 'o'], ['ι', 'i'],
  ['κ', 'k'], ['μ', 'u'], ['ν', 'v'], ['ο', 'o'], ['π', 'n'], ['ρ', 'p'], ['σ', 'o'], ['ς', 'c'], ['τ', 't'],
  ['υ', 'u'], ['χ', 'x'], ['ω', 'w'], ['ά', 'a'], ['έ', 'e'], ['ή', 'n'], ['ί', 'i'], ['ό', 'o'], ['ύ', 'u'],
  ['ώ', 'w'], ['ϊ', 'i'], ['ϋ', 'u'], ['ϲ', 'c'], ['ϳ', 'j'], ['ϱ', 'p'],
  // Ermeni
  ['օ', 'o'], ['ս', 'u'], ['հ', 'h'], ['ո', 'n'], ['ռ', 'n'], ['ց', 'g'], ['ք', 'p'], ['զ', 'q'], ['ա', 'w'], ['լ', 'l'],
  // Küçük büyük harfler ve IPA
  ['ᴀ', 'a'], ['ʙ', 'b'], ['ᴄ', 'c'], ['ᴅ', 'd'], ['ᴇ', 'e'], ['ɢ', 'g'], ['ʜ', 'h'], ['ɪ', 'i'], ['ᴊ', 'j'],
  ['ᴋ', 'k'], ['ʟ', 'l'], ['ᴍ', 'm'], ['ɴ', 'n'], ['ᴏ', 'o'], ['ᴘ', 'p'], ['ʀ', 'r'], ['ꜱ', 's'], ['ᴛ', 't'],
  ['ᴜ', 'u'], ['ᴠ', 'v'], ['ᴡ', 'w'], ['ʏ', 'y'], ['ᴢ', 'z'], ['ɑ', 'a'], ['ɡ', 'g'], ['ɩ', 'i'], ['ʋ', 'v'],
  ['ɛ', 'e'], ['ɔ', 'o'], ['ɾ', 'r'], ['ʊ', 'u'], ['ſ', 's'], ['ɐ', 'a'], ['ɒ', 'a'], ['ɵ', 'o'],
];
// Çeroki büyük harfleri (Ꭺ, Ᏼ…) ve küçük karşılıkları.
const CHEROKEE = [['Ꭺ', 'a'], ['Ᏼ', 'b'], ['Ꮯ', 'c'], ['Ꭼ', 'e'], ['Ꮋ', 'h'], ['Ꮖ', 'i'], ['Ꭻ', 'j'], ['Ꮶ', 'k'],
  ['Ꮮ', 'l'], ['Ꮇ', 'm'], ['Ꮎ', 'o'], ['Ꮲ', 'p'], ['Ꮪ', 's'], ['Ꭲ', 't'], ['Ꮩ', 'v'], ['Ꮃ', 'w'], ['Ꮓ', 'z'], ['Ꮐ', 'g'], ['Ꮢ', 'r']];
const CONFUSABLES = new Map(CONFUSABLE_PAIRS);
for (const [up, lat] of CHEROKEE) { CONFUSABLES.set(up, lat); CONFUSABLES.set(up.toLowerCase(), lat); }

// Rakam ve simge yerine harf (leet).
const LEET = new Map([['0', 'o'], ['1', 'i'], ['3', 'e'], ['4', 'a'], ['5', 's'], ['6', 'g'], ['7', 't'], ['8', 'b'], ['9', 'g'], ['@', 'a'], ['$', 's'], ['€', 'e'], ['£', 'l'], ['|', 'l']]);

export function mapConfusable(ch) {
  return CONFUSABLES.get(ch) ?? LEET.get(ch) ?? ch;
}

// Katlanmış iskelet: ASCII küçük harf a–z. Türkçe harfler, şapka ve aksanlar katlanır;
// homoglifler Latin harfe, rakamlar harfe döner; görünmez karakter ve noktalama düşer.
export function skeleton(s) {
  let t = String(s).normalize('NFKC');
  t = t.replace(/İ/g, 'i').replace(/ı/g, 'i').replace(/I/g, 'i').toLowerCase();
  let out = '';
  for (const ch of t) out += mapConfusable(ch);
  return out.normalize('NFKD').replace(/\p{M}/gu, '').replace(/ı/g, 'i').replace(/[^a-z]/g, '');
}

// Katlanmamış iskelet: Türkçe harfler korunur (ç ≠ c); şapka katlanır; homoglif ve rakam harfe döner.
// EN kipinde tam katlanır (iskeletle aynı).
export function letterSkeleton(s, lang = 'tr') {
  if (lang === 'en') return skeleton(s);
  let t = String(s).normalize('NFKC');
  t = toLower(t, 'tr');
  let out = '';
  for (const ch of t) out += mapConfusable(ch);
  out = foldCircumflex(out.normalize('NFC'));
  return out.replace(/[^a-zçğıöşü]/g, '');
}

// Türkçe/İngilizce küçük harfli, şapkası katlanmış, yalnız harflerden oluşan biçim (tahmin karşılaştırması).
export function plainLetters(s, lang = 'tr') {
  const t = foldCircumflex(toLower(normalizeText(s), lang));
  return lang === 'en' ? foldTurkish(t).replace(/[^a-z]/g, '') : t.replace(/[^a-zçğıöşüqwx]/g, '');
}

// ---------------------------------------------------------------------------
// Harfler

// Harfi kipin alfabesinde küçük biçime getirir; alfabede yoksa null.
export function normalizeLetter(letter, lang = 'tr') {
  if (typeof letter !== 'string') return null;
  const l = toLower(letter.normalize('NFC').trim(), lang);
  return alphabet(lang).includes(l) ? l : null;
}

export function letterIndex(letter, lang = 'tr') {
  const l = normalizeLetter(letter, lang);
  return l === null ? -1 : alphabet(lang).indexOf(l);
}

export function letterFromIndex(index, lang = 'tr') {
  const a = alphabet(lang);
  return Number.isInteger(index) && index >= 0 && index < a.length ? a[index] : null;
}

// Gösterim biçimi: büyük harf (TR'de i → İ, ı → I).
export function displayLetter(letter, lang = 'tr') {
  const l = normalizeLetter(letter, lang);
  return l === null ? '' : toUpper(l, lang);
}

// Sözcük yasak harfi içeriyor mu? TR'de şapka katlanır (â = a) ama ç ≠ c, ı ≠ i;
// EN'de bütün aksanlar katlanır (ş = s). Homoglif ve rakam oyunları da harf sayılır.
export function containsLetter(word, letter, lang = 'tr') {
  const l = normalizeLetter(letter, lang);
  if (l === null) return false;
  return letterSkeleton(word, lang).includes(l);
}

// Türk alfabesinde olmayan üç harfin Türkçe okunuşu (TDK): Q "kü", W "çift ve", X "iks".
const FOREIGN_LETTER_NAMES = { q: 'kü', w: 've', x: 'iks' };

// Harfin Türkçe okunuşu: ünlüler kendisi, ünsüzler "-e" ile (be, ce, ke, he; TDK).
// lang: harfin geldiği bulmacanın dili (EN bulmacasındaki "I" Türkçede "i" diye okunur).
export function letterName(letter, lang = 'tr') {
  const raw = toLower(String(letter).normalize('NFC').trim(), lang);
  if (FOREIGN_LETTER_NAMES[raw]) return FOREIGN_LETTER_NAMES[raw];
  const l = normalizeLetter(raw, 'tr') ?? raw;
  return VOWELS.includes(l) ? l : l + 'e';
}

function lastVowel(s) {
  for (let i = s.length - 1; i >= 0; i--) if (VOWELS.includes(s[i])) return s[i];
  return 'e';
}
const FOUR_WAY = { a: 'ı', ı: 'ı', e: 'i', i: 'i', o: 'u', u: 'u', ö: 'ü', ü: 'ü' };
const TWO_WAY = { a: 'a', ı: 'a', o: 'a', u: 'a', e: 'e', i: 'e', ö: 'e', ü: 'e' };

// Harfe kesmeyle ek getirir; ek, harfin okunuşunun son ünlüsüne uyar.
// kind: 'siz' (E'siz, A'sız, O'suz, Ü'süz), 'yi' (R'yi, A'yı), 'ye' (R'ye, A'ya),
//       'de' (R'de, A'da), 'den' (R'den), 'li' (R'li), 'nin' (R'nin, A'nın).
// lang: harfin geldiği bulmacanın dili (Türkçe cümle içinde İngilizce bulmacanın harfi).
export function letterSuffix(letter, kind = 'siz', lang = 'tr') {
  const v = lastVowel(letterName(letter, lang));
  const four = FOUR_WAY[v];
  const two = TWO_WAY[v];
  const suffix = {
    siz: 's' + four + 'z',
    yi: 'y' + four,
    ye: 'y' + two,
    de: 'd' + two,
    den: 'd' + two + 'n',
    li: 'l' + four,
    nin: 'n' + four + 'n',
  }[kind];
  if (!suffix) throw new Error('bilinmeyen ek: ' + kind);
  return toUpper(toLower(String(letter).normalize('NFC').trim(), lang), lang) + "'" + suffix;
}

// Dizeyi ters çevirir (kod noktası düzeyinde).
export function reverseString(s) {
  return Array.from(String(s)).reverse().join('');
}
