# MyFinanceTraining — Claude Code Instructions

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

```
src/
  domain/types.ts          # ドメイン型定義（MarketEvent, Hypothesis, etc.）
  infrastructure/storage.ts # localStorage 読み書き抽象層
  hooks/useStore.ts         # アプリ状態管理フック
  data/sampleData.ts        # 初期サンプルデータ（initialState）
  components/
    EventForm.tsx           # イベント追加フォーム
    HypothesisForm.tsx      # 仮説追加フォーム（5段階ステップ）
    HypothesisCard.tsx      # 仮説カード + ステータスボタン
  App.tsx                   # ビュー切り替え + レイアウト
  styles.css                # 全スタイル
  vite-env.d.ts             # Vite型参照
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

## 実装済み Issue

- [x] #1 Design docs
- [x] #8 PWA foundation (React + Vite + TypeScript)
- [x] #4 データモデル + localStorage + フォーム UI

## 次の Issue

- [ ] #5 ルールベース連想エンジン
- [ ] #6 AI ディープダイブワークフロー（オプション）
- [ ] #7 CSV バックテストワークフロー

## コーディングルール

- ファイル上限: 800行
- 関数上限: 50行
- TypeScript strict モード必須
- コメントは WHY のみ（WHAT は書かない）
- `any` 型禁止
