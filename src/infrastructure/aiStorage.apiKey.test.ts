import { describe, it, expect, vi } from 'vitest';
import { saveApiKey, loadApiKey, clearApiKey, loadAiModel, saveAiModel, API_KEY_KEY, DEFAULT_AI_MODEL, MODEL_KEY } from './aiStorage';
import { exportStateAsJson, STORAGE_KEY } from './storage';
import type { AppState } from '../domain/types';

const DUMMY = 'test-dummy-key-0000';

describe('API キーの保存', () => {
  it('AppState とは別のキーに保存し、削除できる', () => {
    expect(API_KEY_KEY).not.toBe(STORAGE_KEY);
    expect(saveApiKey(`  ${DUMMY} `)).toBe(true);
    expect(loadApiKey()).toBe(DUMMY);
    expect(localStorage.getItem(STORAGE_KEY) ?? '').not.toContain(DUMMY);
    clearApiKey();
    expect(loadApiKey()).toBe('');
  });

  it('JSON エクスポートの中身にキーが含まれない', async () => {
    saveApiKey(DUMMY);
    let blob: Blob | null = null;
    vi.spyOn(URL, 'createObjectURL').mockImplementation(b => { blob = b as Blob; return 'blob:x'; });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const state = { schemaVersion: 2, events: [], hypotheses: [] } as unknown as AppState;
    expect(exportStateAsJson(state)).toBe(true);
    expect(blob).not.toBeNull();
    const text = await (blob as unknown as Blob).text();
    expect(text).not.toContain(DUMMY);
    expect(text).not.toContain(API_KEY_KEY);
  });

  it('モデルの既定は Sonnet で、不正値は既定に戻す', () => {
    expect(loadAiModel()).toBe(DEFAULT_AI_MODEL);
    saveAiModel('claude-haiku-5-5');
    expect(loadAiModel()).toBe('claude-haiku-5-5');
    localStorage.setItem(MODEL_KEY, JSON.stringify('unknown'));
    expect(loadAiModel()).toBe(DEFAULT_AI_MODEL);
  });
});
