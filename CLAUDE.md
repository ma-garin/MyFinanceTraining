# MyFinanceTraining — Claude Code Instructions

> **最初に `docs/spec/spec.md` を読む**（現行コードの仕様の真実源）。コード全体を再スキャンせず、同ファイル §2 のファイル地図で対象を絞ってから読む。src を変更したら同じ PR で spec.md を更新する。

## プロジェクト概要

ニュース・市場イベントから連想ツリーを生成し、日本株/ETF/ETNの投資仮説を管理・検証する個人向け「投資仮説OS」。

**このツールは投資助言・売買自動化ツールではない。** 仮説管理・検証・判断補助ツール。

### 連想フローの核心
```
ニュース → 直接影響 → 行動変化 → 需要/供給変化 → 業種変化 → 候補銘柄/ETF
```

## 起動コマンド

```bash
npm install       # 初回のみ
npm run dev       # 開発サーバー起動 (http://localhost:5173/MyFinanceTraining/)
npm run build     # 本番ビルド
npm run preview   # ビルド後のプレビュー
```

## 技術スタック

- **フレームワーク**: React 19 + TypeScript + Vite
- **状態管理**: useState + localStorage（`myfinancetraining_v1` キー）
- **スタイル**: 素のCSS（`src/styles.css`）
- **PWA**: manifest + Service Worker（`public/sw.js`）

## ディレクトリ構造

ファイル単位の責務は `docs/spec/spec.md` §2.2（ファイル地図）が真実源。概略:

```
src/
  domain/          # 型・純粋ロジック（types, hypothesisRules, importDiff）
  application/     # ユースケース判定（aiApply）
  engine/          # ルールベース連想エンジン（rules, associationEngine）
  services/        # AI プロンプト・CSV 解析・バックテスト・レポート
  infrastructure/  # localStorage 保存（schema v2 移行）・AI 設定・SW 更新検知
  hooks/           # useStore / useAiSettings / useToast
  components/      # フォーム・カード・AI 深掘り・ツリー・shell（ナビ等）
  views/           # 7 画面（Dashboard, EventInput, AssociationTree, HypothesisDetail, Backtest, Report, Settings）
  ui/ utils/ data/ test/
public/sw.js       # Service Worker
e2e/               # Playwright（port 4179）
```

## データモデル

```typescript
MarketEvent    // ニュース・市場イベント
AssociationStep // 連想ステップ (depth: 1〜5, label, reason)
Hypothesis     // 投資仮説 (steps + status + invalidationConditions)
TargetTheme    // 対象テーマ (半導体/小売/防衛 etc.)
HypothesisStatus // 'adopted' | 'watching' | 'rejected' | 'needs_test'
```

## 設計方針

1. **AIは常時使わない**: ルールベース + 手入力が基本。AIは深掘り・反論・失敗条件生成のみ
2. **不変性の徹底**: state を直接変更しない。`setState(prev => {...prev, ...})` パターン
3. **抽象化された保存層**: `storage.ts` を経由。将来 IndexedDB へ移行可能
4. **投資助言文言を避ける**: 「仮説」「検証」「失敗条件」「判断補助」を使う
5. **スマホ幅必須**: 全コンポーネントで `max-width: 520px` の表示確認

## 実装状況

- v1.0.0 リリース済み（#4〜#7 のルールベース連想・AI 深掘り・CSV バックテスト・レポートを含む）。詳細は `docs/roadmap.md`
- 既知の制約: バックテストの営業日計算は土日のみ除外し、祝日は考慮しない（BUG-17）

## コーディングルール

- ファイル上限: 800行
- 関数上限: 50行
- TypeScript strict モード必須
- コメントは WHY のみ（WHAT は書かない）
- `any` 型禁止
