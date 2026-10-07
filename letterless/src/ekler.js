// Ek dilbilgisi: gizli sözcüğün kök değişkenleri (ünsüz yumuşaması, ünlü düşmesi, ünsüz ikizleşmesi,
// birleşik sözcük iyeliği, düzensiz kökler) ve ek zinciri tanıma (TR ve EN).
// Saf modüldür; sunucuya kopyalanabilir.
//
// Ek şablonlarında büyük harfler ses değişimini gösterir:
//   A → a/e (iki yönlü uyum)   I → ı/i/u/ü (dört yönlü uyum)   D → d/t   C → c/ç   K → k/ğ
//   (y) (n) (s) → kaynaştırma ünsüzü var ya da yok   (I) (A) → ünlüyle başlayan ya da başlamayan biçim
// Anlatım denetiminde uyum "gevşek" uygulanır: bir şablonun bütün biçimleri kabul edilir (daha çok yakalayan taraf).
// Tahminde kök verilirse (opts.stem) ünlü uyumu ve kaynaştırma sıkıdır: "pastane" pasta + n + e değildir, "kovala"
// kova + la değildir. Ünsüzle biten kalın ünlülü kökte ilk ek ince de olabilir (saat → saati, gol → golü, kalp → kalbi).

import { foldTurkish, toLower, foldCircumflex } from './turkce.js';
import { TR_DUZENSIZ, EN_DUZENSIZ } from './icerik/kokler.js';

const ALTERNATIVES = {
  A: ['a', 'e'],
  I: ['ı', 'i', 'u', 'ü'],
  D: ['d', 't'],
  C: ['c', 'ç'],
  K: ['k', 'ğ'],
};
const OPTIONAL = {
  '(y)': ['', 'y'],
  '(n)': ['', 'n'],
  '(s)': ['', 's'],
  '(I)': ['', 'ı', 'i', 'u', 'ü'],
  '(A)': ['', 'a', 'e'],
};

// Şablonu bütün biçimlerine açar: "lAr" → ["lar", "ler"].
export function expandTemplate(template) {
  let forms = [''];
  let i = 0;
  while (i < template.length) {
    let options;
    if (template[i] === '(') {
      const end = template.indexOf(')', i);
      options = OPTIONAL[template.slice(i, end + 1)];
      if (!options) throw new Error('bilinmeyen şablon parçası: ' + template);
      i = end + 1;
    } else {
      options = ALTERNATIVES[template[i]] ?? [template[i]];
      i += 1;
    }
    const next = [];
    for (const f of forms) for (const o of options) next.push(f + o);
    forms = next;
  }
  return [...new Set(forms)];
}

// ---------------------------------------------------------------------------
// Türkçe ek takımları

const TR_GROUPS = {
  // Ad yapım ekleri (+ "pastane"deki gibi -hane kısalması).
  der: ['lI', 'lIK', 'sIz', 'CI', 'CIK', 'CAğIz', 'DAş', 'sAl', 'CIl', '(I)msI', 'sI', 'CA', 'hAnA', 'nA', 'CIlIK', 'lIKlI', 'lIKçI', 'ImsI', 'ImtırAk'],
  // Addan eylem yapan ekler.
  vbz: ['lA', 'lAş', 'lAn', 'lAt', 'lAştIr', 'lAndIr', 'Al', 'Ar', 'sA', 'Ik'],
  // Çoğul.
  pl: ['lAr'],
  // İyelik (3. tekil "sI" ünlüden sonra).
  poss: ['(I)m', '(I)n', '(s)I', '(I)mIz', '(I)nIz'],
  // Durum ekleri. "n"li biçimler (casN) yalnız iyelikten ve "-ki"den sonra gelir (kedisini, evdekini; "pastane" pasta + ne değildir).
  cas: ['(y)I', '(y)A', 'DA', 'DAn', '(n)In', '(y)lA', 'CA'],
  casN: ['nI', 'nA', 'ndA', 'ndAn', 'ncA'],
  // Tahminde durum ekleri: eşitlik eki (-CA) yok ("kraliçe" kral + i + çe sayılmaz).
  icas: ['(y)I', '(y)A', 'DA', 'DAn', '(n)In', '(y)lA'],
  icasN: ['nI', 'nA', 'ndA', 'ndAn'],
  // Yardımcı eylem: ses olayından sonra "et-", "ol-" (kaybetmek, kaybolmak, hissetmek, reddetmek).
  aux: ['eD', 'ol'],
  // İlgi eki.
  ki: ['ki', 'kü'],
  // Ek eylem ve kişi ekleri.
  cop: ['(y)Im', 'sIn', '(y)Iz', 'sInIz', 'DIr', 'lAr', '(y)DI', '(y)mIş', '(y)sA', '(y)ken', 'mI', '(y)mIşçAsInA', 'CAsInA'],
  person: ['m', 'n', 'k', 'nIz', 'lAr', '(y)Im', 'sIn', '(y)Iz', 'sInIz', 'DIr'],
  // Eylem çatı ekleri.
  voice: ['(I)l', '(I)n', '(I)ş', 'DIr', 't', 'Ar', 'Ir'],
  neg: ['mA', 'mAz', '(y)AmA', '(y)AmAz'],
  // Kip ve zaman ekleri.
  tam: ['(I)yor', 'DI', 'mIş', '(y)AcAK', 'Ar', 'Ir', 'r', 'mAz', 'sA', 'mAlI', '(y)A', 'mAktA', '(y)Abil'],
  // Eylemden ad ve sıfat yapanlar.
  vn: ['mAK', 'mA', '(y)Iş', '(y)An', 'DIK', '(y)AcAK', '(y)Ip', '(y)ArAK', '(y)IncA', 'mAdAn', 'mAksIzIn', '(y)ken', '(y)IcI', 'mAcA', 'gIn', 'kIn', 'gI', 'kI'],
  // Küçültme (tahminde kabul edilir: "kedicik").
  dim: ['CIK', 'CAğIz'],
  // Emir, istek ve konuşma dilindeki gelecek zaman: yalnız süzgecin fiil kipinde ("siksin", "sıçayım", "sikicem").
  imp: ['sIn', 'sInlAr', '(y)In', '(y)InIz', '(y)AyIm', '(y)AlIm', '(y)IyIm', '(y)IcAm', '(y)IcAn', '(y)IcAk', '(y)IcAz', '(y)IcAnIz', '(y)IcAklAr'],
};

