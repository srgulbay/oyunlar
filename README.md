# Oyunlar sitesi

Hedef, Mikrop, İz, Ek ve Terazi oyunlarının herkese açık gizlilik politikası, destek ve kullanım koşulları sayfaları. GitHub Pages'te `https://srgulbay.github.io/oyunlar/` adresinde yayımlanır. App Store Connect'teki Gizlilik Politikası URL'si ve Destek URL'si bu sayfaları gösterir (Kılavuz 5.1.1(i) ve 1.5).

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

`<oyun>`: `hedef`, `mikrop`, `iz`, `ek`, `terazi`.

Adresler değişmez; App Store Connect'e ve uygulamaların `GIZLILIK_ADRESI` ile `KOSULLAR_ADRESI` değerlerine bunlar girilir:

| Oyun | Gizlilik | Destek | Koşullar |
|---|---|---|---|
| Hedef | https://srgulbay.github.io/oyunlar/hedef/gizlilik/ | https://srgulbay.github.io/oyunlar/hedef/destek/ | https://srgulbay.github.io/oyunlar/hedef/kosullar/ |
| Mikrop | https://srgulbay.github.io/oyunlar/mikrop/gizlilik/ | https://srgulbay.github.io/oyunlar/mikrop/destek/ | https://srgulbay.github.io/oyunlar/mikrop/kosullar/ |
| İz | https://srgulbay.github.io/oyunlar/iz/gizlilik/ | https://srgulbay.github.io/oyunlar/iz/destek/ | https://srgulbay.github.io/oyunlar/iz/kosullar/ |
| Ek | https://srgulbay.github.io/oyunlar/ek/gizlilik/ | https://srgulbay.github.io/oyunlar/ek/destek/ | https://srgulbay.github.io/oyunlar/ek/kosullar/ |
| Terazi | https://srgulbay.github.io/oyunlar/terazi/gizlilik/ | https://srgulbay.github.io/oyunlar/terazi/destek/ | https://srgulbay.github.io/oyunlar/terazi/kosullar/ |

İngilizce metin aynı sayfadadır; adresin sonuna `#en` eklenir.

## Sayfa düzeni

- `<html lang="tr">`. Türkçe metin `<article id="tr" lang="tr">`, İngilizce metin `<article id="en" lang="en">` içindedir.
- Sayfada tek `h1` vardır: Türkçe başlık. Türkçe bölümler `h2`, sık sorulan sorular `h3`'tür. İngilizce bölümde her düzey bir alttadır (`h2`, `h3`, `h4`); görünüm `b1`, `b2`, `b3` sınıflarıyla eşlenir.
- Bütün bağlantılar göreli yazılır (`../destek/`, `../../site.css`). Site `/oyunlar/` alt yolunda yayımlandığı için `/` ile başlayan yol kullanılmaz.
- Üst şeritte konum ("Oyunlar / Hedef") ve dil bağlantıları, altında oyunun üç sayfası arasında geçiş vardır. Geçerli sayfanın bağlantısı `class="secili"` ve `aria-current="page"` taşır.
- Her sayfada "Son güncelleme: 5 Ekim 2026" / "Last updated: October 5, 2026" satırı vardır (destek sayfası hariç). Metin değişince tarih de değişir.

## İçeriğin kaynağı

Metinler oyunların mağaza taslaklarından ve ortak hesap sözleşmesinden gelir (Hedef, Ek ve Terazi: `docs/magaza/gizlilik-politikasi.md`, `destek-sayfasi.md`, App Privacy için `docs/magaza.md` §5; Mikrop ve İz: `docs/magaza.md` §8; sözleşme: `docs/hesap-sozlesmesi.md`). Ek ve Terazi'nin koşulları öteki oyunların koşul sayfalarının yapısındadır. Gizlilik metni sunucudaki gerçek veri akışıyla birebir olmalıdır. Uygulama ya da sunucu değişirse önce oyunun deposundaki taslak, sonra bu sayfa güncellenir.

Beş oyun aynı Supabase projesini (Frankfurt) ve aynı hesabı kullanır. Bir oyunun politikasında saklama süresi ya da silme kuralı değişirse ötekiler de denetlenir.

## Yeni oyun ekleme

1. Oyunun kısa adıyla bir klasör aç (küçük harf, ASCII; ör. `terazi`) ve içine `gizlilik/`, `destek/`, `kosullar/` klasörlerini koy.
2. Var olan bir oyunun üç `index.html` dosyasını kopyala. Her dosyada değiştir:
   - `<title>`, `<meta name="description">`;
   - konum şeridindeki oyun adı ve iki gezinme listesinin `aria-label` değeri;
   - Türkçe ve İngilizce metnin tamamı (oyunun mağaza taslağından);
   - e-posta bağlantılarındaki `subject` (Türkçe harf varsa kodlanır: `İz` → `%C4%B0z`).
3. Kökteki `index.html`'e oyunu iki yerde ekle: Türkçe listeye (`h2`) ve İngilizce listeye (`h3`, bağlantılar `#en` ile).
4. Hesap ortaksa var olan oyunların politikalarındaki ortak hesap cümlelerini güncelle (ör. "Hedef, Mikrop ve İz aynı hesabı kullanır", silmede hangi oyunların sonuçlarının silindiği, engelin geçerli olduğu oyunlar).
5. `araclar/denetle.py` içindeki `OYUNLAR` listesine oyunu ekle ve denetimi çalıştır.
6. Yerelde aç ve iki temada bak (aşağıda).
7. Oyunun adreslerini App Store Connect'e ve uygulamanın yapılandırmasına (`GIZLILIK_ADRESI`, `KOSULLAR_ADRESI`) gir.

## Denetim ve yerel önizleme

```
python3 araclar/denetle.py
python3 -m http.server 8000
```

Betik etiketlerin kapandığını, iç bağlantıların ve `#tr`/`#en` çapalarının çalıştığını, harici kaynak ve yer tutucu kalmadığını, `lang` değerlerini ve başlık düzenini denetler; sorun varsa 1 ile çıkar. Önizleme: `http://localhost:8000/`. Koyu tema sistem ayarından gelir (`prefers-color-scheme`).
