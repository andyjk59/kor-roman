#!/usr/bin/env node
// Accuracy test: Korean -> Romanization (RR and MR)
// Dataset drawn from official Korean government romanization examples,
// common vocabulary, names, and phonological edge cases.

const Hangul = require('./hangul.js');
const Romanize = require('./romanize.js');

function r(word, system) {
  return Romanize.romanize(word, system, null).text;
}

// Each entry: [korean, expectedRR, expectedMR, category]
const dataset = [
  // ---- Official NIKL (National Institute of Korean Language) Examples ----
  ['구미',   'Gumi',   'Kumi',   'place'],
  ['영동',   'Yeongdong', 'Yŏngdong', 'place'],
  ['백암',   'Baegam', 'Paegam', 'place'],
  ['옥천',   'Okcheon', "Okch'ŏn", 'place'],
  ['합덕',   'Hapdeok', 'Hapdŏk', 'place'],
  ['호법',   'Hobeop',  'Hobŏp',  'place'],
  ['의왕',   'Uiwang',  'Ŭiwang', 'place'],
  ['괴산',   'Goesan',  'Koesan', 'place'],
  ['군위',   'Gunwi',   'Kunwi',  'place'],
  ['임실',   'Imsil',   'Imsil',  'place'],
  ['진안',   'Jinan',   'Chinan', 'place'],
  ['무주',   'Muju',    'Muju',   'place'],
  ['장수',   'Jangsu',  'Changsu','place'],
  ['고창',   'Gochang', "Koch'ang",'place'],
  ['부안',   'Buan',    'Puan',   'place'],

  // ---- Liaison (연음) ----
  ['먹이',  'meogi',   'mŏgi',   'liaison'],
  ['꽃이',  'kkochi',  "kkoch'i", 'liaison'],
  ['닭이',  'dalgi',   'talgi',   'liaison'],
  ['값이',  'gapsi',   'kapsi',   'liaison'],
  ['앞이',  'api',     'api',     'liaison'],
  ['밖에',  'bakke',   'pakke',   'liaison'],
  ['국어',  'gugeo',   'kugŏ',   'liaison'],
  ['한국어','hangugeo','han'gugŏ','liaison'],  // MR: n + g -> n'g
  ['음악이','eumagi',  'ŭmagi',  'liaison'],

  // ---- Nasalization (비음화) ----
  ['국민',  'gungmin', 'kungmin', 'nasalization'],
  ['신라',  'Silla',   'Silla',   'nasalization'],  // ㄴ+ㄹ -> ㄹㄹ
  ['항로',  'hangno',  'hangno',  'nasalization'],  // ㅇ + ㄹ -> ㅇ + ㄴ
  ['대통령','daetongnyeong','taetongnyŏng','nasalization'],
  ['독립',  'dongnip', 'tongnip', 'nasalization'],
  ['막내',  'mangnae', 'mangnae', 'nasalization'],
  ['십리',  'simni',   'simni',   'nasalization'],  // ㅂ+ㄹ -> ㅁ+ㄴ
  ['합리',  'hamni',   'hamni',   'nasalization'],

  // ---- Liquidization (유음화) ----
  ['전라',  'Jeolla',  'Chŏlla',  'liquidization'],
  ['설날',  'Seollal', 'Sŏllal',  'liquidization'],
  ['진리',  'jilli',   'chilli',  'liquidization'],
  ['남루',  'namnu',   'namnu',   'liquidization'],  // ㅁ+ㄹ -> ㅁ+ㄴ (nasal+ㄹ)
  ['심리',  'simni',   'simni',   'liquidization'],  // same rule

  // ---- ㅎ rules ----
  ['놓아',  'noa',     'noa',     'h-rule'],  // ㅎ + vowel -> silent
  ['않아',  'ana',     'ana',     'h-rule'],
  ['좋아',  'joa',     'choa',    'h-rule'],
  ['닳아',  'dara',    'tara',    'h-rule'],  // ㄹㅎ -> ㄹ silent, then liaison

  // ---- Word-final neutralization ----
  ['빛',   'bit',     'pit',     'neutralization'],
  ['낮',   'nat',     'nat',     'neutralization'],
  ['꽃',   'kkot',    'kkot',    'neutralization'],
  ['밖',   'bak',     'pak',     'neutralization'],
  ['밥',   'bap',     'pap',     'neutralization'],
  ['산',   'san',     'san',     'neutralization'],
  ['달',   'dal',     'tal',     'neutralization'],
  ['봄',   'bom',     'pom',     'neutralization'],

  // ---- Common vocabulary ----
  ['서울',  'Seoul',   'Sŏul',   'common'],
  ['부산',  'Busan',   'Pusan',  'common'],
  ['대구',  'Daegu',   'Taegu',  'common'],
  ['인천',  'Incheon', "Inch'ŏn",'common'],
  ['광주',  'Gwangju', 'Kwangju','common'],
  ['대전',  'Daejeon', 'Taejŏn','common'],
  ['울산',  'Ulsan',   'Ulsan',  'common'],
  ['한국',  'hanguk',  "han'guk",'common'],
  ['사람',  'saram',   'saram',  'common'],
  ['물',    'mul',     'mul',    'common'],
  ['불',    'bul',     'pul',    'common'],
  ['밥',    'bap',     'pap',    'common'],
  ['집',    'jip',     'chip',   'common'],
  ['학교',  'hakgyo',  'hakkyo', 'common'],
  ['나라',  'nara',    'nara',   'common'],
  ['바다',  'bada',    'pada',   'common'],
  ['하늘',  'haneul',  'hanŭl',  'common'],
  ['사랑',  'sarang',  'sarang', 'common'],
  ['아이',  'ai',      'ai',     'common'],
  ['어머니','eomeoni', 'ŏmŏni',  'common'],
  ['아버지','abeoji',  'abŏji',  'common'],
  ['선생님','seonsaengnim','sŏnsaengnim','common'],
  ['학생',  'haksaeng','haksaeng','common'],
  ['친구',  'chingu',  "ch'ingu",'common'],
  ['음식',  'eumsik',  'ŭmsik',  'common'],
  ['김치',  'gimchi',  'kimch\'i','common'],
  ['불고기','bulgogi',  'pulgogi','common'],
  ['태권도','taekwondo','t\'aekwŏndo','common'],

  // ---- Double consonant initials (tensed/fortis) ----
  ['빠르다','ppareuda','ppareuda','tense'],
  ['쪽',    'jjok',    'tchok',  'tense'],
  ['딸',    'ttal',    'ttal',   'tense'],
  ['뚜껑',  'ttukkeong','ttukk'ŏng','tense'],

  // ---- Complex batchim liaison ----
  ['읽어',  'ilgeo',   'ilgŏ',   'complex-batchim'],
  ['닭을',  'dalgeul', 'talgŭl', 'complex-batchim'],
  ['삶이',  'salmi',   'salmi',  'complex-batchim'],
  ['흙이',  'heulgi',  'hŭlgi',  'complex-batchim'],
  ['읊어',  'eulpeo',  'ŭlpŏ',  'complex-batchim'],

  // ---- Numbers / months ----
  ['일월',  'irwol',   'irwŏl',  'calendar'],
  ['이월',  'iwol',    'iwŏl',   'calendar'],
  ['삼월',  'samwol',  'samwŏl', 'calendar'],

  // ---- Aspirated consonants ----
  ['파도',  'pado',    "p'ado",  'aspirate'],
  ['타다',  'tada',    "t'ada",  'aspirate'],
  ['카드',  'kadeu',   "k'adŭ",  'aspirate'],
  ['차',    'cha',     "ch'a",   'aspirate'],

  // ---- Sentence-level / phrase ----
  ['안녕하세요', 'annyeonghaseyo', 'annyŏnghaseyo', 'phrase'],
  ['감사합니다', 'gamsahamnida',   'kamsahamnida',  'phrase'],
  ['괜찮아요',   'gwaenchanayo',   'kwaench'anayo', 'phrase'],
];

// ---- Run tests -------------------------------------------------------
const results = { RR: { pass: 0, fail: 0, errors: [] }, MR: { pass: 0, fail: 0, errors: [] } };
const categories = {};

console.log('='.repeat(72));
console.log('Korean Romanizer Accuracy Test');
console.log(`Dataset size: ${dataset.length} entries`);
console.log('='.repeat(72));

for (const [korean, expRR, expMR, cat] of dataset) {
  if (!categories[cat]) categories[cat] = { RR: { pass:0, fail:0 }, MR: { pass:0, fail:0 } };

  for (const [system, expected, res] of [['RR', expRR, results.RR], ['MR', expMR, results.MR]]) {
    // Case-insensitive comparison (romanization may differ in capitalisation for place names)
    const got = r(korean, system);
    const pass = got.toLowerCase() === expected.toLowerCase();
    if (pass) {
      res.pass++;
      categories[cat][system].pass++;
    } else {
      res.fail++;
      categories[cat][system].fail++;
      res.errors.push({ korean, expected, got, cat });
    }
  }
}

// ---- Summary ---------------------------------------------------------
for (const system of ['RR', 'MR']) {
  const { pass, fail, errors } = results[system];
  const total = pass + fail;
  const pct = ((pass / total) * 100).toFixed(1);
  console.log(`\n[${system}]  ${pass}/${total} passed  (${pct}% accuracy)`);

  if (errors.length > 0) {
    console.log(`  Failures (${errors.length}):`);
    for (const e of errors) {
      console.log(`    [${e.cat}]  "${e.korean}"  expected "${e.expected}"  got "${e.got}"`);
    }
  }
}

// ---- By category -----------------------------------------------------
console.log('\n' + '-'.repeat(72));
console.log('Accuracy by category:');
const cats = Object.keys(categories).sort();
for (const cat of cats) {
  const rr = categories[cat].RR;
  const mr = categories[cat].MR;
  const rrPct = (((rr.pass) / (rr.pass + rr.fail)) * 100).toFixed(0);
  const mrPct = (((mr.pass) / (mr.pass + mr.fail)) * 100).toFixed(0);
  console.log(`  ${cat.padEnd(20)} RR: ${String(rr.pass).padStart(2)}/${rr.pass+rr.fail} (${rrPct}%)   MR: ${String(mr.pass).padStart(2)}/${mr.pass+mr.fail} (${mrPct}%)`);
}

console.log('\n' + '='.repeat(72));
const totalPass = results.RR.pass + results.MR.pass;
const totalTests = (results.RR.pass + results.RR.fail + results.MR.pass + results.MR.fail);
console.log(`Overall: ${totalPass}/${totalTests} (${((totalPass/totalTests)*100).toFixed(1)}%)`);
console.log('='.repeat(72));
