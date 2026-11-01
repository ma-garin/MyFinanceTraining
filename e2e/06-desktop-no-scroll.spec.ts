import { test, expect, type Page } from '@playwright/test';
import { blockExternal, STORE_KEY } from './helpers';

const VIEWS = ['ダッシュボード', 'イベント', '連想ツリー', '仮説詳細', 'バックテスト', 'レポート', '設定'];
// 961x540 は対応する最小サイズ（spec NFR-DESK）。低い画面・一般的なノート PC・外部モニタを必ず含める
const SIZES = [{ width: 961, height: 540 }, { width: 1280, height: 600 }, { width: 1366, height: 657 }, { width: 1920, height: 969 }];

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

    if (el.scrollWidth > el.clientWidth + 1 && cs.textOverflow !== 'ellipsis' && ['auto', 'scroll', 'hidden', 'clip'].includes(cs.overflowX)) {
      out.push(`clipped-x ${el.tagName.toLowerCase()}.${[...el.classList].join('.')} ${el.scrollWidth}>${el.clientWidth}`);
    }
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      let a = el.parentElement;
      while (a && a !== document.body && ['visible'].includes(getComputedStyle(a).overflowX) && getComputedStyle(a).overflowY === 'visible') a = a.parentElement;
      if (a && a !== document.body) {
        const ar = a.getBoundingClientRect();
        if (r.right > ar.right + 1 || r.bottom > ar.bottom + 1 || r.left < ar.left - 1) {
          out.push(`outside ${el.tagName.toLowerCase()}.${[...el.classList].join('.')} in ${a.tagName.toLowerCase()}.${[...a.classList].join('.')}`);
        }
      }
    }
    if (el.getAttribute('role') === 'tab') {
      const rg = document.createRange();
      rg.selectNodeContents(el);
      if (new Set([...rg.getClientRects()].map(c => Math.round(c.top))).size > 1) out.push(`wrapped-tab ${el.textContent}`);
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

// 画面ごとに、最初のタブだけでなく全タブを開いて検査する（2 つ目以降のタブの見切れを見逃さない）
async function viewProblems(page: Page, label: string): Promise<string[]> {
  await page.locator('.sidebar .nav-btn', { hasText: label }).click();
  await page.waitForTimeout(250);
  const out = (await overflowProblems(page)).map(p => `${label}: ${p}`);
  const tabs = page.locator('.content [role="tab"]');
  for (let t = 1; t < await tabs.count(); t++) {
    await tabs.nth(t).click();
    await page.waitForTimeout(120);
    const name = (await tabs.nth(t).innerText()).trim();
    out.push(...(await overflowProblems(page)).map(p => `${label}[${name}]: ${p}`));
  }
  return out;
}

for (const heavy of [false, true]) {
  for (const size of SIZES) {
    test(`PC ${size.width}x${size.height} で全画面・全タブがスクロールなしで収まる（${heavy ? '大量データ' : 'サンプル'}）`, async ({ page }) => {
      await page.setViewportSize(size);
      await openApp(page, heavy);
      const problems: string[] = [];
      for (const label of VIEWS) problems.push(...await viewProblems(page, label));
      expect(problems).toEqual([]);
    });
  }
}
