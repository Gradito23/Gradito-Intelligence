/** Persist chef intake form draft in sessionStorage for same-tab navigation. */

const STORAGE_KEY = 'gradito_intake_draft';

export function loadIntakeDraft() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveIntakeDraft(form) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  } catch {
    // Quota or private mode — ignore
  }
}

export function clearIntakeDraft() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
