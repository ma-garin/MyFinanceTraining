# MyFinanceTraining 仕様書（As-Built Spec）

- 基準コミット: `4f38825`（2026-11-01 v1.0.0 マージ時点の main）
- 位置づけ: **現行コードから逆起こしした仕様の真実源**。AIDD の各工程はまずこのファイルを読み、コード全体の再スキャンをしない
- 対象範囲: `src/` 全体・`public/`・`vite.config.ts`・`package.json`・`.github/workflows/deploy.yml`・`docs/*.md`

---

## 0. このファイルの使い方（AIDD 運用ルール）

| 場面 | やること |
|---|---|
| 新しいセッションを始める | 本ファイルの §1〜§3 を読む。コードは §2 のファイル地図で対象を特定してから、そのファイルだけ読む |
| 機能を追加・変更する | 該当する FR-ID の節を読む → 実装 → **同じ PR で本ファイルの該当節と §10（変更履歴）を更新** |
| 不具合を直す | §9 の既知不具合 ID（BUG-xx）を参照。直したら §9 から削除し §10 に記録 |
| 設計ドキュメント（`docs/*.md`）と食い違う | **本ファイルが現状、`docs/*.md` は構想**。差分は §8 に一覧 |
| 基準コミットとずれた | `git diff 8f6ab6e --stat -- src public` で変更ファイルを確認し、その節だけ更新して基準コミットを書き換える |

更新の判定基準: `src/domain/types.ts`・`src/hooks/*`・`src/infrastructure/*`・`src/engine/*`・`src/services/*` を変更したら必ず本ファイルを更新する。CSS だけの変更は §6 の画面仕様に影響が出たときだけ更新する。

---

## 1. プロダクト概要

| 項目 | 内容 |
|---|---|
| 名称 | MyFinanceTraining（画面表示名「投資仮説OS」、PWA short_name「FinanceOS」） |
| 一文定義 | 世界のニュース・市場イベントを起点に 3〜5 段階の連想ツリーを作り、日本株/ETF/ETN の投資仮説を管理・検証する個人向けツール |
| 利用者 | 開発者本人 1 名（個人利用。認証なし・サーバなし） |
| 対象市場（出力） | 日本株・東証 ETF/ETN・J-REIT |
| 入力情報 | 米国指標・金利・為替・商品・地政学・決算などの世界のイベント |
| しないこと | 投資助言・売買の自動執行・リアルタイム株価取得・常時 AI 呼び出し |

### 1.1 中核フロー

```
ニュース(MarketEvent)
  → ルールベース連想（テンプレート照合）／手入力
  → 連想ステップ 1〜5（AssociationStep）
  → 仮説（Hypothesis: 方向性・テーマ・候補銘柄・失敗条件・緊急度）
  → 任意: AI 深掘り（プロンプトをコピー → 外部 AI → 結果を貼り付けて取り込み）
  → 検証: 検証ログ（的中/外れ/様子見）・CSV バックテスト（T+1/3/5）
  → ステータス判定（採用 / 様子見 / 棄却 / 要検証）
```

### 1.2 設計原則（コードで守られている事項）

1. **AI は常時使わない**: AI 連携は API 呼び出しをせず、プロンプトのコピー＆貼り付けのみ（APIキー不要）
2. **不変更新**: state は `setState(prev => ({...prev, ...}))` で新しいオブジェクトを作る
3. **保存層の抽象化**: 永続化は `src/infrastructure/` を経由する
4. **投資助言文言を避ける**: 「仮説」「検証」「失敗条件」「判断補助」を使う。AI プロンプトにも「投資助言・売買推奨は含めない」を明記
5. **スマホ幅対応**: モバイルヘッダー＋ボトムナビ、デスクトップはサイドバー

---

## 2. 技術構成とファイル地図

### 2.1 スタック

| 領域 | 採用 | 備考 |
|---|---|---|
| UI | React 19＋ TypeScript strict（依存は `package.json` で完全固定） | `src/main.tsx` で StrictMode |
| ビルド | Vite（`base: '/MyFinanceTraining/'`） | `npm run build` = `tsc && vite build`。Node >=22.12 |
| 状態 | `useState` ＋ カスタムフック | 外部状態ライブラリなし |
| 永続化 | localStorage（300ms デバウンス保存） | IndexedDB は導入せず localStorage 継続（ADR-0004） |
| PWA | 手書き `public/sw.js`＋`manifest.webmanifest` | vite-plugin-pwa は未使用 |
| スタイル | 素の CSS（`styles.css` 1015 行＋`styles-extra.css` 429 行） | `data-theme` でライト/ダーク |
| デプロイ | GitHub Actions → GitHub Pages（main への push で自動。build 前に typecheck/lint/test） | Node 24。`ci.yml` は手動起動のみ |
| 単体・結合テスト | Vitest 5.0.5 ＋ jsdom 30.1.3 ＋ Testing Library（react 16.3.3 / jest-dom 7.0.1 / user-event 14.6.8） | `npm test`。選定理由は ADR-0001 |
| E2E | Playwright 1.64.1（chromium・Pixel 7・port 4179 で build＋preview・SW block） | `npm run test:e2e` |
| lint・型 | ESLint 10 flat config ＋ typescript-eslint 8.72 ＋ react-hooks 7／`tsc` | `npm run lint` / `npm run typecheck` |

### 2.2 ファイル地図（行数は基準コミット時点）

