# ADR-0002 Service Worker 方針の変更

- Status: Accepted
- 日付: 2026-11-01
- 人間承認: （空欄。承認者が記入）

## Context
SW が全 GET を Stale-While-Revalidate で配信していたため、デプロイ直後は 1 回前の版が表示された（旧 BUG-11）。

## Decision
キャッシュ名を v3 に上げ、navigation は network-first（オフライン時はキャッシュへフォールバック）、静的資産は SWR とする。更新通知 UI は作らない（skipWaiting と clients.claim により次回起動時に新版が反映されるため）。

## Consequences
- 通常時はオンラインで最新の HTML を取得でき、オフラインも維持される。
- 更新通知が無く、利用中の画面は切り替わらない（RISK-02）。

## Alternatives
- 全面 SWR 継続: 旧版表示が残る。
- 更新通知 UI: 実装範囲が増えるため defer。
- vite-plugin-pwa: 手書き SW を維持する方針のため見送り。
