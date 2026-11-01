import { test, expect } from '@playwright/test';
import { resetApp, addHypothesis, card, go } from './helpers';

test('E2E-05 採否の理由がレポートの履歴に出て、Markdown をダウンロードできる', async ({ page }) => {
  await resetApp(page);
  await go(page, '成績');
  await expect(page.getByRole('heading', { name: 'レポート', level: 2 })).toBeVisible();
  await expect(page.getByText('まだ採否の変更履歴はありません')).toBeVisible();

  const title = 'E2E-05仮説';
  await addHypothesis(page, title);
  const c = card(page, title);
  await c.getByRole('button', { name: '棄却', exact: true }).click();
  await c.getByLabel('判断理由').fill('失敗条件Aに該当');
  await c.getByRole('button', { name: '変更する' }).click();
  await expect(c.locator('.status-pill')).toContainText('棄却');

  await go(page, '成績');
  await expect(page.getByText('失敗条件Aに該当')).toBeVisible();
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Markdownをダウンロード' }).click(),
  ]);
  expect(dl.suggestedFilename()).toMatch(/^myfinancetraining-report-\d{4}-\d{2}\.md$/);
});
