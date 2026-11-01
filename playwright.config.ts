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
  projects: [{ name: 'chromium', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/MyFinanceTraining/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