| ファイル | 行 | 責務 | 関連 FR |
|---|---|---|---|
| `src/main.tsx` | 19 | ルート描画・SW 登録 | NFR-PWA |
| `src/App.tsx` | 196 | シェル・ナビ・state 配線のみ | 全 FR |
| `src/views/{Dashboard,EventInput,AssociationTree,HypothesisDetail,Backtest,Report,Settings}View.tsx` | — | 7 画面の描画 | 全 FR |
| `src/components/shell/{nav.ts,MobileHeader,BottomNav,ToastContainer,RecoveryScreen}.tsx` | — | ナビ定義・ヘッダー・下部タブ・トースト・破損データ復旧画面 | FR-DM, BUG-06 |
| `src/components/ImportConfirm.tsx` | 48 | インポート前の差分確認パネル（`diffStates` の結果を表示） | FR-DM-03 |
| `src/domain/importDiff.ts` | 47 | `diffStates`（events/hypotheses を id で比較） | FR-DM-03 |
| `src/components/StatusChangeForm.tsx` | 45 | ステータス変更の判断理由入力フォーム | FR-HY-11 |
| `src/components/StatusHistory.tsx` | 23 | 採否履歴の表示（新しい順） | FR-HY-11 |
| `src/services/reportService.ts` | 93 | レポート集計・Markdown 生成 | FR-RP |
| `src/views/ReportView.tsx` | 112 | レポート画面 | FR-RP |
| `src/infrastructure/swUpdate.ts` | 37 | SW の更新検知・`SKIP_WAITING` 送信・reload | NFR-PWA |
| `src/components/shell/UpdateBanner.tsx` | 19 | 「新しいバージョンがあります」バナー | NFR-PWA |
| `src/ui/labels.ts` | — | category/status/urgency/direction/vlog のラベルと status 色の単一出所 | 共通 |
| `src/domain/hypothesisRules.ts` | — | `buildSteps` / `normalizeStepDepths` / `mergeAiResult` | FR-HY, FR-AI |
| `src/application/aiApply.ts` | — | `decideAiApply`（AI 取り込み可否の判定） | FR-AI |
| `src/domain/types.ts` | 131 | ドメイン型定義 | §3 |
| `src/hooks/useStore.ts` | 103 | AppState の CRUD と自動保存 | FR-EV, FR-HY, FR-VL, FR-AI |
| `src/hooks/useAiSettings.ts` | 40 | AI 上限設定・使用回数 | FR-AI |
| `src/hooks/useToast.ts` | 23 | トースト通知（取り消し付き） | FR-HY-04 |
| `src/infrastructure/storage.ts` | 73 | AppState の load/save・検証・JSON 入出力 | FR-DM |
| `src/infrastructure/aiStorage.ts` | 53 | AI 設定・使用回数・キャッシュの保存 | FR-AI |
| `src/engine/rules.ts` | 255 | 連想テンプレート 15 件（静的データ） | FR-RB |
| `src/engine/associationEngine.ts` | 38 | テンプレートのスコアリングと適用 | FR-RB |
| `src/services/aiService.ts` | 74 | AI プロンプト生成・貼り付け結果の解析 | FR-AI |
| `src/services/csvParser.ts` | 47 | 価格/イベント CSV の解析・サンプル | FR-BT |
| `src/services/backtestEngine.ts` | 117 | T+n リターン計算・銘柄別サマリー | FR-BT |
| `src/utils/dateUtils.ts` | — | Asia/Tokyo 固定の `toTokyoDateStr` / `todayStr` / `monthStr` / `isoToTokyoDateStr` | 共通 |
| `src/data/sampleData.ts` | 108 | 初期データ（イベント 2・仮説 2・テーマ 6） | FR-DM-04 |
| `src/components/EventForm.tsx` | 105 | イベント追加フォーム | FR-EV |
| `src/components/HypothesisForm.tsx` | 251 | 仮説追加フォーム（テンプレート提案付き） | FR-HY, FR-RB |
| `src/components/HypothesisCard.tsx` | 259 | 仮説カード（表示・ステータス・削除・検証ログ・AI） | FR-HY, FR-VL, FR-AI |
| `src/components/AiDeepDive.tsx` | 116 | AI 深掘りパネル | FR-AI |
| `src/components/EventTree.tsx` | 136 | イベント→仮説のツリー表示 | FR-TR |
| `src/hooks/{useIsDesktop,usePaged,useFitCount}.ts` | 19/22/20 | PC 判定（`min-width: 961px`）・ページ送り・枠に収まる行数の計測 | NFR-DESK |
| `src/components/desktop/{Pager,SplitPane,Tabs}.tsx` | 17/17/36 | PC のページ送り・一覧＋詳細の 2 ペイン・タブ | NFR-DESK |
| `src/components/{PagedRows,HypothesisDetailPane,AiDeepDiveDesktop,HypothesisFormDesktop}.tsx` | 41/130/96/60 | PC の行ページ送り・仮説詳細タブ 7 種・AI 深掘り・4 段の仮説フォーム | NFR-DESK, FR-HY, FR-AI |
| `src/views/{AssociationTreeDesktop,HypothesisDetailDesktop}.tsx` | 131/66 | 連想ツリー・仮説詳細の PC 版 | NFR-DESK |
| `src/styles/desktop.css`・`src/styles/desktop/*.css` | 86/— | PC で画面全体・各枠のスクロールを止めるレイアウト | NFR-DESK |
| `scripts/check-no-scroll.mjs` | 84 | 7 画面 × 2 データ × 3 解像度のスクロール検査 | NFR-DESK |
| `public/sw.js` | — | Service Worker（navigation は network-first、静的資産は SWR） | NFR-PWA |
| `src/**/*.test.ts(x)`・`src/test/`・`playwright.config.ts`・`eslint.config.js` | — | テスト・lint 設定 | NFR-QA |

### 2.3 依存方向

```
components / App.tsx
   ↓
hooks (useStore, useAiSettings, useToast)
   ↓
infrastructure (storage, aiStorage)   engine (associationEngine → rules)   services (aiService, csvParser, backtestEngine)
   ↓                                     ↓                                   ↓
domain/types.ts ←──────────────── 全層が参照（domain は何にも依存しない）
```

