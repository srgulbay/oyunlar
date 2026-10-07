// Paylaşım metinleri (WhatsApp, Telegram, X, sistem paylaşımı ve kopya). Metin cihaz (arayüz) dilindedir;
// bulmacanın kendisi (anlatım) metnin içindedir, cevap hiçbir zaman (sızdırmazlık testi).
// Bütün metinler beyaz listeden geçmiş veriden üretilir: shareFields() dışındaki alan okunmaz.

import { letterSuffix, displayLetter, toUpper } from './turkce.js';

export const GAME_NAME = Object.freeze({ tr: 'Harfsiz', en: 'Letterless' });
export const SHARE_ICON = '🔤';

// Arayüz diline göre oyunun adı: Türkçe cihazda "Harfsiz", öteki bütün dillerde "Letterless".
export function gameName(uiLang) {
  return uiLang === 'tr' ? GAME_NAME.tr : GAME_NAME.en;
}

export function brandText(uiLang) {
  return toUpper(gameName(uiLang), uiLang === 'tr' ? 'tr' : 'en');
}

// Paylaşıma girebilecek alanlar. Cevap, tuz, gönderen imi ve deste burada yoktur.
const FIELDS = ['lang', 'letter', 'words', 'description', 'url', 'solved', 'attempts', 'day', 'imposed', 'prev'];

export function shareFields(input) {
  const out = {};
  for (const k of FIELDS) if (input && input[k] !== undefined && input[k] !== null) out[k] = input[k];
  if (out.prev) out.prev = { solved: !!out.prev.solved, attempts: Number(out.prev.attempts) || 0 };
  return out;
}

// "E'siz" (TR) / "without the letter E" (EN).
export function letterPhrase(letter, puzzleLang, uiLang) {
  if (uiLang === 'tr') return letterSuffix(letter, 'siz', puzzleLang);
  return `without the letter ${displayLetter(letter, puzzleLang)}`;
}

const enWords = n => (n === 1 ? '1 word' : `${n} words`);

function trTry(n) { return `${n}. hakta`; }
function enTry(n) { return `on try ${n}`; }

// Davet: yeni bulmaca. Dönen { text (bağlantılı tam metin), body (bağlantısız; Telegram), url }.
export function inviteMessage(input, uiLang) {
  const d = shareFields(input);
  const name = gameName(uiLang);
  const lines = [];
  if (uiLang === 'tr') {
    const harf = letterPhrase(d.letter, d.lang, 'tr');
    if (d.day) {
      lines.push(`${SHARE_ICON} ${name} #${d.day} · Günün sözcüğünü ${harf} ${d.words} kelimeyle anlattım`);
    } else if (d.prev) {
      const head = d.prev.solved ? `Anlatımını ${trTry(d.prev.attempts)} bildim ✅` : 'Anlatımını bilemedim 😅';
      lines.push(`${SHARE_ICON} ${name} · ${head} Sıra sende:`);
      lines.push(d.imposed
        ? `Yasakladığın ${displayLetter(d.letter, d.lang)} olmadan ${d.words} kelimeyle bir şey anlattım`
        : `${harf} ${d.words} kelimeyle bir şey anlattım`);
    } else {
      lines.push(`${SHARE_ICON} ${name} · ${harf} ${d.words} kelimeyle bir şey anlattım`);
    }
    lines.push(`«${d.description}»`);
    lines.push(d.day ? 'Önce bil, sonra sen anlat' : '3 hakta bil');
  } else {
    const harf = letterPhrase(d.letter, d.lang, 'en');
    if (d.day) {
      lines.push(`${SHARE_ICON} ${name} #${d.day} · I described today's word in ${enWords(d.words)} ${harf}`);
    } else if (d.prev) {
      const head = d.prev.solved ? `I got yours ${enTry(d.prev.attempts)} ✅` : "I couldn't get yours 😅";
      lines.push(`${SHARE_ICON} ${name} · ${head} Your turn:`);
      lines.push(d.imposed ? `I described something in ${enWords(d.words)} ${harf}, just as you asked` : `I described something in ${enWords(d.words)} ${harf}`);
    } else {
      lines.push(`${SHARE_ICON} ${name} · I described something in ${enWords(d.words)} ${harf}`);
    }
    lines.push(`«${d.description}»`);
    lines.push(d.day ? 'Guess it, then beat me' : 'Guess it in 3 tries');
  }
  return withLink(lines, d.url);
}

// Sonuç dönüşü (alıcıdan kurucuya, #r bağlantısıyla).
export function resultMessage(input, uiLang) {
  const d = shareFields(input);
  const name = gameName(uiLang);
  const lines = [];
  if (uiLang === 'tr') {
    const harf = letterPhrase(d.letter, d.lang, 'tr');
    const what = d.day ? `günün sözcüğü için ${harf} ${d.words} kelimelik anlatımını` : `${harf} ${d.words} kelimelik anlatımını`;
    lines.push(`${SHARE_ICON} ${name}${d.day ? ' #' + d.day : ''} · ${what} ${d.solved ? trTry(d.attempts) + ' bildim ✅' : 'bilemedim 😅'}`);
    lines.push('Sonucu gör, yeni bir tane anlat');
  } else {
    const harf = letterPhrase(d.letter, d.lang, 'en');
    const what = `your ${enWords(d.words).replace(' words', '-word').replace(' word', '-word')} clue ${harf}`;
    lines.push(`${SHARE_ICON} ${name}${d.day ? ' #' + d.day : ''} · ${d.solved ? `I got ${what} ${enTry(d.attempts)} ✅` : `I couldn't get ${what} 😅`}`);
    lines.push('See the result and send me a new one');
  }
  return withLink(lines, d.url);
}

// Uygulamayı önermek (Ayarlar → "Arkadaşına öner").
export function appInviteMessage(url, uiLang) {
  const lines = uiLang === 'tr'
    ? [`${SHARE_ICON} ${gameName('tr')}: bir harfi yasakla, bir sözcüğü o harfi hiç kullanmadan anlat. Arkadaşın 3 hakta bilsin.`, 'Dene']
    : [`${SHARE_ICON} ${gameName('en')}: ban a letter, then describe a word without ever using it. Your friend gets 3 tries.`, 'Try it'];
  return withLink(lines, url);
}

function withLink(lines, url) {
  const body = lines.join('\n');
  if (!url) return { text: body, body, url: null };
  const last = lines.length - 1;
  const text = [...lines.slice(0, last), `${lines[last]} 👉 ${url}`].join('\n');
  return { text, body, url };
}

// Kanal adresleri (yalnız metin ve bağlantı taşırlar; görseli OG önizlemesi taşır).
export function whatsappUrl(message) {
  return 'https://wa.me/?text=' + encodeURIComponent(message.text);
}

export function telegramUrl(message) {
  return 'https://t.me/share/url?url=' + encodeURIComponent(message.url || '') + '&text=' + encodeURIComponent(message.body);
}

export function xUrl(message) {
  return 'https://x.com/intent/tweet?text=' + encodeURIComponent(message.body) + (message.url ? '&url=' + encodeURIComponent(message.url) : '');
}

// Sayaç için kanal kodları (sayac.js ile aynı küme).
export const CHANNELS = Object.freeze(['wa', 'tg', 'x', 'ig', 'wd', 'sys', 'kopya']);
