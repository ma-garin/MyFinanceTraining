import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BacktestView } from './BacktestView';

const mockMatch = (matches: boolean) => {
  window.matchMedia = vi.fn(() => ({ matches, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
};

describe('BacktestView', () => {
  afterEach(() => vi.restoreAllMocks());

  it('PC 幅では入力タブと実行ボタンを持つ 2 ペインを描く', () => {
    mockMatch(true);
    const { container } = render(<BacktestView hypotheses={[]} />);
    expect(container.querySelector('.view-root .split-pane')).not.toBeNull();
    expect(screen.getByRole('tab', { name: '価格CSV' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'バックテスト実行' })).toBeTruthy();
  });

  it('スマホ幅では従来の縦積み表示のまま', () => {
    mockMatch(false);
    const { container } = render(<BacktestView hypotheses={[]} />);
    expect(container.querySelector('.split-pane')).toBeNull();
    expect(screen.getByText('入力形式')).toBeTruthy();
  });
});
