import { defineConfig, devices } from '@playwright/test';

// 利用者の開発サーバ(5173)と衝突しないよう検証専用ポートで preview を起動する
const PORT = 4179;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}/MyFinanceTraining/`,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Pixel 7'] }, testIgnore: /desktop/ },
    // PC 幅（1366x768 のノート PC でブラウザの枠を除いた高さ）。画面スクロールなしの作りを確かめる
    { name: 'desktop', use: { viewport: { width: 1366, height: 657 } }, testMatch: /desktop/ },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/MyFinanceTraining/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
