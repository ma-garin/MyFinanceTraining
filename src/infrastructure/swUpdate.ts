type Listener = (reg: ServiceWorkerRegistration) => void;

const listeners = new Set<Listener>();

export function onSwUpdate(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(reg: ServiceWorkerRegistration): void {
  listeners.forEach((l) => l(reg));
}

export function watchRegistration(reg: ServiceWorkerRegistration): void {
  if (reg.waiting && navigator.serviceWorker.controller) notify(reg);
  reg.addEventListener('updatefound', () => {
    const worker = reg.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      // controller が無い初回インストールは更新ではないので通知しない
      if (worker.state === 'installed' && navigator.serviceWorker.controller) notify(reg);
    });
  });
}

export function applyUpdate(reg: ServiceWorkerRegistration): void {
  let reloaded = false;
  // 複数回の controllerchange で再読み込みが連鎖しないよう一度だけにする
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
  reg.waiting?.postMessage('SKIP_WAITING');
}
