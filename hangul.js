// Hangul syllable decomposition / composition utilities
(function (global) {
  const HANGUL_BASE = 0xAC00;
  const HANGUL_LAST = 0xD7A3;

  const INITIALS = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const MEDIALS = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  // index 0 = no final
  const FINALS = ['', 'ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

  function isHangulSyllable(ch) {
    if (!ch) return false;
    const code = ch.codePointAt(0);
    return code >= HANGUL_BASE && code <= HANGUL_LAST;
  }

  function decomposeSyllable(ch) {
    const code = ch.codePointAt(0) - HANGUL_BASE;
    const initial = Math.floor(code / (21 * 28));
    const medial = Math.floor((code % (21 * 28)) / 28);
    const final = code % 28;
    return { initial: INITIALS[initial], medial: MEDIALS[medial], final: FINALS[final] };
  }

  function composeSyllable(initial, medial, final) {
    const i = INITIALS.indexOf(initial);
    const m = MEDIALS.indexOf(medial);
    const f = FINALS.indexOf(final || '');
    if (i < 0 || m < 0 || f < 0) return null;
    const code = HANGUL_BASE + (i * 21 + m) * 28 + f;
    return String.fromCodePoint(code);
  }

  // Splits a string into an array of tokens: hangul syllables become
  // { hangul: true, initial, medial, final }, everything else (spaces,
  // punctuation, latin letters) becomes { hangul: false, raw: ch }
  function decomposeWord(word) {
    const tokens = [];
    for (const ch of word) {
      if (isHangulSyllable(ch)) {
        tokens.push(Object.assign({ hangul: true, char: ch }, decomposeSyllable(ch)));
      } else {
        tokens.push({ hangul: false, raw: ch });
      }
    }
    return tokens;
  }

  function composeWord(tokens) {
    return tokens.map(t => t.hangul ? composeSyllable(t.initial, t.medial, t.final) : t.raw).join('');
  }

  const api = { INITIALS, MEDIALS, FINALS, isHangulSyllable, decomposeSyllable, composeSyllable, decomposeWord, composeWord };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.Hangul = api;
})(typeof window !== 'undefined' ? window : globalThis);
