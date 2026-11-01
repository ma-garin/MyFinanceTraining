# ADR-0003 エラー復旧方式（破損データ時の保存停止と退避）

- Status: Accepted
- 日付: 2026-11-01
- 人間承認: （空欄。承認者が記入）

## Context
保存データの JSON が壊れていると、サンプルで起動して自動保存が元データを上書きしていた（旧 BUG-06）。

## Decision
loadState は empty / ok / corrupt を返す。corrupt のとき autosave を停止し復旧画面を出す。利用者は破損データをダウンロードするか、別キー myfinancetraining_v1_corrupt_<epoch ms> へ退避して初期化できる。退避に失敗した場合は初期化しない。保存失敗は saveError の常時バナーで通知し、AI 側の保存失敗も取り込み時に表示する。

## Consequences
- 元データが自動で失われない。
- 破損時は利用者の操作が 1 回必要になる。
- 退避キーが localStorage 容量を消費する。

## Alternatives
- 常にサンプルで起動: データ喪失の恐れ。
- 自動修復: 誤修復の恐れがあり仮説データの信頼性を損なう。