`views/` は `components/` と同層。`application/aiApply.ts` は domain のみに依存する。

例外: `AiDeepDive.tsx` は `infrastructure/aiStorage` を直接呼ぶ（キャッシュ読み書き）。`views/SettingsView.tsx` 経由で `infrastructure/storage` の JSON 入出力を呼ぶ。

---

## 3. データモデル（`src/domain/types.ts`）

### 3.1 列挙型

| 型 | 値 | 表示ラベル |
|---|---|---|
| `EventCategory` | `geopolitics` / `macro` / `commodity` / `semiconductor` / `currency` / `consumer` / `other` | 地政学 / マクロ（フォームでは「マクロ経済」）/ コモディティ / 半導体 / 為替 / 消費者 / その他 |
| `Direction` | `up` / `down` / `mixed` / `watch` | ↑ 上昇 / ↓ 下落 / ↔ 混在 / ? 様子見 |
| `HypothesisStatus` | `adopted` / `watching` / `rejected` / `needs_test` | 採用 / 様子見 / 棄却 / 要検証 |
| `HypothesisUrgency` | `high` / `medium` / `low` | 🔴 今週中 / 🟡 今月中 / 🔵 長期（フォームでは「長期観察」） |
| `VerificationLogResult` | `hit` / `miss` / `pending` | ✓ 的中 / ✕ 外れ / ⏳ 様子見 |
| `AiPromptType` | `association_expand` / `counter_scenario` / `missing_angle` | 連想を深掘り / 失敗条件を追加 / 見落とし観点 |

### 3.2 エンティティ

```ts
MarketEvent {
  id: string            // 新規は `EVT-${Date.now()}`、サンプルは `event-001`
  title: string         // 必須
  category: EventCategory
  occurredAt: string    // YYYY-MM-DD
  summary: string       // 必須
}

AssociationStep {
  depth: 1|2|3|4|5      // 入力欄の位置（空欄を詰めても depth は詰めない → 欠番あり得る）
  label: string
  reason: string        // 空文字可
}

Hypothesis {
  id: string                       // 新規は `HYP-${Date.now()}`、サンプルは命名規則形式
  title: string                    // 必須
  eventId: string                  // 紐づくイベント ID。未選択・削除済みは ''
  expectedDirection: Direction
  targetThemes: string[]           // 自由文字列（TargetTheme.id とは非連携）
  candidateStocks: string[]        // "6857 アドバンテスト" 形式の自由文字列
  urgency: HypothesisUrgency
  associationSteps: AssociationStep[]   // 1〜5 件
  invalidationConditions: string[]      // 失敗条件
  status: HypothesisStatus              // 新規は常に 'needs_test'
  verificationLogs?: VerificationLog[]
  invalidationRules?: InvalidationRule[] // 型のみ定義。UI・ロジックとも未使用
  statusHistory?: StatusChange[]        // 採否の履歴（v1.0）。旧データは migration で []
}

StatusChange { date: ISO文字列, from: HypothesisStatus, to: HypothesisStatus, reason: string }

VerificationLog { id: `log-${Date.now()}`, loggedAt: YYYY-MM-DD, result, note }

InvalidationRule { condition: string, threshold?: { metric, operator: '>'|'<'|'>='|'<=', value: number } }  // 未使用

TargetTheme { id, name, description, examples[], positiveDrivers[], negativeDrivers[] }  // 編集 UI なし（読み取り専用）

AppState { version?: number /* スキーマ版。保存時は CURRENT_SCHEMA_VERSION=2。無しは 1 として扱う */, events[], hypotheses[], themes[] }
```

### 3.3 AI・バックテスト用の型

```ts
AiSettings     { dailyLimit: number, monthlyLimit: number }          // 既定 5 / 50
AiUsageRecord  { date: YYYY-MM-DD, month: YYYY-MM, dailyCount, monthlyCount }
AiCacheEntry   { key: `${hypothesisId}:${promptType}`, prompt, result, createdAt: ISO }

PriceRow         { date, ticker, close }
BacktestEventRow { hypothesisId, eventDate, ticker, notes }
BacktestResult   { hypothesisId, eventDate, ticker, notes, t1Return|null, t3Return|null, t5Return|null, maxDrawdown|null }
BacktestSummary  { ticker, count, winRate1/3/5, avgReturn1/3/5, stdDev1/3/5, maxDrawdown|null /* null 除外の最小 */, sampleWarning }  // backtestEngine.ts で定義
```

### 3.4 関連と参照整合性

- `Hypothesis.eventId → MarketEvent.id`（0..1）。イベント削除時・読み込み時に存在しない参照は `''` に置き換える（`sanitizeState`）
- `BacktestEventRow.hypothesisId` は仮説 ID と**照合しない**（任意文字列可）
- `targetThemes` と `TargetTheme` は**名前でも ID でも連携しない**

---

## 4. 永続化仕様

### 4.1 localStorage キー

| キー | 内容 | 読み書き |
|---|---|---|
| `myfinancetraining_v1` | `AppState`（JSON） | `storage.ts` |
| `mft_ai_settings` | `AiSettings` | `aiStorage.ts` |
| `mft_ai_usage` | `AiUsageRecord` | `aiStorage.ts` |
| `mft_ai_cache` | `AiCacheEntry[]`（上限なし・同一 key は上書き） | `aiStorage.ts` |
| `theme` | `'light'` / `'dark'` | `App.tsx` |

### 4.2 読み込み（`loadState`）

`loadState` は `{status:'empty'|'ok'|'corrupt'}` を返す。

