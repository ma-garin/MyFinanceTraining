# 仮説モデル

## 基本単位

投資仮説OSでは、ニュースや市場イベントを `Event` として登録し、そこから `AssociationTree`、`Hypothesis`、`TargetTheme` を生成する。

## Event

```ts
type Event = {
  id: string;
  title: string;
  occurredAt: string;
  region: 'US' | 'JP' | 'EU' | 'CN' | 'GLOBAL' | 'MIDDLE_EAST' | 'OTHER';
  category: string[];
  sourceUrl?: string;
  memo?: string;
};
```

例：

```text
中東情勢悪化
米雇用統計上振れ
SOX急落
原油価格急騰
AI関連株急落
```

## AssociationNode

```ts
type AssociationNode = {
  id: string;
  eventId: string;
  parentId?: string;
  depth: 1 | 2 | 3 | 4 | 5;
  statement: string;
  direction: 'UP' | 'DOWN' | 'MIXED' | 'UNKNOWN';
  confidence: 1 | 2 | 3 | 4 | 5;
  reason?: string;
};
```

例：

```text
depth 1: 中東情勢悪化
深さ2: 原油供給不安
深さ3: 移動費上昇
深さ4: 外出抑制/内篭り需要
深さ5: ゲーム関連株が意識される
```

## Hypothesis

```ts
type Hypothesis = {
  id: string;
  title: string;
  eventId: string;
  summary: string;
  expectedDirection: 'UP' | 'DOWN' | 'LONG_SHORT' | 'WATCH';
  targetMarket: 'JP_STOCK' | 'JP_ETF_ETN' | 'J_REIT';
  targetThemes: string[];
  targetSymbols?: string[];
  triggerConditions: string[];
  invalidationConditions: string[];
  checkIndicators: string[];
  status: 'ADOPTED' | 'WATCHING' | 'REJECTED' | 'NEEDS_TEST';
  createdAt: string;
  updatedAt: string;
};
```

## TargetTheme

```ts
type TargetTheme = {
  id: string;
  name: string;
  market: 'JP';
  examples: string[];
  positiveDrivers: string[];
  negativeDrivers: string[];
};
```

初期テーマ例：

| テーマ | 例 |
|---|---|
| 半導体 | 東京エレクトロン、アドバンテスト、ディスコ、SCREEN、レーザーテック |
| 小売 | 百貨店、ドラッグストア、ディスカウント、コンビニ、専門店 |
| 防衛 | 三菱重工、川崎重工、IHI、日本製鋼所 |
| 原油/資源 | INPEX、石油資源開発、ENEOS、出光興産 |
| 商社 | 三菱商事、三井物産、住友商事、丸紅、伊藤忠 |
| ゲーム | 任天堂、ソニーG、カプコン、コナミG、スクエニHD、バンナムHD |
| 銀行/保険 | メガバンク、損保、生保 |
| REIT/不動産 | J-REIT、不動産大手 |

## Hypothesis ID命名規則

```text
<REGION>-<EVENT>-<MECHANISM>-<TARGET>-<DIRECTION>
```

例：

```text
MIDEAST-OIL-UP-STAYHOME-GAME-UP
US-JOBS-STRONG-AI-DOWN-JP-RETAIL-UP
COVID-MOBILITY-RECOVERY-OIL-UP
US-SOX-DOWN-JP-RETAIL-UP
```

## 失敗条件の扱い

仮説には必ず失敗条件を持たせる。

例：

```text
仮説：中東情勢悪化 → 原油高 → 移動費上昇 → 内篭り需要 → ゲーム株上昇
失敗条件：
- 市場全体が全面リスクオフ
- ゲーム株がグロース売りに巻き込まれる
- 原油高が短期で収束する
- 円高で海外売上期待が剥落する
- 個別銘柄の決算が弱い
```

## スコア項目案

| 項目 | 内容 |
|---|---|
| impactScore | 市場影響度 |
| storyScore | 市場参加者が連想しやすいか |
| humanBehaviorScore | 生活者/企業行動として自然か |
| timingScore | 反応が早すぎる/遅すぎるリスク |
| testabilityScore | 過去データで検証可能か |
| riskScore | 失敗条件の強さ |

初期版では手動スコアでよい。