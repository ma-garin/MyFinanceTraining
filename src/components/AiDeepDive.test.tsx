import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AiDeepDive } from './AiDeepDive';
import { makeHyp, makeEvent } from '../test/fixtures';

afterEach(() => { vi.restoreAllMocks(); });

const setup = (canExecute = true) => {
  const onApply = vi.fn();
  const onIncrement = vi.fn(() => true);
  const user = userEvent.setup();
  render(<AiDeepDive hypothesis={makeHyp()} event={makeEvent()} canExecute={canExecute} onIncrement={onIncrement} onApply={onApply} />);
  return { user, onApply, onIncrement };
};
const open = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: /AI 深掘り/ }));
const applyBtn = () => screen.getByRole('button', { name: '仮説に取り込む' });

describe('AiDeepDive BUG-01 上限', () => {
  it('canExecute=false は取り込みボタン disabled と上限メッセージ', async () => {
    const { user } = setup(false);
    await open(user);
    expect(applyBtn()).toBeDisabled();
    expect(screen.getByText(/実行上限に達しました/)).toBeInTheDocument();
  });
});

describe('AiDeepDive BUG-02 解析 0 件', () => {
  it('onApply/onIncrement を呼ばず、キャッシュも書かず、エラーを表示', async () => {
    const { user, onApply, onIncrement } = setup();
    await open(user);
    await user.type(screen.getByPlaceholderText(/AIの出力/), '読み取れない文章');
    await user.click(applyBtn());
    expect(onApply).not.toHaveBeenCalled();
    expect(onIncrement).not.toHaveBeenCalled();
    expect(localStorage.getItem('mft_ai_cache')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('読み取れませんでした');
  });

  it('正常な貼り付けは onApply と onIncrement が 1 回ずつ', async () => {
    const { user, onApply, onIncrement } = setup();
    await open(user);
    await user.click(screen.getByPlaceholderText(/AIの出力/));
    await user.paste('1. 連想先: 原油高 / 理由: 供給不安\n2. 連想先: 海運 / 理由: 運賃上昇');
    await user.click(applyBtn());
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0][0]).toHaveLength(2);
    expect(onIncrement).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('mft_ai_cache')).not.toBeNull();
  });
});

describe('AiDeepDive 見落とし観点', () => {
  it('種別を選んで貼り付けると onApply の第2引数に条件が入る', async () => {
    const { user, onApply } = setup();
    await open(user);
    await user.click(screen.getByRole('button', { name: /見落とし観点/ }));
    await user.click(screen.getByPlaceholderText(/AIの出力/));
    await user.paste('1. 逆方向の要因で需要減\n2. 時間軸のずれ');
    await user.click(applyBtn());
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0][1]).toEqual(['逆方向の要因で需要減', '時間軸のずれ']);
  });
});

describe('AiDeepDive BUG-08 clipboard 失敗', () => {
  it('writeText が reject するとエラー文 (role=alert)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { user } = setup();
    // user-event が navigator.clipboard を差し替えるので、setup 後に reject 版へ上書きする
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) }, configurable: true,
    });
    await open(user);
    await user.click(screen.getByRole('button', { name: 'コピー' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('コピーできませんでした');
  });
});

describe('AiDeepDive BUG-20 連打', () => {
  it('仮説が更新される前の 2 回目の取り込みは無視し、onApply・onIncrement は 1 回だけ', async () => {
    const { user, onApply, onIncrement } = setup();
    await open(user);
    await user.click(screen.getByPlaceholderText(/AIの出力/));
    await user.paste('1. 連想先: 原油高 / 理由: 供給不安');
    await user.dblClick(applyBtn());
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onIncrement).toHaveBeenCalledTimes(1);
  });
});
