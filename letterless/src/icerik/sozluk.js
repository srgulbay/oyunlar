// Bilinen sözcükler: elle derlenmiş sık Türkçe ve İngilizce sözcükler (C2'nin kendi seçkisi; dış listeden kopyalanmadı,
// tools/icerik/KAYNAKLAR.md). Biçim: docs/icerik-bicimi.md §4.3.
// - Tahmin (tahmin.js): tahmin bilinen başka bir sözcükse yazım hatası payı uygulanmaz ("horse" ≠ "house", "havuz" ≠
//   "havuç"); SOZLUK_AYRI'daki sözcükler cevabın çekimi gibi okunsa da başka sözcüktür ve ek çözümüyle de kabul edilmez.
// - İçerik araçları (tools/icerik): yanlış pozitif ve süzgeç taramasının sözlüğü. Deste sözcükleri ayrıca taranır.
// Boşlukla ayrılmış sözcükler; küçük harf, Türkçe harflerle. Saf modüldür; tahmin.js içe aktarır.

const words = (...parts) => Object.freeze([...new Set(parts.join(' ').split(/\s+/).filter(Boolean))]);

export const SOZLUK = Object.freeze({
  tr: words(
    // İşlev sözcükleri, adıllar, ilgeçler
    `ve ile ama fakat ancak çünkü ki de da mi mı mu mü ne neden nasıl niçin nerede nereye nereden kim kime kimin
    hangi kaç bu şu o bunlar şunlar onlar ben sen biz siz bana sana ona bize size onlara beni seni onu bizi sizi
    onları benim senin onun bizim sizin bende sende onda bizde sizde benden senden ondan kendi kendisi kendine
    kendini her hiç bazı birkaç çok az daha en pek gayet oldukça biraz hep hepsi herkes hiçbiri tümü bütün tüm
    şimdi sonra önce artık hala henüz yine gene bile sadece yalnız belki elbette tabii evet hayır yok var değil
    gibi kadar için göre karşı doğru beri dolayı rağmen üzere içinde dışında üstünde altında yanında önünde
    arkasında arasında ortasında karşısında etrafında yukarı aşağı ileri geri içeri dışarı burada şurada orada
    buraya oraya bugün dün yarın sabah öğle akşam gece hafta yıl saat dakika saniye zaman an hem ya veya yoksa
    eğer madem diye iken öyle böyle şöyle aynı başka diğer öteki bir birbiri birlikte beraber ayrı tek`,
    // Sayılar
    `iki üç dört beş altı yedi sekiz dokuz on yirmi otuz kırk elli altmış yetmiş seksen doksan yüz bin milyon
    ilk son birinci ikinci üçüncü yarım çeyrek çift`,
    // Sıfatlar
    `büyük küçük uzun kısa geniş dar yüksek alçak derin sığ kalın ince ağır hafif sıcak soğuk ılık serin sert
    yumuşak kuru ıslak temiz kirli yeni eski genç yaşlı güzel çirkin iyi kötü doğru yanlış kolay zor hızlı yavaş
    erken geç açık kapalı dolu boş tatlı acı ekşi tuzlu lezzetli parlak karanlık aydınlık renkli beyaz siyah
    kırmızı mavi yeşil sarı turuncu mor pembe kahverengi gri lacivert sessiz gürültülü mutlu üzgün kızgın korkak
    cesur yorgun uykulu aç tok hasta sağlıklı güçlü zayıf şişman minik kocaman sevimli komik ciddi garip tuhaf
    normal özel önemli gerekli tehlikeli güvenli sakin kalabalık tüylü pürüzsüz sivri yuvarlak kare üçgen düz
    eğri dik kıvırcık yakın uzak ünlü meşhur zengin fakir ucuz pahalı canlı vahşi evcil sıcacık soğucak tatlış
    akıllı çalışkan tembel neşeli şirin yaramaz uslu kibar terbiyeli sinirli meraklı utangaç sabırlı dürüst
    gizli sihirli büyülü kocaman ufacık upuzun bembeyaz kapkara masmavi yemyeşil sapsarı kıpkırmızı tertemiz
    parlak mat şeffaf yumuşacık sımsıkı gevşek sıkı sık seyrek kalın ağırlık hafiflik kalabalık tenha
    dört ayaklı iki ayaklı kanatlı boynuzlu tüysüz pullu dikenli çizgili benekli noktalı kareli desenli
    sulu kuru taze bayat çiğ pişmiş haşlanmış kızarmış fırında ızgarada dondurulmuş ezilmiş dilimlenmiş`,
    // Eylemler (kök, mastar ve sık çekimler)
    `gel gelmek geldi geliyor gelen gelir git gitmek gitti gidiyor giden gider yap yapmak yaptı yapıyor yapan
    yapar yapılır et etmek etti ediyor eden eder ol olmak oldu oluyor olan olur ver vermek verdi veriyor veren
    verir al almak aldı alıyor alan alır gör görmek gördü görüyor gören görür bak bakmak baktı bakıyor bakan
    bakar bil bilmek bildi biliyor bilen bilir de demek dedi diyor diyen der söyle söylemek söyledi konuş
    konuşmak konuştu konuşan anlat anlatmak anlattı anlatan sor sormak sordu cevapla düşün düşünmek düşündü sev
    sevmek sevdi seviyor seven sever iste istemek istedi istiyor isteyen ye yemek yedi yiyor yiyen yer iç içmek
    içti içiyor içen içer uyu uyumak uyudu uyuyor uyuyan uyur kalk kalkmak kalktı otur oturmak oturdu oturan
    yat yatmak yattı yatan koş koşmak koştu koşuyor koşan yürü yürümek yürüdü yürüyen uç uçmak uçtu uçuyor uçan
    yüzmek yüzdü yüzen atla atlamak atladı atlayan zıpla zıplamak zıplayan tut tutmak tuttu tutan atmak
    attı atan çek çekmek çekti çeken it itmek itti iten aç açmak açtı açan kapa kapatmak kapadı kapanan oku
    okumak okudu okuyan okunan yaz yazmak yazdı yazan yazılan çiz çizmek çizdi çizen boyamak boyadı oyna oynamak
    oynadı oynayan oynanan çal çalmak çaldı çalan çalınan dinle dinlemek dinledi dinleyen dinlenen izle izlemek
    izledi izleyen izlenen bekle beklemek bekledi bekleyen ara aramak aradı arayan bul bulmak buldu bulan kaybet
    kaybetmek kaybetti kazan kazanmak kazandı kazanan sat satmak sattı satan satılan öde ödemek ödedi pişir
    pişirmek pişirdi pişen pişirilen kes kesmek kesti kesen kesilen doğra doğramak karıştır karıştırmak dök
    dökmek döktü koy koymak koydu koyan konulan kır kırmak kırdı kırılan yık yıkmak yıka yıkamak yıkadı yıkanan
    sil silmek sildi temizle temizlemek temizledi süpür süpürmek ütüle ütülemek giy giymek giydi giyilen giyen
    çıkar çıkarmak tak takmak taktı takılan bağla bağlamak bağladı çöz çözmek çözdü sakla saklamak sakladı
    saklanan göster göstermek gösterdi gösteren öğren öğrenmek öğrendi öğret öğretmek öğretti başla başlamak
    başladı başlayan bitir bitirmek bitti biten dur durmak durdu duran taşı taşımak taşıdı taşıyan götür
    götürmek getir getirmek getirdi gönder göndermek gönderdi yolla yollamak sür sürmek sürdü süren sürülen
    bin binmek bindi binilen in inmek indi inen çık çıkmak çıktı çıkan gir girmek girdi giren dön dönmek döndü
    dönen çevir çevirmek çevirdi büyü büyümek büyüdü büyüyen küçül küçülmek ısıt ısıtmak ısınan soğut soğutmak
    soğuyan erit eritmek eriyen don donmak dondu donan yan yanmak yandı yanan söndür söndürmek parla parlamak
    parlayan aydınlat aydınlatmak ağla ağlamak ağladı ağlayan gül gülmek güldü gülen gülümse gülümsemek bağır
    bağırmak bağırdı fısılda fısıldamak sus susmak sustu öp öpmek sarıl sarılmak dokun dokunmak hisset hissetmek
    kokla koklamak tat tatmak duy duymak duydu duyan anla anlamak anladı unut unutmak unuttu hatırla hatırlamak
    say saymak saydı hesapla hesaplamak ölç ölçmek tart tartmak seç seçmek seçti topla toplamak topladı böl
    bölmek paylaş paylaşmak yardım kurtar kurtarmak koru korumak korudu kovala kovalamak kovaladı yakala
    yakalamak yakaladı kaç kaçmak kaçtı kaçan saklan saklanmak tamir onar onarmak yapıştır yapıştırmak dik
    dikmek dikti ör örmek ördü çalış çalışmak çalıştı çalışan dinlen dinlenmek gez gezmek gezdi gezen dolaş
    dolaşmak tırman tırmanmak tırmanan kay kaymak kaydı kayan sallan sallanmak sallanan salla sallamak esne
    esnemek hapşırmak öksür öksürmek horla horlamak titre titremek terle terlemek üşü üşümek acık acıkmak susa
    susamak doy doymak vur vurmak vurdu vuran at atıl tekmele tekmelemek fırlat fırlatmak yuvarla yuvarlamak
    yuvarlan yuvarlanmak sür sürükle sürüklemek kaz kazmak kazdı ek ekmek ekti biç biçmek sula sulamak suladı
    besle beslemek besledi sağ sağmak havla havlamak miyavla miyavlamak öt ötmek ötüyor kükre kükremek uyan
    uyanmak uyandı sık sıkmak sıktı bas basmak bastı çarp çarpmak çarptı patla patlamak patladı şişir şişirmek
    uçur uçurmak süsle süslemek paketle sar sarmak sardı ört örtmek ısır ısırmak çiğne çiğnemek yut yutmak
    tadına bak kokusu sesi rengi şekli boyu eni ağırlığı`,
    // Adlar (genel)
    `insan adam kadın erkek kız oğlan çocuk genç yaşlı anne baba abla ağabey abi teyze hala amca dayı kuzen
    aile dost sahip kişi şey nesne eşya alet araç gereç makine cihaz parça bölüm kısım taraf yan ön arka üst
    alt iç dış orta köşe kenar uç baş başlangıç sonuç neden sebep amaç fikir düşünce soru cevap sorun çözüm iş
    meslek görev ödev ders sayfa satır yazı harf kelime sözcük cümle hikaye müzik ses gürültü renk koku tat his
    duygu sevgi aşk mutluluk üzüntü korku öfke umut akıl zeka bilgi bilim sanat oyun eğlence şaka espri gülme
    gözyaşı içecek hava meyve sebze yağ öğle yemeği akşam yemeği zemin yer bina apartman daire cadde kasaba
    ülke kıyı sahil mevsim ilkbahar yaz sonbahar kış hafta sonu bayram fiyat alışveriş dükkan mağaza çarşı
    üniversite durak yolcu adres mesaj posta kart film dizi haber internet tuş şarj elektrik gaz ısı sıcaklık
    derece metre kilo litre ölçü boy yaş isim ad soyad numara sayı rakam hesap toplam fark yarı tam
    dudak alın göğüs bel kalça bacak deri kan nefes hayvan böcek kapak sap tutacak tekerlek kanat gaga pati
    pençe boynuz kabuk tüy pul yele hörgüç hortum yumurta yavru sürü kafes tasma mama kemik
    sıra kuyruk yığın küme grup takım ekip toplantı yarış maç oyun puan ödül kupa madalya zafer yenilgi
    kural yasak harf hak tahmin bilmece bulmaca anlatım ipucu sır gizem sürpriz şans talih kader
    güç kuvvet hız ağırlık yükseklik derinlik uzunluk genişlik sıcaklık soğukluk karanlık aydınlık gölgelik
    yön kuzey güney doğu batı sağ sol düzlük yokuş iniş çıkış giriş kapalı açık`,
    // Rastlantı denetimi için sık başlangıçlar (kısa kökleri içinde ya da başında taşıyan olağan sözcükler)
    `karar kardeş kariyer karakter karate karamel karavan kargo karton karşı karışık kara karadeniz karanlık
    kardan kartopu karne karşılık karşılaşma kaza kazan kazık kazma kazanç kaldırım kalemlik kalas kalabalık
    kalça kalın kalkan kaplıca kapsül kaplama kapan kapanış adam adalet adaş adet adım adres adak masaj
    masaüstü balta baldır ballı baloncuk parasız paraşüt parazit parantez paragraf paralel parça parçacık
    ayna aynı ayran ayrı ayrıca ayrıntı ayak ayakta aylık ayıp ayık ayıkla aydın ayar ayraç dolap dolaşma
    dolay dolar dolmuş doluluk dolunay tatlı tatlıcı tatil tatlısı tatmin taşıt taşıma taşra taşkın kumar kumaş
    kumanda kumandan kumru kuşak kuşku kuşkusuz kuşet dişi dişil dizi dizel dizüstü sütun sütlü sütlaç gölge
    gölet göller çamaşır çamlık çaput topla toplam toplantı toprak toplu topal topuz zarar zarif zarf zaman
    zamanla eldiven elli elle eller elma elmas elçi elek elektrik ekmek ekim ekip ekran eksik ekşi ekran
    ev evet evren evrak evli evlat evcil odak odun odası odalar kumsal sıcacık yuvarlak yuvarlanmak yuvarlandı
    kurtarmak kurtardı kurtuluş kurtçuk karga kargaşa saksı saksağan kedi kendi kendine kendisi kerevit
    gülmek güldü güler gülen gülümse güle güle güleç gülünç dalga dalgalı dalgıç dalış dallı daldı çiçekçi
    pazartesi salı çarşamba perşembe cuma cumartesi ocak şubat mart nisan mayıs haziran temmuz ağustos eylül
    ekim kasım aralık sabahleyin akşamüstü öğleden gündüz geceleyin hep birden derken ansızın aniden sonunda
    tatlıcı tuzlu tuzluk tuzsuz şekerli şekersiz ballı yağlı yağsız sütsüz çaycı kahveci ekmekçi
    altında altından altına altı altıncı üstü üstüne üstünde yanı yanına önü önüne arkası arkasına içi içine
    dışı dışına ortası ortasına başı başına sonu sonuna ucu ucuna kenarı köşesi`,
    // Süzgeç tuzakları: süzgeç girdisini başında ya da içinde taşıyan olağan sözcükler
    `sıçan sıçrama sıçramak sıçradı çukur çukurlu boks boksör seksen seksek zencefil nazik nazikçe gebe gebelik
    amin amip amiral amatör ambalaj ambulans amca amaç ama ambar penisilin vajinal tecavüzsüz intiharı bokser
    kafiye kafile kafi zencilik keriz enayi lavuk kevgir genel genelge genelde gene erozyon erotizm sıçrayan
    boğa bozuk bokluk bostan bocalamak gerçek gergin gergedan geberik`,
  ),
  en: words(
    // İşlev sözcükleri
    `the a an and or but so if then than that this these those there here where when why how what which who whom
    whose it its i me my mine you your yours he him his she her hers we us our ours they them their theirs
    is are was were be been being am do does did done have has had having can could will would shall should may
    might must not no yes very too also just only even still yet again ever never always often sometimes once
    twice all any some many much more most less least few each every both either neither other another such same
    in on at to for of from with without by about above below under over between among through into onto out up
    down off near far inside outside around before after during until since while because although though like
    as per via against along across behind beside beyond toward upon within`,
    // Sayılar
    `one two three four five six seven eight nine ten eleven twelve twenty thirty forty fifty hundred thousand
    million first second third last half double single dozen pair`,
    // Sıfatlar
    `big small large little tiny huge long short tall wide narrow high low deep shallow thick thin heavy light hot
    cold warm cool hard soft dry wet clean dirty new old young pretty ugly good bad right wrong easy hard fast slow
    early late open closed full empty sweet sour salty bitter spicy tasty bright dark colorful white black red blue
    green yellow orange purple pink brown gray grey quiet loud noisy happy sad angry scared brave tired sleepy
    hungry thirsty sick healthy strong weak fat skinny cute funny serious strange weird normal special important
    dangerous safe calm busy lonely together furry fluffy smooth sharp round square flat straight curly near far
    famous rich poor cheap expensive alive wild tame smart clever lazy cheerful shy kind rude polite curious
    patient honest secret magic magical shiny striped spotted dotted fresh stale raw cooked frozen boiled fried
    baked melted sticky slippery bumpy fuzzy crunchy chewy juicy creamy crispy spiky scaly feathery hairy bald
    wooden metal plastic glass paper golden silver giant mini enormous gigantic`,
    // Eylemler (kök ve sık çekimler)
    `come comes came coming go goes went going gone make makes made making do get gets got getting give gives gave
    given giving take takes took taken taking see sees saw seen seeing look looks looked looking know knows knew
    known say says said saying tell tells told talk talks talked talking ask asks asked think thinks thought love
    loves loved loving want wants wanted eat eats ate eaten eating drink drinks drank drinking sleep sleeps slept
    sleeping wake woke sit sits sat sitting stand stands stood lie lies lay lying run runs ran running walk walks
    walked walking fly flies flew flying swim swims swam swimming jump jumps jumped jumping hold holds held throw
    throws threw thrown catch catches caught pull pulls pulled push pushes pushed open opens opened close closes
    closed read reads reading write writes wrote written writing draw draws drew drawn drawing paint paints painted
    play plays played playing sing sings sang sung singing listen listens listened watch watches watched wait
    waits waited find finds found lose loses lost win wins won sell sells sold buy buys bought pay pays paid cook
    cooks cooked cooking cut cuts cutting mix mixes mixed pour pours poured put puts break breaks broke broken
    wash washes washed clean cleans cleaned wear wears wore worn tie ties tied hide hides hid hidden show shows
    showed shown learn learns learned teach teaches taught start starts started begin began begun finish finishes
    finished stop stops stopped carry carries carried bring brings brought send sends sent ride rides rode ridden
    drive drives drove driven climb climbs climbed fall falls fell fallen turn turns turned grow grows grew grown
    melt melts melted burn burns burned shine shines shone cry cries cried laugh laughs laughed smile smiles
    smiled shout shouts whisper whispers kiss kisses hug hugs touch touches feel feels felt smell smells taste
    tastes hear hears heard understand forget forgot remember count counts measure weigh choose chose collect
    share help helps helped save saves saved protect chase chases chased hunt hunts hunted escape fix fixes fixed
    build builds built glue sew knit work works worked rest rests travel travels visit visits slide slides slid
    swing swings swung shake shakes shook bark barks barked meow purr purrs roar roars buzz buzzes hiss hisses
    bite bites bit chew chews swallow lick licks dig digs dug plant plants water waters feed feeds fed milk pop
    pops popped blow blows blew wrap wraps wrapped cover covers kick kicks kicked hit hits bounce bounces roll
    rolls rolled spin spins spun float floats sink sinks sank dive dives dived shoot score scores scored
    sneeze snore yawn shiver sweat freeze froze frozen boil boils bake bakes fry fries flip`,
    // Adlar (genel)
    `person people man men woman women boy girl child children kid kids baby mom mother dad father sister brother
    aunt uncle cousin family friend owner thing object tool device machine part piece side front back top bottom
    inside outside middle corner edge end start reason idea question answer problem job work task homework lesson
    page line word letter sentence story music sound noise color colour smell feeling love fear hope mind brain
    knowledge science art sport game fun joke tear food drink air fruit vegetable meat oil floor ground building
    apartment avenue town country coast shore season spring summer fall autumn winter weekend holiday party price
    shopping shop store market university stop passenger address message mail card film movie show news internet
    button charge electricity gas heat temperature degree meter inch foot mile pound gallon size age name number
    lip forehead chest waist hip leg skin blood breath animal bug insect lid handle wing beak paw claw horn shell
    fur feather scale mane hump trunk egg cub herd cage leash collar team group race match point prize cup medal
    victory rule clue hint secret mystery surprise luck chance power speed weight height depth length width north
    south east west left right road path way trip journey home place world`,
    // Kısa kökleri başında ya da içinde taşıyan sözcükler (rastlantı denetimi)
    `cattle catalog category scatter catch dogma hotdog bookmark sunday sundae sunflower carpet cargo cartoon career
    carrot careful pencil pen penny penguin pension antique anthem pantry plant tooth teeth bear beard bearing
    earring early earth heart hearth hare hair chair cheer cheap cheese chest chess eggplant legend begin pigeon
    starfish start stare starve startle butterfly bucket bucketful horseshoe horsefly mousetrap seahorse seaweed
    season seat seal search icicle iceberg icing juice nice price rice slice spice twice office police notice
    handle handy handsome hands handshake rocket rocky rocking wallet wallpaper waller tailor tailgate ringtone
    fireplace firework fireworks firefly fireman firewood moonlight moonbeam homesick homework house household
    doorbell doorway window windy windmill wind winding snowball snowflake rainbow raincoat rainy rain trainer
    training boxer boxing boxes beetle beet bee been beer`,
    // Süzgeç tuzakları: süzgeç girdisini başında ya da içinde taşıyan olağan sözcükler
    `class classic assist pass passage grass glass bass mass sassy assassin assume japan japanese spice spicy
    raccoon cocoon pakistan homogenous homework homeless therapist grape drape scrape sextet unisex essex sexton
    titmouse titanic title booby dike swank swanky pornography beanery suicidal spazz negroni scunthorpe
    shiitake cockatoo cockpit peacock hancock dickens arsenal arsenic passion compass harass embarrass
    button butter skill skilled scrap shitake document cocktail analysis`,
  ),
});

// Bir deste cevabının çekimi gibi okunan ama başka sözcük olanlar: tahminde ek çözümüyle de, yazım hatası payıyla da
// kabul edilmez ("altında" altın + da değil ilgeçtir; "kayan" kaya + n değil "kaymak"tandır; "dişi" diş + i değil
// "erkek"in karşıtıdır). Deste cevapları zaten bilinen sözcüktür, burada yazılmaz. Liste tahmin taramasıyla gözden
// geçirilir (web/tests/icerik-sozluk.test.js): sözlükte ya da çok sözcüklü cevapta geçip bir cevabın ekli hâli sayılan her
// sözcük ya burada ya da sınamadaki gerçek çekimler listesindedir.
export const SOZLUK_AYRI = Object.freeze({
  tr: words(
    // ilgeç ve zarf
    `altına altında altından`,
    // başka ad ve sıfat
    `dizi dişi kasaba kumandan kurtçuk boyama`,
    // eylem
    `kayan sordu`,
  ),
  en: words(''),
});