1. `empty`（キー無し）→ `useStore` が `initialState`（サンプルデータ）で開始
2. `corrupt`（JSON 解析失敗・`isValidState` 不合格）→ **autosave を停止**し復旧画面（`RecoveryScreen`）を表示。選択肢は「破損データをダウンロード」「別キー `myfinancetraining_v1_corrupt_<epoch ms>` へ退避して初期化」。退避に失敗したら初期化しない（BUG-06 解消）
3. `ok`: `isValidState` は `events` / `hypotheses` / `themes` が配列であることだけを検査（要素の形は検査しない）
4. `sanitizeState`: 存在しない `eventId` を `''` に置換。`steps` の depth 重複を順序保持で 1..n に振り直す（5 件以下のとき）
5. `migrateState`: `CURRENT_SCHEMA_VERSION = 2`。`version` 無しは 1 とみなし、v1→v2 で各仮説の `statusHistory` を空配列で補完。現行より新しい版は「新しい版（vN）のデータのため読み込めません…」で拒否する
6. 起動時の読み込みとインポートは共通の `parseStateJson`（JSON 解析 → 検証 → sanitize → migrate）を通る。保存時は `version: 2` を付ける（ADR-0004）

### 4.3 保存（`saveState`）

- `state` が変わるたびに 300ms デバウンスで保存（`useStore` の `useEffect`）。`corrupt` 中は保存しない
- 失敗時は `useStore.saveError` を立て、常時バナーで通知（BUG-07 解消）。`aiStorage` の save 系は `boolean` を返し、AI 取り込み時に失敗を表示する。`theme` の保存は try で保護

### 4.4 JSON エクスポート / インポート（FR-DM-02, 03）

- エクスポート: `myfinancetraining-YYYY-MM-DD.json`（**東京日付**）を整形 JSON でダウンロード
- インポート: `FileReader`（`onerror` 対応）→ 解析成功後に現在と取り込みの差分（イベント・仮説それぞれ追加／削除／変更／同一の件数、仮説タイトル最大 5 件）を示す確認パネル（置き換える／キャンセル）→ `parseStateJson`（検証→sanitize→migrate）→ `replaceState` で全置換（マージなし）。確認パネルは `diffStates`（`src/domain/importDiff.ts`）の結果を表示する
- エラー文: 「無効なファイル形式です」「JSONの解析に失敗しました」をトースト「インポートエラー: …」で表示
- AI 設定・使用回数・キャッシュ・テーマ設定はエクスポート対象外

---

## 5. 機能要件（FR）

ID は本ファイル内で採番。`docs/requirements.md` の番号との対応は §8。

### FR-EV イベント管理（`EventForm.tsx`・`views/EventInputView.tsx`）

| ID | 仕様 |
|---|---|
| FR-EV-01 | タイトル・カテゴリ（既定 地政学）・発生日（既定 今日）・概要を入力して追加できる |
| FR-EV-02 | 検証: タイトル空 →「タイトルを入力してください」、概要空 →「概要を入力してください」。前後空白は除去して保存 |
| FR-EV-03 | 追加後フォームは初期化。登録済み一覧は**新しい順**に表示、件数を表示 |
| FR-EV-04 | 削除は 2 段階（削除 → キャンセル/削除確定）。削除すると紐づく仮説の `eventId` を `''` にする（仮説は残る）。トースト「イベントを削除しました」（取り消しなし） |
| FR-EV-05 | 0 件時「まだイベントがありません」 |

### FR-HY 仮説管理（`HypothesisForm.tsx`・`HypothesisCard.tsx`・`views/AssociationTreeView.tsx`・`views/HypothesisDetailView.tsx`）

| ID | 仕様 |
|---|---|
| FR-HY-01 | 入力項目: タイトル*・起点イベント（任意、選択肢は登録イベント）・方向性（既定 上昇）・緊急度（既定 今月中）・連想ステップ 5 行（ラベル＋理由）・対象テーマ（`,` または `、` 区切り）・候補銘柄（1 行 1 件）・失敗条件（1 行 1 件） |
| FR-HY-02 | 検証: タイトル空 →「仮説タイトルを入力してください」、ステップ 1 空 →「連想ステップ1を入力してください」。空ラベルのステップは除外（depth は入力行番号のまま） |
| FR-HY-03 | 登録時のステータスは `needs_test`、ID は `HYP-${Date.now()}`。登録後フォームを閉じる |
| FR-HY-04 | ステータスは 4 ボタンで変更。トースト「ステータスを「X」に変更しました」＋「取り消す」（3 秒、直前のステータスへ戻す。履歴には理由「直前の変更を取り消し」で残る） |
| FR-HY-05 | 削除は 2 段階確認。トースト「仮説を削除しました」（取り消しなし）。詳細画面では削除後に別の仮説を自動選択 |
| FR-HY-06 | 一覧（連想ツリー画面）は新しい順。フィルター: ステータス（全て/要検証/採用/様子見/棄却）× 緊急度（全期間/今週中/今月中/長期）。「n / 全件 件」を表示 |
| FR-HY-07 | 0 件時: 全体 0 件なら「仮説がありません。「仮説を追加」から登録してください。」、フィルター結果 0 件なら「フィルター条件に一致する仮説がありません。」 |
| FR-HY-08 | カード表示: ID・緊急度バッジ・タイトル・起点イベント（カテゴリバッジ付き）・ステータス・連想タイムライン・方向性・対象テーマ・候補銘柄チップ・失敗条件 |
| FR-HY-09 | 詳細画面: ドロップダウンで 1 件を選び同じカードを表示。初期選択は先頭の仮説 |
| FR-HY-10 | 仮説の**編集機能はない**（追加・ステータス変更・削除・AI 追記・検証ログ追加のみ） |
| FR-HY-11 | ステータスボタンを押すと `StatusChangeForm`（判断理由）を開く。採用・棄却は理由必須（空は保存不可）。確定すると `updateHypothesisStatus(id, status, reason)` が `statusHistory` に `StatusChange{date(ISO), from, to, reason}` を追記する。同じ status への変更は何もしない。`StatusHistory` が新しい順で表示する。トーストの取り消しも理由「直前の変更を取り消し」で履歴に残る |

