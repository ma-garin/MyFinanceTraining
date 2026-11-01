import { describe, it, expect } from 'vitest';
import { diffStates } from './importDiff';
import type { AppState } from './types';

const st = (events: unknown[], hypotheses: unknown[]) =>
  ({ events, hypotheses, themes: [] }) as unknown as AppState;
const h = (id: string, title = id, extra = 0) => ({ id, title, extra });

describe('diffStates', () => {
  it('追加を数える', () => {
    const d = diffStates(st([], []), st([], [h('a', 'A')]));
    expect(d.hypotheses).toEqual({ added: 1, removed: 0, changed: 0, unchanged: 0 });
    expect(d.addedTitles).toEqual(['A']);
  });
  it('削除を数える', () => {
    const d = diffStates(st([], [h('a', 'A')]), st([], []));
    expect(d.hypotheses.removed).toBe(1);
    expect(d.removedTitles).toEqual(['A']);
  });
  it('変更を数える', () => {
    const d = diffStates(st([], [h('a', 'A', 0)]), st([], [h('a', 'A', 1)]));
    expect(d.hypotheses).toEqual({ added: 0, removed: 0, changed: 1, unchanged: 0 });
    expect(d.changedTitles).toEqual(['A']);
  });
  it('同一は unchanged', () => {
    const s = st([{ id: 'e1', title: 'E' }], [h('a')]);
    const d = diffStates(s, s);
    expect(d.events.unchanged).toBe(1);
    expect(d.hypotheses.unchanged).toBe(1);
  });
  it('タイトルは最大5件', () => {
    const many = Array.from({ length: 8 }, (_, i) => h(`x${i}`));
    expect(diffStates(st([], []), st([], many)).addedTitles).toHaveLength(5);
  });
});
