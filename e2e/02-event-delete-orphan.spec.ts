import { test, expect } from '@playwright/test';
import { resetApp, addEvent, addHypothesis, go, readStore, card } from './helpers';

test('E2E-02 イベント削除後も紐付き仮説は残り eventId が空になる', async ({ page }) => {
  await resetApp(page);
  await addEvent(page, '削除対象イベント');
  const ev = (await readStore(page)).events.find(e => e.title === '削除対象イベント')!;
  const title = '孤児化する仮説';
  await addHypothesis(page, title, ev.id);
  expect((await readStore(page)).hypotheses.find(h => h.title === title)?.eventId).toBe(ev.id);

  await go(page, '入力');
  const item = page.locator('.list-item').filter({ hasText: '削除対象イベント' });
  await item.getByRole('button', { name: '削除', exact: true }).click();
  await item.getByRole('button', { name: '削除確定' }).click();
  await expect(page.getByRole('heading', { name: '削除対象イベント' })).toHaveCount(0);

  const s = await readStore(page);
  expect(s.events.some(e => e.id === ev.id)).toBe(false);
  expect(s.hypotheses.find(h => h.title === title)?.eventId).toBe('');
  await go(page, '仮説');
  await expect(card(page, title)).toBeVisible();
});
