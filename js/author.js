

import { safeParse, getCapsuleKey, getIndexKey, SCHEMA_ID } from './storage.js';

/* ---------- Helper Functions ---------- */
/**
 * Escape double quotes for use in input values
 */
export function escapeAttr(s=''){ 
  return s.replace(/"/g,'&quot;'); 
}

/* ---------- Flashcard Row ---------- */
/**
 * Add a new flashcard row in the author form
 * @param {string} front - Text for front of flashcard
 * @param {string} back - Text for back of flashcard
 */
export function addFlashcardRow(front = '', back = ''){
  const div = document.createElement('div');
  div.className = 'row g-2 mb-2 flashcard-row align-items-center';
  div.innerHTML = `
    <div class="col-md-5"><input class="form-control fc-front" placeholder="Front" value="${escapeAttr(front)}" /></div>
    <div class="col-md-5"><input class="form-control fc-back" placeholder="Back" value="${escapeAttr(back)}" /></div>
    <div class="col-md-2"><button type="button" class="btn btn-sm btn-danger remove-fc" aria-label="Remove flashcard">X</button></div>
  `;
  div.querySelector('.remove-fc').addEventListener('click', ()=>div.remove());
  document.querySelector('#flashcardsContainer').appendChild(div);
}

/* ---------- Quiz Row ---------- */
/**
 * Add a new quiz question row in the author form
 * @param {string} qText - Question text
 * @param {Array} choices - Array of 4 choices
 * @param {number} correct - Index of correct choice (0-3)
 */
export function addQuizRow(qText = '', choices = [], correct = 0){
  const div = document.createElement('div');
  div.className = 'card card-body mb-2 quiz-block';
  const name = 'r'+Date.now()+Math.floor(Math.random()*1000); // Unique radio group
  div.innerHTML = `
    <input class="form-control quiz-q mb-2" placeholder="Question" value="${escapeAttr(qText)}" />
    ${[0,1,2,3].map(i=>`
      <div class="input-group mb-1">
        <span class="input-group-text">${String.fromCharCode(65+i)}</span>
        <input class="form-control quiz-choice" value="${escapeAttr(choices[i]||'')}" />
        <div class="input-group-text"><input type="radio" name="${name}" ${i===correct ? 'checked' : ''} aria-label="Select correct answer"></div>
      </div>
    `).join('')}
    <div class="d-flex justify-content-end"><button type="button" class="btn btn-sm btn-danger delete-question">Delete Question</button></div>
  `;
  div.querySelector('.delete-question').addEventListener('click', ()=>div.remove());
  document.querySelector('#quizContainer').appendChild(div);
}

/* ---------- Initialize Author Handlers ---------- */
/**
 * Initialize all event listeners for the author section
 */
export function initAuthorHandlers(){

  /* ---------- Edit Capsule ---------- */
  window.addEventListener('pc-edit', e=>{
    const id = e.detail.id;
    const c = safeParse(localStorage.getItem(getCapsuleKey(id)));
    if(!c){ alert('Capsule not found'); return; }

    // Populate author form fields
    document.querySelector('#editingId').value = c.id;
    document.querySelector('#title').value = c.title || '';
    document.querySelector('#subject').value = c.subject || '';
    document.querySelector('#level').value = c.level || 'Beginner';
    document.querySelector('#notes').value = (c.notes || []).join('\n');
    document.querySelector('#extraField').value = c.extraField || ''; // Additional field

    // Populate flashcards
    const flashContainer = document.querySelector('#flashcardsContainer');
    flashContainer.innerHTML = '';
    (c.flashcards || []).forEach(f => addFlashcardRow(f.front, f.back));

    // Populate quiz questions
    const quizContainer = document.querySelector('#quizContainer');
    quizContainer.innerHTML = '';
    (c.quiz || []).forEach(qb => addQuizRow(qb.q, qb.choices, qb.correct));

    window.dispatchEvent(new CustomEvent('pc-show-section', { detail: { id: 'author' } }));
  });

  /* ---------- Save Capsule ---------- */
  const form = document.querySelector('#authorForm');
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const id = document.querySelector('#editingId').value || 'c_' + Date.now();
    const capsule = {
      id,
      title: document.querySelector('#title').value.trim(),
      subject: document.querySelector('#subject').value.trim(),
      level: document.querySelector('#level').value,
      notes: document.querySelector('#notes').value.split("\n").map(s=>s.trim()).filter(Boolean),
      extraField: document.querySelector('#extraField').value.trim(), // Store additional field
      flashcards: Array.from(document.querySelectorAll('#flashcardsContainer .row')).map(r=>{
        const inputs = r.querySelectorAll('input.form-control');
        return { front: (inputs[0]?.value||'').trim(), back: (inputs[1]?.value||'').trim() };
      }).filter(fc=>fc.front || fc.back),
      quiz: Array.from(document.querySelectorAll('#quizContainer .card')).map(card=>{
        const qIn = card.querySelector('.quiz-q');
        const choices = Array.from(card.querySelectorAll('.quiz-choice')).map(inp=>inp.value.trim());
        let correct = 0;
        card.querySelectorAll('input[type=radio]').forEach((r,i)=>{ if(r.checked) correct=i; });
        return { q: qIn.value.trim(), choices, correct };
      }).filter(qo=>qo.q || qo.choices.some(c=>c)),
      updatedAt: new Date().toISOString(),
      schema: SCHEMA_ID
    };

    // Validation
    if(!capsule.title){
      alert('Title is required.'); return;
    }
    if(!capsule.notes.length && !capsule.flashcards.length && !capsule.quiz.length){
      alert('Please add at least one of Notes, Flashcards or Quiz.'); return;
    }

    // Save capsule
    localStorage.setItem(getCapsuleKey(capsule.id), JSON.stringify(capsule, null, 2));

    // Update index
    let idx = safeParse(localStorage.getItem(getIndexKey())) || [];
    idx = idx.filter(i => i.id !== capsule.id);
    idx.unshift({ id: capsule.id, title: capsule.title, subject: capsule.subject, level: capsule.level, updatedAt: capsule.updatedAt });
    localStorage.setItem(getIndexKey(), JSON.stringify(idx, null, 2));

    alert('Saved!');
    window.dispatchEvent(new CustomEvent('pc-saved', { detail: { id: capsule.id } }));
  });

  /* ---------- Add/Cancel Buttons ---------- */
  // Reattach add flashcard button to avoid duplicate listeners
  const addFCBtn = document.querySelector('#addFlashcardBtn');
  addFCBtn.replaceWith(addFCBtn.cloneNode(true));
  document.querySelector('#addFlashcardBtn').addEventListener('click', ()=>addFlashcardRow());

  // Reattach add quiz button
  const addQuizBtn = document.querySelector('#addQuizBtn');
  addQuizBtn.replaceWith(addQuizBtn.cloneNode(true));
  document.querySelector('#addQuizBtn').addEventListener('click', ()=>addQuizRow());

  // Cancel author editing
  const cancelBtn = document.querySelector('#cancelAuthorBtn');
  cancelBtn.replaceWith(cancelBtn.cloneNode(true));
  document.querySelector('#cancelAuthorBtn').addEventListener('click', ()=> 
    window.dispatchEvent(new CustomEvent('pc-show-section', { detail:{ id:'library' } }))
  );
}
