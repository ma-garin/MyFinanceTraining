import { describe, it, expect } from 'vitest';
import { addCacheEntry, loadAiCache, MAX_CACHE_ENTRIES } from './aiStorage';

describe('BUG-18 AI cache の上限', () => {
  it('上限を超えたら古い順に捨て、最新を残す', () => {
    for (let i = 0; i < MAX_CACHE_ENTRIES + 5; i++) {
      addCacheEntry({ key: `k${i}`, prompt: 'p', result: 'r', createdAt: '2026-11-01T00:00:00.000Z' });
    }
    const keys = loadAiCache().map(e => e.key);
    expect(keys).toHaveLength(MAX_CACHE_ENTRIES);
    expect(keys[0]).toBe('k5');
    expect(keys[keys.length - 1]).toBe(`k${MAX_CACHE_ENTRIES + 4}`);
  });
});
