import { describe, it, expect } from 'vitest';
import { filterRows, lastUpdated, nextSort, sortRows, themeOptions, type CompareRow } from './hypothesisCompare';
import { makeHyp } from '../test/fixtures';

const row = (over: Partial<CompareRow>): CompareRow => ({
  id: 'r', title: 'A', status: 'watching', themes: [], depth: 1, hit: 0, miss: 0, pending: 0, hitRate: null, updatedAt: '', ...over,
});
const a = row({ id: 'a', title: 'あ', status: 'adopted', themes: ['半導体'], depth: 3, hit: 2, hitRate: 1, updatedAt: '2026-10-02' });
const b = row({ id: 'b', title: 'い', status: 'needs_test', themes: ['小売', '半導体'], depth: 1, hit: 1, miss: 1, hitRate: 0.5, updatedAt: '2026-10-05' });
const c = row({ id: 'c', title: 'う', status: 'rejected', depth: 5 });
const ids = (rs: CompareRow[]) => rs.map(r => r.id);

describe('hypothesisCompare', () => {
  it('lastUpdated: 履歴と検証ログの最新日。無ければ空', () => {
    expect(lastUpdated(makeHyp())).toBe('');
    expect(lastUpdated(makeHyp({
      statusHistory: [{ date: '2026-10-03T09:00:00.000Z', from: 'watching', to: 'adopted', reason: '' }],
      verificationLogs: [{ id: 'l', loggedAt: '2026-10-01', result: 'hit', note: '' }],
    }))).toBe('2026-10-03');
  });
  it('filterRows: 状態とテーマの両方で絞る', () => {
    expect(ids(filterRows([a, b, c], { status: '', theme: '半導体' }))).toEqual(['a', 'b']);
    expect(ids(filterRows([a, b, c], { status: 'needs_test', theme: '半導体' }))).toEqual(['b']);
    expect(ids(filterRows([a, b, c], { status: '', theme: '' }))).toEqual(['a', 'b', 'c']);
  });
  it('sortRows: 昇順と降順。元の配列は変えない', () => {
    const src = [a, b, c];
    expect(ids(sortRows(src, 'depth', 'asc'))).toEqual(['b', 'a', 'c']);
    expect(ids(sortRows(src, 'depth', 'desc'))).toEqual(['c', 'a', 'b']);
    expect(ids(sortRows(src, 'status', 'asc'))).toEqual(['b', 'a', 'c']);
    expect(ids(src)).toEqual(['a', 'b', 'c']);
  });
  it('sortRows: 値の無い行はどちらの向きでも末尾', () => {
    expect(ids(sortRows([c, a, b], 'rate', 'asc'))).toEqual(['b', 'a', 'c']);
    expect(ids(sortRows([c, a, b], 'rate', 'desc'))).toEqual(['a', 'b', 'c']);
    expect(ids(sortRows([c, a, b], 'updated', 'desc'))).toEqual(['b', 'a', 'c']);
  });
  it('themeOptions と nextSort', () => {
    expect(themeOptions([a, b, c])).toEqual(['小売', '半導体'].sort((x, y) => x.localeCompare(y, 'ja')));
    expect(nextSort({ key: 'title', dir: 'asc' }, 'title')).toEqual({ key: 'title', dir: 'desc' });
    expect(nextSort({ key: 'title', dir: 'desc' }, 'rate')).toEqual({ key: 'rate', dir: 'asc' });
  });
});
