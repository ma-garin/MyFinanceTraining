import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useState } from 'react';
import { EventInputView } from './EventInputView';
import type { AppState, Hypothesis, MarketEvent } from '../domain/types';

const mockDesktop = (desktop: boolean) => {
  window.matchMedia = vi.fn(() => ({ matches: desktop, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
};

function Harness({ onHyp }: { onHyp: (h: Hypothesis) => void }) {
  const [events, setEvents] = useState<MarketEvent[]>([]);
  const state = { events, hypotheses: [] } as unknown as AppState;
  return <EventInputView state={state} onAdd={e => setEvents(prev => [...prev, e])} onDelete={() => {}} onAddHypothesis={onHyp} />;
}

const addEvent = () => {
  fireEvent.change(screen.getByLabelText('タイトル *'), { target: { value: '中東で紛争が拡大' } });
  fireEvent.change(screen.getByLabelText('概要 *'), { target: { value: '原油供給不安が意識される' } });
  fireEvent.click(screen.getByRole('button', { name: '追加する' }));
};

describe('イベント追加の直後に仮説の下書きを作る', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([['スマホ', false], ['PC', true]])('%s: 2 操作で下書きの仮説を登録できる', (_, desktop) => {
    const onHyp = vi.fn();
    mockDesktop(desktop);
    render(<Harness onHyp={onHyp} />);
    addEvent();
    fireEvent.click(screen.getByRole('button', { name: 'このイベントから仮説の下書きを作る' }));
    expect((screen.getByLabelText('仮説タイトル *') as HTMLInputElement).value).toContain('中東で紛争が拡大');
    fireEvent.click(screen.getByRole('button', { name: '仮説を登録' }));
    const h = onHyp.mock.calls[0][0] as Hypothesis;
    expect(h.associationSteps.length).toBe(5);
    expect(h.invalidationConditions.length).toBeGreaterThan(0);
    expect(h.targetThemes.length).toBeGreaterThan(0);
    expect(screen.getByText(/仮説を登録しました/)).toBeTruthy();
  });
});
