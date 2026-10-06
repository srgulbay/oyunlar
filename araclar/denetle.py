#!/usr/bin/env python3
"""Siteyi denetler. Kullanım: python3 araclar/denetle.py (depo kökünden).

Denetimler:
- her HTML dosyasında etiketler dengeli (boş öğeler dışında her etiket kapanır);
- <html lang> ve bütün lang değerleri tr ya da en; yinelenen id yok;
- tek h1, başlık düzeyleri atlanmaz;
- bütün iç bağlantılar (dosya ve #çapa) çalışır;
- harici kaynak yok (stylesheet, betik, görsel, yazı tipi, CSS url/@import);
- yer tutucu kalmadı ("[" ile başlayan kalıp, açılı ayraçlı ya da ‹…› alan, taslak sözcükleri);
- her oyunun üç sayfası var, kök yalnız bu oyunları listeler;
- gizlilik ve koşullar sayfalarında Türkçe ve İngilizce "son güncelleme" tarihi var ve aynı gündür;
- İngilizce adı ayrı olan oyunlarda (Mikrop dışında hepsi) İngilizce bölüm ve <title> o adı kullanır;
- İngilizce bölümlerde (kök dahil) ve açıklamanın İngilizce cümlesinde bu oyunların Türkçe adı
  yalnız "called Hedef in Turkish" / "its Turkish name, Hedef" kalıbıyla geçer;
- tıbbi içerikli oyunların destek ve koşullar sayfalarında "klinik karar" uyarısı iki dilde de var.
Sorun varsa çıkış kodu 1'dir.
"""

import os
import re
import sys
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OYUNLAR = ["hedef", "mikrop", "iz", "ek", "terazi", "tac", "kat", "soz", "koloni", "terim", "doz"]
SAYFALAR = ["gizlilik", "destek", "kosullar"]
# İngilizce bölümde kendi adıyla anılan oyunlar. Mikrop yalnız Türkçedir; İngilizcede de Mikrop adını kullanır.
INGILIZCE_AD = {
    "hedef": "Target", "iz": "Trace", "ek": "Suffix", "terazi": "Scales",
    "tac": "Crown", "kat": "Fold", "soz": "Proverb", "koloni": "Colony", "terim": "Terms", "doz": "Dose",
}
TURKCE_AD = {
    "hedef": "Hedef", "iz": "İz", "ek": "Ek", "terazi": "Terazi",
    "tac": "Taç", "kat": "Kat", "soz": "Söz", "koloni": "Koloni", "terim": "Terim", "doz": "Doz",
}
# İngilizce bölümde Türkçe ad yalnız bu kalıplarla, bilerek anılır ("called Hedef in Turkish").
TURKCE_AD_IZINLI = re.compile(r"called \w+ in Turkish|its Turkish name, \w+")
TURKCE_AD_KALIBI = re.compile(r"(?<!\w)(" + "|".join(TURKCE_AD.values()) + r")(?!\w)")
TIBBI = ["koloni", "doz"]
TIBBI_UYARI = {"tr": "klinik karar için kullanılmaz", "en": "must not be used for clinical decisions"}
AYLAR_TR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"]
AYLAR_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
TARIH_TR = re.compile(r"Son güncelleme: (\d{1,2}) (" + "|".join(AYLAR_TR) + r") (\d{4})")
TARIH_EN = re.compile(r"Last updated: (" + "|".join(AYLAR_EN) + r") (\d{1,2}), (\d{4})")
BOS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
DILLER = {"tr", "en"}
E_POSTA = "srgulbay@gmail.com"

sorunlar = []


def sorun(dosya, ileti):
    sorunlar.append(f"{os.path.relpath(dosya, KOK)}: {ileti}")


