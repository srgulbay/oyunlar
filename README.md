# Oyunlar sitesi

Hedef, Mikrop, İz, Ek, Terazi, Taç, Kat, Söz, Koloni, Terim ve Doz oyunlarının herkese açık gizlilik politikası, destek ve kullanım koşulları sayfaları. GitHub Pages'te `https://srgulbay.github.io/oyunlar/` adresinde yayımlanır. App Store Connect'teki Gizlilik Politikası URL'si ve Destek URL'si bu sayfaları gösterir (Kılavuz 5.1.1(i) ve 1.5).

Site düz HTML ve tek bir CSS dosyasıdır. Derleme adımı, betik, yazı tipi ya da başka bir harici kaynak yoktur.

## Yapı

```
index.html                 kök: oyunların listesi, her oyunun üç bağlantısı
site.css                   ortak biçem (kağıt zemin, mürekkep lacivert; açık ve koyu tema)
.nojekyll                  GitHub Pages dosyaları Jekyll'den geçirmeden yayımlar
<oyun>/gizlilik/index.html gizlilik politikası
<oyun>/destek/index.html   destek ve sık sorulanlar
<oyun>/kosullar/index.html kullanım koşulları
araclar/denetle.py         denetim betiği
```

`<oyun>`: `hedef`, `mikrop`, `iz`, `ek`, `terazi`, `tac`, `kat`, `soz`, `koloni`, `terim`, `doz`.

Adresler değişmez; App Store Connect'e ve uygulamaların `GIZLILIK_ADRESI` ile `KOSULLAR_ADRESI` değerlerine bunlar girilir:

| Oyun | Gizlilik | Destek | Koşullar |
|---|---|---|---|
| Hedef | https://srgulbay.github.io/oyunlar/hedef/gizlilik/ | https://srgulbay.github.io/oyunlar/hedef/destek/ | https://srgulbay.github.io/oyunlar/hedef/kosullar/ |
| Mikrop | https://srgulbay.github.io/oyunlar/mikrop/gizlilik/ | https://srgulbay.github.io/oyunlar/mikrop/destek/ | https://srgulbay.github.io/oyunlar/mikrop/kosullar/ |
| İz | https://srgulbay.github.io/oyunlar/iz/gizlilik/ | https://srgulbay.github.io/oyunlar/iz/destek/ | https://srgulbay.github.io/oyunlar/iz/kosullar/ |
| Ek | https://srgulbay.github.io/oyunlar/ek/gizlilik/ | https://srgulbay.github.io/oyunlar/ek/destek/ | https://srgulbay.github.io/oyunlar/ek/kosullar/ |
| Terazi | https://srgulbay.github.io/oyunlar/terazi/gizlilik/ | https://srgulbay.github.io/oyunlar/terazi/destek/ | https://srgulbay.github.io/oyunlar/terazi/kosullar/ |
| Taç | https://srgulbay.github.io/oyunlar/tac/gizlilik/ | https://srgulbay.github.io/oyunlar/tac/destek/ | https://srgulbay.github.io/oyunlar/tac/kosullar/ |
| Kat | https://srgulbay.github.io/oyunlar/kat/gizlilik/ | https://srgulbay.github.io/oyunlar/kat/destek/ | https://srgulbay.github.io/oyunlar/kat/kosullar/ |
| Söz | https://srgulbay.github.io/oyunlar/soz/gizlilik/ | https://srgulbay.github.io/oyunlar/soz/destek/ | https://srgulbay.github.io/oyunlar/soz/kosullar/ |
| Koloni | https://srgulbay.github.io/oyunlar/koloni/gizlilik/ | https://srgulbay.github.io/oyunlar/koloni/destek/ | https://srgulbay.github.io/oyunlar/koloni/kosullar/ |
| Terim | https://srgulbay.github.io/oyunlar/terim/gizlilik/ | https://srgulbay.github.io/oyunlar/terim/destek/ | https://srgulbay.github.io/oyunlar/terim/kosullar/ |
| Doz | https://srgulbay.github.io/oyunlar/doz/gizlilik/ | https://srgulbay.github.io/oyunlar/doz/destek/ | https://srgulbay.github.io/oyunlar/doz/kosullar/ |

