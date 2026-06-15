import type { AppState } from '../domain/types';

const STORAGE_KEY = 'myfinancetraining_v1';

// Type guard to prevent crash on corrupted or old-schema localStorage data
const isValidState = (obj: unknown): obj is AppState =>
  obj != null &&
  typeof obj === 'object' &&
  'events'     in obj && Array.isArray((obj as AppState).events) &&
  'hypotheses' in obj && Array.isArray((obj as AppState).hypotheses) &&
  'themes'     in obj && Array.isArray((obj as AppState).themes);

// Remove dangling eventId references (C-3: reference integrity)
const sanitizeState = (s: AppState): AppState => {
  const eventIds = new Set(s.events.map(e => e.id));
  return {
    ...s,
    hypotheses: s.hypotheses.map(h => ({
      ...h,
      eventId: eventIds.has(h.eventId) ? h.eventId : '',
    })),
  };
};

export const loadState = (): AppState | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidState(parsed)) return null;
    return sanitizeState(parsed);
  } catch {
    return null;
  }
};

export const saveState = (state: AppState): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.error('localStorage save failed:', err);
    return false;
  }
};

export const exportStateAsJson = (state: AppState): void => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `myfinancetraining-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const importStateFromJson = (
  file: File,
  onSuccess: (s: AppState) => void,
  onError: (msg: string) => void,
): void => {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed: unknown = JSON.parse(e.target?.result as string);
      if (!isValidState(parsed)) { onError('無効なファイル形式です'); return; }
      onSuccess(sanitizeState(parsed));
    } catch {
      onError('JSONの解析に失敗しました');
    }
  };
  reader.readAsText(file);
};
