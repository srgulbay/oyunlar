// Kurallarla birlikte sınanan cümleler (TR/EN): denetim uyarıları, tahmin geri bildirimi, açılış durumları,
// deste notu ve hak metinleri. Arayüzün geri kalan metinleri A'nın metin tablosundadır.
// Sunucuya kopyalanmaz. Cevap hiçbir cümleye girmez (sızdırmazlık testi); kurucuya bile "gizli sözcük" denir.

import { displayLetter, letterSuffix } from './turkce.js';
import { MAX_WORDS, MAX_CHARS } from './denetim.js';
import { gameName } from './paylas.js';

const q = s => `«${s}»`;

const ANSWER_TEXT = {
  tr: {
    self: w => `${q(w)} gizli sözcüğün kendisi.`,
    inflected: w => `${q(w)} gizli sözcüğün ekli hâli.`,
    derived: w => `${q(w)} gizli sözcükten türemiş.`,
    compound: w => `${q(w)} gizli sözcüğü içinde taşıyor.`,
    split: w => `${q(w)} gizli sözcüğü bölerek yazıyor.`,
    reversed: w => `${q(w)} gizli sözcüğü tersten yazıyor.`,
    translation: w => `${q(w)} gizli sözcüğün öteki dildeki karşılığı.`,
  },
  en: {
    self: w => `${q(w)} is the secret word itself.`,
    inflected: w => `${q(w)} is a form of the secret word.`,
    derived: w => `${q(w)} is built from the secret word.`,
    compound: w => `${q(w)} hides the secret word inside.`,
    split: w => `${q(w)} spells out the secret word.`,
    reversed: w => `${q(w)} is the secret word backwards.`,
    translation: w => `${q(w)} is the secret word in the other language.`,
  },
};

// Denetim uyarısının cümlesi. ctx: { letter, lang (bulmaca dili) }.
export function issueText(issue, uiLang = 'tr', ctx = {}) {
  const tr = uiLang === 'tr';
  const chars = (issue.chars || []).map(c => q(c)).join(' ');
  const L = ctx.letter ? displayLetter(ctx.letter, ctx.lang || 'tr') : '';
  switch (issue.type) {
    case 'empty': return tr ? 'Bir şey yaz.' : 'Write something.';
    case 'too-many-words': return tr ? `${issue.count} kelime oldu; en çok ${MAX_WORDS}.` : `That's ${issue.count} words; ${MAX_WORDS} at most.`;
    case 'too-long': return tr ? `Anlatım çok uzun (${issue.count}/${MAX_CHARS} karakter).` : `Too long (${issue.count}/${MAX_CHARS} characters).`;
    case 'digit': return tr ? `Rakam kullanılmaz: ${chars}. Sayıyı yazıyla yaz.` : `No digits: ${chars}. Spell the number out.`;
    case 'emoji': return tr ? `Emoji kullanılmaz: ${chars}. Yalnız harf ve noktalama var.` : `No emoji: ${chars}. Letters and punctuation only.`;
    case 'homoglyph': return tr ? `Başka alfabeden, Latin harfine benzeyen harf: ${chars}. Normal klavyeyle yeniden yaz.` : `A look-alike letter from another alphabet: ${chars}. Retype it with a regular keyboard.`;
    case 'foreign': return tr ? `Bu harf oyunda yok: ${chars}.` : `This letter isn't allowed: ${chars}.`;
    case 'invisible': return tr ? 'Görünmez ya da birleşik bir işaret var. O kısmı silip yeniden yaz.' : 'There is an invisible or combining mark. Delete that part and retype it.';
    case 'symbol': return tr ? `Bu işaret kullanılmaz: ${chars}. Yalnız harf ve . , : ; ! ? ' " - … ( ) « »` : `This symbol isn't allowed: ${chars}. Only letters and . , : ; ! ? ' " - … ( ) « »`;
    case 'letter': return tr ? `${q(issue.text)} yasak harfi (${L}) içeriyor.` : `${q(issue.text)} uses the banned letter ${L}.`;
    case 'ambiguous-i': return tr ? `${q(issue.text)}: İ yasakken büyük I belirsiz. Küçük harfle yaz.` : `${q(issue.text)}: a capital I is ambiguous while İ is banned. Type it in lowercase.`;
    case 'answer': {
      const kind = issue.source === 'translation' ? 'translation' : issue.kind;
      const table = ANSWER_TEXT[tr ? 'tr' : 'en'];
      return (table[kind] || table.self)(issue.text);
    }
    case 'filter': return tr ? `${q(issue.text)} uygunsuz sözcük süzgecine takıldı.` : `${q(issue.text)} was caught by the language filter.`;
    default: return tr ? 'Bu anlatım gönderilemiyor.' : "This clue can't be sent.";
  }
}

// Kurma ekranının yönergesi: "E'siz anlat (en çok 8 kelime)".
export function describeInstruction(letter, puzzleLang, uiLang = 'tr') {
  return uiLang === 'tr'
    ? `${letterSuffix(letter, 'siz', puzzleLang)} anlat (en çok ${MAX_WORDS} kelime)`
    : `Describe it without the letter ${displayLetter(letter, puzzleLang)} (${MAX_WORDS} words at most)`;
}

