
import { safeParse, getIndexKey, getCapsuleKey, escapeHtml } from './storage.js';

/**
 * Render all capsules in the Library section
 */
export function renderLibrary() {
  const list = document.querySelector('#capsuleList');
  list.innerHTML = '';

  const idx = safeParse(localStorage.getItem(getIndexKey())) || [];
  if (!idx.length) {
    document.querySelector('#emptyLibrary').classList.remove('d-none');
    return;
  }
  document.querySelector('#emptyLibrary').classList.add('d-none');

  idx.forEach(entry => {
    const c = safeParse(localStorage.getItem(getCapsuleKey(entry.id)));
    if (!c) return;

    // Calculate quiz & flashcard stats
    const totalQuiz = c.quiz?.length || 0;
    const correctQuiz = parseInt(localStorage.getItem(`pc_quiz_${c.id}_score`) || '0', 10);
    const quizDone = Math.min(parseInt(localStorage.getItem(`pc_quiz_${c.id}`) || '0', 10), totalQuiz);
    const flashDone = Math.min(parseInt(localStorage.getItem(`pc_flash_${c.id}`) || '0', 10), c.flashcards?.length || 0);
    const progress = totalQuiz ? Math.round((correctQuiz / totalQuiz) * 100) : 0;

    // Build capsule card element
    const col = document.createElement('div');
    col.className = 'col-sm-6 col-md-4';
    col.innerHTML = `
      <div class="card p-3 h-100 shadow-sm d-flex flex-column">
        <h5>${escapeHtml(c.title)}</h5>
        <p class="text-muted small mb-1">
          ${escapeHtml(c.subject || "")} · <span class="badge ${escapeHtml(c.level || '')}">${escapeHtml(c.level || '')}</span>
        </p>
        <p class="small text-muted mb-2">Last updated: ${new Date(c.updatedAt).toLocaleDateString()}</p>
        <div class="progress mb-2" style="height:8px;">
          <div class="progress-bar bg-success" role="progressbar" style="width:${progress}%"></div>
        </div>
        <p class="small text-muted mb-1">
          Best Score: ${progress}% (${correctQuiz}/${totalQuiz})
          <span class="badge bg-success mb-2">Quiz answered: ${quizDone}/${totalQuiz}</span>
        </p>
        <p class="d-flex flex-wrap justify-content-between align-items-center mb-2 small text-muted">
          <span>Flashcards done: ${flashDone}/${c.flashcards?.length || 0}</span>
          <span class="text-success">✔ Know: ${parseInt(localStorage.getItem(`pc_flash_${c.id}_known`) || '0', 10)}</span>
          <span class="text-danger">❌ Don't Know: ${parseInt(localStorage.getItem(`pc_flash_${c.id}_unknown`) || '0', 10)}</span>
        </p>
        <div class="mt-auto d-flex gap-2 flex-wrap">
          <button class="btn btn-sm btn-primary flex-fill learnBtn" data-id="${c.id}">Learn</button>
          <button class="btn btn-sm btn-secondary flex-fill editBtn" data-id="${c.id}">Edit</button>
          <button class="btn btn-sm btn-warning flex-fill exportBtn" data-id="${c.id}">Export</button>
          <button class="btn btn-sm btn-danger flex-fill deleteBtn" data-id="${c.id}">Delete</button>
        </div>
      </div>
    `;
    list.appendChild(col);
  });

  // ---------- Event Listeners ----------
  // Learn button triggers Learn section
  document.querySelectorAll('.learnBtn').forEach(btn => btn.addEventListener('click', e => {
    const id = e.currentTarget.dataset.id;
    window.dispatchEvent(new CustomEvent('pc-learn', { detail: { id } }));
  }));

  // Edit button triggers Author section
  document.querySelectorAll('.editBtn').forEach(btn => btn.addEventListener('click', e => {
    const id = e.currentTarget.dataset.id;
    window.dispatchEvent(new CustomEvent('pc-edit', { detail: { id } }));
  }));

  // Export capsule to JSON
  document.querySelectorAll('.exportBtn').forEach(btn => btn.addEventListener('click', e => {
    const id = e.currentTarget.dataset.id;
    const raw = localStorage.getItem(getCapsuleKey(id));
    if (!raw) { alert('Capsule not found.'); return; }
    const c = safeParse(raw);
    if (!c) { alert('Invalid capsule data.'); return; }

    c.schema = 'pocket-classroom/v1';
    const blob = new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${(c.title || 'capsule').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,60) || 'capsule'}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }));

  // Delete capsule
  document.querySelectorAll('.deleteBtn').forEach(btn => btn.addEventListener('click', e => {
    const id = e.currentTarget.dataset.id;
    if (!confirm('Delete this capsule?')) return;
    window.dispatchEvent(new CustomEvent('pc-delete', { detail: { id } }));
  }));
}
