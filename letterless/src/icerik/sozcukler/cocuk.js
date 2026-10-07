// Çocuk destesi (TR, ücretli). Biçim: docs/icerik-bicimi.md §3. Seçki C2'nindir (tools/icerik/KAYNAKLAR.md).
// Okul öncesi ve ilkokul çağına uygun: masal, oyun, oyuncak, park, sevimli hayvanlar. Silah, adı olan masal kahramanı
// ve marka yoktur; masal yaratıkları (hayalet, canavar, cadı, büyücü) hafif ve çocuk kitaplarındaki gibidir. Gerçek
// kişilere yönelik kırıcı kullanımı olan "cüce" yoktur. Temel destedeki hayvanlar burada yinelenmez. Yazım TDK'ye
// göredir: "deniz kızı" (masal yaratığı) ayrı, "denizatı" bitişik.
export const SOZCUKLER = Object.freeze([
  ['dinozor', 'dinosaur', 1], ['ejderha', 'dragon', 1], ['peri', 'fairy', 1], ['sihirli lamba', 'magic lamp', 2], ['dev', 'giant', 1],
  { soz: 'büyücü', ceviri: 'wizard', zorluk: 1, kokler: ['büyü'] },
  ['korsan', 'pirate', 1], ['hazine', 'treasure', 1], ['hayalet', 'ghost', 1],
  { soz: 'sihirbaz', ceviri: 'magician', zorluk: 1, kokler: ['sihir'] },
  ['palyaço', 'clown', 1], ['salıncak', 'swing', 1],
  { soz: 'kaydırak', ceviri: 'slide', zorluk: 1, kokler: ['kaydır'] },
  { soz: 'uçurtma', ceviri: 'kite', zorluk: 1, kokler: ['uçur'] },
  ['masal', 'fairy tale', 1],
  ['tebeşir', 'chalk', 2], ['boya', 'paint', 1], ['ninni', 'lullaby', 2], ['emzik', 'pacifier', 2], ['biberon', 'baby bottle', 2],
  ['yapboz', 'jigsaw puzzle', 1],
  { soz: 'saklambaç', ceviri: 'hide and seek', zorluk: 1, kokler: ['sakla'] },
  ['körebe', 'blind man\'s buff', 2],
  { soz: 'misket', ceviri: 'marble', zorluk: 2, esler: ['bilye'] },
  ['topaç', 'spinning top', 2],
  ['deniz kızı', 'mermaid', 1],
  ['oyuncak ayı', 'teddy bear', 1],
  { soz: 'kumdan kale', ceviri: 'sandcastle', zorluk: 1, serbest: ['kalem'] },
  ['süper kahraman', 'superhero', 1],
  { soz: 'tek boynuzlu at', ceviri: 'unicorn', zorluk: 1, kokler: ['boynuz'] },

  // Masal ve hayal
  { soz: 'prenses', ceviri: 'princess', zorluk: 1, kokler: ['prens'] },
  ['prens', 'prince', 1], ['cadı', 'witch', 1], ['taç', 'crown', 1], ['canavar', 'monster', 1],
  { soz: 'uzaylı', ceviri: 'alien', zorluk: 1, kokler: ['uzay'] },
  ['kukla', 'puppet', 1], ['diş perisi', 'tooth fairy', 2], ['uzay gemisi', 'spaceship', 2], ['şato', 'castle', 2],
  { soz: 'sihirli değnek', ceviri: 'magic wand', zorluk: 2, kokler: ['sihir'] },
  { soz: 'uçan halı', ceviri: 'flying carpet', zorluk: 2, serbest: ['pahalı', 'hala', 'halde'] },
  ['kurabiye adam', 'gingerbread man', 2], ['kovboy', 'cowboy', 2], ['ninja', 'ninja', 2],
  ['şövalye', 'knight', 3], ['trol', 'troll', 3],
  { soz: 'göz bandı', ceviri: 'eye patch', zorluk: 3, serbest: ['bana'] }, ['kaşif', 'explorer', 3], ['hazine sandığı', 'treasure chest', 2],

  // Oyun ve oyuncak
  { soz: 'oyun hamuru', ceviri: 'play dough', zorluk: 1, kokler: ['oyna-'] },
  { soz: 'boyama kitabı', ceviri: 'coloring book', zorluk: 1, kokler: ['boya'] },
  { soz: 'baloncuk', ceviri: 'bubble', zorluk: 1, kokler: ['balon'] },
  ['kum havuzu', 'sandbox', 1], ['lunapark', 'amusement park', 1],
  ['sirk', 'circus', 1], ['kartopu', 'snowball', 1], ['kızak', 'sled', 1], ['yavru kedi', 'kitten', 1], ['çizgi film', 'cartoon', 1],
  ['ağaç ev', 'tree house', 1],
  { soz: 'üç tekerlekli bisiklet', ceviri: 'tricycle', zorluk: 1, kokler: ['tekerlek'] },
  ['tahterevalli', 'seesaw', 2], ['atlıkarınca', 'carousel', 2], ['trambolin', 'trampoline', 2],
  ['dönme dolap', 'big wheel', 2], ['çarpışan arabalar', 'bumper cars', 2], ['pastel boya', 'crayon', 2], ['keçeli kalem', 'marker', 2], ['kutu oyunu', 'board game', 2],
  ['domino', 'domino', 2], ['kağıttan uçak', 'paper airplane', 2], ['seksek', 'hopscotch', 2], ['parti şapkası', 'party hat', 2], ['maske', 'mask', 2],
  ['kostüm', 'costume', 2], ['pelerin', 'cape', 2], ['lastik ördek', 'rubber duck', 2],
  { soz: 'bez bebek', ceviri: 'rag doll', zorluk: 2 }, ['taş kağıt makas', 'rock paper scissors', 2],
  ['masal kitabı', 'storybook', 2], ['oyuncak kutusu', 'toy box', 2], ['fırıldak', 'pinwheel', 3], ['çember', 'hoop', 2], ['konfeti', 'confetti', 3],
  ['yoyo', 'yo-yo', 2],
  { soz: 'çıkartma', ceviri: 'sticker', zorluk: 3, kokler: ['çıkart'] },
  ['origami', 'origami', 3],

  // Tatlı şeyler
  { soz: 'pamuk şekeri', ceviri: 'cotton candy', zorluk: 1, esler: ['pamuk helvası'] },
  ['lolipop', 'lollipop', 1], ['sakız', 'gum', 1], ['çikolata', 'chocolate', 1], ['patlamış mısır', 'popcorn', 1],
  ['jöle', 'jelly', 2], ['elma şekeri', 'candy apple', 2], ['dondurma külahı', 'ice cream cone', 2], ['gazoz', 'soda', 2],

  // Bebeklik
  ['beşik', 'cradle', 2], ['bebek arabası', 'stroller', 2], ['mama', 'baby food', 2], ['çıngırak', 'rattle', 3], ['mama sandalyesi', 'high chair', 3],

  // Okul ve kreş
  { soz: 'anaokulu', ceviri: 'kindergarten', zorluk: 2, kokler: ['okul'], esler: ['kreş'] },
  { soz: 'yapıştırıcı', ceviri: 'glue', zorluk: 2, kokler: ['yapıştır'] },
  { soz: 'kalemtıraş', ceviri: 'sharpener', zorluk: 2, kokler: ['kalem'] },
  ['kalem kutusu', 'pencil case', 2], ['sırt çantası', 'backpack', 1],
  ['beslenme çantası', 'lunch box', 2],
  { soz: 'suluboya', ceviri: 'watercolor', zorluk: 2, kokler: ['boya'] },
  ['alfabe', 'alphabet', 2], ['kaleydoskop', 'kaleidoscope', 3], ['kara tahta', 'blackboard', 3], ['aferin', 'well done', 3], ['abaküs', 'abacus', 3],

  // Oyunlar, sözler ve sevgi
  { soz: 'kovalamaca', ceviri: 'tag', zorluk: 2, kokler: ['kovala'] },
  { soz: 'evcilik', ceviri: 'playing house', zorluk: 3, harf: ['E', 'V'] },
  ['bilmece', 'riddle', 3], ['tekerleme', 'tongue twister', 3], ['gece lambası', 'night light', 2],
  { soz: 'gıdıklama', ceviri: 'tickling', zorluk: 3, kokler: ['gıdık'] },
  ['kucak', 'lap', 3],
  { soz: 'öpücük', ceviri: 'kiss', zorluk: 2, harf: ['Ö', 'P'] },
  { soz: 'süt dişi', ceviri: 'baby tooth', zorluk: 2, serbest: ['kendisi'] },

  // Sevimli hayvanlar
  ['civciv', 'chick', 1], ['uğur böceği', 'ladybug', 1], ['panda', 'panda', 1], ['papağan', 'parrot', 1], ['kutup ayısı', 'polar bear', 2],
  ['salyangoz', 'snail', 2], ['kanguru', 'kangaroo', 2], ['ateş böceği', 'firefly', 2], ['tırtıl', 'caterpillar', 2],
  { soz: 'denizatı', ceviri: 'seahorse', zorluk: 2, kokler: ['deniz'], harf: ['A', 'T'] },
  { soz: 'denizyıldızı', ceviri: 'starfish', zorluk: 2, kokler: ['deniz', 'yıldız'] },
  ['koala', 'koala', 2], ['hamster', 'hamster', 2], ['flamingo', 'flamingo', 2], ['örümcek ağı', 'spiderweb', 2],
  ['midilli', 'pony', 3], ['mamut', 'mammoth', 3], ['tay', 'foal', 3], ['fosil', 'fossil', 3],

  // Dışarıda
  ['çöp kamyonu', 'garbage truck', 2], ['kar tanesi', 'snowflake', 2], ['su birikintisi', 'puddle', 2], ['can simidi', 'swim ring', 2],
  { soz: 'yağmurluk', ceviri: 'raincoat', zorluk: 2, kokler: ['yağmur'] },
  ['vinç', 'crane', 3], ['kolluk', 'armbands', 3], ['matara', 'canteen', 3],
]);
