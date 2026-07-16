// Starter exceptions dictionary: common Korean surnames whose conventional,
// real-world spellings diverge from the strict rule-based output. Checked
// before the algorithm runs, in both directions (Hangul -> romanized and
// romanized -> Hangul).
//
// Fields:
//   hangul: the surname in Hangul
//   rr: the conventional Revised Romanization spelling most often used in
//       practice (passports, news, etc.) - not necessarily what the strict
//       2000 rules would generate
//   mr:  the standard academic McCune-Reischauer spelling
//   alt: other common alternate spellings seen in the wild (for matching on
//        the reverse/de-romanization side; not the canonical output)
//   note: short explanation of why this is an exception
(function (global) {
  const EXCEPTIONS = [
    { hangul: '김', rr: 'Kim', mr: 'Kim', alt: ['Gim'], note: 'Conventional spelling; rule-based RR would give "Gim".' },
    { hangul: '이', rr: 'Lee', mr: 'Yi', alt: ['Yi', 'I', 'Rhee'], note: 'Conventional spelling; rule-based RR/MR would give "I".' },
    { hangul: '박', rr: 'Park', mr: "Pak", alt: ['Pak'], note: 'Conventional spelling; rule-based RR would give "Bak".' },
    { hangul: '최', rr: 'Choi', mr: "Ch'oe", alt: ['Choe'], note: 'Conventional spelling; rule-based RR would give "Choe".' },
    { hangul: '정', rr: 'Jung', mr: 'Chŏng', alt: ['Jeong', 'Chung'], note: 'Common conventional spelling alongside the rule-based "Jeong".' },
    { hangul: '강', rr: 'Kang', mr: 'Kang', alt: [], note: 'Conventional spelling; rule-based RR would give "Gang".' },
    { hangul: '조', rr: 'Cho', mr: 'Cho', alt: ['Jo'], note: 'Conventional spelling; rule-based RR would give "Jo".' },
    { hangul: '윤', rr: 'Yoon', mr: 'Yun', alt: ['Yun'], note: 'Common conventional spelling alongside the rule-based "Yun".' },
    { hangul: '장', rr: 'Jang', mr: 'Chang', alt: [], note: 'Standard spellings for this surname.' },
    { hangul: '임', rr: 'Lim', mr: 'Im', alt: ['Im'], note: 'Conventional spelling; rule-based RR would give "Im".' },
    { hangul: '한', rr: 'Han', mr: 'Han', alt: [], note: 'Rule-based output matches convention.' },
    { hangul: '오', rr: 'Oh', mr: 'O', alt: ['O'], note: 'Conventional spelling adds a silent "h"; rule-based RR gives "O".' },
    { hangul: '서', rr: 'Seo', mr: 'Sŏ', alt: [], note: 'Standard spellings for this surname.' },
    { hangul: '신', rr: 'Shin', mr: 'Sin', alt: ['Sin'], note: 'Conventional spelling; rule-based RR would give "Sin".' },
    { hangul: '권', rr: 'Kwon', mr: 'Kwŏn', alt: [], note: 'Standard spellings for this surname.' },
    { hangul: '황', rr: 'Hwang', mr: 'Hwang', alt: [], note: 'Rule-based output matches convention.' },
    { hangul: '안', rr: 'Ahn', mr: 'An', alt: ['An'], note: 'Conventional spelling adds a silent "h"; rule-based RR gives "An".' },
    { hangul: '송', rr: 'Song', mr: 'Song', alt: [], note: 'Rule-based output matches convention.' },
    { hangul: '전', rr: 'Jeon', mr: 'Chŏn', alt: ['Chun', 'Jun'], note: 'Standard spellings for this surname.' },
    { hangul: '홍', rr: 'Hong', mr: 'Hong', alt: [], note: 'Rule-based output matches convention.' },
    { hangul: '유', rr: 'Yoo', mr: 'Yu', alt: ['Yu', 'You'], note: 'Common conventional spelling alongside the rule-based "Yu".' },
    { hangul: '류', rr: 'Ryu', mr: 'Ryu', alt: ['Yoo', 'Yu'], note: 'Conventional spelling preserves the historical "R"; rule-based RR would give "Yu".' },
    { hangul: '고', rr: 'Ko', mr: 'Ko', alt: ['Go'], note: 'Conventional spelling; rule-based RR would give "Go".' },
    { hangul: '문', rr: 'Moon', mr: 'Mun', alt: ['Mun'], note: 'Conventional spelling; rule-based RR would give "Mun".' },
    { hangul: '양', rr: 'Yang', mr: 'Yang', alt: [], note: 'Rule-based output matches convention.' },
    { hangul: '손', rr: 'Son', mr: 'Son', alt: [], note: 'Rule-based output matches convention.' },
    { hangul: '배', rr: 'Bae', mr: 'Pae', alt: [], note: 'Standard spellings for this surname.' },
    { hangul: '백', rr: 'Baek', mr: 'Paek', alt: ['Back'], note: 'Standard spellings for this surname.' },
    { hangul: '허', rr: 'Heo', mr: 'Hŏ', alt: ['Huh'], note: 'Standard spellings for this surname.' },
    { hangul: '남', rr: 'Nam', mr: 'Nam', alt: [], note: 'Rule-based output matches convention.' },
    { hangul: '심', rr: 'Shim', mr: 'Sim', alt: ['Sim'], note: 'Conventional spelling; rule-based RR would give "Sim".' },
    { hangul: '노', rr: 'Noh', mr: 'No', alt: ['Roh', 'No'], note: 'Conventional spelling adds a silent "h"; rule-based RR gives "No".' },
    { hangul: '하', rr: 'Ha', mr: 'Ha', alt: [], note: 'Rule-based output matches convention.' },
    { hangul: '곽', rr: 'Kwak', mr: 'Kwak', alt: [], note: 'Rule-based output matches convention.' },
    { hangul: '성', rr: 'Sung', mr: 'Sŏng', alt: ['Seong'], note: 'Common conventional spelling alongside the rule-based "Seong".' },
    { hangul: '차', rr: 'Cha', mr: "Ch'a", alt: [], note: 'Standard spellings for this surname.' },
    { hangul: '주', rr: 'Joo', mr: 'Chu', alt: ['Ju'], note: 'Common conventional spelling alongside the rule-based "Ju".' },
    { hangul: '우', rr: 'Woo', mr: 'U', alt: ['U'], note: 'Conventional spelling; rule-based RR would give "U".' },
    { hangul: '구', rr: 'Koo', mr: 'Ku', alt: ['Gu', 'Ku'], note: 'Conventional spelling; rule-based RR would give "Gu".' },
    { hangul: '민', rr: 'Min', mr: 'Min', alt: [], note: 'Rule-based output matches convention.' },
    // Two-syllable (compound) surnames — used by name mode to split correctly.
    { hangul: '남궁', rr: 'Namgung', mr: 'Namgung', alt: ['Namkoong'], note: 'Two-syllable surname.' },
    { hangul: '황보', rr: 'Hwangbo', mr: 'Hwangbo', alt: [], note: 'Two-syllable surname.' },
    { hangul: '선우', rr: 'Seonu', mr: "Sŏnu", alt: ['Sunwoo', 'Seonwoo'], note: 'Two-syllable surname.' },
    { hangul: '제갈', rr: 'Jegal', mr: 'Chegal', alt: [], note: 'Two-syllable surname.' },
    { hangul: '독고', rr: 'Dokgo', mr: 'Tokko', alt: [], note: 'Two-syllable surname.' },
    { hangul: '사공', rr: 'Sagong', mr: 'Sagong', alt: [], note: 'Two-syllable surname.' },
    { hangul: '서문', rr: 'Seomun', mr: "Sŏmun", alt: [], note: 'Two-syllable surname.' },
    { hangul: '동방', rr: 'Dongbang', mr: 'Tongbang', alt: [], note: 'Two-syllable surname.' },
    { hangul: '태권도', rr: 'taekwondo', mr: "t'aekwŏndo", alt: ['taegwondo'], note: 'Conventional/IOC spelling; strict RR rules voice the ㄱ to give "taegwondo".' },
    // Words whose correct romanization depends on morpheme boundaries the
    // surface rule engine can't see (compound ㄴ-insertion, lexical irregulars).
    { hangul: '학여울', rr: 'Hangnyeoul', mr: "Hangnyŏul", alt: [], note: 'Compound ㄴ-insertion (학+여울); rules give "hagyeoul" via plain liaison.' },
    { hangul: '알약', rr: 'allyak', mr: 'allyak', alt: [], note: 'Compound ㄴ-insertion then ㄹ assimilation (알+약); rules give "aryak".' },
    { hangul: '꽃잎', rr: 'kkonnip', mr: 'kkonnip', alt: [], note: 'Compound ㄴ-insertion + nasalization (꽃+잎); rules give "kkochip".' },
    { hangul: '맨입', rr: 'maennip', mr: 'maennip', alt: [], note: 'Compound ㄴ-insertion (맨+입); rules give "maenip".' },
    { hangul: '색연필', rr: 'saengnyeonpil', mr: "saengnyŏnp'il", alt: [], note: 'Compound ㄴ-insertion + nasalization (색+연필); rules give "saegyeonpil".' },
    { hangul: '밟다', rr: 'bapda', mr: 'papta', alt: [], note: 'Lexical irregular: ㄼ surfaces as ㅂ here (cf. 여덟 → yeodeol); rules give "balda".' },
    { hangul: '신문로', rr: 'Sinmunno', mr: 'Sinmunno', alt: [], note: 'Compound 신문+로: ㄴ+ㄹ nasalizes to ㄴㄴ, not the usual ㄹㄹ of 신라 (Silla); rules give "sinmullo".' }
  ];

  // Build fast lookup maps in both directions.
  const byHangul = new Map();
  const byRoman = new Map(); // lowercased romanized form (rr, mr, and alts) -> entry
  for (const e of EXCEPTIONS) {
    byHangul.set(e.hangul, e);
    const forms = [e.rr, e.mr, ...(e.alt || [])];
    for (const f of forms) {
      if (f) byRoman.set(f.toLowerCase(), e);
    }
  }

  function lookupByHangul(word) {
    return byHangul.get(word) || null;
  }

  function lookupByRoman(word) {
    return byRoman.get((word || '').toLowerCase()) || null;
  }

  const api = { EXCEPTIONS, lookupByHangul, lookupByRoman };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.Exceptions = api;
})(typeof window !== 'undefined' ? window : globalThis);
