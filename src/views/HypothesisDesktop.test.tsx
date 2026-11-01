import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HypothesisDetailView } from './HypothesisDetailView';
import { AssociationTreeView } from './AssociationTreeView';
import { makeEvent, makeHyp, makeState } from '../test/fixtures';

const h1 = makeHyp({ id: 'h-1', title: '仮説アルファ', associationSteps: [{ depth: 1, label: '起点ステップ', reason: '' }] });
const h2 = makeHyp({ id: 'h-2', title: '仮説ベータ', invalidationConditions: ['ベータの失敗条件'] });
const state = makeState({ events: [makeEvent({ id: 'ev-1', title: 'イベント1' })], hypotheses: [h1, h2] });
const handlers = {
  onStatusChange: vi.fn(), onDelete: vi.fn(), canExecuteAi: true,
  onAiIncrement: () => true, onAiApply: vi.fn(), onAddLog: vi.fn(),
};

const original = window.matchMedia;
beforeEach(() => {
  window.matchMedia = vi.fn(() => ({ matches: true, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
});
afterEach(() => { window.matchMedia = original; });

describe('PC 表示（961px 以上）の 2 ペイン', () => {
  it('仮説詳細: 一覧で選ぶと右に詳細が出て、タブで中身が切り替わる', async () => {
    const user = userEvent.setup();
    render(<HypothesisDetailView state={state} {...handlers} />);
    expect(screen.queryByRole('combobox')).toBeNull();
    await user.click(screen.getByRole('button', { name: /仮説ベータ/ }));
    expect(screen.getByRole('heading', { name: '仮説ベータ' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: '失敗条件' }));
    expect(screen.getByRole('tab', { name: '失敗条件' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('✕ ベータの失敗条件')).toBeInTheDocument();
  });

  it('仮説詳細: 採用への変更は理由が無いと確定できない', async () => {
    const user = userEvent.setup();
    render(<HypothesisDetailView state={state} {...handlers} />);
    await user.click(screen.getByRole('button', { name: '採用' }));
    expect(screen.getByRole('button', { name: '変更する' })).toBeDisabled();
  });

  it('連想ツリー: イベントの仮説を選ぶと詳細、追加でフォームを段ごとに出す', async () => {
    const user = userEvent.setup();
    render(<AssociationTreeView state={state} onAdd={vi.fn()} {...handlers} />);
    await user.click(screen.getByRole('button', { name: /仮説アルファ/ }));
    await user.click(screen.getByRole('tab', { name: '連想' }));
    expect(screen.getByText('1. 起点ステップ')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /仮説一覧へ/ }));
    await user.click(screen.getByRole('button', { name: /仮説を追加/ }));
    expect(screen.getByLabelText('仮説タイトル *')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '次へ ›' }));
    expect(screen.getByPlaceholderText('ニュース・起点イベント *')).toBeInTheDocument();
  });
});
