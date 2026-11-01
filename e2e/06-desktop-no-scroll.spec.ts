import { test, expect, type Page } from '@playwright/test';
import { blockExternal, STORE_KEY } from './helpers';

const VIEWS = ['ダッシュボード', 'イベント', '連想ツリー', '仮説詳細', 'バックテスト', 'レポート', '設定'];

// 画面全体のスクロールと、枠で切られて見えない中身を数える（1px は丸め誤差として許す）
const overflowProblems = (page: Page) => page.evaluate(() => {
  const de = document.documentElement;
  const out: string[] = [];
  if (de.scrollHeight > innerHeight + 1) out.push(`page ${de.scrollHeight}>${innerHeight}`);
  if (de.scrollWidth > innerWidth + 1) out.push(`page-x ${de.scrollWidth}>${innerWidth}`);
  const els = [document.querySelector('.content'), ...document.querySelectorAll('.content *')];
  for (const el of els) {
    if (!el || el.closest('.row-item')) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none') continue;
    if (el.scrollHeight > el.clientHeight + 1 && ['auto', 'scroll', 'hidden', 'clip'].includes(cs.overflowY)) {
      out.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')} ${el.scrollHeight}>${el.clientHeight}`);
    }
  }
  return out;
});

async function openApp(page: Page, heavy: boolean) {
  await blockExternal(page);
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(600);
  if (heavy) {
    await page.evaluate((k) => {
      const s = JSON.parse(localStorage.getItem(k) as string);
      const events: unknown[] = [];
      const hypotheses: unknown[] = [];
      for (let i = 0; i < 15; i++) {
        for (const e of s.events) events.push({ ...e, id: `${e.id}-x${i}`, title: `${e.title}（複製${i}）` });
        for (const h of s.hypotheses) hypotheses.push({
          ...h, id: `${h.id}-x${i}`, eventId: h.eventId ? `${h.eventId}-x${i}` : '', title: `${h.title}（複製${i}）`,
          verificationLogs: Array.from({ length: 12 }, (_, n) => ({ id: `vl-${i}-${n}`, loggedAt: '2026-10-01', result: n % 2 ? 'hit' : 'miss', note: `検証メモ ${n}` })),
        });
      }
      localStorage.setItem(k, JSON.stringify({ ...s, events, hypotheses }));
    }, STORE_KEY);
    await page.reload();
  }
}

for (const heavy of [false, true]) {
  test(`PC 幅では全画面がスクロールなしで収まる（${heavy ? '大量データ' : 'サンプル'}）`, async ({ page }) => {
    await openApp(page, heavy);
    for (const label of VIEWS) {
      await page.locator('.sidebar .nav-btn', { hasText: label }).click();
      await page.waitForTimeout(250);
      expect(await overflowProblems(page), label).toEqual([]);
    }
  });
}
