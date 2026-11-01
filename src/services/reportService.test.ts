import { describe, it, expect } from 'vitest';
import {
  hypothesisStats, themeStats, statusTimeline, monthlyReview, toMarkdown,
} from './reportService';
import { makeHyp, makeState } from '../test/fixtures';

const log = (id: string, loggedAt: string, result: 'hit' | 'miss' | 'pending') => ({ id, loggedAt, result, note: '' });
const theme = (id: string, name: string) => ({ id, name, examples: [], description: '', positiveDrivers: [], negativeDrivers: [] });

const h1 = makeHyp({
  id: 'h-1', title: 'A', targetThemes: ['t1', 'ghost'],
  verificationLogs: [log('1', '2026-10-31', 'hit'), log('2', '2026-11-01', 'miss'), log('3', '2026-11-30', 'hit'), log('4', '2026-12-01', 'pending')],
  statusHistory: [
    { date: '2026-11-05', from: 'watching', to: 'adopted', reason: '根拠あり' },
    { date: '2026-12-01', from: 'adopted', to: 'rejected', reason: '崩れた' },
  ],
});
const h2 = makeHyp({ id: 'h-2', title: 'B', targetThemes: ['t1'], verificationLogs: [log('5', '2026-11-10', 'miss')] });
const state = makeState({ hypotheses: [h1, h2], themes: [theme('t1', '半導体')] });

describe('reportService', () => {
  it('hypothesisStats: 件数と的中率', () => {
    expect(hypothesisStats(h1)).toEqual({ hit: 2, miss: 1, pending: 1, hitRate: 2 / 3 });
  });
  it('hypothesisStats: 分母0は null', () => {
    expect(hypothesisStats(makeHyp()).hitRate).toBeNull();
    expect(hypothesisStats(makeHyp({ verificationLogs: [log('p', '2026-11-01', 'pending')] })).hitRate).toBeNull();
  });
  it('themeStats: 集計し存在しないテーマ id は除外', () => {
    const r = themeStats(state);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ name: '半導体', hypotheses: 2, hit: 2, miss: 2, hitRate: 0.5 });
  });
  it('statusTimeline: 新しい順', () => {
    const r = statusTimeline(state);
    expect(r.map(e => e.date)).toEqual(['2026-12-01', '2026-11-05']);
    expect(r[0]).toMatchObject({ hypothesisTitle: 'A', to: 'rejected', reason: '崩れた' });
  });
  it('monthlyReview: 月の境界', () => {
    expect(monthlyReview(state, '2026-11')).toMatchObject({ logs: 3, hit: 1, miss: 2, statusChanges: 1, adopted: 1, rejected: 0 });
    expect(monthlyReview(state, '2026-12')).toMatchObject({ logs: 1, statusChanges: 1, rejected: 1 });
    expect(monthlyReview(state, '2026-01').logs).toBe(0);
  });
  it('toMarkdown: 見出しと表', () => {
    const md = toMarkdown(state, '2026-11');
    expect(md).toContain('## 月次レビュー');
    expect(md).toContain('| 仮説 | 的中 | 外れ | 未判定 | 的中率 |');
    expect(md).toContain('| 半導体 | 2 | 2 | 2 | 50% |');
    expect(md).toContain('根拠あり');
  });
  it('toMarkdown: 履歴0件', () => {
    expect(toMarkdown(makeState(), '2026-11')).toContain('まだ採否の変更履歴はありません');
  });
});
