import { test, expect, type Page } from '@playwright/test';
import { resetApp, go, readStore, card, addHypothesis } from './helpers';

async function exportFile(page: Page, dir: string) {
  await go(page, '設定');
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /JSONエクスポート/ }).click(),
  ]);
  const path = `${dir}/${dl.suggestedFilename()}`;
  await dl.saveAs(path);
  return path;
}

async function deleteFirstHypothesis(page: Page) {
  await go(page, '仮説');
  const c = page.locator('article.hypothesis-card').first();
  await c.getByRole('button', { name: '削除', exact: true }).click();
  await c.getByRole('button', { name: '削除確定' }).click();
}

test('E2E-03 エクスポート→変更→インポートで置き換え／キャンセルは不変', async ({ page }, testInfo) => {
  await resetApp(page);
  await addHypothesis(page, 'E2E-03仮説A');
  await addHypothesis(page, 'E2E-03仮説B');
  const orig = await readStore(page);
  const n = orig.hypotheses.length;
  expect(n).toBe(4);
  const file = await exportFile(page, testInfo.outputDir);

  await deleteFirstHypothesis(page);
  expect((await readStore(page)).hypotheses.length).toBe(n - 1);

  // キャンセルでは変わらない
  await go(page, '設定');
  await page.locator('input[type=file]').setInputFiles(file);
  const dlg = page.getByRole('dialog');
  await expect(dlg).toContainText('インポートで現在のデータを置き換えます');
  // 差分プレビュー: 削除した 1 件が「追加」として戻る
  await expect(dlg.getByTestId('diff-hypotheses')).toContainText('追加1 / 削除0');
  await dlg.getByRole('button', { name: 'キャンセル' }).click();
  await expect(dlg).toHaveCount(0);
  expect((await readStore(page)).hypotheses.length).toBe(n - 1);

  // 置き換えで元に戻る
  await page.locator('input[type=file]').setInputFiles(file);
  await page.getByRole('dialog').getByRole('button', { name: '置き換える' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await readStore(page)).hypotheses.length).toBe(n);
  await go(page, '仮説');
  await expect(card(page, 'E2E-03仮説A')).toBeVisible();

  // 取り込みを元に戻すと取り込み前（n-1 件）に戻る
  await go(page, '設定');
  await page.getByRole('button', { name: '取り込みを元に戻す' }).click();
  await expect(page.locator('.toast')).toContainText('取り込み前のデータに戻しました');
  expect((await readStore(page)).hypotheses.length).toBe(n - 1);
  await expect(page.getByRole('button', { name: '取り込みを元に戻す' })).toHaveCount(0);
});
