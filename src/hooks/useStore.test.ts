import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStore } from './useStore';
import { STORAGE_KEY, CORRUPT_BACKUP_PREFIX } from '../infrastructure/storage';
import { initialState } from '../data/sampleData';
import { makeState, makeHyp, makeEvent } from '../test/fixtures';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

const backupKeys = () =>
  Object.keys(localStorage).filter(k => k.startsWith(CORRUPT_BACKUP_PREFIX));

describe('useStore BUG-06 破損データの復旧', () => {
  it('破損時は recovery が立ち、300ms 経っても元データを上書きしない', () => {
    localStorage.setItem(STORAGE_KEY, '{broken');
    const { result } = renderHook(() => useStore());
    expect(result.current.recovery).toMatchObject({ raw: '{broken' });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{broken');
  });

  it('resolveRecoveryByReset は退避→初期化→保存再開', () => {
    localStorage.setItem(STORAGE_KEY, '{broken');
    const { result } = renderHook(() => useStore());
    let ok = false;
    act(() => { ok = result.current.resolveRecoveryByReset(); });
    expect(ok).toBe(true);
    expect(result.current.recovery).toBeNull();
    const keys = backupKeys();
    expect(keys).toHaveLength(1);
    expect(localStorage.getItem(keys[0])).toBe('{broken');
    act(() => { vi.advanceTimersByTime(300); });
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) as string)).toEqual(initialState);
  });
});

describe('useStore レビュー指摘: 読み取り失敗時の初期化', () => {
  it('起動時に読めなかった実データは、初期化前に読み直して退避する', () => {
    const real = JSON.stringify(makeState());
    localStorage.setItem(STORAGE_KEY, real);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => { throw new Error('denied'); });
    const { result } = renderHook(() => useStore());
    expect(result.current.recovery).toMatchObject({ raw: '' });
    let ok = false;
    act(() => { ok = result.current.resolveRecoveryByReset(); });
    expect(ok).toBe(true);
    const keys = backupKeys();
    expect(keys).toHaveLength(1);
    expect(localStorage.getItem(keys[0])).toBe(real);
  });

  it('読み直しも失敗したら初期化しない', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    const { result } = renderHook(() => useStore());
    let ok = true;
    act(() => { ok = result.current.resolveRecoveryByReset(); });
    expect(ok).toBe(false);
    expect(result.current.recovery).not.toBeNull();
  });
});

describe('useStore BUG-07 保存失敗', () => {
  it('setItem が投げると saveError=true', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    const { result } = renderHook(() => useStore());
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.saveError).toBe(true);
  });
  it('成功時は false', () => {
    const { result } = renderHook(() => useStore());
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current.saveError).toBe(false);
  });
});

describe('useStore Event / Hypothesis 特性', () => {
  const seed = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(makeState()));

  it('イベント追加と削除（削除しても仮説は残り eventId は空）', () => {
    seed();
    const { result } = renderHook(() => useStore());
    act(() => { result.current.addEvent(makeEvent({ id: 'ev-2' })); });
    expect(result.current.state.events.map(e => e.id)).toEqual(['ev-1', 'ev-2']);
    act(() => { result.current.deleteEvent('ev-1'); });
    expect(result.current.state.events.map(e => e.id)).toEqual(['ev-2']);
    expect(result.current.state.hypotheses).toHaveLength(1);
    expect(result.current.state.hypotheses[0].eventId).toBe('');
  });

  it('仮説の追加・ステータス変更・削除', () => {
    seed();
    const { result } = renderHook(() => useStore());
    act(() => { result.current.addHypothesis(makeHyp({ id: 'h-2' })); });
    expect(result.current.state.hypotheses).toHaveLength(2);
    act(() => { result.current.updateHypothesisStatus('h-2', 'adopted'); });
    expect(result.current.state.hypotheses[1].status).toBe('adopted');
    expect(result.current.state.hypotheses[0].status).toBe('watching');
    act(() => { result.current.deleteHypothesis('h-1'); });
    expect(result.current.state.hypotheses.map(h => h.id)).toEqual(['h-2']);
  });

  it('BUG-03/05 appendAiResult は depth 一意・同一失敗条件を重複追加しない', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(makeState({
      hypotheses: [makeHyp({
        associationSteps: [{ depth: 1, label: 'a', reason: '' }, { depth: 2, label: 'b', reason: '' }],
        invalidationConditions: ['既存'],
      })],
    })));
    const { result } = renderHook(() => useStore());
    const apply = () => act(() => {
      result.current.appendAiResult('h-1', [{ label: 'x', reason: '' }, { label: 'y', reason: '' }], ['既存', '新規']);
    });
    apply();
    apply();
    const h = result.current.state.hypotheses[0];
    const depths = h.associationSteps.map(s => s.depth);
    expect(new Set(depths).size).toBe(depths.length);
    expect(depths).toEqual([1, 2, 3, 4, 5]);
    expect(h.invalidationConditions).toEqual(['既存', '新規']);
  });
});
