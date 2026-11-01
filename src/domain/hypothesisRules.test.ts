import { describe, it, expect } from 'vitest';
import { buildSteps, mergeAiResult, normalizeStepDepths } from './hypothesisRules';
import { makeHyp } from '../test/fixtures';

describe('hypothesisRules buildSteps (BUG-03)', () => {
  it('空ラベル除去後に 1..n 連番になる', () => {
    const r = buildSteps([
      { label: 'a', reason: ' r ' }, { label: '  ', reason: 'x' }, { label: 'c', reason: '' },
    ]);
    expect(r).toEqual([{ depth: 1, label: 'a', reason: 'r' }, { depth: 2, label: 'c', reason: '' }]);
  });
  it('6 件目以降は切り捨て', () => {
    const r = buildSteps(Array.from({ length: 7 }, (_, i) => ({ label: `l${i}`, reason: '' })));
    expect(r).toHaveLength(5);
  });
});

describe('hypothesisRules mergeAiResult (BUG-03/05)', () => {
  it('BUG-21: 既存の最大 depth より後ろに割り当て、起点より前に並べない', () => {
    const h = makeHyp({ associationSteps: [{ depth: 1, label: 'a', reason: '' }, { depth: 3, label: 'c', reason: '' }] });
    const r = mergeAiResult(h, [{ label: 'x', reason: '' }, { label: 'y', reason: '' }], []);
    expect(r.addedSteps.map(s => s.depth)).toEqual([4, 5]);
    expect(r.hypothesis.associationSteps.map(s => s.label)).toEqual(['a', 'c', 'x', 'y']);
  });
  it('5 を超える分は切り捨て', () => {
    const h = makeHyp({ associationSteps: [{ depth: 1, label: 'a', reason: '' }] });
    const r = mergeAiResult(h, Array.from({ length: 8 }, (_, i) => ({ label: `n${i}`, reason: '' })), []);
    expect(r.addedSteps).toHaveLength(4);
    expect(r.hypothesis.associationSteps).toHaveLength(5);
  });
  it('既存一致・空・重複の条件を除く', () => {
    const h = makeHyp({ invalidationConditions: ['A'] });
    const r = mergeAiResult(h, [], ['A', ' B ', 'B', '']);
    expect(r.addedConditions).toEqual(['B']);
    expect(r.hypothesis.invalidationConditions).toEqual(['A', 'B']);
  });
  it('既存データ内の同一文言は消さない', () => {
    const h = makeHyp({ invalidationConditions: ['A', 'A'] });
    const r = mergeAiResult(h, [], ['C']);
    expect(r.hypothesis.invalidationConditions).toEqual(['A', 'A', 'C']);
  });
});

describe('hypothesisRules normalizeStepDepths (BUG-03)', () => {
  it('1 からの連番ならそのまま', () => {
    const s = [{ depth: 1 as const, label: 'a', reason: '' }, { depth: 2 as const, label: 'b', reason: '' }];
    expect(normalizeStepDepths(s)).toEqual(s);
  });
  it('BUG-21: 一意でも飛び番なら 1..n に詰める', () => {
    const s = [{ depth: 1 as const, label: 'a', reason: '' }, { depth: 4 as const, label: 'b', reason: '' }];
    expect(normalizeStepDepths(s).map(x => x.depth)).toEqual([1, 2]);
  });
  it('重複は depth 順（同値は元順）で 1..n', () => {
    const s = [
      { depth: 3 as const, label: 'a', reason: '' },
      { depth: 3 as const, label: 'b', reason: '' },
      { depth: 1 as const, label: 'c', reason: '' },
    ];
    expect(normalizeStepDepths(s).map(x => [x.depth, x.label])).toEqual([[1, 'c'], [2, 'a'], [3, 'b']]);
  });
  it('入力を変更しない', () => {
    const s = [{ depth: 2 as const, label: 'a', reason: '' }, { depth: 2 as const, label: 'b', reason: '' }];
    normalizeStepDepths(s);
    expect(s.map(x => x.depth)).toEqual([2, 2]);
  });
});

import { normalizeStepDepths as norm2, mergeAiResult as merge2 } from './hypothesisRules';
import { makeHyp as mk2 } from '../test/fixtures';
describe('BUG-21 depth の飛び番', () => {
  it('飛び番は 1 からの連番に詰める', () => {
    const s = norm2([{ depth: 2, label: 'a', reason: '' }, { depth: 3, label: 'b', reason: '' }]);
    expect(s.map(x => x.depth)).toEqual([1, 2]);
  });
  it('AI 段は既存の最大 depth より後ろに足す', () => {
    const h = mk2({ associationSteps: [{ depth: 2, label: 'a', reason: '' }] });
    expect(merge2(h, [{ label: 'x', reason: '' }], []).addedSteps[0].depth).toBe(3);
  });
});