// Her durumdan hangi takımla hangi duruma geçilir. Durumlar:
// N ad gövdesi · P çoğul · S iyelik · C durum · K ilgi · Q ek eylem · E kişi · V eylem gövdesi
// W olumsuz · T kip/zaman · M eylemden ad (adlaşmış) · D küçültme
// Başlangıç durumları: N kökün kendisi · X ses olayına uğramış kök (yumuşama, ikizleşme, düzensiz: N + yardımcı eylem)
// · Y ünlüsü düşmüş kök (yalnız iyelik, durum ve yardımcı eylem; ek eylem değil: "boynuz" boyun + uz değildir).
const TR_FULL = {
  N: [['der', 'N'], ['vbz', 'V'], ['pl', 'P'], ['poss', 'S'], ['cas', 'C'], ['cop', 'Q']],
  X: [['der', 'N'], ['vbz', 'V'], ['pl', 'P'], ['poss', 'S'], ['cas', 'C'], ['cop', 'Q'], ['aux', 'V']],
  Y: [['poss', 'S'], ['cas', 'C'], ['aux', 'V']],
  P: [['poss', 'S'], ['cas', 'C'], ['cop', 'Q'], ['ki', 'K']],
  S: [['cas', 'C'], ['casN', 'C'], ['ki', 'K'], ['cop', 'Q'], ['pl', 'P']],
  C: [['ki', 'K'], ['cop', 'Q']],
  K: [['pl', 'P'], ['cas', 'C'], ['casN', 'C'], ['cop', 'Q']],
  Q: [['cop', 'Q'], ['person', 'E']],
  E: [],
  V: [['voice', 'V'], ['neg', 'W'], ['tam', 'T'], ['vn', 'M']],
  W: [['tam', 'T'], ['vn', 'M']],
  T: [['person', 'E'], ['cop', 'Q']],
  M: [['pl', 'P'], ['poss', 'S'], ['cas', 'C'], ['cop', 'Q'], ['der', 'N']],
};

// Tahminde kabul edilen çekim: küçültme, çoğul, iyelik, durum, ilgi, ek eylem (yapım eki ve eşitlik eki yok).
const TR_INFLECT = {
  N: [['dim', 'D'], ['pl', 'P'], ['poss', 'S'], ['icas', 'C'], ['cop', 'Q']],
  Y: [['poss', 'S'], ['icas', 'C']],
  D: [['pl', 'P'], ['poss', 'S'], ['icas', 'C'], ['cop', 'Q']],
  P: [['poss', 'S'], ['icas', 'C'], ['cop', 'Q'], ['ki', 'K']],
  S: [['icas', 'C'], ['icasN', 'C'], ['ki', 'K'], ['cop', 'Q'], ['pl', 'P']],
  C: TR_FULL.C,
  K: [['pl', 'P'], ['icas', 'C'], ['icasN', 'C'], ['cop', 'Q']],
  Q: TR_FULL.Q,
  E: [],
};
TR_INFLECT.X = TR_INFLECT.N;

// Süzgecin fiil kipi: fiil kökünden başlayan bütün eylem çekimleri, emir ve istek ekleri dahil ("sikti", "sikmek",
// "sikiyor", "siksin", "sıçayım"). Kök ad gibi de çekilir; o yol 'inflect' dilbilgisiyle ayrıca denenir.
const TR_VERB = { ...TR_FULL, V: [...TR_FULL.V, ['imp', 'E']] };

