// Forward romanization engine.
// Resolves Korean consonant assimilation (liaison, nasalization, liquidization)
// at syllable boundaries, then maps the result to Revised Romanization (RR)
// and McCune-Reischauer (MR) in a single pass so both systems stay consistent
// with each other.
(function (global) {
  const Hangul = (typeof module !== 'undefined' && module.exports) ? require('./hangul.js') : global.Hangul;

  // ---- Letter tables -------------------------------------------------

  // Vowel (medial) romanization - context independent in both systems.
  const VOWEL_RR = {
    'ㅏ':'a','ㅐ':'ae','ㅑ':'ya','ㅒ':'yae','ㅓ':'eo','ㅔ':'e','ㅕ':'yeo','ㅖ':'ye',
    'ㅗ':'o','ㅘ':'wa','ㅙ':'wae','ㅚ':'oe','ㅛ':'yo','ㅜ':'u','ㅝ':'wo','ㅞ':'we',
    'ㅟ':'wi','ㅠ':'yu','ㅡ':'eu','ㅢ':'ui','ㅣ':'i'
  };
  const VOWEL_MR = {
    'ㅏ':'a','ㅐ':'ae','ㅑ':'ya','ㅒ':'yae','ㅓ':'ŏ','ㅔ':'e','ㅕ':'yŏ','ㅖ':'ye',
    'ㅗ':'o','ㅘ':'wa','ㅙ':'wae','ㅚ':'oe','ㅛ':'yo','ㅜ':'u','ㅝ':'wŏ','ㅞ':'we',
    'ㅟ':'wi','ㅠ':'yu','ㅡ':'ŭ','ㅢ':'ŭi','ㅣ':'i'
  };

  // Onset (initial) consonant romanization - used whenever a consonant is
  // acting as the front of a syllable (including via liaison).
  const ONSET_RR = {
    'ㄱ':'g','ㄲ':'kk','ㄴ':'n','ㄷ':'d','ㄸ':'tt','ㄹ':'r','ㅁ':'m','ㅂ':'b','ㅃ':'pp',
    'ㅅ':'s','ㅆ':'ss','ㅇ':'','ㅈ':'j','ㅉ':'jj','ㅊ':'ch','ㅋ':'k','ㅌ':'t','ㅍ':'p','ㅎ':'h'
  };
  const ONSET_MR = {
    'ㄱ':'k','ㄲ':'kk','ㄴ':'n','ㄷ':'t','ㄸ':'tt','ㄹ':'r','ㅁ':'m','ㅂ':'p','ㅃ':'pp',
    'ㅅ':'s','ㅆ':'ss','ㅇ':'','ㅈ':'ch','ㅉ':'tch','ㅊ':"ch'",'ㅋ':"k'",'ㅌ':"t'",'ㅍ':"p'",'ㅎ':'h'
  };
  // MR voices ㄱㄷㅂㅈ to g/d/b/j between voiced sounds (after a vowel, or
  // after ㄴ/ㄹ/ㅁ/ㅇ). RR does not voice initials this way.
  const MR_VOICED_ONSET = { 'ㄱ':'g','ㄷ':'d','ㅂ':'b','ㅈ':'j' };

  // Coda (final) consonant romanization, used when the consonant is NOT
  // followed by a vowel (i.e. followed by another consonant, or at the end
  // of the word) - both systems neutralize to the same unreleased-stop set.
  const CODA_RR = {
    'ㄱ':'k','ㄴ':'n','ㄷ':'t','ㄹ':'l','ㅁ':'m','ㅂ':'p','ㅇ':'ng'
  };
  const CODA_MR = {
    'ㄱ':'k','ㄴ':'n','ㄷ':'t','ㄹ':'l','ㅁ':'m','ㅂ':'p','ㅇ':'ng'
  };

  // Complex (double) batchim -> the single consonant that is actually
  // pronounced, used for neutralization before a consonant / word end.
  const COMPLEX_FINAL_SOUND = {
    'ㄳ':'ㄱ','ㄵ':'ㄴ','ㄶ':'ㄴ','ㄺ':'ㄱ','ㄻ':'ㅁ','ㄼ':'ㄹ','ㄽ':'ㄹ',
    'ㄾ':'ㄹ','ㄿ':'ㅂ','ㅀ':'ㄹ','ㅄ':'ㅂ'
  };
  // Single batchim that simplify to a representative class for neutralization
  const SIMPLE_FINAL_SOUND = {
    'ㄲ':'ㄱ','ㅋ':'ㄱ','ㅅ':'ㄷ','ㅆ':'ㄷ','ㅈ':'ㄷ','ㅊ':'ㄷ','ㅌ':'ㄷ','ㅎ':'ㄷ','ㅍ':'ㅂ'
  };
  // Complex batchim, when followed by a vowel-initial syllable, split: the
  // first consonant stays as the coda of the current syllable, the second
  // becomes the onset of the next (e.g. 닭이 -> dal-gi, not da-gi).
  // For ㄶ and ㅀ the trailing ㅎ deletes before a vowel, leaving a single
  // consonant (ㄴ/ㄹ) that then liaisons to the next onset — so nothing stays
  // as the coda (싫어 -> sireo, not sileo; 않은 -> aneun). The other clusters
  // keep their first consonant as the coda and move the second forward.
  const COMPLEX_FINAL_LIAISON_PAIRS = {
    'ㄳ':['ㄱ','ㅅ'], 'ㄵ':['ㄴ','ㅈ'], 'ㄶ':['', 'ㄴ'], 'ㄺ':['ㄹ','ㄱ'],
    'ㄻ':['ㄹ','ㅁ'], 'ㄼ':['ㄹ','ㅂ'], 'ㄽ':['ㄹ','ㅅ'], 'ㄾ':['ㄹ','ㅌ'],
    'ㄿ':['ㄹ','ㅍ'], 'ㅀ':['', 'ㄹ'], 'ㅄ':['ㅂ','ㅅ']
  };

  function neutralize(final) {
    if (!final) return '';
    if (COMPLEX_FINAL_SOUND[final]) return COMPLEX_FINAL_SOUND[final];
    if (SIMPLE_FINAL_SOUND[final]) return SIMPLE_FINAL_SOUND[final];
    return final; // already a simple class: ㄱㄴㄷㄹㅁㅂㅇ
  }

  // Returns [stay, link]: stay = consonant that remains as this syllable's
  // coda, link = consonant that becomes the next syllable's onset (or null
  // if nothing carries over, e.g. ㅎ deletes before a vowel suffix).
  function liaisonPair(final) {
    if (!final) return ['', null];
    if (final === 'ㅎ') return ['', null];
    if (final === 'ㅇ') return ['ㅇ', null]; // velar nasal /ŋ/ never moves; it stays as the coda (강아지 -> gangaji)
    if (COMPLEX_FINAL_LIAISON_PAIRS[final]) return COMPLEX_FINAL_LIAISON_PAIRS[final];
    return ['', final]; // simple jamo: the whole consonant moves to the next onset
  }

  const NASAL = { 'ㄴ':1, 'ㅁ':1, 'ㅇ':1 };
  const STOP_TO_NASAL = { 'ㄱ':'ㅇ', 'ㄷ':'ㄴ', 'ㅂ':'ㅁ' };

  // ---- Aspiration / palatalization tables -----------------------------
  // ㅎ-side aspiration: a final ㅎ (or the ㅎ in ㄶ/ㅀ) merges with a
  // following ㄱ/ㄷ/ㅈ to make it aspirated (좋고 -> joko, 낳지 -> nachi).
  const H_ASPIRATE_NEXT = { 'ㄱ':'ㅋ', 'ㄷ':'ㅌ', 'ㅈ':'ㅊ' };
  // What stays as the coda once that ㅎ has been absorbed.
  const H_FINAL_REMAINDER = { 'ㅎ':'', 'ㄶ':'ㄴ', 'ㅀ':'ㄹ' };
  // Stop-side aspiration: a stop coda ㄱ/ㄷ/ㅂ merges with a following ㅎ
  // to make an aspirated onset (축하 -> chuka, 잡혀 -> japyeo, 입학 -> ipak).
  const ASPIRATE_BEFORE_H = { 'ㄱ':'ㅋ', 'ㄷ':'ㅌ', 'ㅂ':'ㅍ' };
  // Complex-coda aspiration before ㅎ: the sonorant (ㄴ/ㄹ) stays as the coda
  // and the trailing obstruent merges with the ㅎ (밝히다 -> balkida,
  // 넓히다 -> neolpida, 앉히다 -> anchida). [staysAsCoda, aspiratedOnset]
  const ASPIRATE_H_COMPLEX = {
    'ㄺ':['ㄹ','ㅋ'], 'ㄼ':['ㄹ','ㅍ'], 'ㄵ':['ㄴ','ㅊ'], 'ㄾ':['ㄹ','ㅌ'], 'ㄿ':['ㄹ','ㅍ']
  };
  // Palatalization: a final ㄷ/ㅌ before the vowel 이 surfaces as ㅈ/ㅊ
  // (굳이 -> guji, 같이 -> gachi).
  const PALATALIZE = { 'ㄷ':'ㅈ', 'ㅌ':'ㅊ' };
  // Vowels (medials) that trigger compound ㄴ-insertion when they follow an
  // explicitly marked morpheme boundary: 이 and the y-glide vowels.
  const Y_INSERT = { 'ㅣ':1, 'ㅑ':1, 'ㅕ':1, 'ㅛ':1, 'ㅠ':1, 'ㅖ':1, 'ㅒ':1 };

  // ---- Assimilation pass ----------------------------------------------
  // Walks the decomposed syllable list and annotates each hangul token with
  // resolvedFinal (what actually gets romanized as the coda, '' if none)
  // and resolvedInitial (what actually gets romanized as the onset).
  function resolve(tokens, notes, nameMode) {
    notes = notes || [];
    const out = tokens.map(t => t.hangul ? Object.assign({}, t) : t);
    for (let i = 0; i < out.length; i++) {
      const cur = out[i];
      if (!cur.hangul) continue;
      cur.resolvedInitial = cur.initial;
      cur.resolvedFinal = cur.final;
    }
    for (let i = 0; i < out.length; i++) {
      const cur = out[i];
      if (!cur.hangul || !cur.final) continue;
      const next = out[i + 1];

      if (next && next.hangul) {
        // Name mode (NIKL personal-name rule): sound changes between name
        // syllables are not reflected. Keep liaison (강철웅 -> Cheorung) and
        // syllable-final neutralization (홍빛나 -> Bitna), but skip every
        // cross-consonant assimilation/aspiration (용래 -> Yongrae, not Yongnae).
        if (nameMode) {
          if (next.initial === 'ㅇ') {
            const [stay, link] = liaisonPair(cur.final);
            cur.resolvedFinal = stay;
            if (link) next.resolvedInitial = link;
          } else {
            cur.resolvedFinal = neutralize(cur.final);
          }
          continue;
        }

        // --- Explicit morpheme boundary (the user typed a hyphen) ---
        // Compounds need boundary information the surface jamo can't supply,
        // so we only apply these where the writer marked the seam.
        if (next.boundaryBefore) {
          // ㄴ-insertion: consonant-final element + 이/야/여/요/유/예 across the
          // seam inserts ㄴ (학-여울 -> hangnyeoul, 맨-입 -> maennip,
          // 알-약 -> allyak with the inserted ㄴ liquidized to ㄹ after ㄹ).
          if (cur.final && next.initial === 'ㅇ' && Y_INSERT[next.medial]) {
            const neut = neutralize(cur.final);
            if (cur.final === 'ㄹ' || neut === 'ㄹ') {
              cur.resolvedFinal = 'ㄹ';
              next.resolvedInitial = 'ㄹ';
            } else if (STOP_TO_NASAL[neut]) {
              cur.resolvedFinal = STOP_TO_NASAL[neut];
              next.resolvedInitial = 'ㄴ';
            } else {
              cur.resolvedFinal = neut;
              next.resolvedInitial = 'ㄴ';
            }
            notes.push(`Compound boundary before "${next.char}": ㄴ-insertion (ㄴ 첨가) applied.`);
            continue;
          }
          // Across a compound seam, ㄴ + ㄹ nasalizes to ㄴㄴ rather than
          // liquidizing to ㄹㄹ (신문-로 -> Sinmunno, not Sinmullo).
          if (cur.final === 'ㄴ' && next.initial === 'ㄹ') {
            cur.resolvedFinal = 'ㄴ';
            next.resolvedInitial = 'ㄴ';
            notes.push(`Compound boundary: ㄹ after ㄴ nasalized to ㄴ (not liquidized to ㄹㄹ).`);
            continue;
          }
        }

        // Palatalization: ㄷ/ㅌ + 이 -> ji/chi (굳이 -> guji, 같이 -> gachi).
        // ㄷ/ㅌ + 히 also palatalizes to 치 (굳히다 -> guchida), the ㅎ merging
        // in. Checked before plain liaison so the coda doesn't just link across.
        if (PALATALIZE[cur.final] && next.medial === 'ㅣ' && (next.initial === 'ㅇ' || next.initial === 'ㅎ')) {
          cur.resolvedFinal = '';
          next.resolvedInitial = next.initial === 'ㅎ' ? 'ㅊ' : PALATALIZE[cur.final];
          notes.push(`Assumed palatalization (ㄷ/ㅌ + 이 → j/ch), as in 굳이 → guji. This is right across a word+suffix seam; a single morpheme would keep …di/ti.`);
          continue;
        }

        if (next.initial === 'ㅇ') {
          // Liaison: current coda surfaces as the onset of the next syllable.
          // For complex batchim, the first consonant stays as this
          // syllable's coda and the second becomes the next onset.
          const [stay, link] = liaisonPair(cur.final);
          cur.resolvedFinal = stay;
          if (link) next.resolvedInitial = link;
          continue;
        }

        // ㅎ-side aspiration: final ㅎ (or the ㅎ in ㄶ/ㅀ) + ㄱ/ㄷ/ㅈ aspirates
        // the following onset and is itself absorbed (좋고 -> joko, 않다 -> anta).
        if (H_FINAL_REMAINDER[cur.final] !== undefined && H_ASPIRATE_NEXT[next.initial]) {
          cur.resolvedFinal = H_FINAL_REMAINDER[cur.final];
          next.resolvedInitial = H_ASPIRATE_NEXT[next.initial];
          continue;
        }
        // ㅎ + ㅅ: the ㅎ is absorbed and ㅅ stays (tensed, but tensification is
        // not written) — 좋습니다 -> joseumnida, 좋소 -> joso.
        if (H_FINAL_REMAINDER[cur.final] !== undefined && next.initial === 'ㅅ') {
          cur.resolvedFinal = H_FINAL_REMAINDER[cur.final];
          continue;
        }

        const neut = neutralize(cur.final);

        // ㅈ/ㅊ + ㅎ aspirate to ㅊ (맞히다 -> machida) rather than ㅌ, which
        // the plain ㄷ-neutralization below would otherwise produce.
        if (next.initial === 'ㅎ' && (cur.final === 'ㅈ' || cur.final === 'ㅊ')) {
          cur.resolvedFinal = '';
          next.resolvedInitial = 'ㅊ';
          continue;
        }
        // Complex coda + ㅎ: sonorant stays, trailing obstruent aspirates
        // (밝히다 -> balkida, 넓히다 -> neolpida, 앉히다 -> anchida).
        if (next.initial === 'ㅎ' && ASPIRATE_H_COMPLEX[cur.final]) {
          cur.resolvedFinal = ASPIRATE_H_COMPLEX[cur.final][0];
          next.resolvedInitial = ASPIRATE_H_COMPLEX[cur.final][1];
          continue;
        }
        // Stop-side aspiration: a stop coda ㄱ/ㄷ/ㅂ + ㅎ aspirates the onset
        // and absorbs the ㅎ (축하 -> chuka, 입학 -> ipak, 잡혀 -> japyeo).
        if (next.initial === 'ㅎ' && ASPIRATE_BEFORE_H[neut]) {
          cur.resolvedFinal = '';
          next.resolvedInitial = ASPIRATE_BEFORE_H[neut];
          continue;
        }
        if (cur.final === 'ㄺ' && next.initial === 'ㄱ') {
          // ㄺ keeps its ㄹ before a ㄱ ending (읽고 -> ilgo, 맑게 -> malge),
          // unlike its usual neutralization to ㄱ before other consonants
          // (읽다 -> ikda).
          cur.resolvedFinal = 'ㄹ';
        } else if (cur.final === 'ㄴ' && next.initial === 'ㄹ') {
          // 전라 -> Chŏlla / Jeolla
          cur.resolvedFinal = 'ㄹ';
          next.resolvedInitial = 'ㄹ';
          notes.push(`Assumed ㄴ + ㄹ → ㄹㄹ liquidization (신라 → Silla type). If this is a compound (e.g. 신문로), mark the seam with a hyphen — 신문-로 — for the …nn… reading.`);
        } else if (cur.final === 'ㄹ' && next.initial === 'ㄴ') {
          // 설날 -> Seollal
          next.resolvedInitial = 'ㄹ';
        } else if (NASAL[neut] === undefined && (next.initial === 'ㄴ' || next.initial === 'ㅁ') && STOP_TO_NASAL[neut]) {
          // 국민 -> gungmin, nasalization of a stop before ㄴ/ㅁ
          cur.resolvedFinal = STOP_TO_NASAL[neut];
        } else if (STOP_TO_NASAL[neut] && next.initial === 'ㄹ') {
          // 독립 -> dongnip, 합리 -> hamni: a stop before ㄹ nasalizes on
          // both sides — the stop becomes its matching nasal (ㄱ->ㅇ, ㄷ->ㄴ,
          // ㅂ->ㅁ) and the following ㄹ surfaces as ㄴ.
          cur.resolvedFinal = STOP_TO_NASAL[neut];
          next.resolvedInitial = 'ㄴ';
        } else if (NASAL[neut] && next.initial === 'ㄹ') {
          // 음료 -> eumnyo, ㄹ -> n after a nasal
          cur.resolvedFinal = neut;
          next.resolvedInitial = 'ㄴ';
        } else {
          cur.resolvedFinal = neut;
        }
      } else {
        // word boundary or punctuation follows: always neutralize
        cur.resolvedFinal = neutralize(cur.final);
      }
    }
    return out;
  }

  // ---- Mapping to letters ----------------------------------------------
  function renderInitial(jamo, system, afterVoiced) {
    if (jamo === 'ㅇ' || jamo === '') return '';
    if (system === 'RR') return ONSET_RR[jamo] !== undefined ? ONSET_RR[jamo] : jamo;
    // MR
    if (afterVoiced && MR_VOICED_ONSET[jamo]) return MR_VOICED_ONSET[jamo];
    return ONSET_MR[jamo] !== undefined ? ONSET_MR[jamo] : jamo;
  }

  function renderFinal(jamo, system) {
    if (!jamo) return '';
    const table = system === 'RR' ? CODA_RR : CODA_MR;
    return table[jamo] !== undefined ? table[jamo] : '';
  }

  function romanize(word, system, exceptionLookup, options) {
    if (exceptionLookup) {
      const hit = exceptionLookup(word, system);
      if (hit) return { text: hit, exact: true, notes: ['Matched exception dictionary entry.'], breakdown: [{ char: word, text: hit }] };
    }
    const nameMode = !!(options && options.nameMode);
    const rawTokens = Hangul.decomposeWord(word);
    // Pull explicit morpheme-boundary markers ("-") out of the stream and flag
    // the syllable that follows, so they steer the phonology (ㄴ-insertion,
    // compound ㄴㄹ) without ever being printed in the output.
    const tokens = [];
    let boundaryPending = false;
    for (const t of rawTokens) {
      if (!t.hangul && t.raw === '-') { boundaryPending = true; continue; }
      tokens.push(t.hangul && boundaryPending ? Object.assign({}, t, { boundaryBefore: true }) : t);
      boundaryPending = false;
    }

    const notes = [];
    const resolved = resolve(tokens, notes, nameMode);
    let result = '';
    let prevWasVoiced = false; // for MR voicing: vowel or sonorant before this syllable
    let prevFinal = '';        // resolvedFinal of the previous hangul syllable
    const breakdown = [];

    for (let i = 0; i < resolved.length; i++) {
      const t = resolved[i];
      if (!t.hangul) {
        result += t.raw;
        prevWasVoiced = false;
        prevFinal = '';
        continue;
      }

      let onsetLetter;
      if (t.resolvedInitial === 'ㄹ' && prevFinal === 'ㄹ') {
        // geminate ㄹㄹ is always "ll", regardless of which rule produced it
        onsetLetter = 'l';
      } else {
        onsetLetter = renderInitial(t.resolvedInitial, system, prevWasVoiced);
      }

      // MR convention: insert a syllable-separating apostrophe when a coda
      // "n" immediately precedes a velar onset, to avoid being misread as
      // the single digraph final "ng" (e.g. han'guk, not hanguk).
      let piece = '';
      if (system === 'MR' && prevFinal === 'ㄴ' && t.resolvedInitial === 'ㄱ') {
        result += "'";
        piece += "'";
      }

      const vowelLetter = (system === 'RR' ? VOWEL_RR : VOWEL_MR)[t.medial] || '';
      const finalLetter = renderFinal(t.resolvedFinal, system);

      if (t.resolvedInitial !== t.initial) notes.push(`Syllable "${t.char}": consonant assimilation applied before romanizing.`);
      if (t.resolvedFinal !== t.final && t.final) notes.push(`Syllable "${t.char}": final ${t.final} resolved to ${t.resolvedFinal || '(silent, linked forward)'}.`);

      piece += onsetLetter + vowelLetter + finalLetter;
      result += onsetLetter + vowelLetter + finalLetter;
      breakdown.push({ char: t.char, text: piece });

      // Determine voicing context for the *next* syllable (MR only cares,
      // but harmless either way): voiced if this syllable ends in a vowel
      // or a sonorant consonant (n, m, ng, l).
      const endsSonorant = t.resolvedFinal && ['ㄴ','ㅁ','ㅇ','ㄹ'].includes(t.resolvedFinal);
      prevWasVoiced = (!t.resolvedFinal) || endsSonorant;
      prevFinal = t.resolvedFinal;
    }
    return { text: result, exact: false, notes: [...new Set(notes)], breakdown };
  }

  const api = { romanize, resolve, neutralize, liaisonPair, VOWEL_RR, VOWEL_MR, ONSET_RR, ONSET_MR, CODA_RR, CODA_MR };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.Romanize = api;
})(typeof window !== 'undefined' ? window : globalThis);
