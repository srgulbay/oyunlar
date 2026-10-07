// Mutfak destesi (TR, ücretli). Biçim: docs/icerik-bicimi.md §3. Seçki C2'nindir (tools/icerik/KAYNAKLAR.md).
// Temel destedeki yiyecekler (elma, çorba, pilav…) burada yinelenmez; aynı dilde iki destede aynı sözcük olmaz.
// İngilizcede yerleşik karşılığı olmayan yemeklerde `ceviri` yazılmaz. Yakın iki yemekten biri ötekinin eş adıdır
// ("sarma" → "dolma"nın `esler`i). Argoda aşağılayıcı anlamı yaygın olan "kaşar" yerine "tulum peyniri" seçildi.
export const SOZCUKLER = Object.freeze([
  ['tencere', 'pot', 1], ['tava', 'frying pan', 1], ['kaşık', 'spoon', 1], ['çatal', 'fork', 1], ['bıçak', 'knife', 1],
  ['fırın', 'oven', 1],
  { soz: 'buzdolabı', ceviri: 'fridge', zorluk: 1, kokler: ['dolap', 'buz'] },
  ['rende', 'grater', 2], ['kepçe', 'ladle', 2],
  { soz: 'süzgeç', ceviri: 'colander', zorluk: 2, harf: ['S', 'Ü', 'Z'] },
  ['oklava', 'rolling pin', 3],
  { soz: 'çaydanlık', ceviri: 'teapot', zorluk: 1, harf: ['Ç', 'A', 'Y'] },
  ['cezve', 'coffee pot', 2], ['tabak', 'plate', 1], ['bardak', 'glass', 1],
  ['mantı', 'dumplings', 2], ['baklava', 'baklava', 1], { soz: 'menemen', zorluk: 2 }, { soz: 'lahmacun', zorluk: 2 }, { soz: 'mücver', zorluk: 2 },
  { soz: 'tuzluk', ceviri: 'salt shaker', zorluk: 2, harf: ['T', 'U', 'Z'] },
  ['önlük', 'apron', 2], ['mikser', 'mixer', 2], ['tost', 'toast', 1], ['köfte', 'meatballs', 1],
  ['kebap', 'kebab', 1], ['börek', 'pastry', 1], ['sucuk', 'sausage', 2], ['turşu', 'pickle', 2], ['reçel', 'jam', 1],
  { soz: 'tereyağı', ceviri: 'butter', zorluk: 1, harf: ['Y', 'Ğ', 'A'] },
  ['un', 'flour', 2], ['şeker', 'sugar', 1], ['tuz', 'salt', 1], ['biber', 'pepper', 1],

  // Araç gereç ve sofra
  ['fincan', 'cup', 1], ['tepsi', 'tray', 1], ['mangal', 'barbecue', 1], ['ocak', 'stove', 1],
  { soz: 'mikrodalga', ceviri: 'microwave', zorluk: 1, kokler: ['dalga'] },
  ['bulaşık makinesi', 'dishwasher', 1], ['peçete', 'napkin', 1], ['çay bardağı', 'tea glass', 1], ['pipet', 'straw', 1], ['kase', 'bowl', 2],
  ['ızgara', 'grill', 2], ['düdüklü tencere', 'pressure cooker', 2], ['kavanoz', 'jar', 2], ['sofra', 'dinner table', 2], ['masa örtüsü', 'tablecloth', 2],
  ['huni', 'funnel', 3], ['semaver', 'samovar', 3], ['kürdan', 'toothpick', 3], ['spatula', 'spatula', 3], ['sürahi', 'pitcher', 3],
  ['şiş', 'skewer', 3],
  { soz: 'buzluk', ceviri: 'freezer', zorluk: 3, harf: ['B', 'U', 'Z'] },

  // Yemekler
  ['pide', 'flatbread', 1],
  { soz: 'döner', ceviri: 'doner', zorluk: 1, serbest: ['dönerek'] },
  ['omlet', 'omelet', 1], ['salata', 'salad', 1], ['sandviç', 'sandwich', 1],
  ['hamburger', 'hamburger', 1], ['patates kızartması', 'fries', 1],
  { soz: 'gözleme', zorluk: 2 }, { soz: 'poğaça', zorluk: 2 },
  { soz: 'dolma', ceviri: 'dolma', zorluk: 2, esler: ['sarma'] },
  ['kuru fasulye', 'bean stew', 2], { soz: 'çiğ köfte', zorluk: 2 }, ['kumpir', 'baked potato', 2], ['cacık', 'tzatziki', 2], ['dürüm', 'wrap', 2],
  { soz: 'tarhana', zorluk: 3 }, { soz: 'karnıyarık', zorluk: 3 },

  // Tatlılar ve fırın
  ['kurabiye', 'cookie', 1], ['kek', 'sponge cake', 1], ['bisküvi', 'biscuit', 1], ['puding', 'pudding', 1], ['tatlı', 'dessert', 3],
  { soz: 'künefe', zorluk: 2 },
  { soz: 'sütlaç', ceviri: 'rice pudding', zorluk: 2, kokler: ['süt'] },
  ['helva', 'halva', 2],
  { soz: 'lokma', zorluk: 3 }, { soz: 'kadayıf', zorluk: 3 }, ['muhallebi', 'milk pudding', 3],

  // İçecekler
  { soz: 'ayran', zorluk: 1 },
  { soz: 'limonata', ceviri: 'lemonade', zorluk: 1, kokler: ['limon'] },
  ['meyve suyu', 'juice', 1], ['kakao', 'cocoa', 2], { soz: 'boza', zorluk: 3 }, ['ıhlamur', 'linden tea', 3],

  // Süt ürünleri, sos ve baharat
  { soz: 'tulum peyniri', zorluk: 2 },
  ['ketçap', 'ketchup', 1], ['mayonez', 'mayonnaise', 2], ['hardal', 'mustard', 2],
  { soz: 'zeytinyağı', ceviri: 'olive oil', zorluk: 2, kokler: ['zeytin'] },
  { soz: 'karabiber', ceviri: 'black pepper', zorluk: 2, kokler: ['biber'] },
  ['nane', 'mint', 2], ['maydanoz', 'parsley', 2], ['salça', 'tomato paste', 3], ['kaymak', 'clotted cream', 3],
  ['pekmez', 'molasses', 3], ['tahin', 'tahini', 3],
  { soz: 'dereotu', ceviri: 'dill', zorluk: 3, kokler: ['dere'] },
  ['zencefil', 'ginger', 3], ['tarçın', 'cinnamon', 3],

  // Bakliyat, sebze ve meyve
  ['pirinç', 'rice', 2], ['bulgur', 'bulgur', 2], ['mercimek', 'lentil', 2], ['nohut', 'chickpea', 2], ['bezelye', 'pea', 2],
  ['sarımsak', 'garlic', 1], ['mantar', 'mushroom', 1], ['patlıcan', 'eggplant', 1], ['kabak', 'zucchini', 1], ['ıspanak', 'spinach', 2],
  { soz: 'salatalık', ceviri: 'cucumber', zorluk: 2, kokler: ['salata'] },
  ['marul', 'lettuce', 2], ['lahana', 'cabbage', 2], ['karnabahar', 'cauliflower', 3], ['pırasa', 'leek', 3],
  ['enginar', 'artichoke', 3], ['ananas', 'pineapple', 1], ['mandalina', 'tangerine', 1], ['şeftali', 'peach', 1], ['kavun', 'melon', 1],
  ['erik', 'plum', 1], ['fıstık', 'peanut', 1], ['kayısı', 'apricot', 2], ['nar', 'pomegranate', 2], ['incir', 'fig', 2],
  ['vişne', 'sour cherry', 2], ['badem', 'almond', 2], ['dut', 'mulberry', 3], ['kestane', 'chestnut', 3],

  // Et ve deniz ürünleri
  ['sosis', 'sausage', 1], ['kıyma', 'ground meat', 2], ['somon', 'salmon', 2], ['karides', 'shrimp', 2], ['midye', 'mussel', 2],
  ['biftek', 'steak', 2], ['hamsi', 'anchovy', 3],

  // Mekân ve mutfak dili
  ['restoran', 'restaurant', 1],
  { soz: 'pastane', ceviri: 'bakery', zorluk: 1, kokler: ['pasta'] },
  ['kafe', 'cafe', 2], ['menü', 'menu', 2], ['baharat', 'spice', 2],
  ['hamur', 'dough', 2], ['tarif', 'recipe', 3], ['bahşiş', 'tip', 3],
]);
