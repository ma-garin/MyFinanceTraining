// 版を上げると activate で旧キャッシュを消す。リリースで SW の挙動を変えたら必ず上げる
const CACHE_NAME = 'my-finance-training-v4';

// App shell + manifest on install
const PRECACHE = [
  '/MyFinanceTraining/',
  '/MyFinanceTraining/manifest.webmanifest',
];

// 初回表示の JS/CSS は SW の制御前に取得されキャッシュに入らない。HTML から資産 URL を拾って先に入れ、初回直後のオフライン起動で白画面にしない
const precacheShellAssets = async (cache) => {
  const res = await fetch('/MyFinanceTraining/', { cache: 'no-cache' });
  if (!res.ok) return;
  const html = await res.clone().text();
  await cache.put('/MyFinanceTraining/', res);
  const assets = [...html.matchAll(/(?:src|href)="(\/MyFinanceTraining\/assets\/[^"]+)"/g)].map((m) => m[1]);
  await cache.addAll(assets);
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(PRECACHE);
      await precacheShellAssets(cache).catch((err) => console.warn('asset precache failed', err));
    })
  );
});

// 更新はユーザーがバナーで承認したときだけ有効化する（操作中の画面を突然差し替えない）
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 画面遷移(HTML)は network-first: 古い index.html が新しいハッシュ付き JS を指さず、デプロイが次回起動で反映される（BUG-11）
const networkFirst = async (request) => {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = (await cache.match(request)) || (await cache.match('/MyFinanceTraining/'));
    if (cached) return cached;
    throw err;
  }
};

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // ハッシュ付きの静的資産は内容が不変なので Stale-While-Revalidate で速度を優先する

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      const networkPromise = fetch(event.request).then((response) => {
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      }).catch(() => cached);

      return cached || networkPromise;
    })
  );
});