// Kısa köklerde (≤ 3 harf) anlatım denetimi daha dar bir dilbilgisiyle yapılır; kısa kök sık sözcüklerin
// başında rastlantıyla bulunur ("ada" → "adam", "kar" → "kardeş", "karar", "karınca"). Bu yüzden:
// 1. ve 2. kişi iyelik ve kişi ekleri, eşitlik eki (-CA), eylem yapan ekler ve seyrek yapım ekleri dışarıda.
// Ses olayına uğramış kısa kökten sonra yardımcı eylem ve eylem ekleri de gelir (hakketti, hissetmek, reddedildi).
const TR_SHORT_DESC_GROUPS = {
  der: ['lI', 'sIz', 'lIK', 'CI', 'CIK', 'CAğIz'],
  pl: ['lAr'],
  poss: ['(s)I'],
  cas: ['(y)I', '(y)A', 'DA', 'DAn', '(n)In', '(y)lA'],
  casN: ['nI', 'nA', 'ndA', 'ndAn'],
  ki: ['ki', 'kü'],
  cop: ['DIr', '(y)DI', '(y)mIş', '(y)sA', '(y)ken'],
  aux: TR_GROUPS.aux,
  voice: TR_GROUPS.voice,
  neg: TR_GROUPS.neg,
  tam: TR_GROUPS.tam,
  vn: TR_GROUPS.vn,
  person: TR_GROUPS.person,
};
const TR_SHORT_DESC = {
  N: [['der', 'N'], ['pl', 'P'], ['poss', 'S'], ['cas', 'C'], ['cop', 'Q']],
  X: [['der', 'N'], ['pl', 'P'], ['poss', 'S'], ['cas', 'C'], ['cop', 'Q'], ['aux', 'V']],
  Y: [['poss', 'S'], ['cas', 'C'], ['aux', 'V']],
  P: [['poss', 'S'], ['cas', 'C'], ['cop', 'Q'], ['ki', 'K']],
  S: [['cas', 'C'], ['casN', 'C'], ['ki', 'K'], ['cop', 'Q']],
  C: [['ki', 'K'], ['cop', 'Q']],
  K: [['pl', 'P'], ['cas', 'C'], ['casN', 'C']],
  Q: [['cop', 'Q']],
  // Yalnız yardımcı eylemden sonra (X, Y): eylem ekleri.
  V: [['voice', 'V'], ['neg', 'W'], ['tam', 'T'], ['vn', 'M']],
  W: [['tam', 'T'], ['vn', 'M']],
  T: [['person', 'E'], ['cop', 'Q']],
  M: [['pl', 'P'], ['poss', 'S'], ['cas', 'C']],
  E: [],
};

// Kısa köklerde (≤ 3 harf) tahminde yalnız çoğul ve 3. kişi iyelik: "karlar", "karı", "karları".
const TR_SHORT_ENDINGS = ['lAr', '(s)I', 'lArI'];

// ---------------------------------------------------------------------------
// İngilizce ekler

const EN_SUFFIXES = ['s', 'es', 'ed', 'd', 'ing', 'er', 'ers', 'est', 'y', 'ies', 'ied', 'ier', 'iest', 'ily', 'ly',
  'ness', 'less', 'ful', 'fully', 'ish', 'like', 'able', 'ible', 'ism', 'ist', 'ize', 'ise', 'ship', 'hood', 'dom',
  'en', 'ette', 'let', 'ling', 'ie', 'kin', 'ery', 'ary', 'al', 'ic', 'ical', 'ward', 'wards', 'wise', 'man', 'men',
  'ment', 'ty', 'ity', 'ian', 'ee', 'or'];
const EN_INFLECT = ['s', 'es'];

// ---------------------------------------------------------------------------
// Derleme

function compileGroups(groups, fold) {
  const out = {};
  for (const [name, templates] of Object.entries(groups)) {
    const forms = new Set();
    for (const t of templates) for (const f of expandTemplate(t)) forms.add(fold ? foldTurkish(f) : f);
    forms.delete('');
    out[name] = [...forms].sort((a, b) => b.length - a.length);
  }
  return out;
}

const COMPILED = {
  plain: compileGroups(TR_GROUPS, false),
  folded: compileGroups(TR_GROUPS, true),
};
const COMPILED_SHORT = {
  plain: compileGroups(TR_SHORT_DESC_GROUPS, false),
  folded: compileGroups(TR_SHORT_DESC_GROUPS, true),
};
const SHORT = {
  plain: new Set(TR_SHORT_ENDINGS.flatMap(expandTemplate)),
  folded: new Set(TR_SHORT_ENDINGS.flatMap(expandTemplate).map(foldTurkish)),
};
const EN_SET = [...new Set(EN_SUFFIXES)].sort((a, b) => b.length - a.length);

const MAX_DEPTH = 6;

function walk(rem, state, graph, groups, depth, derivations, memo) {
  if (rem === '') return true;
  if (depth >= MAX_DEPTH) return false;
  const key = rem + '|' + state + '|' + depth + '|' + derivations;
  if (memo.has(key)) return memo.get(key);
  let ok = false;
  for (const [group, next] of graph[state] || []) {
    if (group === 'der' && derivations >= 2) continue;
    for (const form of groups[group]) {
      if (rem.startsWith(form) &&
        walk(rem.slice(form.length), next, graph, groups, depth + 1, derivations + (group === 'der' ? 1 : 0), memo)) {
        ok = true; break;
      }
    }
    if (ok) break;
  }
  memo.set(key, ok);
  return ok;
}

// ---------------------------------------------------------------------------
// Tahminde sıkı ses uyumu: ünlü uyumu ve kaynaştırma ünsüzü/ünlüsü ("pastane" pasta + n + e değildir; "kovala"
// kova + la değildir, doğrusu "kovayla").

