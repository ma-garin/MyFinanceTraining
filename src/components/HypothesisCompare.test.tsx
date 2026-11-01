import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HypothesisCompare } from './HypothesisCompare';
import { makeHyp } from '../test/fixtures';

const hyps = [
  makeHyp({ id: 'h-a', title: '仮説A', status: 'adopted', targetThemes: ['半導体'], associationSteps: [{ depth: 1, label: 'x', reason: '' }, { depth: 2, label: 'y', reason: '' }],
    verificationLogs: [{ id: 'l1', loggedAt: '2026-10-02', result: 'hit', note: '' }, { id: 'l2', loggedAt: '2026-10-03', result: 'miss', note: '' }] }),
  makeHyp({ id: 'h-b', title: '仮説B', status: 'watching', targetThemes: ['小売'], associationSteps: [{ depth: 1, label: 'x', reason: '' }] }),
];
const titles = () => screen.getAllByRole('button', { name: /の詳細を開く$/ }).map(b => b.getAttribute('aria-label'));

describe('HypothesisCompare（PC の表）', () => {
  it('列の値を出し、見出しで昇順・降順に並べ替える', async () => {
    const user = userEvent.setup();
    render(<HypothesisCompare hypotheses={hyps} onOpen={vi.fn()} />);
    const rowA = screen.getByRole('button', { name: '仮説Aの詳細を開く' });
    for (const t of ['採用', '半導体', '的1 外1 未0', '50%', '2026-10-03']) expect(within(rowA).getByText(t)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^連想の段数で並べ替え/ }));
    expect(titles()).toEqual(['仮説Bの詳細を開く', '仮説Aの詳細を開く']);
    await user.click(screen.getByRole('button', { name: /^連想の段数で並べ替え/ }));
    expect(titles()).toEqual(['仮説Aの詳細を開く', '仮説Bの詳細を開く']);
    expect(screen.getByRole('button', { name: /^連想の段数で並べ替え/ })).toHaveAccessibleName('連想の段数で並べ替え（降順で表示中）');
  });

  it('状態とテーマで絞り込み、0 件なら戻し方を示す', async () => {
    const user = userEvent.setup();
    render(<HypothesisCompare hypotheses={hyps} onOpen={vi.fn()} />);
    await user.selectOptions(screen.getByLabelText('テーマ'), '小売');
    expect(titles()).toEqual(['仮説Bの詳細を開く']);
    await user.selectOptions(screen.getByLabelText('状態'), 'adopted');
    expect(screen.getByText(/条件に合う仮説がありません/)).toBeInTheDocument();
  });

  it('行をクリックするとその仮説を開く', async () => {
    const onOpen = vi.fn();
    render(<HypothesisCompare hypotheses={hyps} onOpen={onOpen} />);
    await userEvent.setup().click(screen.getByRole('button', { name: '仮説Bの詳細を開く' }));
    expect(onOpen).toHaveBeenCalledWith('h-b');
  });
});

describe('HypothesisCompare（スマホの行リスト）', () => {
  it('並べ替えの項目と向きを選べ、行で開ける', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<HypothesisCompare hypotheses={hyps} onOpen={onOpen} compact />);
    await user.selectOptions(screen.getByLabelText('並べ替え'), 'depth');
    expect(titles()).toEqual(['仮説Bの詳細を開く', '仮説Aの詳細を開く']);
    await user.click(screen.getByRole('button', { name: '昇順 ▲' }));
    expect(titles()).toEqual(['仮説Aの詳細を開く', '仮説Bの詳細を開く']);
    await user.click(screen.getByRole('button', { name: '仮説Aの詳細を開く' }));
    expect(onOpen).toHaveBeenCalledWith('h-a');
  });
});
