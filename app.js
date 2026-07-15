(function () {
  const input = document.getElementById('word-input');
  const hint = document.getElementById('input-hint');
  const pills = Array.from(document.querySelectorAll('.pill'));
  const bridgeSection = document.getElementById('bridge-section');
  const bridgeRow = document.getElementById('bridge-row');
  const outputs = document.getElementById('outputs');
  const rrText = document.getElementById('rr-text');
  const mrText = document.getElementById('mr-text');
  const notesStrip = document.getElementById('notes-strip');
  const notesList = document.getElementById('notes-list');

  let mode = 'hangul'; // 'hangul' | 'RR' | 'MR'

  const HINTS = {
    hangul: "Type a Hangul word or name. For compounds, mark the seam with a hyphen (e.g. 학-여울, 신문-로) to trigger ㄴ-insertion / boundary nasalization. Switch the pills above if you're typing romanized text instead.",
    name: "Type a full Korean name, e.g. 최서은. The first syllable is treated as the surname — spelled by convention when known (Choi, Park, Kim…) — and the given name follows after a space. For an unusual surname split, type a space to mark the boundary yourself (최 서은).",
    RR: 'Type Revised Romanization text (e.g. "gyeongbokgung"). Converting from romanized text is best-effort — see the notes below each result.',
    MR: "Type McCune\u2013Reischauer text, with apostrophes and breves if you have them (e.g. \"kyŏngbokkung\"). Converting from romanized text is best-effort \u2014 see the notes below each result."
  };

  pills.forEach(p => p.addEventListener('click', () => {
    pills.forEach(o => { o.classList.remove('active'); o.setAttribute('aria-checked', 'false'); });
    p.classList.add('active');
    p.setAttribute('aria-checked', 'true');
    mode = p.dataset.mode === 'hangul' ? 'hangul' : p.dataset.mode;
    hint.textContent = HINTS[mode];
    input.placeholder = mode === 'hangul' ? '한글 입력 — try 한국어, 경복궁, 신라...'
      : mode === 'name' ? '한국 이름 — try 최서은, 박진영, 홍길동...'
      : mode === 'RR' ? 'try hangugeo, gyeongbokgung, silla...'
      : "try han'gugŏ, kyŏngbokkung, silla...";
    render();
  }));

  function exceptionByHangul(word) {
    const hit = Exceptions.lookupByHangul(word);
    if (!hit) return null;
    return hit;
  }

  // Romanize an explicit Korean name (name mode). The user has declared this is
  // a name, so there are no false positives: the surname is split off (spelled
  // by convention when known, otherwise by rule), the given name is romanized
  // separately, and the two are joined with a space. Assimilation is not applied
  // across the surname/given-name boundary (한복남 -> Han Boknam, not Bongnam).
  // The boundary is taken from an explicit space if present, otherwise detected
  // from the surname dictionary (two-syllable compound surname first).
  function romanizeName(input) {
    const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
    // Per the NIKL personal-name rule, sound changes between the syllables of a
    // name are NOT reflected (홍빛나 -> Hong Bitna, 용래 -> Yongrae, not Yongnae).
    // nameMode keeps liaison (강철웅 -> Cheorung) but drops assimilation.
    const nameRom = (hangul, sys) => Romanize.romanize(hangul, sys, null, { nameMode: true }).text;
    input = (input || '').trim();
    // Not a Hangul name (empty, Latin, punctuation): romanize as plain text
    // rather than trying to split a surname off something that isn't one.
    if (!input || !Hangul.isHangulSyllable(Array.from(input)[0])) {
      return { hangul: input, rr: cap(Romanize.romanize(input, 'RR').text), mr: cap(Romanize.romanize(input, 'MR').text),
        notes: input ? ['Name mode expects a Hangul name — romanized as plain text.'] : [] };
    }
    let surnameHangul, givenHangul;
    const spaceIdx = input.search(/\s/);
    if (spaceIdx >= 0) {
      surnameHangul = input.slice(0, spaceIdx);
      givenHangul = input.slice(spaceIdx + 1).replace(/\s+/g, '');
    } else {
      const syl = Array.from(input);
      const first2 = syl.slice(0, 2).join('');
      // Use a known two-syllable (compound) surname whenever the first two
      // syllables match one — even with no given name (남궁 -> Namgung).
      const n = (syl.length >= 2 && Exceptions.lookupByHangul(first2)) ? 2 : 1;
      surnameHangul = syl.slice(0, n).join('');
      givenHangul = syl.slice(n).join('');
    }

    const exc = Exceptions.lookupByHangul(surnameHangul);
    const surRR = exc ? exc.rr : cap(nameRom(surnameHangul, 'RR'));
    const surMR = exc ? exc.mr : cap(nameRom(surnameHangul, 'MR'));
    const how = exc ? 'conventional spelling' : 'romanized by rule';

    if (!givenHangul) {
      return { hangul: surnameHangul, rr: surRR, mr: surMR, notes: [`Name mode: "${surnameHangul}" (${how}).`] };
    }
    const givRR = cap(nameRom(givenHangul, 'RR'));
    const givMR = cap(nameRom(givenHangul, 'MR'));
    return {
      hangul: surnameHangul + givenHangul,
      rr: surRR + ' ' + givRR,
      mr: surMR + ' ' + givMR,
      notes: [`Name mode: surname "${surnameHangul}" (${how}) + given name "${givenHangul}", each syllable romanized on its own per the name rule (no assimilation across syllables — 용래 → Yongrae).`]
    };
  }

  // Converts one space-free token into { hangul, rr, mr, notes }
  function convertToken(token, mode) {
    if (mode === 'hangul') {
      const exc = exceptionByHangul(token);
      if (exc) {
        return { hangul: token, rr: exc.rr, mr: exc.mr, notes: [`"${token}" matched the surname exceptions dictionary (${exc.note})`] };
      }
      const rr = Romanize.romanize(token, 'RR');
      const mr = Romanize.romanize(token, 'MR');
      return { hangul: token, rr: rr.text, mr: mr.text, notes: [...new Set([...rr.notes, ...mr.notes])] };
    }

    // Romanized input (RR or MR)
    const excByRoman = Exceptions.lookupByRoman(token);
    if (excByRoman) {
      return {
        hangul: excByRoman.hangul,
        rr: excByRoman.rr,
        mr: excByRoman.mr,
        notes: [`"${token}" matched the surname exceptions dictionary (${excByRoman.note})`]
      };
    }

    const d = Derromanize.derromanize(token, mode);
    if (!d.parsed) {
      return { hangul: token, rr: mode === 'RR' ? token : '', mr: mode === 'MR' ? token : '', notes: ['Could not parse this as ' + mode + ' text.'], warn: true };
    }
    const otherSystem = mode === 'RR' ? 'MR' : 'RR';
    const other = Romanize.romanize(d.text, otherSystem);
    const rr = mode === 'RR' ? token : other.text;
    const mr = mode === 'MR' ? token : other.text;
    return {
      hangul: d.text,
      rr, mr,
      notes: ['Reconstructed as ' + d.text + ' from the romanized text — this step is best-effort and can be ambiguous for words with sound-linking.'],
      warn: true
    };
  }

  function render() {
    const raw = input.value;
    if (!raw.trim()) {
      bridgeSection.hidden = true;
      outputs.hidden = true;
      notesStrip.hidden = true;
      return;
    }

    let hangulOut = '', rrOut = '', mrOut = '';
    const allNotes = [];
    let anyWarn = false;

    if (mode === 'name') {
      // A name is one logical unit — process the whole input, not word by word.
      const r = romanizeName(raw.trim());
      hangulOut = r.hangul; rrOut = r.rr; mrOut = r.mr;
      allNotes.push(...r.notes);
    } else {
      const words = raw.split(/(\s+)/);
      for (const w of words) {
        if (/^\s+$/.test(w) || w === '') { hangulOut += w; rrOut += w; mrOut += w; continue; }
        const result = convertToken(w, mode);
        hangulOut += result.hangul;
        rrOut += result.rr;
        mrOut += result.mr;
        allNotes.push(...result.notes);
        if (result.warn) anyWarn = true;
      }
    }

    // Syllable bridge: only meaningful when we have real Hangul to show
    const tokens = Hangul.decomposeWord(hangulOut);
    const hasHangul = tokens.some(t => t.hangul);
    if (hasHangul) {
      bridgeSection.hidden = false;
      bridgeRow.innerHTML = '';
      const rrFull = Romanize.romanize(hangulOut, 'RR');
      const mrFull = Romanize.romanize(hangulOut, 'MR');
      const rrByChar = new Map(rrFull.breakdown.map(b => [b.char, b.text]));
      const mrByChar = new Map(mrFull.breakdown.map(b => [b.char, b.text]));
      for (const t of tokens) {
        if (!t.hangul) continue;
        const rrSyl = rrByChar.get(t.char) || '';
        const mrSyl = mrByChar.get(t.char) || '';
        const el = document.createElement('div');
        el.className = 'bridge-syllable';
        el.innerHTML = `
          <div class="bridge-hangul">${t.char}</div>
          <div class="bridge-tick"></div>
          <div class="bridge-chip rr">${rrSyl}</div>
          <div class="bridge-chip mr">${mrSyl}</div>
        `;
        bridgeRow.appendChild(el);
      }
    } else {
      bridgeSection.hidden = true;
    }

    outputs.hidden = false;
    rrText.textContent = rrOut;
    mrText.textContent = mrOut;

    if (allNotes.length) {
      notesStrip.hidden = false;
      notesList.innerHTML = '';
      for (const n of allNotes) {
        const li = document.createElement('li');
        li.textContent = n;
        notesList.appendChild(li);
      }
    } else {
      notesStrip.hidden = true;
    }
  }

  let debounceTimer = null;
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(render, 90);
  });

  // ---- Copy buttons ----
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const target = document.getElementById(btn.dataset.target);
      try {
        await navigator.clipboard.writeText(target.textContent);
        const original = btn.textContent;
        btn.textContent = 'Copied';
        setTimeout(() => { btn.textContent = original; }, 1200);
      } catch (e) { /* clipboard unavailable, silently ignore */ }
    });
  });

  // ---- Exceptions browser ----
  const toggle = document.getElementById('exceptions-toggle');
  const wrap = document.getElementById('exceptions-wrap');
  const tbody = document.getElementById('exceptions-tbody');
  const countEl = document.getElementById('exceptions-count');

  countEl.textContent = Exceptions.EXCEPTIONS.length + ' entries';
  for (const e of Exceptions.EXCEPTIONS) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${e.hangul}</td><td>${e.rr}</td><td>${e.mr}</td><td>${(e.alt || []).join(', ')}</td>`;
    tbody.appendChild(tr);
  }

  toggle.addEventListener('click', () => {
    const isHidden = wrap.hidden;
    wrap.hidden = !isHidden;
    toggle.setAttribute('aria-expanded', String(isHidden));
  });

})();
