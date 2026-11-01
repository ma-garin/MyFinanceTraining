import type { AppState } from '../domain/types';
import { normalizeStepDepths } from '../domain/hypothesisRules';
import { todayStr } from '../utils/dateUtils';

export const STORAGE_KEY = 'myfinancetraining_v1';
export const CORRUPT_BACKUP_PREFIX = 'myfinancetraining_v1_corrupt_';

export type LoadResult =
  | { kind: 'empty' }
  | { kind: 'ok'; state: AppState }
  | { kind: 'corrupt'; raw: string; reason: string };

export const isValidState = (obj: unknown): obj is AppState =>
  obj != null &&
  typeof obj === 'object' &&
  'events'     in obj && Array.isArray((obj as AppState).events) &&
  'hypotheses' in obj && Array.isArray((obj as AppState).hypotheses) &&
  'themes'     in obj && Array.isArray((obj as AppState).themes);

const isRecord = (v: unknown): v is Record<string, unknown> => v != null && typeof v === 'object' && !Array.isArray(v);

// 参照整合性（存在しない eventId）と depth 重複（BUG-03 の既存データ）を読み込み時に補正する。
// null 要素や配列でない steps が残ると描画時に TypeError で白画面になるため、ここで除く
export const sanitizeState = (s: AppState): AppState => {
  const events = s.events.filter(e => isRecord(e) && typeof e.id === 'string');
  const eventIds = new Set(events.map(e => e.id));
  return {
    ...s,
    events,
    themes: s.themes.filter(isRecord),
    hypotheses: s.hypotheses.filter(h => isRecord(h) && typeof h.id === 'string').map(h => ({
      ...h,
      eventId: eventIds.has(h.eventId) ? h.eventId : '',
      associationSteps: normalizeStepDepths(Array.isArray(h.associationSteps) ? h.associationSteps.filter(isRecord) : []),
      invalidationConditions: Array.isArray(h.invalidationConditions) ? h.invalidationConditions : [],
    })),
  };
};

export const CURRENT_SCHEMA_VERSION = 2;

// version 無し（v0.x）は 1 とみなす。新しい版で書かれたデータは読めない項目を落とすと失うので拒否する
export const migrateState = (s: AppState): { ok: true; state: AppState } | { ok: false; reason: string } => {
  const v = typeof s.version === 'number' ? s.version : 1;
  if (v > CURRENT_SCHEMA_VERSION) return { ok: false, reason: `新しい版（v${v}）のデータのため読み込めません。アプリを更新してください` };
  const hypotheses = v < 2
    ? s.hypotheses.map(h => ({ ...h, statusHistory: Array.isArray(h.statusHistory) ? h.statusHistory : [] }))
    : s.hypotheses;
  return { ok: true, state: { ...s, version: CURRENT_SCHEMA_VERSION, hypotheses } };
};

export const parseStateJson = (raw: string): { ok: true; state: AppState } | { ok: false; reason: string } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'JSON として読み取れません' };
  }
  if (!isValidState(parsed)) return { ok: false, reason: 'データの形式が想定と異なります' };
  try {
    return migrateState(sanitizeState(parsed));
  } catch {
    return { ok: false, reason: 'データの形式が想定と異なります' };
  }
};

// 破損データを null 扱いにすると初期データで上書き保存されて消える。corrupt として呼び出し側に止めさせる（BUG-06）
export const loadState = (): LoadResult => {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { kind: 'corrupt', raw: '', reason: 'ブラウザの保存領域を読み取れません' };
  }
  if (!raw) return { kind: 'empty' };
  const r = parseStateJson(raw);
  return r.ok ? { kind: 'ok', state: r.state } : { kind: 'corrupt', raw, reason: r.reason };
};

// 起動時に読めなかった本体を、初期化の直前に読み直して退避する。undefined は読み取り不能
export const readRawState = (): string | null | undefined => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return undefined;
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

export const backupCorruptRaw = (raw: string, now: Date = new Date()): string | null => {
  const key = `${CORRUPT_BACKUP_PREFIX}${now.getTime()}`;
  try {
    localStorage.setItem(key, raw);
    return key;
  } catch (err) {
    console.error('corrupt backup failed:', err);
    return null;
  }
};

const downloadText = (text: string, filename: string): boolean => {
  try {
    const blob = new Blob([text], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('download failed:', err);
    return false;
  }
};

export const exportStateAsJson = (state: AppState): boolean =>
  downloadText(JSON.stringify(state, null, 2), `myfinancetraining-${todayStr()}.json`);

export const downloadCorruptRaw = (raw: string): boolean =>
  downloadText(raw, `myfinancetraining-corrupt-${todayStr()}.json`);

export const importStateFromJson = (
  file: File,
  onSuccess: (s: AppState) => void,
  onError: (msg: string) => void,
): void => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target?.result;
    if (typeof text !== 'string') { onError('ファイルを読み取れませんでした'); return; }
    const r = parseStateJson(text);
    if (r.ok) onSuccess(r.state); else onError(r.reason);
  };
  reader.onerror = () => onError('ファイルを読み取れませんでした');
  reader.readAsText(file);
};