const TR_VOWEL_CHARS = 'aeıioöuü';
const BACK_VOWELS = 'aıou';
const FRONT_OF = { a: 'e', ı: 'i', o: 'ö', u: 'ü' };
const HARMONY_A = v => (BACK_VOWELS.includes(v) ? 'a' : 'e');
const HARMONY_I = { a: 'ı', ı: 'ı', e: 'i', i: 'i', o: 'u', u: 'u', ö: 'ü', ü: 'ü' };
const isVowelChar = ch => TR_VOWEL_CHARS.includes(ch);

// Şablonu ses bilgisiyle açar: { form, glide, lead, harm }. glide: baştaki kaynaştırma ünsüzü ((y), (n), (s))
// kullanıldı mı (şablonda yoksa null) · lead: baştaki seçmeli ünlü ((I), (A)) kullanıldı mı (yoksa null) · harm:
// biçimdeki her ünlünün türü, sırayla: 'A', 'I' (uyuma bağlı) ya da '-' (değişmez: "ki", "ken", "yor").
function annotateTemplate(template) {
  let items = [{ form: '', glide: null, lead: null, harm: '' }];
  let i = 0;
  while (i < template.length) {
    let options;
    if (template[i] === '(') {
      const end = template.indexOf(')', i);
      const tok = template.slice(i, end + 1);
      if (tok === '(I)') options = [{ s: '', lead: false }, ...[...'ıiuü'].map(s => ({ s, lead: true, h: 'I' }))];
      else if (tok === '(A)') options = [{ s: '', lead: false }, ...[...'ae'].map(s => ({ s, lead: true, h: 'A' }))];
      else options = [{ s: '', glide: false }, { s: tok[1], glide: true }];
      i = end + 1;
    } else {
      const ch = template[i];
      if (ch === 'A') options = [...'ae'].map(s => ({ s, h: 'A' }));
      else if (ch === 'I') options = [...'ıiuü'].map(s => ({ s, h: 'I' }));
      else options = (ALTERNATIVES[ch] ?? [ch]).map(s => ({ s, h: isVowelChar(s) ? '-' : '' }));
      i += 1;
    }
    const next = [];
    for (const it of items) {
      for (const o of options) {
        next.push({
          form: it.form + o.s,
          glide: o.glide ?? it.glide,
          lead: o.lead ?? it.lead,
          harm: it.harm + (o.h || ''),
        });
      }
    }
    items = next;
  }
  return items.filter(x => x.form);
}

function compileStrict(groups) {
  const out = {};
  for (const [name, templates] of Object.entries(groups)) {
    const seen = new Set();
    const list = [];
    for (const t of templates) {
      for (const x of annotateTemplate(t)) {
        const key = `${x.form}|${x.glide}|${x.lead}|${x.harm}`;
        if (seen.has(key)) continue;
        seen.add(key);
        list.push({ ...x, folded: foldTurkish(x.form), vowels: [...x.form].filter(isVowelChar) });
      }
    }
    out[name] = list.sort((a, b) => b.form.length - a.form.length);
  }
  return out;
}

const STRICT = compileStrict(TR_GROUPS);
const STRICT_SHORT = compileStrict({ end: TR_SHORT_ENDINGS }).end;

// Kökün uyum durumu: son ünlüsünün olası değerleri ve ünlüyle bitip bitmediği. Ünsüzle biten kalın ünlülü kökte ilk
// ek ince de olabilir (alıntı sözcükler: saati, golü, kalbi, hali).
function stemHarmony(stem) {
  const chars = [...stem];
  const vowels = chars.filter(isVowelChar);
  const last = vowels[vowels.length - 1];
  const endsVowel = isVowelChar(chars[chars.length - 1] || '');
  if (!last) return { harm: TR_VOWEL_CHARS, vowel: endsVowel };
  return { harm: !endsVowel && FRONT_OF[last] ? last + FRONT_OF[last] : last, vowel: endsVowel };
}

// Ekin ünlüleri önceki ünlüye uyuyor mu? Dönen: yeni durum (son ünlü) ya da null.
function harmonize(state, e) {
  let s = state;
  for (let k = 0; k < e.vowels.length; k++) {
    const v = e.vowels[k];
    const h = e.harm[k];
    if (h === 'A' && ![...s].some(p => HARMONY_A(p) === v)) return null;
    if (h === 'I' && ![...s].some(p => HARMONY_I[p] === v)) return null;
    s = v;
  }
  return s;
}

// Kaynaştırma: ünsüz ((y), (n), (s)) yalnız ünlüden sonra, seçmeli ünlü ((I), (A)) yalnız ünsüzden sonra.
const glideOk = (e, prevVowel) => (e.glide === null || e.glide === prevVowel) && (e.lead === null || e.lead !== prevVowel);

function walkStrict(rem, node, graph, depth, prevVowel, harm, folded, memo) {
  if (rem === '') return true;
  if (depth >= MAX_DEPTH) return false;
  const key = rem + '|' + node + '|' + depth + '|' + prevVowel + '|' + harm;
  if (memo.has(key)) return memo.get(key);
  let ok = false;
  outer: for (const [group, next] of graph[node] || []) {
    for (const e of STRICT[group]) {
      const f = folded ? e.folded : e.form;
      if (!rem.startsWith(f) || !glideOk(e, prevVowel)) continue;
      const h = harmonize(harm, e);
      if (h === null) continue;
      if (walkStrict(rem.slice(f.length), next, graph, depth + 1, isVowelChar(f[f.length - 1]), h, folded, memo)) {
        ok = true;
        break outer;
      }
    }
  }
  memo.set(key, ok);
  return ok;
}

