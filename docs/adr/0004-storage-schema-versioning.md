# ADR-0004 保存層は localStorage を継続し、スキーマ版で移行する

- Status: Accepted
- 日付: 2026-11-01
- 人間承認: （空欄。承認者が記入）

## Context
v1.0 で仮説に採否の履歴（statusHistory）を加えた。保存形式が変わるため、旧データの読み込みと将来の変更に備えた移行の仕組みが要る。ロードマップでは IndexedDB への移行も候補だった。

## Decision
- 保存先は localStorage（`myfinancetraining_v1`）を継続する。
- `AppState.version` をスキーマ版とし、現行は `CURRENT_SCHEMA_VERSION = 2`。version 無しは 1 とみなす。
- 読み込み時（起動・インポート共通の parseStateJson）に migrateState で現行版へ上げる。v1→v2 は statusHistory を空配列で補う。
- 現行より新しい版のデータは読み込まず、理由を表示する（不明な項目を落として保存し直すと失うため）。
- インポートは直前の状態を 1 世代メモリに保持し、「取り込みを元に戻す」で戻せる（再読み込みで消える）。

## Consequences
- 旧データはそのまま読める。版を上げるたびに migrateState に段を足す。
- 容量の上限（約 5MB）は残る。仮説数百件規模では問題にならない想定（未計測）。
- 元に戻すはセッション内だけ。恒久の退避はエクスポートで行う。

## Alternatives
- IndexedDB へ移行: 起動処理が非同期になり、ADR-0003 の復旧処理を作り直す必要がある。v1.0 の要件に容量の不足が無いため見送る。
- 版を持たない: 形式変更のたびに読み込みで壊れる恐れ。
