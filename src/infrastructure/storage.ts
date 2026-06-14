import type { AppState } from '../domain/types';

const STORAGE_KEY = 'myfinancetraining_v1';

export const loadState = (): AppState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppState;
  } catch {
    return null;
  }
};

export const saveState = (state: AppState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('localStorage save failed:', err);
  }
};