class Ayristirici(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.yigin = []
        self.hatalar = []
        self.idler = []
        self.baglantilar = []  # (etiket, öznitelik, değer, satır)
        self.diller = []
        self.basliklar = []  # (düzey, satır)
        self.html_lang = None
        self.metin = []

    def handle_starttag(self, etiket, oznitelikler):
        oz = dict(oznitelikler)
        satir = self.getpos()[0]
        if etiket == "html":
            self.html_lang = oz.get("lang")
        if "id" in oz:
            self.idler.append((oz["id"], satir))
        if "lang" in oz:
            self.diller.append((oz["lang"], satir))
        for ad in ("href", "src"):
            if ad in oz:
                self.baglantilar.append((etiket, ad, oz[ad] or "", satir, oz.get("rel", "")))
        if re.fullmatch(r"h[1-6]", etiket):
            self.basliklar.append((int(etiket[1]), satir))
        if etiket not in BOS:
            self.yigin.append((etiket, satir))

    def handle_startendtag(self, etiket, oznitelikler):
        if etiket not in BOS:
            self.hatalar.append(f"satır {self.getpos()[0]}: <{etiket}/> boş öğe değil")
        self.handle_starttag(etiket, oznitelikler)
        if etiket not in BOS:
            self.yigin.pop()

    def handle_endtag(self, etiket):
        satir = self.getpos()[0]
        if etiket in BOS:
            self.hatalar.append(f"satır {satir}: </{etiket}> boş öğe kapatılmaz")
            return
        if not self.yigin:
            self.hatalar.append(f"satır {satir}: </{etiket}> açılmamış")
            return
        ust, ust_satir = self.yigin[-1]
        if ust == etiket:
            self.yigin.pop()
            return
        self.hatalar.append(f"satır {satir}: </{etiket}> beklenmedi; açık olan <{ust}> (satır {ust_satir})")
        if any(e == etiket for e, _ in self.yigin):
            while self.yigin and self.yigin[-1][0] != etiket:
                self.yigin.pop()
            self.yigin.pop()

    def handle_data(self, veri):
        self.metin.append(veri)


def html_dosyalari():
    for kok, klasorler, dosyalar in os.walk(KOK):
        klasorler[:] = [k for k in klasorler if not k.startswith(".") and k != "tmp"]
        for ad in dosyalar:
            if ad.endswith(".html"):
                yield os.path.join(kok, ad)


def hedef_dosya(kaynak, yol):
    """Göreli bağlantıyı dosya yoluna çevirir; klasör bağlantısı index.html'e gider."""
    if yol == "":
        return kaynak
    taban = os.path.dirname(kaynak)
    if yol.startswith("/"):
        return None  # mutlak yol: site /oyunlar/ altında yayımlanır, kullanılmaz
    tam = os.path.normpath(os.path.join(taban, unquote(yol)))
    if yol.endswith("/") or os.path.isdir(tam):
        tam = os.path.join(tam, "index.html")
    return tam


YER_TUTUCU = [
    (re.compile(r"\["), "'[' kalıbı"),
    (re.compile(r"<[^<>]*(e-posta|email|satıcı|tarih|date|adı|name)[^<>]*>", re.I), "açılı ayraçlı alan"),
    (re.compile(r"[‹›]"), "tek açılı tırnaklı alan (‹…›)"),
    (re.compile(r"\b(TODO|FIXME|lorem|taslak|yayın notu|placeholder)\b", re.I), "taslak sözcüğü"),
    (re.compile(r"Geliştirici adı|iletişim e-postası|yayın tarihi|Developer name|contact email|support email|publication date|destek e-postası", re.I), "doldurulmamış alan"),
]


def turkce_ad_tara(yol, en_bolum):
    """İngilizce bölümde İngilizce adı olan oyunların Türkçe adı izinli kalıp dışında geçmez."""
    metin = TURKCE_AD_IZINLI.sub("", unquote(en_bolum))
    bulunan = sorted(set(TURKCE_AD_KALIBI.findall(metin)))
    if bulunan:
        sorun(yol, f"İngilizce bölümde Türkçe ad: {', '.join(bulunan)}")


def main():
    ayrisanlar = {}
    for dosya in sorted(html_dosyalari()):
        with open(dosya, encoding="utf-8") as f:
            icerik = f.read()
        a = Ayristirici()
        a.feed(icerik)
        a.close()
        ayrisanlar[dosya] = (a, icerik)

        for h in a.hatalar:
            sorun(dosya, h)
        for etiket, satir in a.yigin:
            sorun(dosya, f"<{etiket}> (satır {satir}) kapanmamış")
        if not icerik.lstrip().lower().startswith("<!doctype html>"):
            sorun(dosya, "<!doctype html> yok")
        if a.html_lang not in DILLER:
            sorun(dosya, f"<html lang> geçersiz: {a.html_lang!r}")
        for dil, satir in a.diller:
            if dil not in DILLER:
                sorun(dosya, f"satır {satir}: lang={dil!r}")
        gorulen = {}
        for kimlik, satir in a.idler:
            if kimlik in gorulen:
                sorun(dosya, f"satır {satir}: id={kimlik!r} yinelendi (ilk satır {gorulen[kimlik]})")
            gorulen[kimlik] = satir
        h1 = [s for d, s in a.basliklar if d == 1]
        if len(h1) != 1:
            sorun(dosya, f"h1 sayısı {len(h1)} (1 olmalı)")
        onceki = 0
        for duzey, satir in a.basliklar:
            if duzey > onceki + 1:
                sorun(dosya, f"satır {satir}: h{onceki} → h{duzey} düzey atladı")
            onceki = duzey
        if 'id="tr"' not in icerik or 'id="en"' not in icerik:
            sorun(dosya, "#tr ya da #en bölümü yok")
        if E_POSTA not in icerik:
            sorun(dosya, "iletişim e-postası yok")

        # Yer tutucular: düz metinde ve ham HTML'de.
        duz = "".join(a.metin)
        for kalip, ad in YER_TUTUCU:
            for kaynak, adi in ((duz, "metin"), (icerik, "html")):
                m = kalip.search(kaynak)
                if m and not (adi == "html" and ad == "açılı ayraçlı alan"):
                    sorun(dosya, f"yer tutucu ({ad}, {adi}): {m.group(0)!r}")
                    break

    # İç bağlantılar ve harici kaynaklar.
    dis_baglantilar = set()
    for dosya, (a, _) in ayrisanlar.items():
        for etiket, oz, deger, satir, rel in a.baglantilar:
            parca = urlsplit(deger)
            if parca.scheme in ("mailto", "data"):
                if parca.scheme == "mailto" and not parca.path == E_POSTA:
                    sorun(dosya, f"satır {satir}: beklenmeyen e-posta {deger!r}")
                continue
            if parca.scheme or deger.startswith("//"):
                if etiket == "a":
                    dis_baglantilar.add(deger)
                else:
                    sorun(dosya, f"satır {satir}: harici kaynak <{etiket} {oz}={deger!r}>")
                continue
            hedef = hedef_dosya(dosya, parca.path)
            if hedef is None:
                sorun(dosya, f"satır {satir}: mutlak yol kullanılmamalı: {deger!r}")
                continue
            if not os.path.isfile(hedef):
                sorun(dosya, f"satır {satir}: bağlantı kırık: {deger!r}")
                continue
            if parca.fragment:
                if hedef.endswith(".html"):
                    if hedef not in ayrisanlar:
                        sorun(dosya, f"satır {satir}: hedef ayrıştırılmadı: {deger!r}")
                        continue
                    idler = {k for k, _ in ayrisanlar[hedef][0].idler}
                    if parca.fragment not in idler:
                        sorun(dosya, f"satır {satir}: çapa yok: {deger!r}")

    # CSS: harici kaynak ve yer tutucu.
    for kok, klasorler, dosyalar in os.walk(KOK):
        klasorler[:] = [k for k in klasorler if not k.startswith(".") and k != "tmp"]
        for ad in dosyalar:
            if ad.endswith(".css"):
                yol = os.path.join(kok, ad)
                with open(yol, encoding="utf-8") as f:
                    css = f.read()
                if re.search(r"url\(|@import|@font-face", css):
                    sorun(yol, "CSS harici kaynak (url, @import ya da @font-face) içeriyor")
                if "[" in css:
                    sorun(yol, "'[' kalıbı")

    # Yapı: her oyunun üç sayfası; kök yalnız bu oyunlar.
    for oyun in OYUNLAR:
        for sayfa in SAYFALAR:
            yol = os.path.join(KOK, oyun, sayfa, "index.html")
            if not os.path.isfile(yol):
                sorun(yol, "sayfa yok")
                continue
            icerik = ayrisanlar[yol][1]
            tr_bolum, _, en_bolum = icerik.partition('<article id="en"')
            if sayfa != "destek":
                tr_tarih, en_tarih = TARIH_TR.search(tr_bolum), TARIH_EN.search(en_bolum)
                if not tr_tarih or not en_tarih:
                    sorun(yol, "son güncelleme tarihi yok (Türkçe ya da İngilizce)")
                elif (int(tr_tarih[1]), AYLAR_TR.index(tr_tarih[2]), tr_tarih[3]) != (int(en_tarih[2]), AYLAR_EN.index(en_tarih[1]), en_tarih[3]):
                    sorun(yol, f"tarihler ayrı: {tr_tarih[0]!r} / {en_tarih[0]!r}")
            if "Sait Ramazan Gülbay" not in icerik:
                sorun(yol, "geliştirici adı yok")
            if oyun in INGILIZCE_AD:
                if f'aria-label="{INGILIZCE_AD[oyun]} pages"' not in en_bolum:
                    sorun(yol, f"İngilizce bölüm {INGILIZCE_AD[oyun]!r} adını kullanmıyor")
                baslik = re.search(r"<title>(.*?)</title>", tr_bolum)
                if not baslik or f" · {INGILIZCE_AD[oyun]} · " not in baslik[1]:
                    sorun(yol, f"<title> İngilizce adı ({INGILIZCE_AD[oyun]}) taşımıyor")
            turkce_ad_tara(yol, en_bolum)
            aciklama = re.search(r'<meta name="description" content="([^"]*)"', tr_bolum)
            if aciklama:
                turkce_ad_tara(yol, aciklama[1].partition(". ")[2])
            if oyun in TIBBI and sayfa != "gizlilik":
                if TIBBI_UYARI["tr"] not in tr_bolum or TIBBI_UYARI["en"] not in en_bolum:
                    sorun(yol, "tıbbi içerik uyarısı eksik (eğitim amaçlıdır, klinik karar için kullanılmaz)")
    kok_sayfa = os.path.join(KOK, "index.html")
    if kok_sayfa in ayrisanlar:
        a, icerik = ayrisanlar[kok_sayfa]
        oyun_baglantilari = {d.split("/")[0] for _, _, d, _, _ in a.baglantilar if "/" in d and not urlsplit(d).scheme}
        if oyun_baglantilari != set(OYUNLAR):
            sorun(kok_sayfa, f"kökteki oyunlar {sorted(oyun_baglantilari)} (beklenen {OYUNLAR})")
        for sozcuk in ("yakında", "Yakında", "coming soon", "Coming soon"):
            if sozcuk in icerik:
                sorun(kok_sayfa, f"kökte olmaması gereken: {sozcuk!r}")
        _, ayrac, kok_en = icerik.partition('<section id="en"')
        if ayrac:
            turkce_ad_tara(kok_sayfa, kok_en)
        else:
            sorun(kok_sayfa, "İngilizce bölüm yok")
        aciklama = re.search(r'<meta name="description" content="([^"]*)"', icerik)
        if aciklama:
            turkce_ad_tara(kok_sayfa, aciklama[1].partition(". ")[2])
    else:
        sorun(kok_sayfa, "kök sayfa yok")
    for zorunlu in (".nojekyll", "README.md", "site.css"):
        if not os.path.isfile(os.path.join(KOK, zorunlu)):
            sorun(os.path.join(KOK, zorunlu), "dosya yok")

    print(f"{len(ayrisanlar)} HTML dosyası denetlendi.")
    if dis_baglantilar:
        print("Dış bağlantılar (yalnız gezinme, kaynak değil):")
        for d in sorted(dis_baglantilar):
            print(f"  {d}")
    if sorunlar:
        print(f"{len(sorunlar)} sorun:")
        for s in sorunlar:
            print(f"  {s}")
        return 1
    print("Sorun yok.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