İngilizce metin aynı sayfadadır; adresin sonuna `#en` eklenir. Oyunlar İngilizce bölümde (sayfa başlığı ve açıklaması, kök sayfanın İngilizce listesi, ortak hesap listeleri dahil) İngilizce adlarıyla anılır; adresler ve klasörler Türkçe kalır:

| Türkçe | İngilizce |
|---|---|
| Hedef | Target |
| Mikrop | Mikrop (uygulama yalnız Türkçedir; İngilizce adı yoktur) |
| İz | Trace |
| Ek | Suffix |
| Terazi | Scales |
| Taç | Crown |
| Kat | Fold |
| Söz | Proverb |
| Koloni | Colony |
| Terim | Terms |
| Doz | Dose |

İngilizce bölümde Türkçe ad yalnız bilerek ve "called Hedef in Turkish" ya da "its Turkish name, Hedef" kalıbıyla geçer (Hedef, İz, Ek, Terazi ve Söz'ün sayfalarında, mağaza taslaklarındaki gibi). Türkçe bölüm her zaman Türkçe adları kullanır. `araclar/denetle.py` bunu `INGILIZCE_AD` ve `TURKCE_AD` ile denetler.

## Sayfa düzeni

- `<html lang="tr">`. Türkçe metin `<article id="tr" lang="tr">`, İngilizce metin `<article id="en" lang="en">` içindedir.
- Sayfada tek `h1` vardır: Türkçe başlık. Türkçe bölümler `h2`, sık sorulan sorular `h3`'tür. İngilizce bölümde her düzey bir alttadır (`h2`, `h3`, `h4`); görünüm `b1`, `b2`, `b3` sınıflarıyla eşlenir.
- Bütün bağlantılar göreli yazılır (`../destek/`, `../../site.css`). Site `/oyunlar/` alt yolunda yayımlandığı için `/` ile başlayan yol kullanılmaz.
- Üst şeritte konum ("Oyunlar / Hedef") ve dil bağlantıları, altında oyunun üç sayfası arasında geçiş vardır. Geçerli sayfanın bağlantısı `class="secili"` ve `aria-current="page"` taşır.
- Her sayfada "Son güncelleme: 6 Ekim 2026" / "Last updated: October 6, 2026" biçiminde bir satır vardır (destek sayfası hariç). Metin değişince tarih de değişir; iki dildeki tarih aynı gün olmalıdır.
- Bahşiş (isteğe bağlı, tüketilebilir uygulama içi satın alma; Hedef'te "bağış") her oyunda üç sayfada anlatılır: gizlilikte "Destek (uygulama içi satın alma)" bölümü (Taç'ta "Uygulama içi satın alma (Destekle)"; ödemeyi Apple işler, ödeme bilgisi bize ulaşmaz, sunucuya bir şey gönderilmez, destekçi işareti yalnız cihazda), destekte "Destekle" sorusu (hiçbir özellik açmaz; iade Apple'dan, `reportaproblem.apple.com`), koşullarda bahşiş maddesi (satın alma, ödeme ve iade Apple'ın koşullarına tabidir).
- Koloni, Terim ve Doz tıbbi içeriklidir. Koşullarda tıbbi sorumluluk reddi taslaktaki gibi ayrı, numaralı bir başlıktır (Doz'da ilk madde, "önemli"; Koloni ve Terim'de ikinci madde); destek sayfasında "eğitim amaçlıdır … için kullanılmaz" uyarısı vardır. İkisi de iki dilde (`TIBBI`, `TIBBI_BASLIK`, `TIBBI_UYARI`).
- Kök sayfada her oyunun altında mağaza adı ve alt başlığı durur (`p.ad`, "Ad: Tür · Alt başlık"); Türkçe listede Türkçe, İngilizce listede İngilizce mağaza metni (oyun deposunda `docs/magaza.md` §3).

## İçeriğin kaynağı

Metinler oyunların mağaza taslaklarından ve ortak hesap sözleşmesinden gelir (Hedef, Ek, Terazi ve Kat: `docs/magaza/gizlilik-politikasi.md`, `destek-sayfasi.md`, Ek ve Kat'ta `kullanim-kosullari.md`, App Privacy için `docs/magaza.md` §5; Mikrop: `docs/magaza.md` §8; İz: `docs/magaza/sayfa/*.html`; sözleşme: `docs/hesap-sozlesmesi.md`). Ek ve Terazi'nin koşulları öteki oyunların koşul sayfalarının yapısındadır. Kat'ın üç sayfası 6 Ekim 2026'da oyunun taslaklarıyla hizalandı (koşullar taslağın dokuz maddesiyle). Taç, Söz, Koloni, Terim ve Doz'un üç sayfası da 6 Ekim 2026'da oyunların gönderim taslaklarından (`docs/magaza/gizlilik-politikasi.md`, `destek-sayfasi.md`, `kullanim-kosullari.md`) yeniden yazıldı; metin taslakla sözcüğü sözcüğüne aynıdır, yalnız sitenin kuralları uygulanır: tarih satırında adres yok, İngilizce tarih "October 6, 2026" biçiminde, site adresleri göreli bağlantı, ortak hesap cümlelerinde oyun adları. Taslaklar ortak hesabı oyun saymadan anlatır ("bütün oyunlarımız"); sitede ortak hesap cümleleri oyunları adıyla sayar (aşağıda "Yeni oyun ekleme", adım 4). Gizlilik metni sunucudaki gerçek veri akışıyla birebir olmalıdır. Uygulama ya da sunucu değişirse önce oyunun deposundaki taslak, sonra bu sayfa güncellenir.

On bir oyun aynı Supabase projesini (Frankfurt) ve aynı hesabı kullanır. Bir oyunun politikasında saklama süresi ya da silme kuralı değişirse ötekiler de denetlenir.

## Yeni oyun ekleme

1. Oyunun kısa adıyla bir klasör aç (küçük harf, ASCII; ör. `terazi`) ve içine `gizlilik/`, `destek/`, `kosullar/` klasörlerini koy.
2. Var olan bir oyunun üç `index.html` dosyasını kopyala. Her dosyada değiştir:
   - `<title>`, `<meta name="description">`;
   - konum şeridindeki oyun adı ve iki gezinme listesinin `aria-label` değeri;
   - Türkçe ve İngilizce metnin tamamı (oyunun mağaza taslağından);
   - e-posta bağlantılarındaki `subject` (Türkçe harf varsa kodlanır: `İz` → `%C4%B0z`).
3. Kökteki `index.html`'e oyunu iki yerde ekle: Türkçe listeye (`h2`, Türkçe ad) ve İngilizce listeye (`h3`, İngilizce ad, bağlantılar `#en` ile). İngilizce adı `araclar/denetle.py` → `INGILIZCE_AD` ve `TURKCE_AD`'a da yaz.
4. Hesap ortaksa var olan oyunların politikalarındaki ortak hesap cümlelerini güncelle (ör. "Hedef, Mikrop ve İz aynı hesabı kullanır", silmede hangi oyunların sonuçlarının silindiği, engelin geçerli olduğu oyunlar). Türkçe bölümde Türkçe adı, İngilizce bölümde İngilizce adı yaz.
5. `araclar/denetle.py` içindeki `OYUNLAR` listesine oyunu ekle ve denetimi çalıştır.
6. Yerelde aç ve iki temada bak (aşağıda).
7. Oyunun adreslerini App Store Connect'e ve uygulamanın yapılandırmasına (`GIZLILIK_ADRESI`, `KOSULLAR_ADRESI`) gir.

## Denetim ve yerel önizleme

```
python3 araclar/denetle.py
python3 -m http.server 8000
```

Betik etiketlerin kapandığını, iç bağlantıların ve `#tr`/`#en` çapalarının çalıştığını, harici kaynak ve yer tutucu kalmadığını, `lang` değerlerini, başlık düzenini, tarihleri, İngilizce bölümdeki oyun adlarını ve tıbbi oyunların uyarılarını denetler; sorun varsa 1 ile çıkar. Önizleme: `http://localhost:8000/`. Koyu tema sistem ayarından gelir (`prefers-color-scheme`).
