import { test, expect } from '@playwright/test';
import { resetApp, addEvent, addHypothesis, card, go, readStore } from './helpers';

test('E2E-01 イベント追加→仮説追加→ステータス変更→元に戻す', async ({ page }) => {
  await resetApp(page);
  await addEvent(page, 'E2Eイベント');
  const title = 'E2E仮説タイトル';
  await addHypothesis(page, title);
  const c = card(page, title);
  await expect(c.locator('.status-pill')).toContainText('要検証');

  await c.getByRole('button', { name: '採用', exact: true }).click();
  await expect(c.locator('.status-pill')).toContainText('採用');
  await expect(page.locator('.toast')).toContainText('ステータスを「採用」に変更しました');
  expect((await readStore(page)).hypotheses.find(h => h.title === title)?.status).toBe('adopted');

  await page.getByRole('button', { name: '取り消す' }).click();
  await expect(c.locator('.status-pill')).toContainText('要検証');
  expect((await readStore(page)).hypotheses.find(h => h.title === title)?.status).toBe('needs_test');
  await go(page, 'ホーム');
});
