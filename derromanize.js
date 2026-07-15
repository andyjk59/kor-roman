// De-romanization: best-effort parse of RR or MR text back into Hangul.
//
// IMPORTANT LIMITATION: romanized Korean is not always uniquely invertible.
// Sound-linking (liaison) means several different underlying Hangul spellings
// can produce the same romanized surface form (e.g. RR "mina" could be 미나
// or 민아). This parser uses the most common syllabification pattern
// (single consonant between vowels = onset of the following syllable; two
// consonants = coda + onset split) which is correct for the large majority
// of ordinary words and names, but is not guaranteed for every input.
(function (global) {
  const Hangul = (typeof module !== 'undefined' && module.exports) ? require('./hangul.js') : global.Hangul;

  // Vowel units, longest-match-first.
  const VOWEL_UNITS_RR = [
    ['yae','ㅒ'],['wae','ㅙ'],['yeo','ㅕ'],
    ['eo','ㅓ'],['eu','ㅡ'],['ya','ㅑ'],['wa','ㅘ'],['oe','ㅚ'],['yo','ㅛ'],
    ['wo','ㅝ'],['we','ㅞ'],['wi','ㅟ'],['yu','ㅠ'],['ui','ㅢ'],['ye','ㅖ'],['ae','ㅐ'],
    ['a','ㅏ'],['e','ㅔ'],['i','ㅣ'],['o','ㅗ'],['u','ㅜ']
  ];
  const VOWEL_UNITS_MR = [
    ['yae','ㅒ'],['wae','ㅙ'],['yŏ','ㅕ'],
    ['ŏ','ㅓ'],['ŭi','ㅢ'],['ŭ','ㅡ'],['ya','ㅑ'],['wa','ㅘ'],['oe','ㅚ'],['yo','ㅛ'],
    ['wŏ','ㅝ'],['we','ㅞ'],['wi','ㅟ'],['yu','ㅠ'],['ye','ㅖ'],['ae','ㅐ'],
    ['a','ㅏ'],['e','ㅔ'],['i','ㅣ'],['o','ㅗ'],['u','ㅜ']
  ];

  // Onset consonant units, longest-match-first. Both unvoiced and voiced
  // surface spellings map back to the same underlying jamo where relevant.
  const ONSET_UNITS_RR = [
    ['kk','ㄲ'],['tt','ㄸ'],['pp','ㅃ'],['ss','ㅆ'],['jj','ㅉ'],['ch','ㅊ'],
    ['g','ㄱ'],['n','ㄴ'],['d','ㄷ'],['r','ㄹ'],['m','ㅁ'],['b','ㅂ'],['s','ㅅ'],
    ['j','ㅈ'],['k','ㅋ'],['t','ㅌ'],['p','ㅍ'],['h','ㅎ']
  ];
  const ONSET_UNITS_MR = [
    ["ch'",'ㅊ'],["k'",'ㅋ'],["t'",'ㅌ'],["p'",'ㅍ'],
    ['kk','ㄲ'],['tt','ㄸ'],['pp','ㅃ'],['ss','ㅆ'],['tch','ㅉ'],['ch','ㅈ'],
    ['g','ㄱ'],['k','ㄱ'],['n','ㄴ'],['d','ㄷ'],['t','ㄷ'],['r','ㄹ'],['m','ㅁ'],
    ['b','ㅂ'],['p','ㅂ'],['s','ㅅ'],['j','ㅈ'],['h','ㅎ']
  ];

  // Coda (final) units, longest-match-first - identical surface set in both systems.
  const CODA_UNITS = [
    ['ng','ㅇ'],['k','ㄱ'],['n','ㄴ'],['t','ㄷ'],['l','ㄹ'],['m','ㅁ'],['p','ㅂ']
  ];

  function matchExact(str, units) {
    for (const [s, jamo] of units) {
      if (s === str) return jamo;
    }
    return null;
  }

  function matchLongest(str, pos, units) {
    for (const [s, jamo] of units) {
      if (str.startsWith(s, pos)) return { jamo, len: s.length };
    }
    return null;
  }

  // Splits a medial consonant run (between two vowels) into a coda for the
  // preceding syllable and an onset for the following one. Tries the
  // smallest coda first (maximal-onset preference) and only grows it when
  // the remainder can't be consumed as a single clean onset unit. This is
  // what correctly turns "ng" in "hanguk" into coda-n + onset-g, while still
  // turning "ng" in "gangnam" (run "ngn") into coda-ng + onset-n.
  function splitConsonantRun(run, ONSETS) {
    // codaLen 0: try the whole run as one onset unit first.
    const whole = matchExact(run, ONSETS);
    if (whole !== null) return { coda: '', onset: whole };

    for (let codaLen = 1; codaLen <= run.length; codaLen++) {
      const codaStr = run.slice(0, codaLen);
      const codaJamo = matchExact(codaStr, CODA_UNITS);
      if (codaJamo === null) continue;
      const remainder = run.slice(codaLen);
      if (remainder === '') return { coda: codaJamo, onset: 'ㅇ' };
      const onsetJamo = matchExact(remainder, ONSETS);
      if (onsetJamo !== null) return { coda: codaJamo, onset: onsetJamo };
    }
    // Nothing clean matched - fall back to treating it all as an onset
    // via longest-prefix match so we still produce *something*.
    const fallback = matchLongest(run, 0, ONSETS);
    return { coda: '', onset: fallback ? fallback.jamo : 'ㅇ' };
  }

  // Parses one "word" (no spaces) of romanized text into a sequence of
  // {initial, medial, final} syllable descriptors. Returns null if no vowel
  // could be found at all (e.g. the token is punctuation).
  function parseWord(word, system) {
    const w = word; // assume already lowercase, MR diacritics preserved
    const VOWELS = system === 'RR' ? VOWEL_UNITS_RR : VOWEL_UNITS_MR;
    const ONSETS = system === 'RR' ? ONSET_UNITS_RR : ONSET_UNITS_MR;

    // Step 1: find all vowel matches left-to-right to segment the string
    // into consonant-run / vowel pairs.
    const pieces = []; // { type:'vowel', jamo, start, end } or consonant runs computed after
    let i = 0;
    const vowelSpans = [];
    while (i < w.length) {
      const v = matchLongest(w, i, VOWELS);
      if (v) {
        vowelSpans.push({ start: i, end: i + v.len, jamo: v.jamo });
        i += v.len;
      } else {
        i++;
      }
    }
    if (vowelSpans.length === 0) return null;

    const syllables = [];
    for (let s = 0; s < vowelSpans.length; s++) {
      const vSpan = vowelSpans[s];
      const prevVEnd = s === 0 ? 0 : vowelSpans[s - 1].end;
      const runStart = prevVEnd;
      const runEnd = vSpan.start;
      const run = w.slice(runStart, runEnd);

      let onsetJamo = 'ㅇ';
      let prevFinalJamo = '';

      if (s === 0) {
        // word-initial consonant run (if any) is entirely the onset
        if (run.length > 0) {
          onsetJamo = matchExact(run, ONSETS);
          if (onsetJamo === null) {
            const m = matchLongest(run, 0, ONSETS);
            onsetJamo = m ? m.jamo : 'ㅇ';
          }
        }
      } else if (run.length > 0) {
        // Explicit MR syllable-separator apostrophe (not an aspiration
        // marker, since aspiration apostrophes are consumed as part of the
        // onset unit match below): split coda | onset right at it.
        const apIdx = run.indexOf("'");
        const isAspirationMark = apIdx > 0 && (
          run.slice(Math.max(0, apIdx - 2), apIdx + 1) === "ch'" ||
          ['k', 't', 'p'].includes(run[apIdx - 1])
        );
        if (system === 'MR' && apIdx > 0 && !isAspirationMark) {
          const codaPart = run.slice(0, apIdx);
          const onsetPart = run.slice(apIdx + 1);
          prevFinalJamo = matchExact(codaPart, CODA_UNITS) || '';
          onsetJamo = (onsetPart.length ? matchExact(onsetPart, ONSETS) : null) || 'ㅇ';
        } else {
          const split = splitConsonantRun(run, ONSETS);
          prevFinalJamo = split.coda;
          onsetJamo = split.onset;
        }
      }

      if (prevFinalJamo && syllables.length > 0) {
        syllables[syllables.length - 1].final = prevFinalJamo;
      }
      syllables.push({ initial: onsetJamo, medial: vSpan.jamo, final: '' });
    }

    // word-final consonant run becomes the coda of the last syllable
    const lastVEnd = vowelSpans[vowelSpans.length - 1].end;
    const tail = w.slice(lastVEnd);
    if (tail.length > 0) {
      const exact = matchExact(tail, CODA_UNITS);
      if (exact !== null) {
        syllables[syllables.length - 1].final = exact;
      } else {
        const cm = matchLongest(tail, 0, CODA_UNITS);
        if (cm) syllables[syllables.length - 1].final = cm.jamo;
      }
    }

    return syllables;
  }

  // Converts romanized text (RR or MR) into a best-effort Hangul string.
  // Words are split on whitespace; punctuation/hyphens are passed through.
  function derromanize(text, system) {
    const words = text.split(/(\s+)/); // keep separators
    let out = '';
    let anyParsed = false;
    for (const w of words) {
      if (/^\s+$/.test(w) || w.length === 0) { out += w; continue; }
        const cleanedWord = w.replace(/[.,!?;:]+$/, '');
        const trailing = w.slice(cleanedWord.length);
        const syllables = parseWord(cleanedWord.toLowerCase(), system);
        if (!syllables) { out += w; continue; }
        anyParsed = true;
        for (const syl of syllables) {
          const ch = Hangul.composeSyllable(syl.initial, syl.medial, syl.final);
          out += ch || '?';
        }
        out += trailing;
    }
    return { text: out, parsed: anyParsed };
  }

  const api = { derromanize, parseWord };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.Derromanize = api;
})(typeof window !== 'undefined' ? window : globalThis);
