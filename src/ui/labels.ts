import type {
  EventCategory, HypothesisStatus, HypothesisUrgency, VerificationLogResult,
} from '../domain/types';

// 表示ラベル・色の単一の出所。画面ごとに表記が揺れていた（BUG 由来の Step8）
export const CATEGORY_LABELS: Record<EventCategory, string> = {
  geopolitics:   '地政学',
  macro:         'マクロ',
  commodity:     'コモディティ',
  semiconductor: '半導体',
  currency:      '為替',
  consumer:      '消費者',
  other:         'その他',
};

export const CATEGORY_OPTIONS = (Object.keys(CATEGORY_LABELS) as EventCategory[])
  .map(value => ({ value, label: CATEGORY_LABELS[value] }));

export const categoryLabel = (c: string): string =>
  (CATEGORY_LABELS as Record<string, string>)[c] ?? c;

export const STATUS_LABELS: Record<HypothesisStatus, string> = {
  adopted:    '採用',
  watching:   '様子見',
  rejected:   '棄却',
  needs_test: '要検証',
};

export const STATUS_ICONS: Record<HypothesisStatus, string> = {
  adopted:    '✓',
  watching:   '👁',
  rejected:   '✕',
  needs_test: '🧪',
};

export const STATUS_COLOR: Record<HypothesisStatus, string> = {
  adopted:    '#16a34a',
  watching:   '#d97706',
  rejected:   '#dc2626',
  needs_test: '#7c3aed',
};

export const statusWithIcon = (s: HypothesisStatus): string => `${STATUS_ICONS[s]} ${STATUS_LABELS[s]}`;

export const URGENCY_LABELS: Record<HypothesisUrgency, string> = {
  high:   '🔴 今週中',
  medium: '🟡 今月中',
  low:    '🔵 長期',
};

export const DIRECTION_LABELS: Record<string, string> = {
  up:    '↑ 上昇',
  down:  '↓ 下落',
  mixed: '↔ 混在',
  watch: '? 様子見',
};

export const VLOG_LABELS: Record<VerificationLogResult, string> = {
  hit:     '✓ 的中',
  miss:    '✕ 外れ',
  pending: '⏳ 様子見',
};
