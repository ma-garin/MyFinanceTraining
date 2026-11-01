# ADR-0001 テスト基盤の選定

- Status: Accepted
- 日付: 2026-11-01
- 人間承認: （空欄。承認者が記入）

## Context
自動テストと lint が無く、回帰を機械で検出できなかった（RISK-01）。GitHub Pages の base パス（/MyFinanceTraining/）配下での動作も確認したい。

## Decision
Vitest 5.0.5 + jsdom 30.1.3 + Testing Library（react 16.3.3 / jest-dom 7.0.1 / user-event 14.6.8）、Playwright 1.64.1（chromium・Pixel 7・port 4179 で build+preview・SW block）、ESLint 10 flat config + typescript-eslint 8.72 + react-hooks 7 を採用。Vite と設定・変換を共有でき追加ビルド設定が不要。RTL は利用者視点のロケータ。Playwright は preview で Pages の base パスを再現できる。Node >=22.12（vitest 5 / jsdom 30 の要件）。依存は package.json で完全固定（latest 廃止）。scripts は typecheck / lint / test / test:e2e / build。

## Consequences
- Node 要件が上がる（deploy は Node 24）。
- 依存更新は意図的に行う必要がある。
- E2E は所要時間が長いため deploy には含めず手動実行とする。

## Alternatives
- Jest: Vite と変換設定が二重になる。
- Cypress: preview での base パス再現と軽さで Playwright に劣後。
- E2E なし: ナビ・SW・永続化の結合を検出できない。
