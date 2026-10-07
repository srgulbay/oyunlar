// Spor destesi (TR, ücretli). Biçim: docs/icerik-bicimi.md §3. Seçki C2'nindir (tools/icerik/KAYNAKLAR.md).
// Temel destedeki "top", "kale", "satranç" burada yinelenmez. Türemiş sözcükte kök `kokler`e ("güreşçi" → "güreş"),
// kökü kısa olanlarda `harf` önerisi kökün harflerinden seçilir ("yüzücü" → Y, Ü, Z). Fiilden türemiş dalda fiil
// kökü de `kokler`dedir: uzunsa düz ("ısınma" → "ısın"), kısaysa sonu tireyle ("koşu" → "koş-": koşan, koştu);
// mastarı ("ısınmak", "atmak") motor kendisi yakalar. Çözme ekranı deste adını gösterdiğinden ("«Spor»
// destesinden") "spor" kökünü taşıyan sözcük (sporcu, spor salonu) yoktur. Yazım TDK'ye göredir ("bovling";
// yaygın İngilizce yazımı `esler`de).
export const SOZCUKLER = Object.freeze([
  ['futbol', 'football', 1],
  { soz: 'basketbol', ceviri: 'basketball', zorluk: 1, kokler: ['basket'] },
  { soz: 'voleybol', ceviri: 'volleyball', zorluk: 1, kokler: ['voley'] },
  ['tenis', 'tennis', 1],
  { soz: 'yüzme', ceviri: 'swimming', zorluk: 1, kokler: ['yüz-'], harf: ['Y', 'Ü', 'Z'] },
  ['maraton', 'marathon', 2], ['hakem', 'referee', 1],
  { soz: 'kaleci', ceviri: 'goalkeeper', zorluk: 1, kokler: ['kale'], serbest: ['kalem'] },
  ['penaltı', 'penalty', 1], ['forma', 'jersey', 2],
  ['stadyum', 'stadium', 1], ['madalya', 'medal', 1], ['kupa', 'trophy', 1], ['şampiyon', 'champion', 1], ['güreş', 'wrestling', 2],
  ['boks', 'boxing', 1], ['kayak', 'skiing', 1], ['sörf', 'surfing', 2],
  { soz: 'okçuluk', ceviri: 'archery', zorluk: 2, harf: ['O', 'K'] },
  ['eskrim', 'fencing', 2],
  ['jimnastik', 'gymnastics', 2], ['halter', 'weightlifting', 2], ['golf', 'golf', 2], ['bilardo', 'billiards', 2],
  { soz: 'taraftar', ceviri: 'fan', zorluk: 1, kokler: ['taraf'] },
  ['antrenör', 'coach', 2], ['ofsayt', 'offside', 2], ['korner', 'corner kick', 2], ['raket', 'racket', 1], ['düdük', 'whistle', 1],

  // Dallar
  ['masa tenisi', 'table tennis', 1], ['buz pateni', 'ice skating', 1], ['karate', 'karate', 1], ['yoga', 'yoga', 1],
  { soz: 'koşu', ceviri: 'running', zorluk: 1, kokler: ['koş-'] },
  ['kaykay', 'skateboard', 1], ['paten', 'skates', 1], ['dart', 'darts', 1],
  { soz: 'bovling', ceviri: 'bowling', zorluk: 1, esler: ['bowling'] },
  { soz: 'ip atlama', ceviri: 'jump rope', zorluk: 1, kokler: ['atla'] },
  ['hentbol', 'handball', 2], ['badminton', 'badminton', 2], ['beyzbol', 'baseball', 2], ['ragbi', 'rugby', 2], ['hokey', 'hockey', 2],
  ['kano', 'canoe', 2], ['yelken', 'sailing', 2],
  { soz: 'dalış', ceviri: 'diving', zorluk: 2, kokler: ['dal-'] },
  ['atletizm', 'athletics', 2], ['bayrak yarışı', 'relay race', 2],
  { soz: 'uzun atlama', ceviri: 'long jump', zorluk: 2, kokler: ['atla'] },
  { soz: 'yüksek atlama', ceviri: 'high jump', zorluk: 2, kokler: ['atla'] },
  { soz: 'dağcılık', ceviri: 'mountaineering', zorluk: 2, harf: ['D', 'A', 'Ğ'] },
  ['judo', 'judo', 2], ['tekvando', 'taekwondo', 2],
  ['sumo', 'sumo', 2], ['pilates', 'pilates', 2], ['kürek', 'rowing', 2],
  { soz: 'halat çekme', ceviri: 'tug of war', zorluk: 2, kokler: ['çek-'] },
  { soz: 'binicilik', ceviri: 'horse riding', zorluk: 2, harf: ['B', 'İ', 'N'] },
  ['kriket', 'cricket', 3], ['triatlon', 'triathlon', 3],
  { soz: 'sırıkla atlama', ceviri: 'pole vault', zorluk: 3, kokler: ['atla'] },
  ['gülle atma', 'shot put', 3], ['cirit', 'javelin', 3],
  ['yamaç paraşütü', 'paragliding', 3], ['rafting', 'rafting', 3],

  // Malzeme
  ['kask', 'helmet', 1], ['mayo', 'swimsuit', 1], ['eşofman', 'tracksuit', 1], ['pota', 'hoop', 1], ['krampon', 'cleats', 2],
  ['file', 'net', 2], ['sopa', 'bat', 2], ['dambıl', 'dumbbell', 2], ['şnorkel', 'snorkel', 2], ['can yeleği', 'life jacket', 2],
  ['sörf tahtası', 'surfboard', 2], ['boks eldiveni', 'boxing glove', 2], ['siyah kuşak', 'black belt', 2],
  { soz: 'koşu bandı', ceviri: 'treadmill', zorluk: 2, kokler: ['koş-'], serbest: ['bana'] },
  ['palet', 'flippers', 3],
  ['kronometre', 'stopwatch', 3],

  // Maç ve oyun
  ['gol', 'goal', 1], ['faul', 'foul', 1], ['kırmızı kart', 'red card', 1],
  { soz: 'sarı kart', ceviri: 'yellow card', zorluk: 1, serbest: ['dışarı'] },
  ['maç', 'match', 1],
  ['takım', 'team', 1], ['saha', 'field', 1], ['final', 'final', 1], ['olimpiyat', 'olympics', 1], ['yarış', 'race', 1],
  ['tribün', 'stands', 1], ['turnuva', 'tournament', 1], ['rekor', 'record', 1], ['skor', 'score', 1], ['frikik', 'free kick', 2],
  ['taç atışı', 'throw-in', 2], ['devre arası', 'halftime', 2], ['derbi', 'derby', 2], ['lig', 'league', 2], ['yedek', 'substitute', 2],
  ['forvet', 'striker', 2], ['defans', 'defense', 2], ['pas', 'pass', 2], ['smaç', 'spike', 2], ['servis', 'serve', 2],
  ['blok', 'block', 2],
  { soz: 'üçlük', ceviri: 'three pointer', zorluk: 2, harf: ['Ü', 'Ç'] },
  ['mola', 'timeout', 2], ['kort', 'court', 2], ['podyum', 'podium', 2],
  ['zafer', 'victory', 2], ['bitiş çizgisi', 'finish line', 2], ['tur', 'lap', 2], ['kadro', 'squad', 3], ['taktik', 'tactic', 3],
  ['orta saha', 'midfield', 3], ['rövaşata', 'bicycle kick', 3],
  { soz: 'uzatma', ceviri: 'extra time', zorluk: 2, kokler: ['uzat'] },
  ['deplasman', 'away game', 3], ['ribaund', 'rebound', 3], ['turnike', 'layup', 3],
  { soz: 'beraberlik', ceviri: 'draw', zorluk: 2, kokler: ['beraber'] },
  { soz: 'yenilgi', ceviri: 'defeat', zorluk: 2, kokler: ['yenil'] },
  ['fotofiniş', 'photo finish', 3], ['kulvar', 'lane', 3],
  ['çalım', 'dribble', 3],

  // Antrenman ve salon
  ['nakavt', 'knockout', 2], ['antrenman', 'training', 1], ['şınav', 'push up', 1], ['ter', 'sweat', 1],
  { soz: 'ısınma', ceviri: 'warm up', zorluk: 2, kokler: ['ısın-'] },
  ['kas', 'muscle', 2], ['soyunma odası', 'locker room', 2], ['parkur', 'course', 2], ['ring', 'ring', 2], ['mekik', 'sit up', 3],
  ['barfiks', 'pull up', 3],

  // İnsanlar
  ['amigo', 'cheerleader', 2],
  { soz: 'futbolcu', ceviri: 'footballer', zorluk: 1, kokler: ['futbol'] },
  { soz: 'yüzücü', ceviri: 'swimmer', zorluk: 1, harf: ['Y', 'Ü', 'Z'] },
  { soz: 'koşucu', ceviri: 'runner', zorluk: 1, kokler: ['koşu', 'koş-'] },
  { soz: 'boksör', ceviri: 'boxer', zorluk: 1, kokler: ['boks'] },
  ['maskot', 'mascot', 1],
  { soz: 'güreşçi', ceviri: 'wrestler', zorluk: 2, kokler: ['güreş'] },
  ['yan hakem', 'linesman', 3], ['çaylak', 'rookie', 3], ['jokey', 'jockey', 3],
]);
