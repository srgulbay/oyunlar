// Sonuç ve davet kartının canvas çizimi (KOORDINASYON.md §7). Düzen C'nin kart.js'inden (konum ve boy),
// görsel dil B'nin web/src/yerel/temalar.js'inden (renk, yazı, desen, rozet, bant) gelir. Çizim adımları
// B'nin başvuru çiziminin (tools/kart/onizleme.py) canvas karşılığıdır: zemin → desen → parıltı → bant →
// metinler ve rozet → hak şeridi → doku. Kart cevabı hiçbir zaman taşımaz: veri kart.js → cardData beyaz
// listesinden geçer, burada yalnız düzen öğeleri çizilir. Karşıtlık B'nin testindedir (tools/kart/temalar.test.mjs).

import { cardLayout, cardAltText, FORMATS, DEFAULT_THEME, MIN_FONT } from './kart.js';
import { KART_TEMALARI, desenNoktalari, tebesirLekeleri, yaziDizgisi } from './yerel/temalar.js';
import { toUpper } from './turkce.js';

export const themeFor = (id) => KART_TEMALARI[id] || KART_TEMALARI[DEFAULT_THEME];

// ---------------------------------------------------------------- yardımcılar

const hexA = (hex, a) => {
  const h = String(hex).replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}, ${a})`;
};

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function fillRoundRect(ctx, x, y, w, h, r, color) {
  ctx.fillStyle = color;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.fill();
}

function line(ctx, x1, y1, x2, y2, width, color, round = true) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = round ? 'round' : 'butt';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function disc(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2);
  ctx.fill();
}

/** Halka: dış yarıçap r, kalınlık w içe doğru (başvuru çizimindeki Pillow halkasıyla aynı). */
function ring(ctx, cx, cy, r, w, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(0, r - w / 2), 0, Math.PI * 2);
  ctx.stroke();
}

/** Işıltı (canvas gölgesi): önce ışıltılı, büyük bulanıklıkta ikinci kat yarı bulanık; sonra keskin. */
function withGlow(ctx, glow, color, draw) {
  if (glow && glow.bulaniklik) {
    ctx.save();
    ctx.shadowColor = glow.renk || color;
    ctx.shadowBlur = glow.bulaniklik;
    draw(glow.renk || color);
    if (glow.bulaniklik > 4) {
      ctx.shadowBlur = glow.bulaniklik / 2;
      draw(glow.renk || color);
    }
    ctx.restore();
  }
  draw(color);
}

/** Harf aralıklı metin genişliği. */
function textWidth(ctx, text, spacing) {
  if (!spacing) return ctx.measureText(text).width;
  const chars = Array.from(text);
  return chars.reduce((w, ch) => w + ctx.measureText(ch).width, 0) + spacing * Math.max(0, chars.length - 1);
}

/**
 * Tek satırlık öğe genişliğe sığmazsa yazısı küçülür (en az MIN_FONT). Okunur adres yollu tabanda uzar
 * (K-1: "srgulbay.github.io/oyunlar/letterless" 48 px eşaralıklıda ~1066 px); kartın kenarından taşmaz.
 */
export function fitToWidth(ctx, text, style, el, maxWidth) {
  ctx.save();
  ctx.font = yaziDizgisi(style, el);
  const width = textWidth(ctx, text, style.aralik || 0);
  ctx.restore();
  if (width <= maxWidth) return el;
  return { ...el, size: Math.max(MIN_FONT, Math.floor((el.size * maxWidth) / width)) };
}

/** Metin yazar (y taban çizgisi); stil temalar.js biçiminde. Dönen: genişlik. */
function drawText(ctx, x, y, text, style, el, { color = null, align = 'left', glow = undefined } = {}) {
  ctx.save();
  ctx.font = yaziDizgisi(style, el);
  ctx.textBaseline = 'alphabetic';
  const spacing = style.aralik || 0;
  const width = textWidth(ctx, text, spacing);
  const left = align === 'center' ? x - width / 2 : x;
  const paint = (fill) => {
    ctx.fillStyle = fill;
    ctx.textAlign = 'left';
    if (!spacing) {
      ctx.fillText(text, left, y);
      return;
    }
    let cx = left;
    for (const ch of Array.from(text)) {
      ctx.fillText(ch, cx, y);
      cx += ctx.measureText(ch).width + spacing;
    }
  };
  withGlow(ctx, glow === undefined ? style.isilti : glow, color || style.renk, paint);
  ctx.restore();
  return width;
}

// ---------------------------------------------------------------- zemin ve desen

const patternCache = new Map();

/** Tohumlu desen noktaları (her cihazda aynı; tools/kart/veri.mjs ile aynı adlar ve sayılar). */
function patternsFor(theme, height) {
  const key = `${theme.id}/${height}`;
  if (patternCache.has(key)) return patternCache.get(key);
  const scale = (n) => Math.round((n * height) / 1080);
  const d = theme.zemin.desen;
  const out = {};
  if (d && d.toz) out.toz = desenNoktalari(theme.id, `toz/${height}`, { en: 1080, boy: height, ...d.toz, sayi: scale(d.toz.sayi) });
  if (d && d.leke) out.leke = tebesirLekeleri(height);
  if (theme.doku) out.doku = desenNoktalari(theme.id, `doku/${height}`, { en: 1080, boy: height, ...theme.doku, sayi: scale(theme.doku.sayi) });
  patternCache.set(key, out);
  return out;
}

function drawGround(ctx, theme, W, H, patterns) {
  ctx.fillStyle = theme.zemin.renk;
  ctx.fillRect(0, 0, W, H);
  const d = theme.zemin.desen;
  if (!d) return;
  if (d.tur === 'cizgili') {
    for (let y = d.ilk; y < H; y += d.aralik) line(ctx, 0, y, W, y, d.kalinlik, d.renk, false);
    for (const x of d.kenar.x) line(ctx, x, 0, x, H, d.kenar.kalinlik, d.kenar.renk, false);
  } else if (d.tur === 'tahta') {
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W / 2, H / 2));
    g.addColorStop(0, d.ic);
    g.addColorStop(1, d.dis);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (const s of patterns.leke || []) {
      const lg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 1.5);
      lg.addColorStop(0, hexA(d.leke.renk, s.a));
      lg.addColorStop(0.55, hexA(d.leke.renk, s.a * 0.7));
      lg.addColorStop(1, hexA(d.leke.renk, 0));
      ctx.fillStyle = lg;
      ctx.fillRect(s.x - s.r * 1.5, s.y - s.r * 1.5, s.r * 3, s.r * 3);
    }
    for (const n of patterns.toz || []) disc(ctx, n.x, n.y, n.r, hexA(d.toz.renk, n.a));
  } else if (d.tur === 'tugla') {
    let row = 0;
    for (let y = 0; y < H; y += d.boy, row++) {
      line(ctx, 0, y, W, y, d.kalinlik, d.renk, false);
      for (let x = row % 2 ? d.en / 2 : 0; x < W; x += d.en) line(ctx, x, y, x, y + d.boy, d.kalinlik, d.renk, false);
    }
  }
}

/** Neon: anlatımın arkasında mor parıltı. */
function drawGlowSpot(ctx, theme, desc) {
  const p = theme.zemin.desen && theme.zemin.desen.parilti;
  if (!p || !desc) return;
  const cy = desc.y - desc.size * 0.35 + ((desc.lines.length - 1) * desc.lineHeight) / 2;
  const r = p.yaricap * 1.3;
  const g = ctx.createRadialGradient(540, cy, 0, 540, cy, r);
  g.addColorStop(0, hexA(p.renk, p.saydamlik));
  g.addColorStop(0.5, hexA(p.renk, p.saydamlik * 0.6));
  g.addColorStop(1, hexA(p.renk, 0));
  ctx.fillStyle = g;
  ctx.fillRect(540 - r, cy - r, r * 2, r * 2);
}

function drawBand(ctx, theme, el) {
  const st = theme.bant;
  ctx.save();
  ctx.fillStyle = st.renk;
  ctx.fillRect(el.x, el.y, el.width, el.height);
  const d = st.desen || {};
  if (d.tur === 'yarimTon') {
    for (let y = el.y + d.aralik / 2; y < el.y + el.height; y += d.aralik) {
      for (let x = d.aralik / 2; x < el.width; x += d.aralik) {
        const r = d.yaricap[0] + (d.yaricap[1] - d.yaricap[0]) * (x / el.width);
        if (r > 0.3) disc(ctx, x, y, r, d.renk);
      }
    }
  } else if (d.tur === 'delik') {
    for (let x = d.aralik / 2; x < el.width; x += d.aralik) disc(ctx, x, el.y, d.yaricap, d.renk);
  } else if (d.tur === 'tebesirler') {
    for (const p of d.parcalar) {
      ctx.save();
      ctx.translate(p.x, el.y + p.dy);
      ctx.rotate((p.aci * Math.PI) / 180);
      fillRoundRect(ctx, -p.en / 2, -p.boy / 2, p.en, p.boy, p.boy / 2.5, p.renk);
      ctx.restore();
    }
  }
  if (st.ustCizgi) {
    const u = st.ustCizgi;
    withGlow(ctx, u.isilti, u.renk, (c) => line(ctx, 0, el.y + u.kalinlik / 2, el.width, el.y + u.kalinlik / 2, u.kalinlik, c, false));
  }
  ctx.restore();
}

// ---------------------------------------------------------------- rozet ve hak şeridi

function drawBadge(ctx, theme, el) {
  const { r, cx, cy } = el;
  const st = theme.rozet;
  ctx.save();
  const shape = (color) => {
    if (st.tur === 'tas') {
      fillRoundRect(ctx, cx - r, cy - r + 0.05 * r, 2 * r, 2 * r, 0.444 * r, st.alt);
      fillRoundRect(ctx, cx - r, cy - r, 2 * r, 2 * r, 0.444 * r, st.zemin);
    } else if (st.tur === 'tus') {
      disc(ctx, cx, cy + 0.08 * r, r, st.alt);
      disc(ctx, cx, cy, r, st.kenar);
      disc(ctx, cx, cy, r - st.kenarKalinlik, st.zemin);
    } else if (st.tur === 'damga') {
      const k = 2 * r;
      const i1 = st.kenarKalinlik;
      const i2 = i1 + 6;
      const i3 = i2 + st.icKenar;
      fillRoundRect(ctx, cx - r, cy - r, k, k, 0.36 * r, st.kenar);
      fillRoundRect(ctx, cx - r + i1, cy - r + i1, k - 2 * i1, k - 2 * i1, 0.36 * r - i1, st.zemin);
      fillRoundRect(ctx, cx - r + i2, cy - r + i2, k - 2 * i2, k - 2 * i2, 0.36 * r - i2, st.kenar);
      fillRoundRect(ctx, cx - r + i3, cy - r + i3, k - 2 * i3, k - 2 * i3, 0.36 * r - i3, st.zemin);
    } else if (st.tur === 'tebesir') {
      ring(ctx, cx, cy, r - st.halkaKalinlik / 2, st.halkaKalinlik, hexA(st.cizgiRenk, 235 / 255));
    } else if (st.tur === 'neon') {
      ring(ctx, cx, cy, r - 6, st.halkaKalinlik, color);
    }
  };
  if (st.tur === 'neon') withGlow(ctx, st.isilti, st.halka, shape);
  else shape(null);

  // Harf: ortada; büyük harf gövdesi ortalanır (taban = cy + 0,35 × boy), taş ve damgada biraz sol üste.
  const shift = st.tur === 'tas' || st.tur === 'damga' ? 0.05 * r : 0;
  drawText(ctx, cx - shift, cy + 0.35 * el.size - shift, el.letter, { aile: st.aile, kalinlik: st.kalinlik, renk: st.harf }, el, { align: 'center', glow: st.harfIsilti || null });

  // Kırmızı kalem çizgisi: sol alttan sağ üste; boşluk varsa önce harf zemininde daha kalın çizgi.
  if (el.struck !== false) {
    const s = 0.1 * r;
    const half = st.tur === 'tas' || st.tur === 'damga' ? 0.6 * r : 0.52 * r;
    const ax = cx - half + s;
    const ay = cy + half + s;
    const bx = cx + half + s;
    const by = cy - half + s;
    const width = st.tur === 'tas' || st.tur === 'damga' ? 0.16 * r : 0.15 * r;
    if (st.bosluk) line(ctx, ax, ay, bx, by, width + 0.1 * r, st.zemin || theme.zemin.renk);
    withGlow(ctx, st.isilti, st.cizgi, (c) => line(ctx, ax, ay, bx, by, width, c));
  }
  ctx.restore();
}

function drawMarks(ctx, theme, el) {
  const st = theme.haklar;
  const size = el.size;
  const w = st.cizgi * size;
  ctx.save();
  el.marks.forEach((mark, i) => {
    const x = el.x + i * el.gap;
    const y = el.y;
    const color = st[mark === 'hit' ? 'hit' : mark === 'miss' ? 'miss' : 'empty'];
    withGlow(ctx, st.isilti, color, (c) => {
      if (mark === 'miss') {
        const u = 0.32 * size;
        line(ctx, x - u, y - u, x + u, y + u, w * 1.2, c);
        line(ctx, x - u, y + u, x + u, y - u, w * 1.2, c);
      } else if (mark === 'hit') disc(ctx, x, y, size / 2 - 2, c);
      else ring(ctx, x, y, size / 2 - w / 2, w, c);
    });
  });
  ctx.restore();
}

// ---------------------------------------------------------------- kart

/**
 * Düzeni (kart.js → cardLayout) bağlama çizer. ctx: CanvasRenderingContext2D (ya da sınama için sahte bağlam).
 * uiLang: etiket büyük harfe çevrilirken Türkçe İ/ı kuralı için.
 */
export function drawLayout(ctx, layout, theme = themeFor(layout.theme), { uiLang = 'tr' } = {}) {
  const W = layout.width;
  const H = layout.height;
  const byType = Object.fromEntries(layout.elements.map((e) => [e.type, e]));
  const patterns = patternsFor(theme, H);
  ctx.save();
  drawGround(ctx, theme, W, H, patterns);
  drawGlowSpot(ctx, theme, byType.description);
  if (byType.band) drawBand(ctx, theme, byType.band);
  for (const el of layout.elements) {
    if (el.type === 'brand') {
      const m = theme.marka;
      const g = drawText(ctx, el.x, el.y, el.text, m, el);
      if (m.altCizgi) line(ctx, el.x + 4, el.y + m.altCizgi.uzaklik, el.x + g - 4, el.y + m.altCizgi.uzaklik, m.altCizgi.kalinlik, m.altCizgi.renk);
      if (m.ciftCizgi) {
        const cc = m.ciftCizgi;
        const y1 = el.y + cc.uzaklik;
        const y2 = y1 + cc.kalin / 2 + cc.arada + cc.ince / 2;
        const badge = byType.letterBadge;
        const end = badge ? badge.cx - badge.r - cc.rozetPayi : W - el.x;
        line(ctx, el.x, y1, end, y1, cc.kalin, cc.renk, false);
        line(ctx, el.x, y2, end, y2, cc.ince, cc.renk, false);
      }
    } else if (el.type === 'letterBadge') drawBadge(ctx, theme, el);
    else if (el.type === 'label') {
      const text = theme.etiket.donusum === 'buyuk' ? toUpper(el.text, uiLang === 'en' ? 'en' : 'tr') : el.text;
      drawText(ctx, el.x, el.y, text, theme.etiket, el);
    } else if (el.type === 'description') {
      el.lines.forEach((l, i) => drawText(ctx, el.x, el.y + i * el.lineHeight, l, theme.anlatim, el));
    } else if (el.type === 'hero') {
      const st = theme.sonuc;
      const color = st.renk[el.tone] || st.renk.neutral;
      drawText(ctx, el.x, el.y, el.text, st, el, { color, glow: st.isilti ? { renk: color, bulaniklik: st.isilti.bulaniklik } : null });
    } else if (el.type === 'attempts') drawMarks(ctx, theme, el);
    else if (el.type === 'match') drawText(ctx, el.x, el.y, el.text, theme.skor, el);
    else if (el.type === 'cta') drawText(ctx, el.x, el.y, el.text, theme.bant.cta, fitToWidth(ctx, el.text, theme.bant.cta, el, W - 2 * el.x));
    else if (el.type === 'address') drawText(ctx, el.x, el.y, el.text, theme.bant.adres, fitToWidth(ctx, el.text, theme.bant.adres, el, W - 2 * el.x));
  }
  // Tebeşir dokusu: zemin rengini küçük noktalarla yazıların üstüne geri koyar (başvuru çizimiyle aynı).
  if (theme.doku && patterns.doku) {
    const base = theme.zemin.desen.ic;
    for (const n of patterns.doku) disc(ctx, n.x, n.y, n.r, hexA(base, n.a));
  }
  ctx.restore();
}

/** Anlatımın satır kırması temanın anlatım yazısıyla ölçülür (kart.js → wrapLines). */
export function measureWith(ctx, theme) {
  return (text, size) => {
    ctx.save();
    ctx.font = yaziDizgisi(theme.anlatim, { size, weight: 700 });
    const w = textWidth(ctx, text, theme.anlatim.aralik || 0);
    ctx.restore();
    return w;
  };
}

/**
 * Kartı çizer. input: kart.js → cardData alanları (kind, perspective, lang, uiLang, letter, words,
 * description, solved, attempts, day, match, address, theme). Dönen: { canvas, alt, layout }.
 */
export function renderCard(input, format = 'square', { createCanvas = defaultCanvas } = {}) {
  const f = FORMATS[format];
  const canvas = createCanvas(f.width, f.height);
  const ctx = canvas.getContext('2d');
  const theme = themeFor(input && input.theme);
  const layout = cardLayout(input, format, { measure: measureWith(ctx, theme) });
  drawLayout(ctx, layout, themeFor(layout.theme), { uiLang: input && input.uiLang === 'tr' ? 'tr' : 'en' });
  return { canvas, alt: cardAltText(input), layout };
}

function defaultCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** PNG Blob. */
export const canvasBlob = (canvas) => new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));

/** PNG base64 (data: öneki olmadan; iOS köprüsü için). */
export const canvasBase64 = (canvas) => canvas.toDataURL('image/png').split(',')[1] || '';
