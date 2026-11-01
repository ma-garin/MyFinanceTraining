import { describe, it, expect } from 'vitest';
import { todayStr, monthStr, isoToTokyoDateStr } from './dateUtils';

describe('dateUtils BUG-04 東京時間', () => {
  it('UTC 2026-01-01T15:30Z は東京で 2026-01-02', () => {
    const d = new Date('2026-01-01T15:30:00Z');
    expect(todayStr(d)).toBe('2026-01-02');
    expect(monthStr(d)).toBe('2026-01');
  });
  it('月末をまたぐと monthStr が翌月になる', () => {
    expect(monthStr(new Date('2026-01-31T15:00:00Z'))).toBe('2026-02');
  });
  it('isoToTokyoDateStr は ISO を東京日付に直す', () => {
    expect(isoToTokyoDateStr('2026-01-01T15:30:00Z')).toBe('2026-01-02');
  });
  it('解釈不能な文字列は先頭 10 文字を返す', () => {
    expect(isoToTokyoDateStr('not-a-date-at-all')).toBe('not-a-date');
  });
});
