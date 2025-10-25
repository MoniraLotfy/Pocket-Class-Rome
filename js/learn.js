
import { safeParse, getCapsuleKey, escapeHtml } from './storage.js';

let learnState = null; // current learning session

/* ---------- Keyboard Shortcuts ---------- */
document.addEventListener('keydown', e => {
  const tag = document.activeElement.tagName;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

  const learnSection = document.querySelector('#learn');
  if (!learnSection || learnSection.classList.contains('d-none')) return;

  if (e.code === 'Space') {
    e.preventDefault();
    const fcTab = document.querySelector('#flashcardsTab.show') || document.querySelector('#flashcardsTab:not(.d-none)');
    const inner = fcTab?.querySelector('.flashcard-inner');
    if (inner) inner.classList.toggle('flipped'); // flip current flashcard
    return;
  }

  const tabKeys = { '[': 'notesTab', ']': 'flashcardsTab', '\\': 'quizTab' };
  if (tabKeys[e.key]) {
    e.preventDefault();
    const btn = document.querySelector(`#learn .nav-link[data-tab="${tabKeys[e.key]}"]`);
    if (btn) btn.click(); // switch active tab
  }
});

/* ---------- Render Learn Dropdown ---------- */
export function renderLearnDropdown() {
  const learnHeader = document.querySelector('#learnHeader');
  let select = document.querySelector('#learnSelect');

  if (!select) {
    select = document.createElement('select');
    select.className = 'form-select mb-2';
    select.id = 'learnSelect';
    select.setAttribute('aria-label', 'Select capsule to learn');
    learnHeader.insertBefore(select, learnHeader.firstChild);
    select.addEventListener('change', () => learnCapsule(select.value)); // load selected capsule
  }

  const idx = safeParse(localStorage.getItem('pc_capsules_index')) || [];
  select.innerHTML = '<option value="">-- Select Capsule --</option>' +
    idx.map(i => {
      const c = safeParse(localStorage.getItem(getCapsuleKey(i.id))) || { title: i.title || '(untitled)' };
      return `<option value="${i.id}">${escapeHtml(c.title)}</option>`;
    }).join('');
}

/* ---------- Load Capsule for Learning ---------- */
export function learnCapsule(id) {
  if (!id) { alert('Please select a capsule first!'); return; }

  const c = safeParse(localStorage.getItem(getCapsuleKey(id)));
  if (!c) { alert('Capsule not found'); return; }

  const savedFlash = parseInt(localStorage.getItem(`pc_flash_${c.id}`) || '0', 10);
  const savedQuiz = parseInt(localStorage.getItem(`pc_quiz_${c.id}`) || '0', 10);
  const savedScore = parseInt(localStorage.getItem(`pc_quiz_${c.id}_score`) || savedQuiz, 10);

  learnState = { capsule: c, fi: savedFlash, qi: savedQuiz, score: savedScore };

  document.querySelector('#learnTitle').textContent = c.title || '';
  document.querySelector('#learnSubject').textContent = c.subject || '';
  const lvl = document.querySelector('#learnLevel');
  lvl.textContent = c.level || '';
  lvl.className = 'badge ' + (c.level || 'Beginner'); // set level badge

  if (!document.querySelector('#learnShortcuts')) {
    const div = document.createElement('div');
    div.id = 'learnShortcuts';
    div.className = 'small text-muted mb-2';
    div.innerHTML = `⬜ <b>Space:</b> Flip flashcard &nbsp; | &nbsp;
      <b>[ / ]:</b> Switch Notes ↔ Flashcards ↔ Quiz &nbsp; | &nbsp;
      <b>\\</b>: Go to Quiz`; // keyboard hints
    document.querySelector('#learnHeader').appendChild(div);
  }

  renderNotes(); // display notes
  renderFlash(); // display flashcards
  renderQuiz(); // display quiz

  window.dispatchEvent(new CustomEvent('pc-show-section', { detail: { id: 'learn' } }));
  const learnNavBtn = document.querySelector('#learn .nav-link[data-tab="notesTab"]');
  showLearnTab('notesTab', learnNavBtn || document.querySelector('#learn .nav-link')); // default tab

  updateLearnStats(); // refresh stats
}

