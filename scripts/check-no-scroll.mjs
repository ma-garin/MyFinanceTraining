// PC 幅で全画面が「スクロールなし・はみ出しなし」かを確かめる。
// 使い方: node scripts/check-no-scroll.mjs [--port 4191] [--views report,settings] [--out <dir>] [--sizes 1280x650,1000x560]
// vite の開発サーバをこのスクリプト内で起動し、終わったら止める（利用者の 5173 には触らない）
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: { port: { type: 'string', default: '4191' }, views: { type: 'string', default: '' }, out: { type: 'string', default: '' }, sizes: { type: 'string', default: '' } } });
const VIEWS = [['dashboard', 'ダッシュボード'], ['event-input', 'イベント'], ['association-tree', '連想ツリー'], ['hypothesis-detail', '仮説詳細'], ['backtest', 'バックテスト'], ['report', 'レポート'], ['settings', '設定']];
const only = values.views ? values.views.split(',') : null;
// 961x540 は対応する最小サイズ（NFR-DESK）。低い画面と一般的なノート PC・外部モニタを含める
const DEFAULT_SIZES = '961x540,1100x620,1280x600,1366x657,1920x969';
const VIEWPORTS = (values.sizes || DEFAULT_SIZES).split(',').map(s => { const [width, height] = s.split('x').map(Number); return { width, height }; });
const KEY = 'myfinancetraining_v1';

const inflate = (raw) => {
  const s = JSON.parse(raw);
  const events = [], hypotheses = [];
  for (let i = 0; i < 15; i++) {
    for (const e of s.events) events.push({ ...e, id: `${e.id}-x${i}`, title: `${e.title}（複製${i}）` });
    for (const h of s.hypotheses) hypotheses.push({
      ...h, id: `${h.id}-x${i}`, eventId: h.eventId ? `${h.eventId}-x${i}` : '', title: `${h.title}（複製${i}）`,
      verificationLogs: Array.from({ length: 12 }, (_, k) => ({ id: `vl-${i}-${k}`, loggedAt: '2026-10-01', result: k % 2 ? 'hit' : 'miss', note: `検証メモ ${k}` })),
      statusHistory: Array.from({ length: 6 }, (_, k) => ({ date: `2026-10-0${k + 1}T00:00:00.000Z`, from: 'watching', to: 'needs_test', reason: `理由 ${k}` })),
    });
  }
  return JSON.stringify({ ...s, events, hypotheses });
};

// 画面外へのはみ出しと、overflow で切られて見えない中身を数える（1px は丸め誤差として許す）
const inspect = () => {
  const de = document.documentElement;
  const problems = [];
  if (de.scrollHeight > innerHeight + 1) problems.push(`page scrollHeight ${de.scrollHeight} > ${innerHeight}`);
  if (de.scrollWidth > innerWidth + 1) problems.push(`page scrollWidth ${de.scrollWidth} > ${innerWidth}`);
  for (const el of [document.querySelector('.content'), ...document.querySelectorAll('.content *')]) {
    if (!el) continue;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || el.closest('.row-item')) continue;
    if (el.scrollHeight > el.clientHeight + 1 && ['auto', 'scroll', 'hidden', 'clip'].includes(cs.overflowY)) {
      const tag = `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`;
      problems.push(`${cs.overflowY === 'hidden' || cs.overflowY === 'clip' ? 'clipped' : 'scroll'} ${tag} ${el.scrollHeight}>${el.clientHeight}`);
    }

    if (el.scrollWidth > el.clientWidth + 1 && cs.textOverflow !== 'ellipsis' && ['auto', 'scroll', 'hidden', 'clip'].includes(cs.overflowX)) {
      problems.push(`clipped-x ${el.tagName.toLowerCase()}.${[...el.classList].join('.')} ${el.scrollWidth}>${el.clientWidth}`);
    }
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      let a = el.parentElement;
      while (a && a !== document.body && ['visible'].includes(getComputedStyle(a).overflowX) && getComputedStyle(a).overflowY === 'visible') a = a.parentElement;
      if (a && a !== document.body) {
        const ar = a.getBoundingClientRect();
        if (r.right > ar.right + 1 || r.bottom > ar.bottom + 1 || r.left < ar.left - 1) {
          problems.push(`outside ${el.tagName.toLowerCase()}.${[...el.classList].join('.')} in ${a.tagName.toLowerCase()}.${[...a.classList].join('.')}`);
        }
      }
    }
    if (el.getAttribute('role') === 'tab') {
      const rg = document.createRange();
      rg.selectNodeContents(el);
      if (new Set([...rg.getClientRects()].map(c => Math.round(c.top))).size > 1) problems.push(`wrapped-tab ${el.textContent}`);
    }
  }
  return problems;
};

const server = await createServer({ server: { host: '127.0.0.1', port: Number(values.port), strictPort: true, open: false }, logLevel: 'error' });
await server.listen();
const base = `http://127.0.0.1:${values.port}/MyFinanceTraining/`;
const browser = await chromium.launch({ headless: true });
let fail = 0, checked = 0;
try {
  for (const dataset of ['sample', 'heavy']) {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: vp, serviceWorkers: 'block' });
      const page = await ctx.newPage();
      page.on('pageerror', (e) => console.log(`pageerror ${dataset} ${vp.width}: ${e.message}`));
      await page.goto(base);
      await page.waitForTimeout(700);
      if (dataset === 'heavy') {
        const raw = await page.evaluate((k) => localStorage.getItem(k), KEY);
        await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, inflate(raw)]);
        await page.reload();
      }
      for (const [view, label] of VIEWS) {
        if (only && !only.includes(view)) continue;
        await page.locator('.sidebar .nav-btn', { hasText: label }).click();
        await page.waitForTimeout(250);
        const errs = await page.locator('text=問題が発生しました').count();
        const problems = await page.evaluate(inspect);
        if (errs) problems.push('error screen shown');
        // 最初のタブだけでなく、全タブを開いて同じ検査をする（2 つ目以降のタブの見切れを見逃さない）
        const tabs = page.locator('.content [role="tab"]');
        for (let t = 1; t < await tabs.count(); t++) {
          await tabs.nth(t).click();
          await page.waitForTimeout(120);
          const name = (await tabs.nth(t).innerText()).trim();
          for (const p of await page.evaluate(inspect)) problems.push(`[tab ${name}] ${p}`);
        }
        checked++;
        const tag = `${dataset} ${vp.width}x${vp.height} ${view}`;
        if (values.out) await page.screenshot({ path: `${values.out}/${view}-${dataset}-${vp.width}x${vp.height}.png` });
        if (problems.length) { fail++; console.log(`NG ${tag}\n  ${problems.slice(0, 8).join('\n  ')}`); } else console.log(`OK ${tag}`);
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  await server.close();
}
console.log(`checked=${checked} NG=${fail}`);
process.exit(fail ? 1 : 0);
