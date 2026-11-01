import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import UpdateBanner from './UpdateBanner';
import { watchRegistration } from '../../infrastructure/swUpdate';

function setup() {
  const postMessage = vi.fn();
  const reg = { waiting: { postMessage }, addEventListener: vi.fn() } as unknown as ServiceWorkerRegistration;
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { controller: {}, addEventListener: vi.fn() },
  });
  return { reg, postMessage };
}

describe('UpdateBanner', () => {
  it('通知前は非表示、通知後に表示される', () => {
    const { reg } = setup();
    render(<UpdateBanner />);
    expect(screen.queryByRole('status')).toBeNull();
    act(() => watchRegistration(reg));
    expect(screen.getByRole('status').textContent).toContain('新しいバージョンがあります');
  });

  it('更新するで waiting に SKIP_WAITING を送る', async () => {
    const { reg, postMessage } = setup();
    render(<UpdateBanner />);
    act(() => watchRegistration(reg));
    await userEvent.click(screen.getByRole('button', { name: '更新する' }));
    expect(postMessage).toHaveBeenCalledWith('SKIP_WAITING');
  });
});
