
// ---------- Schema Version ----------
// Unique identifier for Pocket Classroom JSON schema
export const SCHEMA_ID = "pocket-classroom/v1";

/* ---------- Utility Helpers ---------- */
// Shortcut for document.querySelector
export const q = s => document.querySelector(s);
// Shortcut for document.querySelectorAll converted to array
export const qa = s => Array.from(document.querySelectorAll(s));

/**
 * Converts ISO date string to human-readable "time ago"
 * e.g., "5m", "2h", "3d"
 */
export function timeAgo(iso){
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if(mins < 1) return 'just now';
    if(mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if(hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  } catch(e) { 
    return ''; 
  }
}

/**
 * Safely parse JSON string, return null if invalid
 */
export function safeParse(s){
  try { return JSON.parse(s); } catch(e) { return null; }
}

/* ---------- Escape Helpers ---------- */
/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(s){
  if(!s && s !== 0) return '';
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#39;');
}

/**
 * Escape attribute values for HTML
 */
export function escapeAttr(s){
  if(!s && s !== 0) return '';
  return String(s).replaceAll('"','&quot;').replaceAll("'",'&#39;');
}

/* ---------- Storage Key Helpers ---------- */
export function getIndexKey(){ return 'pc_capsules_index'; }
export function getCapsuleKey(id){ return `pc_capsule_${id}`; }
export function getProgressKey(id){ return `pc_progress_${id}`; }

/* ---------- Index and Capsule Operations ---------- */
/**
 * Ensure the capsule index exists in localStorage
 */
export function ensureIndex(){
  if(!localStorage.getItem(getIndexKey())){
    localStorage.setItem(getIndexKey(), JSON.stringify([], null, 2));
  }
}

/**
 * Get the capsule index array
 */
export function getIndex(){
  return safeParse(localStorage.getItem(getIndexKey())) || [];
}

/**
 * Save the capsule index to localStorage
 */
export function saveIndex(idx){
  localStorage.setItem(getIndexKey(), JSON.stringify(idx, null, 2));
}

/**
 * Save a capsule object to localStorage and update index
 * Expects capsule.id to exist
 */
export function saveCapsuleObj(capsule){
  localStorage.setItem(getCapsuleKey(capsule.id), JSON.stringify(capsule, null, 2));
  
  // Update index, keep newest first
  let idx = getIndex();
  idx = idx.filter(i => i.id !== capsule.id);
  idx.unshift({
    id: capsule.id,
    title: capsule.title,
    subject: capsule.subject || '',
    level: capsule.level || '',
    updatedAt: capsule.updatedAt || new Date().toISOString()
  });
  saveIndex(idx);
}

/**
 * Load capsule object by ID
 */
export function loadCapsule(id){
  return safeParse(localStorage.getItem(getCapsuleKey(id)));
}

/**
 * Delete capsule and all related progress from localStorage
 */
export function deleteCapsuleStorage(id){
  localStorage.removeItem(getCapsuleKey(id));
  localStorage.removeItem(`pc_flash_${id}`);
  localStorage.removeItem(`pc_quiz_${id}`);
  localStorage.removeItem(getProgressKey(id));
  localStorage.removeItem(`pc_quiz_best_${id}`);
  
  // Remove from index
  let idx = getIndex();
  idx = idx.filter(i => i.id !== id);
  saveIndex(idx);
}

/* ---------- Progress Helpers ---------- */
/**
 * Update progress percentage (0-100)
 */
export function updateProgress(id, value){
  const v = Math.min(Math.round(value), 100);
  localStorage.setItem(getProgressKey(id), String(v));
}

/**
 * Get progress percentage (0-100)
 */
export function getProgress(id){
  return parseInt(localStorage.getItem(getProgressKey(id)) || '0', 10);
}

/* ---------- Flash & Quiz Counts ---------- */
/**
 * Get number of completed flashcards (bounded by total)
 */
export function getFlashDone(id){
  const c = loadCapsule(id);
  const total = c?.flashcards?.length || 0;
  const done = parseInt(localStorage.getItem(`pc_flash_${id}`) || '0', 10);
  return Math.min(done, total);
}

/**
 * Get number of completed quiz questions (bounded by total)
 */
export function getQuizDone(id){
  const c = loadCapsule(id);
  const total = c?.quiz?.length || 0;
  const done = parseInt(localStorage.getItem(`pc_quiz_${id}`) || '0', 10);
  return Math.min(done, total);
}

/**
 * Get part of quiz progress (0-50) for combined progress calculation
 */
export function getQuizProgressPart(id){
  const qDone = parseInt(localStorage.getItem(`pc_quiz_${id}`) || '0',10);
  const c = loadCapsule(id);
  const total = c?.quiz?.length || 0;
  return total ? Math.round((qDone / total) * 50) : 0;
}
