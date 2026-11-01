import type { AppState, Hypothesis, HypothesisStatus } from '../domain/types';
import { STATUS_LABELS } from '../ui/labels';

export type HypothesisStat = { hit: number; miss: number; pending: number; hitRate: number | null };
export type ThemeStat = { themeId: string; name: string; hypotheses: number; hit: number; miss: number; hitRate: number | null };
export type TimelineEntry = { hypothesisTitle: string; date: string; from: HypothesisStatus; to: HypothesisStatus; reason: string };
export type MonthlyReview = { month: string; logs: number; hit: number; miss: number; statusChanges: number; adopted: number; rejected: number };

// 分母0を 0% と誤読させないため null を返す
const rate = (hit: number, miss: number): number | null =>
  hit + miss === 0 ? null : hit / (hit + miss);

export function hypothesisStats(h: Hypothesis): HypothesisStat {
  const logs = h.verificationLogs ?? [];
  const hit = logs.filter(l => l.result === 'hit').length;
  const miss = logs.filter(l => l.result === 'miss').length;
  const pending = logs.filter(l => l.result === 'pending').length;
  return { hit, miss, pending, hitRate: rate(hit, miss) };
}

export function themeStats(state: AppState): ThemeStat[] {
  return state.themes.map(t => {
    const linked = state.hypotheses.filter(h => h.targetThemes.includes(t.id));
    const stats = linked.map(hypothesisStats);
    const hit = stats.reduce((a, s) => a + s.hit, 0);
    const miss = stats.reduce((a, s) => a + s.miss, 0);
    return { themeId: t.id, name: t.name, hypotheses: linked.length, hit, miss, hitRate: rate(hit, miss) };
  });
}

export function statusTimeline(state: AppState): TimelineEntry[] {
  return state.hypotheses
    .flatMap(h => (h.statusHistory ?? []).map(c => ({
      hypothesisTitle: h.title, date: c.date, from: c.from, to: c.to, reason: c.reason,
    })))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function monthlyReview(state: AppState, month: string): MonthlyReview {
  const logs = state.hypotheses
    .flatMap(h => h.verificationLogs ?? [])
    .filter(l => l.loggedAt.startsWith(month));
  const changes = statusTimeline(state).filter(c => c.date.startsWith(month));
  return {
    month,
    logs: logs.length,
    hit: logs.filter(l => l.result === 'hit').length,
    miss: logs.filter(l => l.result === 'miss').length,
    statusChanges: changes.length,
    adopted: changes.filter(c => c.to === 'adopted').length,
    rejected: changes.filter(c => c.to === 'rejected').length,
  };
}

export const formatRate = (r: number | null): string => (r === null ? '-' : `${Math.round(r * 100)}%`);

const cell = (s: string): string => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');

export function toMarkdown(state: AppState, month: string): string {
  const m = monthlyReview(state, month);
  const lines: string[] = [
    `# レポート ${month}`,
    '',
    '## 月次レビュー',
    `- 検証ログ: ${m.logs} 件（的中 ${m.hit} / 外れ ${m.miss}）`,
    `- ステータス変更: ${m.statusChanges} 件（採用 ${m.adopted} / 棄却 ${m.rejected}）`,
    '',
    '## 仮説別成績',
    '| 仮説 | 的中 | 外れ | 未判定 | 的中率 |',
    '| --- | --- | --- | --- | --- |',
    ...state.hypotheses.map(h => {
      const s = hypothesisStats(h);
      return `| ${cell(h.title)} | ${s.hit} | ${s.miss} | ${s.pending} | ${formatRate(s.hitRate)} |`;
    }),
    '',
    '## テーマ別成績',
    '| テーマ | 仮説数 | 的中 | 外れ | 的中率 |',
    '| --- | --- | --- | --- | --- |',
    ...themeStats(state).map(t =>
      `| ${cell(t.name)} | ${t.hypotheses} | ${t.hit} | ${t.miss} | ${formatRate(t.hitRate)} |`),
    '',
    '## 採否履歴',
  ];
  const timeline = statusTimeline(state);
  if (timeline.length === 0) {
    lines.push('まだ採否の変更履歴はありません');
  } else {
    lines.push('| 日付 | 仮説 | 変更 | 理由 |', '| --- | --- | --- | --- |');
    timeline.forEach(c => lines.push(
      `| ${c.date.slice(0, 10)} | ${cell(c.hypothesisTitle)} | ${STATUS_LABELS[c.from]} → ${STATUS_LABELS[c.to]} | ${cell(c.reason)} |`));
  }
  return lines.join('\n') + '\n';
}