### FR-RB ルールベース連想（`engine/`）

| ID | 仕様 |
|---|---|
| FR-RB-01 | 仮説フォームで起点イベントを選ぶと、そのイベントに合うテンプレートを提案チップで表示 |
| FR-RB-02 | スコア = カテゴリ一致 +2 ＋ キーワード 1 語一致ごとに +1（`title + summary` を小文字化して照合。日本語は部分一致、英数字だけの語は単語境界で一致＝`matchesKeyword`）。スコア > 0 を降順表示 |
| FR-RB-03 | チップを押すと、連想ステップ 5 行・対象テーマ・候補銘柄・失敗条件を**上書き**で自動入力（タイトル・方向性・緊急度は変えない）。適用中のチップを強調 |
| FR-RB-04 | 起点イベントを変えると適用中の強調を解除（入力済みの値は残る） |

テンプレート一覧（`rules.ts`、15 件。各 5 ステップ・失敗条件 3 件）:

| id | ラベル | カテゴリ |
|---|---|---|
| `mideast-conflict` | 中東情勢悪化 | geopolitics |
| `oil-surge` | 原油急騰 | commodity |
| `us-jobs-strong` | 米雇用統計上振れ | macro |
| `sox-plunge` | SOX急落 | semiconductor |
| `yen-weak` | 円安進行 | currency |
| `yen-strong` | 円高・日銀利上げ | currency, macro |
| `us-cpi` | 米CPI上昇（インフレ） | macro |
| `fomc-rate-cut` | FOMC利下げ・ハト派転換 | macro |
| `boj-policy-meeting` | 日銀政策決定会合（タカ派） | macro, currency |
| `inbound-surge` | インバウンド需要急増 | consumer |
| `china-economy-weak` | 中国経済指標悪化 | macro, geopolitics |
| `defense-budget-hike` | 防衛費増額・安保政策強化 | geopolitics |
| `yen-carry-unwind` | 円キャリー巻き戻し | currency, macro |
| `earnings-surprise-up` | 好決算サプライズ | other（候補銘柄なし） |
| `ai-demand-surge` | AI需要急拡大・DC投資増 | semiconductor |

注意: カテゴリ一致だけで +2 になるため、`macro` のイベントは常に 6 件以上が提案される（キーワード無関係）。

### FR-TR 連想ツリー表示（`EventTree.tsx`）

| ID | 仕様 |
|---|---|
| FR-TR-01 | 「🌲 ツリー表示」で開閉。イベントごとに紐づく仮説をステータス色付きで並べる。仮説が無いイベントは「仮説なし」 |
| FR-TR-02 | 仮説ノードを押すと連想ステップと失敗条件を展開（同時に 1 件だけ） |
| FR-TR-03 | 存在しないイベントに紐づく仮説（`eventId=''` を含む）は「イベント未紐付け」にまとめる |
| FR-TR-04 | イベント・仮説とも 0 件なら「イベントと仮説を登録するとツリーが表示されます」 |

ステータス色: 採用 `#16a34a` / 様子見 `#d97706` / 棄却 `#dc2626` / 要検証 `#7c3aed`

### FR-VL 検証ログ（`HypothesisCard.tsx`・`useStore.addVerificationLog`）

| ID | 仕様 |
|---|---|
| FR-VL-01 | 「＋ 追加」で入力欄を開き、結果（的中/外れ/様子見、既定 様子見）とメモ（任意）を保存。日付は今日（Asia/Tokyo） |
| FR-VL-02 | 保存済みログを追加順に表示。ログの編集・削除はできない |
| FR-VL-03 | ログはステータスを自動で変えない |

### FR-AI AI 深掘り（`AiDeepDive.tsx`・`aiService.ts`・`useAiSettings.ts`・`aiStorage.ts`）

| ID | 仕様 |
|---|---|
| FR-AI-01 | 仮説カードの「AI 深掘り」でパネルを開く。種別は「連想を深掘り」「失敗条件を追加」「見落とし観点」の 3 つ。見落とし観点（`missing_angle`）の出力は失敗条件として取り込む |
| FR-AI-02 | ① 種別に応じたプロンプトを生成して表示、「コピー」でクリップボードへ（1.5 秒「✓ コピー済み」）。② 外部 AI の出力を貼り付け、③「仮説に取り込む」 |
| FR-AI-03 | プロンプト（連想）: 起点イベント（無ければ仮説タイトル）＋現在の連想ステップ → 3〜5 個の追加連想を `- 連想先: X / 理由: Y` 形式で出力させる |
| FR-AI-04 | プロンプト（失敗条件）: 仮説タイトル＋連想ステップ＋既存失敗条件 → 仮説固有の失敗条件 3〜5 個を `- X` 形式で出力させる |
| FR-AI-05 | 解析（連想）: `-` または `数字.` で始まる行を対象。`連想先[：:]X[/／]理由[：:]Y` に合えば分解、合わなければ行全体をラベル・理由空 |
| FR-AI-06 | 解析（失敗条件）: `-`・`・`・`数字.` で始まる行の本文を失敗条件として追加 |
| FR-AI-07 | 取り込み: 連想ステップは**合計 5 件を超えない範囲**で、空いている depth に割り当てて追加（depth は一意）。失敗条件は、既存と完全一致する条件を除外して追加（冪等）。0 件・全件重複のときは usage を増やさず cache も書かず、理由を表示する（BUG-02 解消）。可否は `decideAiApply` が判定 |
| FR-AI-08 | 取り込み時に貼り付け結果をキャッシュ（key = `仮説ID:種別`）し、使用回数を +1。キャッシュがあれば「キャッシュを読み込む（日付）」で貼り付け欄に復元 |
| FR-AI-09 | 上限: 日次 `dailyLimit`・月次 `monthlyLimit` を超えたら「本日の実行上限に達しました。Settings で上限を変更できます。」を表示し、取り込みボタンを `disabled` にする（`decideAiApply` でも判定。BUG-01 解消）。クリップボード失敗時は手動コピー案内（`role=alert`。BUG-08 解消） |
| FR-AI-10 | 使用回数は日付・月が変わると 0 に戻る（Asia/Tokyo 基準） |

