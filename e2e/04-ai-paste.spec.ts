import { test, expect } from '@playwright/test';
import { resetApp, addHypothesis, card, readStore } from './helpers';

test('E2E-04 AI深掘りの貼り付け取り込みで連想と失敗条件が追加される', async ({ page }) => {
  const external: string[] = [];
  page.on('request', r => { if (!r.url().startsWith('http://127.0.0.1')) external.push(r.url()); });
  await resetApp(page);
  const title = 'AI取り込み仮説';
  await addHypothesis(page, title);
  const c = card(page, title);

  await c.getByRole('button', { name: 'AI 深掘り' }).click();
  await expect(c.locator('.ai-prompt-box pre')).toContainText('出力形式');
  await c.locator('.ai-result-area').fill('- 連想先: E2E新連想ワード / 理由: E2E理由テキスト');
  await c.getByRole('button', { name: '仮説に取り込む' }).click();
  await expect(c).toContainText('連想 1 件');
  await expect(c).toContainText('E2E新連想ワード');

  await c.getByRole('button', { name: /失敗条件を追加/ }).click();
  await c.locator('.ai-result-area').fill('- E2E新失敗条件');
  await c.getByRole('button', { name: '仮説に取り込む' }).click();
  await expect(c).toContainText('E2E新失敗条件');

  const h = (await readStore(page)).hypotheses.find(x => x.title === title)!;
  expect(h.associationSteps.some(s => s.label === 'E2E新連想ワード')).toBe(true);
  expect(h.invalidationConditions).toContain('E2E新失敗条件');
  expect(external).toEqual([]);
});
