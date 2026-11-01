import { describe, it, expect } from 'vitest';
import { buildDraft, mergeDraft, reapplyDraft, emptySteps, type DraftFields, type DraftSource } from './hypothesisDraft';
import type { MarketEvent } from './types';

const event: MarketEvent = { id: 'E1', title: '中東で紛争', category: 'geopolitics', occurredAt: '2026-01-01', summary: '原油供給不安' };
const source: DraftSource = {
  steps: [{ label: 'A', reason: 'ra' }, { label: 'B', reason: 'rb' }],
  themes: ['原油', '防衛', 'ゲーム'],
  candidateStocks: ['1605 INPEX'],
  invalidationConditions: ['停戦', '原油安'],
};
const blank: DraftFields = { title: '', steps: emptySteps(), targetThemes: '', candidateStocks: '', invalidationConditions: '' };

describe('buildDraft', () => {
  it('テンプレートからタイトル・5 行のステップ・テーマ・失敗条件を組み立てる', () => {
    const d = buildDraft(event, source);
    expect(d.title).toBe('中東で紛争 → 原油・防衛への波及（仮説）');
    expect(d.steps).toHaveLength(5);
    expect(d.steps[1]).toEqual({ label: 'B', reason: 'rb' });
    expect(d.steps[4]).toEqual({ label: '', reason: '' });
    expect(d.targetThemes).toBe('原油, 防衛, ゲーム');
    expect(d.candidateStocks).toBe('1605 INPEX');
    expect(d.invalidationConditions).toBe('停戦\n原油安');
  });

  it('テンプレートが無いときはイベント名をステップ1に入れる', () => {
    const d = buildDraft(event);
    expect(d.title).toBe('中東で紛争 からの連想（仮説）');
    expect(d.steps[0].label).toBe('中東で紛争');
    expect(d.invalidationConditions).toBe('');
  });

  it('元のテンプレートを変更しない', () => {
    const d = buildDraft(event, source);
    d.steps[0].label = 'X';
    expect(source.steps[0].label).toBe('A');
  });
});

describe('mergeDraft', () => {
  it('空のフォームには下書きをすべて入れる', () => {
    const next = buildDraft(event, source);
    expect(mergeDraft(blank, null, next)).toEqual(next);
  });

  it('手で書いたタイトルとステップは残し、前回の下書きのままの欄は差し替える', () => {
    const prev = buildDraft(event);
    const current: DraftFields = { ...prev, title: '自分で書いた仮説', steps: [{ label: '手入力', reason: '' }, ...emptySteps().slice(1)] };
    const next = buildDraft(event, source);
    const merged = mergeDraft(current, prev, next);
    expect(merged.title).toBe('自分で書いた仮説');
    expect(merged.steps[0].label).toBe('手入力');
    expect(merged.targetThemes).toBe(next.targetThemes);
  });

  it('前回の下書きのままのステップは差し替える', () => {
    const prev = buildDraft(event);
    const merged = mergeDraft(prev, prev, buildDraft(event, source));
    expect(merged.steps[0].label).toBe('A');
    expect(merged.title).toBe('中東で紛争 → 原油・防衛への波及（仮説）');
  });
});

describe('reapplyDraft', () => {
  it('テンプレートの選び直しはタイトル以外を上書きし、手書きのタイトルは残す', () => {
    const prev = buildDraft(event, source);
    const current: DraftFields = { ...prev, title: '手書き', invalidationConditions: '自分の条件' };
    const other: DraftSource = { ...source, themes: ['円安'], invalidationConditions: ['円高反転'] };
    const r = reapplyDraft(current, prev, buildDraft(event, other));
    expect(r.title).toBe('手書き');
    expect(r.invalidationConditions).toBe('円高反転');
    expect(r.targetThemes).toBe('円安');
  });
});
