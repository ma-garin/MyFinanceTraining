import { describe, it, expect } from 'vitest';
import { decideAiApply } from './aiApply';
import { makeHyp } from '../test/fixtures';

const step = [{ label: 'x', reason: '' }];

describe('aiApply decideAiApply', () => {
  it('BUG-01 canExecute=false は拒否', () => {
    const r = decideAiApply({ canExecute: false, hypothesis: makeHyp(), steps: step, conditions: [] });
    expect(r.ok).toBe(false);
  });
  it('BUG-02 0 件は拒否', () => {
    const r = decideAiApply({ canExecute: true, hypothesis: makeHyp(), steps: [], conditions: [] });
    expect(r).toMatchObject({ ok: false });
  });
  it('BUG-05 全件重複・満杯は拒否', () => {
    const h = makeHyp({
      invalidationConditions: ['A'],
      associationSteps: ([1, 2, 3, 4, 5] as const).map(d => ({ depth: d, label: `l${d}`, reason: '' })),
    });
    const r = decideAiApply({ canExecute: true, hypothesis: h, steps: step, conditions: ['A'] });
    expect(r.ok).toBe(false);
  });
  it('正常は ok で追加分を返す', () => {
    const r = decideAiApply({ canExecute: true, hypothesis: makeHyp(), steps: step, conditions: ['B'] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.merge.addedSteps).toHaveLength(1);
      expect(r.merge.addedConditions).toEqual(['B']);
    }
  });
});
