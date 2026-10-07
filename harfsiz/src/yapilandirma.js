// Yayın yapılandırması (KOORDINASYON.md §4, §9, §20). Dosya A'nındır, değerleri koordinatör verir.
// Kullanıcı kararları (2026-10-07): K-1 paylaşım tabanı şimdilik GitHub Pages (kalıcı alan adına geçilince
// eski yollarda yönlendirme sayfası kalır); K-2 iOS sayaçları açık. Sözleşmede adı geçen sabitler
// (PAYLASIM_TABANI, SUPABASE_URL, SAYAC_IOS) o adlarla durur.

/** Web sürümü; iOS'ta Ayarlar yerelden gelen sürümü gösterir (platform.info.version). */
export const VERSION = '1.0.0';

/**
 * Paylaşım bağlantılarının kökü (K-1). Yol arayüz diline göre eklenir: <taban>/harfsiz/ ya da
 * <taban>/letterless/ (yuk.js → shareBase). İki yol oyunlar sitesinde ayrı birer uygulama kopyasıdır
 * (scripts/site-yayinla.sh). Universal Link bu tabanda yoktur: bağlantılar web oyununu açar.
 */
export const PAYLASIM_TABANI = 'https://srgulbay.github.io/oyunlar';

/** Ortak Supabase projesi (hedef, Frankfurt) ve herkese açık (publishable) anahtarı; gizli değildir. */
export const SUPABASE_URL = 'https://gqtpyuwcjhkhtlohwjwn.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_z_bpfPqU2m36_r3UbO-46g_gXzPus9I';

/**
 * iOS'ta sayaç olayları (K-2: açık). Web'de sayaç her zaman açıktır. App Privacy'de "Usage Data → Product
 * Interaction · kimliğe bağlı değil · izleme yok · analitik" beyan edilir; ios/Harfsiz/PrivacyInfo.xcprivacy
 * aynı gerçeği anlatır (docs/app-privacy.md).
 */
export const SAYAC_IOS = true;

/** Ayarlar'da yayımlanan destek e-postası (App Store 1.2; ailenin destek adresi). */
export const SUPPORT_EMAIL = 'srgulbay@gmail.com';

/**
 * Oyunlar sitesindeki gizlilik, destek ve koşullar sayfaları (site/harfsiz/). İngilizce metin aynı sayfadadır,
 * adresin sonuna #en eklenir (sitePage). Boş adres bağlantısız kalır.
 */
export const PRIVACY_URL = 'https://srgulbay.github.io/oyunlar/harfsiz/gizlilik/';
export const SUPPORT_URL = 'https://srgulbay.github.io/oyunlar/harfsiz/destek/';
export const TERMS_URL = 'https://srgulbay.github.io/oyunlar/harfsiz/kosullar/';

/** App Store sayfası (uygulama yayımlanınca). Boşken web'deki tek satırlık öneri bağlantısız düz metindir. */
export const APP_STORE_URL = '';

/** Edge Function adresi: <SUPABASE_URL>/functions/v1/<ad>. */
export const functionUrl = (name, root = SUPABASE_URL) => `${String(root).replace(/\/+$/, '')}/functions/v1/${name}`;

/** Yalnız kimlik bilgisiz https adresi bağlantı olabilir; değilse ''. */
export function safeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  let u;
  try {
    u = new URL(value.trim());
  } catch {
    return '';
  }
  if (u.protocol !== 'https:' || !u.hostname || u.username || u.password) return '';
  return u.href;
}

/** Site sayfasının arayüz dilindeki adresi: Türkçede olduğu gibi, öteki dillerde #en bölümü; geçersizse ''. */
export function sitePage(url, uiLang) {
  const safe = safeUrl(url);
  if (!safe) return '';
  return uiLang === 'tr' ? safe.split('#')[0] : `${safe.split('#')[0]}#en`;
}