// Kalan parça geçerli bir ek zinciri mi?
// grammar: 'full' (anlatım denetimi, uzun kök: yapım, eylem ve çekim ekleri),
//          'short-desc' (anlatım denetimi, kısa kök: dar dilbilgisi),
//          'inflect' (tahmin: çekim ve küçültme),
//          'short' (kısa kökte tahmin: yalnız çoğul ve 3. kişi iyelik),
//          'verb' (süzgecin fiil kipi: fiil kökünden bütün eylem çekimleri, emir ve istek dahil).
// folded: kalan parça ASCII'ye katlanmışsa true.
// after: kök ses olayına uğramışsa 'change' (yumuşama, ikizleşme, düzensiz kök: "et-", "ol-" de gelir),
//        'drop' (ünlü düşmesi: yalnız iyelik, durum, "et-", "ol-") ya da 'verb' (fiil kökü: eylem ekleriyle başlar);
//        yoksa kökün kendisi.
// stem: kökün kendisi (Türkçe harfleriyle). Yalnız 'inflect' ve 'short' dilbilgisinde verilir (tahmin): ünlü uyumu ve
//       kaynaştırma sıkı uygulanır.
export function isSuffixChain(rem, { lang = 'tr', grammar = 'full', folded = false, after = null, stem = null } = {}) {
  if (typeof rem !== 'string' || rem === '') return false;
  if (lang === 'en') {
    if (grammar === 'full' || grammar === 'short-desc') return enChain(rem, 0);
    return EN_INFLECT.includes(rem);
  }
  if (stem && (grammar === 'inflect' || grammar === 'short')) {
    const { harm, vowel } = stemHarmony(stem);
    if (grammar === 'short') {
      return STRICT_SHORT.some(e => (folded ? e.folded : e.form) === rem && glideOk(e, vowel) && harmonize(harm, e) !== null);
    }
    const start = after === 'drop' ? 'Y' : after === 'change' ? 'X' : 'N';
    return walkStrict(rem, start, TR_INFLECT, 0, vowel, harm, folded, new Map());
  }
  if (grammar === 'short') return (folded ? SHORT.folded : SHORT.plain).has(rem);
  const start = after === 'drop' ? 'Y' : after === 'change' ? 'X' : after === 'verb' ? 'V' : 'N';
  if (grammar === 'short-desc') {
    return walk(rem, start, TR_SHORT_DESC, folded ? COMPILED_SHORT.folded : COMPILED_SHORT.plain, 0, 0, new Map());
  }
  const groups = folded ? COMPILED.folded : COMPILED.plain;
  const graph = grammar === 'inflect' ? TR_INFLECT : grammar === 'verb' ? TR_VERB : TR_FULL;
  return walk(rem, grammar === 'verb' ? 'V' : start, graph, groups, 0, 0, new Map());
}

// Kalan parça fiil kökünden sonra gelen, en az bir olumsuzluk, kip ya da eylemden ad eki taşıyan bir zincir mi ("an",
// "ucu", "ıyor", "ılmış")? Yalnız çatı ekleri ("il", "in": "penis + ilin") sayılmaz. Anlatım denetiminin tek harf
// istisnasında kullanılır (denetim.js).
export function isVerbTail(rem, { folded = false } = {}) {
  if (typeof rem !== 'string' || rem === '') return false;
  const groups = folded ? COMPILED.folded : COMPILED.plain;
  for (const form of groups.voice) if (rem.startsWith(form) && isVerbTail(rem.slice(form.length), { folded })) return true;
  for (const [group, next] of [['neg', 'W'], ['tam', 'T'], ['vn', 'M']]) {
    for (const form of groups[group]) {
      if (!rem.startsWith(form)) continue;
      const rest = rem.slice(form.length);
      if (rest === '' || walk(rest, next, TR_FULL, groups, 1, 0, new Map())) return true;
    }
  }
  return false;
}

