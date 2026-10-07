// Kimliksiz sayaç olayları: sunucu yalnız (oyun, gün, kanal, olay) → +1 yapar.
// IP, çerez, cihaz ya da kullanıcı kimliği gönderilmez. Web'de açık; iOS'ta SAYAC_IOS bayrağıyla (varsayılan kapalı).
// Bu modül yalnız gövdeyi ve kuralları üretir; gönderimi A yapar (navigator.sendBeacon). Uç: KOORDINASYON.md §9.

export const GAME = 'harfsiz';

// Olaylar ve anlamları (docs/oyun-tasarimi.md §9'daki K hesabı bunlarla yapılır).
export const EVENTS = Object.freeze({
  kurdu: 'bulmaca kuruldu (bağlantı üretildi)',
  rovans_kurdu: 'alıcı rövanş düğmesiyle kurucu oldu',
  gunluk_kurdu: 'günün sözcüğü anlatıldı',
  paylasti: 'bulmaca bağlantısı bir kanala gönderildi (kanal düğmesine dokunuş)',
  sonuc_paylasti: 'sonuç bağlantısı bir kanala gönderildi',
  kart_paylasti: 'sonuç kartı görseli paylaşıldı ya da kaydedildi',
  acildi: 'bulmaca bağlantısı açıldı (bağlantı başına cihazda bir kez)',
  sonuc_acildi: 'sonuç bağlantısı açıldı (bağlantı başına cihazda bir kez)',
  cozuldu: 'bağlantıyla gelen bulmaca bitti (bilinsin ya da bilinmesin)',
  bildi: 'bağlantıyla gelen bulmaca bilindi',
  bildirdi: 'bir anlatım bildirildi',
  teklif_goruldu: 'kendiliğinden teklif kartı göründü (yalnız iOS)',
  satin_alindi: 'kalıcı ürün satın alındı (yalnız iOS; ürün kimliği gönderilmez)',
  aktif_gun_0: 'ilk oyun günü',
  aktif_gun_1: 'ilk oyundan 1 gün sonra oynandı',
  aktif_gun_7: 'ilk oyundan 7 gün sonra oynandı',
  aktif_gun_30: 'ilk oyundan 30 gün sonra oynandı',
});

// Kanallar. Elde tutma olaylarında kanal alanı kohort haftasıdır ("h2026-41").
export const CHANNELS = Object.freeze({
  wa: 'WhatsApp', tg: 'Telegram', x: 'X', ig: 'Instagram hikâyesi', wd: 'WhatsApp Durum', sys: 'sistem paylaşımı',
  kopya: 'panoya kopya', dogrudan: 'bağlantısız ya da bilinmeyen kaynak', '-': 'kanalsız olay',
});

export const RETENTION_DAYS = Object.freeze([0, 1, 7, 30]);

export function platformGame(platform) {
  return platform === 'ios' ? `${GAME}-ios` : GAME;
}

// Gönderilsin mi? Web her zaman; iOS yalnız SAYAC_IOS açıksa.
export function counterEnabled({ platform, iosFlag = false }) {
  return platform === 'ios' ? iosFlag === true : true;
}

const COHORT = /^h\d{4}-\d{2}$/;

// Sunucuya gidecek gövde: { oyun, gun, kanal, olay } ya da geçersizse null.
export function counterBody({ platform = 'web', date, channel = '-', event }) {
  if (!Object.hasOwn(EVENTS, event)) return null;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const retention = event.startsWith('aktif_gun_');
  if (retention ? !COHORT.test(channel) : !Object.hasOwn(CHANNELS, channel)) return null;
  return { oyun: platformGame(platform), gun: date, kanal: channel, olay: event };
}

// Aynı bağlantının ikinci açılışını cihazda elemek için yerel anahtar (cihazdan çıkmaz).
export function onceKey(event, ref) {
  return `harfsiz.sayac.${event}.${ref}`;
}

// Bağlantıdaki ?k= kanal kodu; bilinmiyorsa 'dogrudan'.
export function channelFromSearch(search) {
  const m = /[?&]k=([a-z-]+)/.exec(String(search || ''));
  return m && Object.hasOwn(CHANNELS, m[1]) && m[1] !== '-' ? m[1] : 'dogrudan';
}

// ISO hafta: "h2026-41".
export function cohortWeek(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum); // haftanın perşembesi ISO yılını belirler
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((t.getTime() - yearStart) / 86400000 + 1) / 7);
  return `h${t.getUTCFullYear()}-${String(week).padStart(2, '0')}`;
}

// Bugün gönderilmesi gereken elde tutma olayları. firstDay: cihazdaki ilk oyun günü; sent: gönderilmiş eşikler.
export function retentionDue({ firstDay, today, sent = [] }) {
  const ms = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const age = Math.round((ms(today) - ms(firstDay)) / 86400000);
  return RETENTION_DAYS.filter(n => age === n && !sent.includes(n)).map(n => ({ event: `aktif_gun_${n}`, channel: cohortWeek(firstDay) }));
}
