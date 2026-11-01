import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HypothesisDetailView } from './HypothesisDetailView';
import { makeHyp, makeState } from '../test/fixtures';

const h1 = makeHyp({ id: 'h-1', title: '仮説アルファ' });
const h2 = makeHyp({ id: 'h-2', title: '仮説ベータ' });

const view = (hyps: ReturnType<typeof makeHyp>[]) => (
  <HypothesisDetailView
    state={makeState({ hypotheses: hyps })}
    onStatusChange={vi.fn()} onDelete={vi.fn()} canExecuteAi={true}
    onAiIncrement={() => true} onAiApply={vi.fn()} onAddLog={vi.fn()}
  />
);
const cardCount = (title: string) => screen.queryAllByText(title, { ignore: 'option' }).length;

describe('HypothesisDetailView BUG-12 選択と表示の一致', () => {
  it('選択した仮説が表示される', async () => {
    render(view([h1, h2]));
    await userEvent.setup().selectOptions(screen.getByRole('combobox'), 'h-2');
    expect(screen.getByRole('combobox')).toHaveValue('h-2');
    expect(cardCount('仮説ベータ')).toBeGreaterThan(0);
  });

  it('選択中の仮説が props から消えると先頭へ落ち、select と表示が一致', async () => {
    const { rerender } = render(view([h1, h2]));
    await userEvent.setup().selectOptions(screen.getByRole('combobox'), 'h-2');
    rerender(view([h1]));
    expect(screen.getByRole('combobox')).toHaveValue('h-1');
    expect(cardCount('仮説アルファ')).toBeGreaterThan(0);
    expect(cardCount('仮説ベータ')).toBe(0);
  });

  it('仮説 0 件は空の select で、カードなし', () => {
    render(view([]));
    expect(screen.getByRole('combobox')).toHaveValue('');
  });
});