function enChain(rem, depth) {
  if (rem === '') return true;
  if (depth >= 3) return false;
  for (const s of EN_SET) if (rem.startsWith(s) && enChain(rem.slice(s.length), depth + 1)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Kök değişkenleri

const TR_VOWELS = 'aeıioöuü';
const EN_VOWELS = 'aeiouy';
const isVowelTr = ch => TR_VOWELS.includes(ch);

// Türkçe ve İngilizce bağlaçlar ve tanımlıklar: çok sözcüklü cevapta parça kök sayılmaz.
const STOPWORDS = {
  tr: new Set(['ve', 'ile', 'bir', 'de', 'da', 'ki', 'mi', 'mı', 'mu', 'mü', 'için', 'gibi', 'çok', 'en', 'o', 'bu', 'şu', 'ya', 'veya']),
  en: new Set(['the', 'a', 'an', 'of', 'and', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'is', 'or']),
};

// Düzensiz kökler içerik tablosundandır (C2 genişletir; biçim docs/icerik-bicimi.md §4):
// Türkçe "su → suyu", "ne → neyi"; İngilizce düzensiz çoğullar "mouse → mice".
export const TR_IRREGULAR = TR_DUZENSIZ;
export const EN_IRREGULAR = EN_DUZENSIZ;

const SOFTEN = { p: 'b', ç: 'c', t: 'd', k: 'ğ', g: 'ğ' };
const UNSOFTEN = { b: 'p', c: 'ç', d: 't', ğ: 'k' };

// Ünlü düşmesi sözcüğe özgüdür: "burun → burnu" ama "bulut → bulutu", "okul → okulu", "tatil → tatili". Sesçil bir
// kural yoktur; kural gibi uygulanınca "tatlı"yı "tatil"in, "buldu"yu "bulut"un ekli hâli sayar. Bu yüzden sözlükle:
// sözcük → ünlüyle başlayan iyelik ve durum ekinden önceki biçim(ler) (düşme ve yumuşama birlikte: kayıp → kayb).
// Bu sözcüklerle biten birleşik sözcük de (en az 3 harflik ön parçayla) aynı biçimi alır.
const TR_VOWEL_DROP = Object.freeze({
  // Türkçe kökenli
  ağız: ['ağz'], alın: ['aln'], bağır: ['bağr'], beniz: ['benz'], beyin: ['beyn'], boyun: ['boyn'], böğür: ['böğr'],
  burun: ['burn'], gönül: ['gönl'], göğüs: ['göğs'], karın: ['karn'], kayın: ['kayn'], oğul: ['oğl'], omuz: ['omz'],
  ömür: ['ömr'],
  // Alıntı
  akıl: ['akl'], asır: ['asr'], azim: ['azm'], bahis: ['bahs'], cebir: ['cebr'], cisim: ['cism'], devir: ['devr'],
  emir: ['emr'], fasıl: ['fasl'], fikir: ['fikr'], hacim: ['hacm'], hapis: ['haps'], hasım: ['hasm'], hüküm: ['hükm'],
  hüzün: ['hüzn'], ilim: ['ilm'], isim: ['ism'], kabir: ['kabr'], kahır: ['kahr'], kasıt: ['kast'], kayıp: ['kayb'],
  kayıt: ['kayd'], keşif: ['keşf'], kısım: ['kısm'], kibir: ['kibr'], küfür: ['küfr'], kutup: ['kutb'], metin: ['metn'],
  meyil: ['meyl'], nabız: ['nabz'], nakil: ['nakl'], nakit: ['nakd'], nakış: ['nakş'], nefis: ['nefs'], nehir: ['nehr'],
  nesil: ['nesl'], nutuk: ['nutk'], resim: ['resm'], sabır: ['sabr'], seyir: ['seyr'], sihir: ['sihr'], şahıs: ['şahs'],
  şehir: ['şehr'], şekil: ['şekl'], şükür: ['şükr'], tavır: ['tavr'], ufuk: ['ufk'], vakıf: ['vakf'], vakit: ['vakt'],
  zehir: ['zehr'], zihin: ['zihn'], zikir: ['zikr'], zulüm: ['zulm'],
});

// Ünsüz ikizleşmesi de sözcüğe özgüdür: "hak → hakkı" ama "at → atı", "el → eli" ("attı", "elli" başka sözcükler).
const TR_DOUBLING = Object.freeze({
  af: ['aff'], cin: ['cinn'], fen: ['fenn'], hac: ['hacc'], had: ['hadd'], hak: ['hakk'], hat: ['hatt'], haz: ['hazz'],
  his: ['hiss'], hür: ['hürr'], rab: ['rabb'], red: ['redd'], ret: ['redd'], sır: ['sırr'], şer: ['şerr'], şık: ['şıkk'],
  tıp: ['tıbb'], üs: ['üss'], zam: ['zamm'], zan: ['zann'], zıt: ['zıdd'],
});

const DROP_ENTRIES = Object.entries(TR_VOWEL_DROP);

function vowelDropForms(a) {
  if (Object.hasOwn(TR_VOWEL_DROP, a)) return TR_VOWEL_DROP[a];
  for (const [w, forms] of DROP_ENTRIES) {
    if (a.length - w.length >= 3 && a.endsWith(w)) return forms.map(f => a.slice(0, -w.length) + f);
  }
  return [];
}

// Değişken alanları: form · needsVowel (ardından ünlüyle başlayan ek gelmeli) · bound (bağlı kök: kendi başına sözcük
// değildir, yalnız ekle görünür) · change (ses olayı: none, soft, drop, double, compound, irregular, stem; içerikteki
// fiil kökü için verb) · kind
// (uyarının `source`'u: kaynak türü ya da ses olayı).
const variant = (form, kind, change, needsVowel = false, bound = needsVowel) => ({ form, needsVowel, bound, change, kind });

// head: çok sözcüklü cevabın son sözcüğü (birleşik adın iyelik eki yalnız onda bulunur: "deniz kızı", "süt dişi").
function trTokenVariants(a, kind, head = false) {
  const out = [variant(a, kind, 'none')];
  const last = a[a.length - 1];
  const prev = a[a.length - 2];
  // Ünsüz yumuşaması (kitap → kitabı, ağaç → ağacı, köpek → köpeği, renk → rengi, katalog → kataloğu).
  if (a.length >= 3 && SOFTEN[last]) {
    out.push(variant(a.slice(0, -1) + SOFTEN[last], 'soft', 'soft', true));
    if (last === 'k' && prev === 'n') out.push(variant(a.slice(0, -1) + 'g', 'soft', 'soft', true));
  }
  // Ünlü düşmesi (burun → burnu, ağız → ağzı, şehir → şehri; kayıp → kaybı): sözlükle.
  for (const f of vowelDropForms(a)) out.push(variant(f, 'drop', 'drop', true));
  // Ünsüz ikizleşmesi (hak → hakkı, his → hissi, ret → reddi): sözlükle.
  for (const f of Object.hasOwn(TR_DOUBLING, a) ? TR_DOUBLING[a] : []) out.push(variant(f, 'double', 'double', true));
  // Birleşik sözcüğün iyelik eki (buzdolabı → buzdolapları, zeytinyağı → zeytinyağlı). Çok sözcüklü cevabın son
  // sözcüğünde 4–5 harfte de ("deniz kızı" → kız, "süt dişi" → diş, "göz bandı" → bant, "devre arası" → ara); ilk
  // sözcükte değil ("sarı kart" → sar- değil).
  const short = a.length < 6;
  if ((!short || (head && a.length >= 4)) && 'ıiuü'.includes(last)) {
    const sBuffer = a[a.length - 2] === 's' && isVowelTr(a[a.length - 3]);
    const stems = short ? [sBuffer ? a.slice(0, -2) : a.slice(0, -1)] : [a.slice(0, -1), ...(sBuffer ? [a.slice(0, -2)] : [])];
    for (const s of stems) {
      if (s.length < (short ? 3 : 4)) continue;
      out.push(variant(s, 'compound', 'compound'));
      const e = s[s.length - 1];
      if (UNSOFTEN[e]) out.push(variant(s.slice(0, -1) + UNSOFTEN[e], 'compound', 'compound'));
      if (e === 'g' && s[s.length - 2] === 'n') out.push(variant(s.slice(0, -1) + 'k', 'compound', 'compound'));
    }
  }
  for (const irr of Object.hasOwn(TR_IRREGULAR, a) ? TR_IRREGULAR[a] : []) out.push(variant(irr, 'irregular', 'irregular', true));
  return out;
}

function enTokenVariants(a, kind) {
  const out = [variant(a, kind, 'none')];
  // y → i (city → cities, happy → happily): bağlı kök; yalnız ekle.
  if (/[^aeiou]y$/.test(a)) out.push(variant(a.slice(0, -1) + 'i', 'stem', 'stem', false, true));
  // e düşmesi (bake → baker), kısa kökte ikizleşme (run → running), f/fe → v (knife → knives): ünlüyle başlayan ekle.
  if (/e$/.test(a) && a.length >= 4) out.push(variant(a.slice(0, -1), 'stem', 'stem', true));
  if (/^[^aeiou]*[aeiou][^aeiouwxy]$/.test(a) && a.length <= 4) out.push(variant(a + a[a.length - 1], 'stem', 'stem', true));
  if (/fe?$/.test(a) && a.length >= 4) out.push(variant(a.replace(/fe?$/, 'v'), 'stem', 'stem', true));
  if (/man$/.test(a) && a.length >= 5) out.push(variant(a.replace(/man$/, 'men'), 'irregular', 'irregular'));
  for (const irr of Object.hasOwn(EN_IRREGULAR, a) ? EN_IRREGULAR[a] : []) out.push(variant(irr, 'irregular', 'irregular'));
  return out;
}

// Cevabı kipin küçük harfli, şapkasız, yalnız harf ve boşluktan oluşan biçimine getirir.
export function canonicalAnswer(answer, lang = 'tr') {
  return foldCircumflex(toLower(String(answer ?? '').normalize('NFC'), lang))
    .replace(/[^a-zçğıöşüqwx ]/g, ' ').replace(/ +/g, ' ').trim();
}

// Tek parçanın çekim ekini söküp kök bulur ("kardan" → "kar"); en az 2 harflik ek, en az 3 harflik kök.
function autoStem(token, lang) {
  if (lang !== 'tr') return null;
  for (let cut = 3; cut <= token.length - 2; cut++) {
    const rem = token.slice(cut);
    if (isSuffixChain(rem, { grammar: 'inflect' })) return token.slice(0, cut);
  }
  return null;
}

// Gizli sözcüğün bütün kök değişkenleri.
// opts.extra: içerikten ek kökler ("buzdolabı" için "dolap" gibi); opts.translation: öteki dildeki karşılığı.
// Dönen her öğe: { form (kipin harfleriyle), folded (ASCII iskelet), needsVowel, bound, change, kind, lang,
// base (kaynak parçanın uzunluğu), origin }. origin: 'whole' (cevabın bütünü: kendisi, bitişik yazımı ve ses
// olayları), 'part' (çok sözcüklü cevabın parçası ve parçanın kökü), 'extra' (içerikteki ek kök), 'translation'.
// Tahmin yalnız 'whole' değişkenleri kabul eder; anlatım denetimi hepsini arar.
export function stemVariants(answer, lang = 'tr', opts = {}) {
  const canon = canonicalAnswer(answer, lang);
  const out = [];
  // base: değişkenin türediği parçanın harf sayısı; kısa/uzun kök kuralı buna göre seçilir ("catt" kısa kalır).
  const add = (v, vlang, base, origin) => {
    const folded = foldTurkish(v.form);
    if (!folded) return;
    if (out.some(o => o.form === v.form && o.needsVowel === v.needsVowel && o.lang === vlang && (o.change === 'verb') === (v.change === 'verb'))) return;
    out.push({ ...v, folded, lang: vlang, base: Array.from(base).length, origin });
  };
  // Parçanın iyeliksiz kökü ("kızı" → "kız") kendi uzunluğuyla kısa ya da uzun sayılır.
  const variantsOf = (token, kind, l, head = false) => (l === 'en' ? enTokenVariants(token, kind) : trTokenVariants(token, kind, head))
    .map(v => [v, kind === 'part' && v.change === 'compound' ? v.form : token]);

  const tokens = canon.split(' ').filter(Boolean);
  const joined = tokens.join('');
  for (const [v, b] of variantsOf(joined, 'self', lang)) add(v, lang, b, 'whole');
  if (tokens.length > 1) {
    for (const [i, t] of tokens.entries()) {
      if (t.length < 3 || STOPWORDS[lang].has(t)) continue;
      for (const [v, b] of variantsOf(t, 'part', lang, i === tokens.length - 1)) add(v, lang, b, 'part');
      const stem = autoStem(t, lang);
      if (stem) for (const [v, b] of variantsOf(stem, 'part', lang)) add(v, lang, b, 'part');
    }
  }
  for (const extra of opts.extra || []) {
    const canon = canonicalAnswer(extra, lang);
    const e = canon.replace(/ /g, '');
    if (e.length < 2) continue;
    // Sonu tireli ek kök Türkçe fiil köküdür ("uyu-"): yalnız eylem ekleriyle sayılır (uyuyan, uyudu, uyumak).
    if (lang === 'tr' && /-\s*$/.test(String(extra))) {
      add(variant(e, 'extra', 'verb', false, true), lang, e, 'extra');
      continue;
    }
    for (const [v, b] of variantsOf(e, 'extra', lang)) add(v, lang, b, 'extra');
    // Çok sözcüklü ek (eş ad: "trafik lambası") cevap gibi parçalarıyla da engellenir.
    const parts = canon.split(' ').filter(Boolean);
    if (parts.length < 2) continue;
    for (const t of parts) {
      if (t.length < 3 || STOPWORDS[lang].has(t)) continue;
      for (const [v, b] of variantsOf(t, 'extra', lang)) add(v, lang, b, 'extra');
      const stem = autoStem(t, lang);
      if (stem) for (const [v, b] of variantsOf(stem, 'extra', lang)) add(v, lang, b, 'extra');
    }
  }
  if (opts.translation) {
    const other = lang === 'tr' ? 'en' : 'tr';
    const tr = canonicalAnswer(opts.translation, other);
    const ttokens = tr.split(' ').filter(Boolean);
    const tjoined = ttokens.join('');
    const addT = t => { for (const [v, b] of variantsOf(t, 'translation', other)) add({ ...v, kind: 'translation' }, other, b, 'translation'); };
    if (tjoined.length >= 2) addT(tjoined);
    if (ttokens.length > 1) {
      for (const t of ttokens) if (t.length >= 3 && !STOPWORDS[other].has(t)) addT(t);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Uzatılmış yazıma dayanıklı önek eşleşmesi
// "kediii", "keddi", "saaat": kökteki her aynı harf dizisi sözcükte en az o uzunlukta bulunmalı ("sat" ≠ "saat").
// Tek ünlünün iki katı ("saalak") ancak opts.vowelPair ile uzatma sayılır (denetim, İngilizce yazımlı "book", "keep"
// sözcüklerinde saymaz). Üç ve fazlası her zaman uzatmadır; ünsüz ikilemesi ("kkedi", "keddi") de.
// Dönen: sözcük kökle (uzatılmış biçimde) başlıyorsa olası kalan parçalar; başlamıyorsa [].
const STRETCH_VOWELS = 'aeıioöuü';

export function stretchRemainders(word, stem, { vowelPair = false } = {}) {
  if (!stem) return [word];
  const runs = [];
  for (const ch of stem) {
    if (runs.length && runs[runs.length - 1][0] === ch) runs[runs.length - 1][1] += 1;
    else runs.push([ch, 1]);
  }
  // k harflik dizi kökteki n harflik diziye uyar mı?
  const fits = (ch, n, k) => k === n || (k > n && (n > 1 || k > 2 || vowelPair || !STRETCH_VOWELS.includes(ch)));
  let i = 0;
  for (let r = 0; r < runs.length; r++) {
    const [ch, n] = runs[r];
    let k = 0;
    while (word[i + k] === ch) k++;
    if (k < n) return [];
    if (r < runs.length - 1) {
      if (!fits(ch, n, k)) return [];
      i += k;
      continue;
    }
    const out = [];
    for (let take = k; take >= n; take--) if (fits(ch, n, take)) out.push(word.slice(i + take));
    return out;
  }
  return [word];
}

export function startsWithVowel(s, lang = 'tr') {
  return s.length > 0 && (lang === 'en' ? EN_VOWELS : TR_VOWELS).includes(s[0]);
}
