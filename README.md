# RR ↔ MR — Korean Romanization Converter

A small web app that converts single Korean words and names between
**Revised Romanization (RR)**, South Korea's official system since 2000,
and **McCune–Reischauer (MR)**, the 1939 academic standard.

Open `index.html` directly in a browser — no build step, no server required.

## How it works

1. **Hangul decomposition** (`js/hangul.js`) splits a word into its
   individual jamo (consonants/vowels) using Unicode code-point math.
2. **Forward engine** (`js/romanize.js`) walks the syllables and resolves
   the real Korean consonant-assimilation rules — liaison/sound-linking,
   nasalization, ㄴ+ㄹ/ㄹ+ㄴ → "ll" — before mapping the result to RR and MR
   letters in one consistent pass. This direction (Hangul → romanization)
   is the reliable one; it's deterministic and well-specified by both
   official systems.
3. **Reverse parser** (`js/derromanize.js`) takes romanized text and
   reconstructs a best-effort Hangul spelling, which then gets run back
   through the forward engine to produce the other system's spelling.
   **This direction is inherently lossy.** See Limitations below.
4. **Exceptions dictionary** (`js/exceptions.js`) is checked before either
   engine runs, for the common Korean surnames whose real-world spelling
   (passports, news) doesn't match what the plain rules would generate
   (e.g. 이 → "Lee", not the rule-based "I").

## Known limitations

- **Sound-linking is genuinely ambiguous in reverse.** "한국어" surfaces as
  "hangugeo" because the ㄱ batchim of 국 links forward into 어. Parsing
  "hangugeo" back into Hangul can't tell that apart from the unrelated
  word "한구거" — both produce the identical romanized surface form. The
  app will reconstruct *a* plausible Hangul spelling, flagged as
  best-effort, but it won't always be the one you started from.
- **MR's "kk"/"tt"/"pp"/"ss" are doubly ambiguous.** They can be a genuine
  tense consonant (아빠, "appa") or two plain consonants colliding at a
  syllable boundary (대학교 → "taehakkyo", where it's really ㄱ+ㄱ). The
  parser currently favors the tense-consonant reading. RR mostly avoids
  this problem because its onset and coda letters for ㄱ/ㄷ/ㅂ are visually
  distinct (g vs k, d vs t, b vs p), so romanized → Hangul is more
  reliable starting from RR text than from MR text.
- **Common single-syllable surnames double as ordinary words.** 한 is both
  the surname "Han" and the native word for "one." The exceptions
  dictionary matches on the whole word, so a name-shaped input gets the
  surname spelling even outside of a name context.
- **No proper-noun name segmentation.** A full name like 이순신 romanizes
  syllable-by-syllable; it won't automatically insert the surname/given-name
  space ("Yi Sun-sin").

For anything where the exact spelling matters, double-check against a
known source — and feel free to add entries to `js/exceptions.js`, which
is checked first.

## Extending the exceptions dictionary

Add an entry to the `EXCEPTIONS` array in `js/exceptions.js`:

```js
{ hangul: '윤', rr: 'Yoon', mr: 'Yun', alt: ['Yun'], note: 'why this is an exception' }
```

`alt` is used for matching alternate spellings when converting *from*
romanized text back to Hangul; `rr`/`mr` are the canonical spellings shown
in the output. Word-level matches only (not yet partial/substring matches
within a longer name).

## File structure

```
index.html         page structure
css/style.css       styling
js/hangul.js         Hangul ⇄ jamo decomposition/composition
js/romanize.js       Hangul → RR / MR (the reliable direction)
js/derromanize.js    RR or MR text → Hangul (best-effort)
js/exceptions.js     surname exceptions dictionary + lookup
js/app.js            UI wiring
```