### FR-BT CSV バックテスト（`csvParser.ts`・`backtestEngine.ts`・`views/BacktestView.tsx`）

| ID | 仕様 |
|---|---|
| FR-BT-01 | 価格 CSV（`date,ticker,close`）とイベント CSV（`hypothesis_id,event_date,ticker,notes`）をテキスト欄に貼り付けて実行。1 行目はヘッダーとして読み飛ばす（列名は検査しない） |
| FR-BT-02 | 解析: ダブルクォート内のカンマを許容。日付は `YYYY-MM-DD` のみ。終値が数値でない・0 以下の行は捨てる。イベントの `notes` は省略可 |
| FR-BT-03 | 有効行 0 件のとき「価格CSVが空または不正です」「イベントCSVが空または不正です」。例外時「解析エラー: …」 |
| FR-BT-04 | リターン: 基準 = イベント日の終値。T+n = 土日を除く n 営業日後の終値 / 基準 − 1。該当日の価格が無ければ `null`（表示「—」）。祝日は考慮しない・直近営業日への繰り越しもしない |
| FR-BT-05 | 銘柄別サマリー: 件数（5 未満で ⚠）・勝率（リターン > 0 の割合、null 除外）・平均・標準偏差（母標準偏差）・T+5 最悪値（`worstT5Return` = T+5 リターンの最小値と 0 の小さい方。表示「T+5 最悪値」）・最大DD（`BacktestSummary.maxDrawdown` = `BacktestResult.maxDrawdown` の null 除外の最小。BacktestView に「最大DD」列） |
| FR-BT-08 | `BacktestResult.maxDrawdown`: 基準日終値を含む T+0..T+5 の山から谷への最大下落率。下落なしは 0、窓に欠損があれば null（表示「—」） |
| FR-BT-06 | 表示: サマリー表と詳細表（横スクロール）。正は `ret-pos`、負は `ret-neg`。勝率は 50% 以上を正色 |
| FR-BT-07 | 結果は保存しない（画面遷移で消える）。登録済み仮説 ID を参照用チップとして表示 |

### FR-DM データ管理・ダッシュボード・設定（`App.tsx`）

| ID | 仕様 |
|---|---|
| FR-DM-01 | ダッシュボード: 仮説の合計・採用・様子見・要検証の件数、注目イベント一覧、テーマ一覧、仮説サマリー（先頭ステップ → … → 末尾ステップ） |
| FR-DM-02 | 設定: JSON エクスポート（トースト「JSONをエクスポートしました」） |
| FR-DM-03 | 設定: JSON インポート（確認パネルで「置き換える」後。成功「データをインポートしました」、失敗「インポートエラー: …」） |
| FR-DM-04 | イベント・仮説が両方 0 件のとき、ダッシュボードに 3 ステップの案内と「サンプルを読み込む」「最初のイベントを追加する」を表示 |
| FR-DM-05 | 設定: AI の日次上限（1〜100）・月次上限（1〜1000）を保存。数値でない・0 は既定（5/50）に戻す。本日・今月の使用回数を表示 |
| FR-DM-06 | テーマ切替（ライト/ダーク）。保存値が無ければ OS 設定に従う |

### FR-RP レポート（`services/reportService.ts`・`views/ReportView.tsx`）

| ID | 仕様 |
|---|---|
| FR-RP-01 | 月選択で対象月を切り替える。`monthlyReview` が月次の集計を返す |
| FR-RP-02 | 仮説別成績（`hypothesisStats`）・テーマ別成績（`themeStats`）を表示 |
| FR-RP-03 | 採否履歴（`statusTimeline`）を `statusHistory` から時系列で表示 |
| FR-RP-04 | Markdown ダウンロード（`toMarkdown`。ファイル名 `myfinancetraining-report-YYYY-MM.md`） |
| FR-RP-05 | スマホ幅で表が画面を押し広げないよう `.report-view` に `min-width:0` を指定 |

---

## 6. 画面仕様

### 6.1 ナビゲーション

| view | デスクトップ表示 | モバイル表示 | アイコン |
|---|---|---|---|
| `dashboard` | ダッシュボード | ホーム | ◈ |
| `event-input` | イベント | 入力 | ＋ |
| `association-tree` | 連想ツリー | 仮説 | ⟿ |
| `hypothesis-detail` | 仮説詳細 | 詳細 | ◉ |
| `backtest` | バックテスト | テスト | ↗ |
| `report` | レポート | 成績 | ▤ |
| `settings` | 設定 | 設定 | ⚙ |

- 画面状態は `App` の `useState<View>` のみ（URL ルーティングなし・リロードでダッシュボードに戻る）
- レイアウト: デスクトップはサイドバー（ブランド・ナビ・テーマ切替）、モバイルは上部ヘッダー（ブランド・テーマ切替）＋下部タブ 7 個
- トースト: 画面下部に積み上げ、既定 3 秒、閉じる（×）と取り消す（任意）

### 6.2 画面ごとの状態

