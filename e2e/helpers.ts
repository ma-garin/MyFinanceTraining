import { expect, type Page } from '@playwright/test';

export const STORE_KEY = 'myfinancetraining_v1';

type Stored = {
  events: { id: string; title: string }[];
  hypotheses: { id: string; title: string; eventId: string; status: string; associationSteps: { label: string }[]; invalidationConditions: string[] }[];
};

// 外部通信は発生させない。発生したら失敗させるため abort する
export async function blockExternal(page: Page) {
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, route => route.abort());
}

export async function resetApp(page: Page) {
  await blockExternal(page);
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('nav.bottom-nav')).toBeVisible();
}

export async function go(page: Page, mobileLabel: string) {
  await page.locator('nav.bottom-nav').getByRole('button', { name: new RegExp(`${mobileLabel}$`) }).click();
}

export async function readStore(page: Page): Promise<Stored> {
  // 保存は 300ms デバウンスされるため待つ
  await page.waitForTimeout(600);
  const raw = await page.evaluate(k => localStorage.getItem(k), STORE_KEY);
  return JSON.parse(raw ?? '{"events":[],"hypotheses":[]}') as Stored;
}

export const card = (page: Page, title: string) =>
  page.locator('article.hypothesis-card').filter({ hasText: title });

export async function addEvent(page: Page, title: string) {
  await go(page, '入力');
  await page.getByLabel('タイトル *').fill(title);
  await page.getByLabel('概要 *').fill('E2Eで追加したイベントの概要');
  await page.getByRole('button', { name: '追加する' }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
}

export async function addHypothesis(page: Page, title: string, eventId?: string) {
  await go(page, '仮説');
  await page.getByRole('button', { name: '＋ 仮説を追加' }).click();
  await page.getByLabel('仮説タイトル *').fill(title);
  if (eventId) await page.getByLabel('起点イベント').selectOption(eventId);
  await page.getByPlaceholder('ニュース・起点イベント *').fill('起点ニュース');
  for (let i = 2; i <= 3; i++) await page.getByPlaceholder(`第${i}段階の連想`).fill(`連想${i}`);
  await page.getByLabel('失敗条件（1行1件）').fill('条件A\n条件B');
  await page.getByRole('button', { name: '仮説を登録' }).click();
  await expect(card(page, title)).toBeVisible();
}
