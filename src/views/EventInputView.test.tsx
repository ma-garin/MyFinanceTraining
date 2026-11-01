import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EventInputView } from './EventInputView';
import type { AppState } from '../domain/types';

const events = Array.from({ length: 12 }, (_, i) => ({
  id: `E${i}`, title: `イベント${i}`, category: 'geopolitics', occurredAt: '2026-01-01', summary: `概要${i}`,
}));
const state = { events } as unknown as AppState;

describe('EventInputView PC', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn(() => ({ matches: true, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  });
  afterEach(() => vi.restoreAllMocks());

  it('ページ送りが出て、行を選ぶと詳細が出る', () => {
    render(<EventInputView state={state} onAdd={() => {}} onDelete={() => {}} />);
    expect(screen.getByLabelText('イベント一覧のページ送り')).toBeTruthy();
    fireEvent.click(screen.getByText('イベント11'));
    expect(screen.getByText('概要11')).toBeTruthy();
    fireEvent.click(screen.getByText('新規追加'));
    expect(screen.getByText('イベントを追加')).toBeTruthy();
  });
});
