import { describe, it, expect, vi, afterEach } from 'vitest';
import { onSwUpdate, watchRegistration } from './swUpdate';

const fakeWorker = () => {
  const t = new EventTarget() as EventTarget & { state: string };
  t.state = 'installing';
  return t;
};
const fakeReg = (installing: ReturnType<typeof fakeWorker> | null) => {
  const t = new EventTarget() as EventTarget & { installing: unknown; waiting: unknown };
  t.installing = installing;
  t.waiting = null;
  return t as unknown as ServiceWorkerRegistration;
};
const setController = (value: unknown) =>
  Object.defineProperty(navigator, 'serviceWorker', { value: { controller: value }, configurable: true });

afterEach(() => { vi.restoreAllMocks(); });

describe('watchRegistration', () => {
  it('監視開始時点でインストール中の版が installed になったら通知する', () => {
    setController({});
    const worker = fakeWorker();
    const reg = fakeReg(worker);
    const listener = vi.fn();
    const off = onSwUpdate(listener);
    watchRegistration(reg);
    worker.state = 'installed';
    worker.dispatchEvent(new Event('statechange'));
    expect(listener).toHaveBeenCalledWith(reg);
    off();
  });

  it('controller が無い初回インストールでは通知しない', () => {
    setController(null);
    const worker = fakeWorker();
    const listener = vi.fn();
    const off = onSwUpdate(listener);
    watchRegistration(fakeReg(worker));
    worker.state = 'installed';
    worker.dispatchEvent(new Event('statechange'));
    expect(listener).not.toHaveBeenCalled();
    off();
  });
});