/* ---------- Render Notes ---------- */
function renderNotes() {
  const s = learnState;
  const container = document.querySelector('#notesTab');
  if (!s || !s.capsule) return;

  container.innerHTML = (s.capsule.notes?.length) ?
    `<ol>${s.capsule.notes.map(n => `<li>${escapeHtml(n)}</li>`).join('')}</ol>` :
    '<p class="text-muted">No notes</p>'; // notes list or placeholder
}

/* ---------- Render Flashcards ---------- */
export function renderFlash() {
  const s = learnState;
  const container = document.querySelector('#flashcardsTab');
  if (!s || !s.capsule) return;

  const fc = s.capsule.flashcards || [];
  const fcLength = fc.length;

  let doneMap = safeParse(localStorage.getItem(`pc_flash_${s.capsule.id}_done`)) || [];
  doneMap = Array(fcLength).fill().map((_, i) => doneMap[i] || false);

  const doneCount = doneMap.filter(d => d).length;

  if (doneCount >= fcLength) {
    container.innerHTML = "<p class='text-success text-center'>✅ All flashcards done!</p>";
    localStorage.setItem(`pc_flash_${s.capsule.id}`, fcLength);
    localStorage.removeItem(`pc_flash_${s.capsule.id}_done`);
    updateLearnStats();
    return; 
  }

  const front = escapeHtml(fc[s.fi]?.front || '');
  const back = escapeHtml(fc[s.fi]?.back || '');
  container.innerHTML = `
    <div class="flashcard" tabindex="0">
      <div class="flashcard-inner">
        <div class="flashcard-front">${front}</div>
        <div class="flashcard-back">${back}</div>
      </div>
    </div>
  `; // display current flashcard

  // ---------- Navigation ----------
  const navDiv = document.createElement('div');
  navDiv.className = 'd-flex justify-content-between my-2';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'btn btn-sm btn-warning';
  prevBtn.textContent = '  Prev⏪ ';
  prevBtn.disabled = (s.fi === 0);
  prevBtn.addEventListener('click', () => { if (s.fi > 0) { s.fi--; renderFlash(); updateLearnStats(); } }); // prev card

  const flipBtn = document.createElement('button');
  flipBtn.className = 'btn btn-sm btn-primary d-md-none';
  flipBtn.textContent = '🔄';
  flipBtn.addEventListener('click', () => { container.querySelector('.flashcard-inner')?.classList.toggle('flipped'); }); // mobile flip

  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn btn-sm btn-success';
  nextBtn.textContent = ' ⏩ Next';
  nextBtn.disabled = (s.fi >= fcLength - 1);
  nextBtn.addEventListener('click', () => { if (s.fi < fcLength - 1) { s.fi++; renderFlash(); updateLearnStats(); } }); // next card

  navDiv.append(prevBtn, flipBtn, nextBtn);
  container.appendChild(navDiv);

  // ---------- I Know / I Don't Know ----------
  const actionDiv = document.createElement('div');
  actionDiv.className = 'd-flex justify-content-center gap-2 mb-2 flashcard-action';

  const knowBtn = document.createElement('button');
  knowBtn.className = 'btn btn-sm btn-success';
  knowBtn.textContent = "I Know";
  knowBtn.addEventListener('click', () => { markFlash('known'); }); // mark known

  const dontKnowBtn = document.createElement('button');
  dontKnowBtn.className = 'btn btn-sm btn-warning';
  dontKnowBtn.textContent = "I Don't Know";
  dontKnowBtn.addEventListener('click', () => { markFlash('unknown'); }); // mark unknown

  actionDiv.append(knowBtn, dontKnowBtn);
  container.appendChild(actionDiv);

  /* ---------- Flashcard Manager ---------- */
  function markFlash(type) {
    const key = `pc_flash_${s.capsule.id}_${type}`;
    const prev = parseInt(localStorage.getItem(key) || '0', 10);
    localStorage.setItem(key, prev + 1); // increment count

    doneMap[s.fi] = true;
    localStorage.setItem(`pc_flash_${s.capsule.id}_done`, JSON.stringify(doneMap));

    let nextIndex = doneMap.findIndex((d, i) => !d && i > s.fi);
    if (nextIndex === -1) nextIndex = doneMap.findIndex(d => !d);

    if (nextIndex === -1) {
      container.innerHTML = "<p class='text-success text-center'>✅ All flashcards done!</p>";
      localStorage.setItem(`pc_flash_${s.capsule.id}`, fcLength);
      localStorage.removeItem(`pc_flash_${s.capsule.id}_done`);
      updateLearnStats();
      return;
    }

    s.fi = nextIndex;
    localStorage.setItem(`pc_flash_${s.capsule.id}`, s.fi);
    renderFlash();
    updateLearnStats();
  }
}

