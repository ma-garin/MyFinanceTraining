import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AiDeepDive } from './AiDeepDive';
import { makeHyp, makeEvent } from '../test/fixtures';
import { API_KEY_KEY } from '../infrastructure/aiStorage';

const DUMMY = 'test-dummy-key';

const setup = (withKey: boolean, canExecute = true) => {
  if (withKey) localStorage.setItem(API_KEY_KEY, DUMMY);
  const onApply = vi.fn();
  const onIncrement = vi.fn(() => true);
  const user = userEvent.setup();
  render(<AiDeepDive hypothesis={makeHyp()} event={makeEvent()} canExecute={canExecute} onIncrement={onIncrement} onApply={onApply} />);
  return { user, onApply, onIncrement };
};
const open = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: /AI 深掘り/ }));
const mockFetch = (status: number, body: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body), { status }));

describe('AiDeepDive API 直接呼び出し', () => {
  it('キーが無ければ「AI に聞く」は出ず、手動方式のまま', async () => {
    const { user } = setup(false);
    await open(user);
    expect(screen.queryByRole('button', { name: 'AI に聞く' })).toBeNull();
    expect(screen.getByRole('button', { name: 'コピー' })).toBeInTheDocument();
  });

  it('キーがあれば 1 回押すだけで取り込み、回数は 1 回だけ数える', async () => {
    const f = mockFetch(200, { content: [{ type: 'text', text: '- 連想先: 新しい連想 / 理由: テスト' }] });
    const { user, onApply, onIncrement } = setup(true);
    await open(user);
    expect(screen.getByRole('button', { name: 'コピー' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'AI に聞く' }));
    expect(f).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith([expect.objectContaining({ label: '新しい連想' })], []);
    expect(onIncrement).toHaveBeenCalledTimes(1);
    expect(screen.getByPlaceholderText(/AIの出力/)).toHaveValue('- 連想先: 新しい連想 / 理由: テスト');
  });

  it('401 は取り込まず、設定での確認を案内する', async () => {
    mockFetch(401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } });
    const { user, onApply, onIncrement } = setup(true);
    await open(user);
    await user.click(screen.getByRole('button', { name: 'AI に聞く' }));
    expect(onApply).not.toHaveBeenCalled();
    expect(onIncrement).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('API キーが正しくありません');
  });

  it('上限に達していれば API を呼ばない', async () => {
    const f = mockFetch(200, {});
    const { user } = setup(true, false);
    await open(user);
    expect(screen.getByRole('button', { name: 'AI に聞く' })).toBeDisabled();
    expect(f).not.toHaveBeenCalled();
  });

  it('実行中は二重送信できず、キャンセルで取り消せる', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((_u, init) => new Promise((_r, rej) => {
      init?.signal?.addEventListener('abort', () => rej(new DOMException('aborted', 'AbortError')));
    }));
    const { user, onIncrement } = setup(true);
    await open(user);
    await user.click(screen.getByRole('button', { name: 'AI に聞く' }));
    expect(screen.getByRole('button', { name: /問い合わせ中/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'キャンセル' }));
    expect(await screen.findByText('問い合わせを取り消しました。')).toBeInTheDocument();
    expect(onIncrement).not.toHaveBeenCalled();
  });
});
