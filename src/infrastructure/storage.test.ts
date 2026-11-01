import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  STORAGE_KEY, CORRUPT_BACKUP_PREFIX, loadState, saveState, backupCorruptRaw, parseStateJson,
} from './storage';
import { makeState, makeHyp } from '../test/fixtures';

afterEach(() => { vi.restoreAllMocks(); });

describe('Storage loadState (BUG-06 / BUG-03)', () => {
  it('キー無しは empty', () => {
    expect(loadState()).toEqual({ kind: 'empty' });
  });

  it('正常データは ok で、存在しない eventId は空文字になる', () => {
    const s = makeState({ hypotheses: [makeHyp({ eventId: 'nope' }), makeHyp({ id: 'h-2', eventId: 'ev-1' })] });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    const r = loadState();
    expect(r.kind).toBe('ok');
    if (r.kind === 'ok') {
      expect(r.state.hypotheses.map(h => h.eventId)).toEqual(['', 'ev-1']);
    }
  });

  it('depth 重複は 1..n に振り直される', () => {
    const steps = [
      { depth: 2 as const, label: 'a', reason: '' },
      { depth: 2 as const, label: 'b', reason: '' },
      { depth: 1 as const, label: 'c', reason: '' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(makeState({ hypotheses: [makeHyp({ associationSteps: steps })] })));
    const r = loadState();
    if (r.kind !== 'ok') throw new Error('ok expected');
    const out = r.state.hypotheses[0].associationSteps;
    expect(out.map(s => s.depth)).toEqual([1, 2, 3]);
    expect(out.map(s => s.label)).toEqual(['c', 'a', 'b']);
  });

  it('malformed JSON は corrupt で raw を保持する', () => {
    localStorage.setItem(STORAGE_KEY, '{bad');
    const r = loadState();
    expect(r).toMatchObject({ kind: 'corrupt', raw: '{bad' });
  });

  it('形が不正な JSON は corrupt', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: [] }));
    expect(loadState().kind).toBe('corrupt');
  });
});

describe('Storage parseStateJson', () => {
  it('不正入力は ok=false と理由', () => {
    expect(parseStateJson('x')).toMatchObject({ ok: false });
    expect(parseStateJson('[]')).toMatchObject({ ok: false });
  });
  it('正常入力は ok=true', () => {
    expect(parseStateJson(JSON.stringify(makeState()))).toMatchObject({ ok: true });
  });
  it('レビュー指摘: null 要素や配列でない steps でも例外にせず除いて読む', () => {
    const base = makeState({ hypotheses: [makeHyp()] });
    const raw = JSON.stringify({
      ...base,
      events: [null, ...base.events],
      hypotheses: [null, { ...base.hypotheses[0], associationSteps: 'x', invalidationConditions: null }],
    });
    const r = parseStateJson(raw);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.events).toHaveLength(base.events.length);
    expect(r.state.hypotheses).toHaveLength(1);
    expect(r.state.hypotheses[0].associationSteps).toEqual([]);
    expect(r.state.hypotheses[0].invalidationConditions).toEqual([]);
  });
});

describe('Storage saveState (BUG-07)', () => {
  it('保存できれば true', () => {
    expect(saveState(makeState())).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });
  it('setItem が例外を投げたら false', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(saveState(makeState())).toBe(false);
  });
});

describe('Storage backupCorruptRaw (BUG-06)', () => {
  it('別キーへ保存し元キーは変えない', () => {
    localStorage.setItem(STORAGE_KEY, 'broken');
    const key = backupCorruptRaw('broken', new Date(12345));
    expect(key).toBe(`${CORRUPT_BACKUP_PREFIX}12345`);
    expect(localStorage.getItem(key as string)).toBe('broken');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('broken');
  });
  it('保存失敗は null', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(backupCorruptRaw('x')).toBeNull();
  });
});
