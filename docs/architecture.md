# アーキテクチャ

## 推奨構成

初期版は、スマホ/PC両対応のPWAとして作る。

```text
React + Vite + PWA
IndexedDB
ルールベースエンジン
任意AI API連携
CSVバックテスト準備
```

## 全体像

```text
[User]
  ↓
[PWA UI]
  ↓
[Event Input]
  ↓
[Rule Engine] ── [Template DB]
  ↓
[Association Tree]
  ↓
[Hypothesis DB]
  ↓
[Theme/Symbol Master]
  ↓
[Manual Review / AI Deep Dive]
  ↓
[Backtest Preparation]
```

## 技術スタック案

| 領域 | 技術 | 理由 |
|---|---|---|
| UI | React | スマホ/PCの画面制御がしやすい |
| Build | Vite | 軽量、PWA化しやすい |
| PWA | vite-plugin-pwa | オフライン対応、ホーム画面追加 |
| Local DB | IndexedDB | 仮説、ツリー、検証結果を端末保存できる |
| State | Zustand または React Context | MVPでは軽量で十分 |
| Backtest | CSV + Python または JS | 初期はCSVで十分 |
| AI | Gemini/OpenAI任意設定 | 必要時のみ呼ぶ |

## データ保存方針

初期版は端末内保存を優先する。

- Event
- AssociationNode
- Hypothesis
- TargetTheme
- AI実行履歴
- 採否履歴

将来、必要になったらエクスポート/インポートを追加する。

## ルールベース処理

AIを使わず、以下はルールで処理する。

- キーワード分類
- 既存テンプレート照合
- 日本株テーマ候補抽出
- 影響方向の初期推定
- スコア計算
- 同一イベントの重複検知

例：

```text
中東, 原油, ホルムズ海峡, イラン, イスラエル
→ 原油/防衛/商社/海運/金/ゲーム/旅行警戒
```

## AI利用ポイント

AIは以下だけに限定する。

- 5段階連想ツリーの追加生成
- 失敗条件の生成
- 反対シナリオの生成
- 未登録テーマの補完
- 仮説IDの命名補助

## 画面構成案

| 画面 | 目的 |
|---|---|
| Dashboard | 注目イベント、採用仮説、保留仮説を見る |
| Event Input | ニュース/イベントを登録する |
| Association Tree | 5段階連想を編集する |
| Hypothesis Detail | 仮説ID、根拠、失敗条件、対象テーマを管理する |
| Theme Master | 日本株テーマと代表銘柄を管理する |
| AI Deep Dive | 必要時のみAIで深掘りする |
| Settings | APIキー、上限、保存設定を管理する |

## セキュリティ/コスト方針

- APIキーはユーザー端末側に保存する
- 初期版ではサーバーを持たない
- AI呼び出しは手動実行のみ
- 1日/1回/月の上限を持つ
- 同じ入力はキャッシュする

## 将来拡張

- CSVバックテスト
- 株価/指数データ取り込み
- 仮説ごとの成績管理
- GitHub Pagesデプロイ
- エクスポート/インポート
- ニュースAPI連携
- 複数LLM比較