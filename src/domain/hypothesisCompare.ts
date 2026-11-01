import type { Hypothesis, HypothesisStatus } from './types';

export type CompareKey = 'title' | 'status' | 'themes' | 'depth' | 'verify' | 'rate' | 'updated';
export type SortDir = 'asc' | 'desc';
export type CompareFilter = { status: HypothesisStatus | ''; theme: string };

export type CompareRow = {
  id: string;
  title: string;
  status: HypothesisStatus;
  themes: string[];
  depth: number;
  hit: number;
  miss: number;
  pending: number;
  hitRate: number | null;
  updatedAt: string;
};

// 検討の進み具合の順に並べる（表示ラベルの五十音順では意味のある並びにならないため）
const STATUS_ORDER: Record<HypothesisStatus, number> = { needs_test: 0, watching: 1, adopted: 2, rejected: 3 };

// 仮説には更新日時の項目が無いので、採否の履歴と検証ログの日付のうち最も新しいものを使う
export function lastUpdated(h: Hypothesis): string {
  const dates = [
    ...(h.statusHistory ?? []).map(c => c.date.slice(0, 10)),
    ...(h.verificationLogs ?? []).map(l => l.loggedAt.slice(0, 10)),
  ];
  return dates.reduce((max, d) => (d > max ? d : max), '');
}

export function filterRows(rows: readonly CompareRow[], f: CompareFilter): CompareRow[] {
  return rows.filter(r => (!f.status || r.status === f.status) && (!f.theme || r.themes.includes(f.theme)));
}

const compareBy = (key: CompareKey, a: CompareRow, b: CompareRow): number => {
  switch (key) {
    case 'title': return a.title.localeCompare(b.title, 'ja');
    case 'status': return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    case 'themes': return a.themes.join('、').localeCompare(b.themes.join('、'), 'ja');
    case 'depth': return a.depth - b.depth;
    case 'verify': return a.hit - b.hit || a.hit + a.miss + a.pending - (b.hit + b.miss + b.pending);
    case 'rate': return (a.hitRate ?? 0) - (b.hitRate ?? 0);
    case 'updated': return a.updatedAt.localeCompare(b.updatedAt);
  }
};

// 値が無い行（的中率が出せない・日付が無い・テーマ無し）は昇順でも降順でも末尾に置き、比べられる行を先に見せる
const isBlank = (key: CompareKey, r: CompareRow): boolean =>
  (key === 'rate' && r.hitRate === null) || (key === 'updated' && !r.updatedAt) || (key === 'themes' && r.themes.length === 0);

export function sortRows(rows: readonly CompareRow[], key: CompareKey, dir: SortDir): CompareRow[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const ba = isBlank(key, a), bb = isBlank(key, b);
    if (ba !== bb) return ba ? 1 : -1;
    return sign * compareBy(key, a, b) || a.title.localeCompare(b.title, 'ja');
  });
}

export function themeOptions(rows: readonly CompareRow[]): string[] {
  return [...new Set(rows.flatMap(r => r.themes))].sort((a, b) => a.localeCompare(b, 'ja'));
}

export const nextSort = (cur: { key: CompareKey; dir: SortDir }, key: CompareKey): { key: CompareKey; dir: SortDir } =>
  cur.key === key ? { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' };