| 画面 | 通常 | 0 件 | エラー |
|---|---|---|---|
| ダッシュボード | 統計＋3 カード | 案内（FR-DM-04） | — |
| イベント | フォーム＋一覧 | 「まだイベントがありません」 | 入力検証メッセージ |
| 連想ツリー | ツールバー・フィルター・カード | FR-HY-07 | 入力検証メッセージ |
| 仮説詳細 | 選択＋カード | 「仮説がありません」（選択肢） | — |
| バックテスト | 書式・入力・結果表 | 結果なし | FR-BT-03 |
| レポート | 月選択・成績・採否履歴 | 対象月にデータなし | — |
| 設定 | AI 上限・データ管理（取り込みを元に戻す）・免責 | — | インポートエラーのトースト |

---

## 7. 非機能要件（現状）

| ID | 項目 | 現状 |
|---|---|---|
| NFR-PWA | オフライン・ホーム画面追加 | `sw.js`（キャッシュ名 `my-finance-training-v4`）: install でルートと manifest を事前キャッシュ、navigation は network-first（オフライン時はキャッシュ）、静的資産は Stale-While-Revalidate。install の無条件 skipWaiting は廃止し、message `SKIP_WAITING` で skipWaiting する。`swUpdate.ts` が待機中の SW を検知し、`UpdateBanner` が「新しいバージョンがあります」「更新する」を表示。更新時は `controllerchange` で 1 回だけ reload。manifest は standalone・SVG アイコン 1 つ |
| NFR-DESK | PC 幅（961px 以上）でスクロールしない | 画面全体も各枠も縦スクロールしない。一覧は枠に収まる件数ずつページ送り、詳細は 1 件をタブで切り替える（一覧＋詳細の 2 ペイン）。例外はバックテストの CSV 入力欄（長文を貼ったときの内部スクロール）。PC 版は EventTree の「🌲 ツリー表示」を出さない。**対応する最小サイズは 961x540**（ブラウザの枠を除く表示領域）。高さ 620px 以下は余白と見出しの補足文を省く。切れの定義: 縦・横のはみ出し、親の枠から出た部品、タブ名の折り返し（`…` の省略表示＋title は許容）。検査: E2E `06-desktop-no-scroll`（961x540・1280x600・1366x657・1920x969 × サンプル/大量データ × 全画面・全タブ。`npm run test:layout`。**`deploy.yml` が build 前に実行し、失敗すると公開しない**）と `scripts/check-no-scroll.mjs`（`--sizes` で任意サイズ） |
| NFR-MOB | スマホ幅 | モバイルヘッダー＋ボトムナビ。表は横スクロール。最大幅 520px での確認が開発規約 |
| NFR-SEC | 秘密情報 | APIキーを扱わない（AI は手動コピー）。外部通信なし |
| NFR-PRIV | データの所在 | 端末の localStorage のみ。端末間同期なし |
| NFR-TZ | 日付 | `dateUtils` は Asia/Tokyo 固定。backtest の `addBusinessDays` は UTC メソッドで統一 |
| NFR-COST | AI 費用 | 0 円（API 未使用）。回数上限は自己管理用 |
| NFR-QA | 品質保証 | L1 単体・L2 結合: `npm test`（Vitest）／L3 E2E: `npm run test:e2e`（Playwright。deploy には含めない）／静的: `npm run typecheck`・`npm run lint`。`ci.yml`（手動起動）と `deploy.yml`（main push）が typecheck→lint→test→build を実行 |
| NFR-CODE | コーディング規約 | ファイル 800 行以下・関数 50 行以下・`any` 禁止・strict。`App.tsx` は約 170 行に分割済み |
| NFR-REPRO | 再現性 | 依存は完全固定（`latest` 廃止・lockfile の実バージョン）。`deploy.yml`・`ci.yml` は `npm ci`。Node >=22.12 |

---

## 8. 設計ドキュメント（`docs/*.md`）との差分

`docs/` は構想段階の文書。実装と違う点を以下に固定する（どちらに寄せるかは未決定）。

| 文書の記述 | 実装 | 出典 |
|---|---|---|
| IndexedDB で保存 | 見送り（ADR-0004）。localStorage 継続 | architecture.md |
| vite-plugin-pwa・Zustand/Context | 手書き SW・useState | architecture.md |
| AI は Gemini/OpenAI API を任意設定 | API 呼び出しなし（コピペ方式） | architecture.md, ai-cost-control.md |
| AI キャッシュ key = model+promptType+normalizedInput+templateVersion | `仮説ID:種別` | ai-cost-control.md |
| AI 種別 5 つ（naming・missing_angle・theme_mapping を含む） | 3 つ（missing_angle を実装。naming・theme_mapping なし） | ai-cost-control.md |
| Event に region・sourceUrl・memo、category は配列 | region なし・単一 category | hypothesis-model.md |
| AssociationNode（parentId で分岐・direction・confidence） | 直線の steps 配列。分岐・確信度なし | hypothesis-model.md, requirements.md §2 |
| Hypothesis に summary・targetMarket・triggerConditions・checkIndicators・createdAt/updatedAt | なし（urgency・candidateStocks・verificationLogs を追加） | hypothesis-model.md |
| 仮説 ID 命名規則 `<REGION>-<EVENT>-<MECHANISM>-<TARGET>-<DIRECTION>` | 新規は `HYP-<timestamp>` | hypothesis-model.md |
| スコア項目（impactScore 等 6 種） | なし | hypothesis-model.md |
| 採否の判断理由を保存（requirements §7） | 実装済み（StatusChange.reason・FR-HY-11） | requirements.md |
| Theme Master 画面（テーマ・代表銘柄の管理） | テーマは表示のみ、編集不可 | architecture.md |
| 同一イベントの重複検知 | なし | architecture.md |
| v0.6 レポート（仮説別/テーマ別成績・Markdown 出力） | 実装済み（FR-RP） | roadmap.md |
| CLAUDE.md「次の Issue #5〜#7」 | #5 ルールエンジン・#6 AI 深掘り・#7 CSV バックテストは実装済み | CLAUDE.md |