/* ---------- Render Quiz ---------- */
export function renderQuiz() {
  const s = learnState;
  const container = document.querySelector('#quizTab');
  if (!s || !s.capsule) return;

  const quiz = s.capsule.quiz || [];
  if (!quiz.length) { container.innerHTML = "<p class='text-muted'>No quiz questions.</p>"; return; }

  if (s.qi >= quiz.length) {
    const scorePercent = Math.round((s.score / quiz.length) * 100);
    container.innerHTML = `<h5>✅ Quiz Finished!</h5><p>Your score: <b>${s.score}/${quiz.length}</b> (${scorePercent}%)</p>`;
    localStorage.setItem(`pc_quiz_${s.capsule.id}`, quiz.length);
    localStorage.setItem(`pc_quiz_${s.capsule.id}_score`, s.score);
    return;
  }

  const qObj = quiz[s.qi];
  const choices = [...qObj.choices].slice(0, 4);
  while (choices.length < 4) choices.push('');

  container.innerHTML = `<p><b>Q${s.qi + 1}:</b> ${escapeHtml(qObj.q || '(empty)')}</p>` +
    choices.map(ch => `<button class="btn btn-outline-primary w-100 mb-2 choice-btn">${escapeHtml(ch || '(empty)')}</button>`).join('');

  container.querySelectorAll('.choice-btn').forEach((btn, i) => {
    btn.addEventListener('click', () => {
      const correctIndex = Math.min(qObj.correct || 0, 3);
      btn.classList.remove('btn-outline-primary');
      if (i === correctIndex) {
        btn.classList.add('btn-success'); // correct answer
        s.score++;
      } else {
        btn.classList.add('btn-danger'); // wrong answer
        const all = container.querySelectorAll('.choice-btn');
        if (all[correctIndex]) all[correctIndex].classList.add('btn-success'); // show correct
      }
      localStorage.setItem(`pc_quiz_${s.capsule.id}`, s.qi + 1);
      localStorage.setItem(`pc_quiz_${s.capsule.id}_score`, s.score);
      setTimeout(() => { s.qi++; renderQuiz(); updateLearnStats(); }, 600);
    });
  });
}

/* ---------- Tab Switching ---------- */
export function showLearnTab(id, btn) {
  document.querySelectorAll('#learn .tab-pane').forEach(p => p.classList.remove('show', 'active'));
  const pane = document.querySelector(`#${id}`);
  if (pane) pane.classList.add('show', 'active'); // activate tab
  document.querySelectorAll('#learn .nav-link').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active'); // highlight button
}

/* ---------- Update Stats ---------- */
export function updateLearnStats() {
  const s = learnState;
  if (!s) return;

  const flashDone = parseInt(localStorage.getItem(`pc_flash_${s.capsule.id}_known`) || '0', 10) +
                    parseInt(localStorage.getItem(`pc_flash_${s.capsule.id}_unknown`) || '0', 10);
  const quizDone = Math.min(parseInt(localStorage.getItem(`pc_quiz_${s.capsule.id}`) || '0', 10), s.capsule.quiz?.length || 0);

  let statsDiv = document.querySelector('#learnStats');
  if (!statsDiv) {
    statsDiv = document.createElement('div');
    statsDiv.id = 'learnStats';
    statsDiv.className = 'small text-muted';
    document.querySelector('#learnHeader').appendChild(statsDiv);
  }

  statsDiv.innerHTML = `Flashcards done: ${flashDone}/${s.capsule.flashcards?.length || 0} | Quiz answered: ${quizDone}/${s.capsule.quiz?.length || 0}`; // display stats
}

/* ---------- Export ---------- */
export { learnCapsule as loadCapsuleForLearn };