// Rövanşta kurucuya gelen not: "Rakibin sana R'yi yasakladı."
export function imposedLetterText(letter, puzzleLang, uiLang = 'tr') {
  return uiLang === 'tr'
    ? `Rakibin sana ${letterSuffix(letter, 'yi', puzzleLang)} yasakladı.`
    : `Your rival banned the letter ${displayLetter(letter, puzzleLang)} for you.`;
}

export function attemptsLeftText(left, uiLang = 'tr') {
  if (uiLang === 'tr') return left === 1 ? 'Son hakkın kaldı.' : `${left} hakkın kaldı.`;
  return left === 1 ? 'Last try left.' : `${left} tries left.`;
}

// Tahmin olayının geri bildirimi (tahmin.js → applyGuess event).
export function guessEventText(event, guess, uiLang = 'tr') {
  const tr = uiLang === 'tr';
  switch (event.type) {
    case 'wrong': return event.left > 0
      ? (tr ? `${q(guess)} değil. ` : `Not ${q(guess)}. `) + attemptsLeftText(event.left, uiLang)
      : (tr ? `${q(guess)} değil.` : `Not ${q(guess)}.`);
    case 'repeat': return tr ? 'Bunu zaten denedin; hakkın gitmedi.' : 'You already tried that; no try used.';
    case 'empty': return tr ? 'Bir tahmin yaz.' : 'Type a guess.';
    case 'invalid': return tr ? 'Tahmin yalnız harflerden oluşur (en çok 40).' : 'Guesses use letters only (40 at most).';
    case 'correct': return tr ? 'Bildin!' : 'You got it!';
    default: return '';
  }
}

// Sonuç ekranında, kabul edilen tahminin notu (cevap ayrıca gösterilir; bu cümle tahmini anar).
export function verdictNote(verdict, guess, uiLang = 'tr') {
  const tr = uiLang === 'tr';
  switch (verdict) {
    case 'inflected': return tr ? `${q(guess)} ekli hâliyle kabul edildi.` : `${q(guess)} counted as a form of the word.`;
    case 'ascii': return tr ? `${q(guess)} Türkçe karaktersiz yazımla kabul edildi.` : `${q(guess)} counted without Turkish letters.`;
    case 'typo': return tr ? `${q(guess)} tek harf farkla kabul edildi.` : `${q(guess)} counted: one letter off.`;
    case 'alternate': return tr ? `${q(guess)} öteki adıyla kabul edildi.` : `${q(guess)} counted: another name for it.`;
    default: return null;
  }
}

// Alıcının gördüğü deste notu (hak okumaz; yalnız destenin ücretli olup olmadığını söyler).
export function deckNote(deck, uiLang = 'tr') {
  if (!deck || !deck.paid) return null;
  const name = deck.name[uiLang === 'tr' ? 'tr' : 'en'];
  return uiLang === 'tr'
    ? `Bu anlatım ücretli ${q(name)} destesinden; sen ücretsiz çözüyorsun.`
    : `This clue comes from the paid ${q(name)} deck; solving it is free for you.`;
}

export function pointsText({ solver, creator }, uiLang = 'tr') {
  return uiLang === 'tr'
    ? `Senin puanın ${solver} · Anlatanın puanı ${creator} (az kelime, çok puan)`
    : `Your points ${solver} · Clue writer's points ${creator} (fewer words, more points)`;
}

// Açılış durumlarının başlık ve gövdesi (yuk.js → openFragment state).
export function openStateText(state, uiLang = 'tr', reason = null) {
  const tr = uiLang === 'tr';
  const name = gameName(uiLang);
  switch (state) {
    case 'broken': return tr
      ? { title: 'Bağlantı açılmadı', body: 'Bağlantı kesilmiş ya da değiştirilmiş olabilir. Gönderenden yeniden iste ya da kendi anlatımını kur.' }
      : { title: "The link didn't open", body: 'It may have been cut off or changed. Ask the sender to send it again, or write your own clue.' };
    case 'newer': return tr
      ? { title: `Bu bağlantı daha yeni bir ${name} sürümüyle yapılmış`, body: 'Uygulamayı güncelle ya da sayfayı yenile, sonra bağlantıyı yeniden aç.' }
      : { title: `This link was made with a newer version of ${name}`, body: 'Update the app or reload the page, then open the link again.' };
    case 'blocked': return tr
      ? { title: 'Bu anlatım gösterilmiyor', body: 'Uygunsuz sözcük süzgecine takıldı.' }
      : { title: "This clue isn't shown", body: 'It was caught by the language filter.' };
    case 'hidden': return reason === 'sender'
      ? (tr ? { title: 'Bu gönderenden gelenleri gizledin', body: "İstersen Ayarlar → Gizlenenler'den geri açabilirsin." } : { title: "You've hidden clues from this sender", body: 'You can unhide them in Settings → Hidden.' })
      : (tr ? { title: 'Bu anlatımı bildirdin', body: 'Bu cihazda bir daha gösterilmeyecek.' } : { title: 'You reported this clue', body: "It won't be shown on this device again." });
    default: return null;
  }
}

// Hak şeridinin erişilebilir adları (✕ harcanan, ● bilinen, ○ kullanılmayan).
export function attemptMarkLabel(mark, uiLang = 'tr') {
  const tr = uiLang === 'tr';
  return { miss: tr ? 'yanlış tahmin' : 'wrong guess', hit: tr ? 'doğru tahmin' : 'correct guess', empty: tr ? 'kullanılmayan hak' : 'unused try' }[mark] || '';
}