ロードマップ進捗（実装から判定）: v0.1 ✓ / v0.2 ✓（IndexedDB 以外）/ v0.3〜v1.0 実装済み（IndexedDB を除く。ADR-0004 で見送り）

---

## 9. 既知の不具合・リスク（v1.0 時点・未解決のみ）

severity は ISTQB の分類（Critical / High / Medium / Low）。v0.2 で解消した BUG-01〜12 は §10 に移した。BUG-14〜16・18・20・21 は v0.2 の追補で解消し §10 に記載。以下は既知の制約として残す。

| ID | sev | 内容 | 根拠 |
|---|---|---|---|
| BUG-17 | Low | `addBusinessDays` は祝日非対応（既知の制約） | `backtestEngine` |
| 仕様判断 | — | 同一文言の失敗条件は禁止しない（表示 key は index ベース） | BUG-05 の扱い |
| RISK-01 | — | E2E は代表フローのみ。実機（iOS Safari）での PWA 更新挙動は未検証 | — |
| RISK-02 | — | 更新通知 UI がなく、新版は次回起動時に反映される → v1.0 で解消（`UpdateBanner`） | `sw.js` |
| RISK-03 | — | **解消済み**（v1.0）: `migrateState` とスキーマ版 2 を実装 | `storage.ts` |

未解決の High: 0 件／Medium: 0 件。

---

## 10. 変更履歴

| 日付 | 基準コミット | 内容 |
|---|---|---|
| 2026-11-01 | `8f6ab6e` | 初版。現行コードと `docs/*.md` から逆起こし |
| 2026-11-01 | v0.2（`chore/v0.2-stabilization`） | 安定化。テスト基盤（Vitest / Playwright / ESLint）導入、`App.tsx` を views/shell に分割、依存固定。解消: BUG-01（canExecute を `decideAiApply` と UI で判定）／02（0 件・全件重複は usage・cache を更新せず理由表示）／03（depth 一意化）／04（Asia/Tokyo 統一）／05（index key・冪等な取り込み）／06（corrupt 時は保存停止＋復旧画面）／07（saveError バナー）／08（手動コピー案内）／09（import 確認パネル）／10（`worstT5Return` へ改名）／11（SW v3・network-first）／12（詳細画面の選択フォールバック）。新規発見の BUG-13（CSV の桁区切り付き終値を 7 と誤読。桁区切りを除去し、数値として読めない値・列数が 3 でない行は除外して解消）と BUG-19（index.html の manifest/icon が base を二重付与し PWA manifest が読めない。Vite に base を付けさせて解消）を解消。BUG-14〜18（Low）を追加。独立レビューの指摘を解消: 保存データの null 要素・配列でない steps で白画面（`sanitizeState` で除去）／4 列以上・行末カンマの CSV が全行除外（ヘッダ列数まで許容）／詳細画面で仮説を切り替えても AI 貼り付け内容が残る（`key`）／初回直後のオフライン起動で JS 未キャッシュ（SW install で HTML の資産を事前キャッシュ）／読み取り失敗時の初期化で実データを上書き（初期化前に読み直して退避）。BUG-20・21（Low）を追加。ADR-0001〜0003 |
| 2026-11-01 | v0.2 追補（`fix/v0.2-low-bugs`） | Low を解消: BUG-14（英数字キーワードは単語境界で照合）／15（連想の解析を最大 5 段で打ち切り）／16（`・` 始まりの行も拾う。番号除去を行頭に限定）／18（AI cache を最新 50 件に制限）／20（仮説更新前の連打を同期フラグで無視）／21（depth の飛び番を 1..n に詰め、AI 段は既存の最大 depth の後ろに追加） |
| 2026-11-01 | v1.0（`feat/v1.0`、package.json 1.0.0） | スキーマ版 2 と `migrateState`（RISK-03 解消）／インポート差分表示と「取り込みを元に戻す」（`replaceState` 1 世代保持）／採否の理由と履歴（`StatusChange`・FR-HY-11）／AI `missing_angle`／バックテスト最大DD（FR-BT-05/08）／レポート画面（FR-RP）／SW v4 と更新通知バナー／IndexedDB 見送り（ADR-0004）。テスト: 単体 156 件・E2E 5 件（E2E-01 理由入力、E2E-03 差分と元に戻す、E2E-05 レポート）。レポートのスマホ幅で表が画面を押し広げた不具合は `.report-view` の `min-width:0` で解消 |
| 2026-11-01 | `feat/desktop-no-scroll` | PC 幅のスクロールなしレイアウト（NFR-DESK）。7 画面を一覧＋詳細の 2 ペイン・ページ送り・タブに変更（スマホ幅は従来どおり）。`swUpdate` が監視開始時にインストール中の SW も追う。テスト: 単体 170 件・E2E 7 件（PC 幅 2 件）・`check-no-scroll` NG=0/42 |
| 2026-11-01 | `fix/desktop-min-size` | PC の低い・狭い画面での切れを解消（設定の免責をタブへ、低い画面の余白縮小、タブ列の折り返し、入力欄の幅、バックテストの仮説 ID をページ送り、レポート表の列幅）。検査に全タブ・横方向・枠外・タブ折り返しと最小サイズ 961x540 を追加 |
| 2026-11-01 | `ci/layout-gate` | `deploy.yml` に PC 幅の見切れ検査（`npm run test:layout`）を追加。見切れのある版は公開されない |
