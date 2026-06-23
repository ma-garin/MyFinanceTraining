export type EventCategory =
  | 'geopolitics'
  | 'macro'
  | 'commodity'
  | 'semiconductor'
  | 'currency'
  | 'consumer'
  | 'other';

export type Direction = 'up' | 'down' | 'mixed' | 'watch';

export type HypothesisStatus = 'adopted' | 'watching' | 'rejected' | 'needs_test';

export type HypothesisUrgency = 'high' | 'medium' | 'low';

export type MarketEvent = {
  id: string;
  title: string;
  category: EventCategory;
  occurredAt: string;
  summary: string;
};

export type AssociationStep = {
  depth: 1 | 2 | 3 | 4 | 5;
  label: string;
  reason: string;
  probability?: number;   // 0-100: 前リンクが成立した条件下でこのリンクが成立する確率
};

// ─── Verification Log ───────────────────────────────────────────────────────

export type VerificationLogResult = 'hit' | 'miss' | 'pending';

export type VerificationLog = {
  id: string;
  loggedAt: string;        // YYYY-MM-DD
  result: VerificationLogResult;
  note: string;
};

// ─── Invalidation Rule ──────────────────────────────────────────────────────

export type InvalidationRule = {
  condition: string;
  threshold?: {
    metric: string;
    operator: '>' | '<' | '>=' | '<=';
    value: number;
  };
};

// ─── Forecast Resolution ─────────────────────────────────────────────────────
// 較正（calibration）のための「予測 vs 結果」の最終確定記録

export type ForecastOutcome = 'hit' | 'miss';

export type ForecastResolution = {
  outcome: ForecastOutcome;
  resolvedAt: string;      // YYYY-MM-DD
  note?: string;
};

// ─── Hypothesis ─────────────────────────────────────────────────────────────

export type Hypothesis = {
  id: string;
  title: string;
  eventId: string;
  expectedDirection: Direction;
  targetThemes: string[];
  candidateStocks: string[];       // "6857 アドバンテスト" 形式
  urgency: HypothesisUrgency;      // high=今週/medium=今月/low=長期
  confidence?: number;             // 0-100: 仮説が成立すると考える主観確率（予測）
  associationSteps: AssociationStep[];
  invalidationConditions: string[];
  status: HypothesisStatus;
  resolution?: ForecastResolution; // 結果確定後の hit/miss（較正の入力）
  verificationLogs?: VerificationLog[];
  invalidationRules?: InvalidationRule[];
};

export type TargetTheme = {
  id: string;
  name: string;
  description: string;
  examples: string[];
  positiveDrivers: string[];
  negativeDrivers: string[];
};

export type AppState = {
  version?: number;
  events: MarketEvent[];
  hypotheses: Hypothesis[];
  themes: TargetTheme[];
};

// ─── AI Deep-Dive ───────────────────────────────────────────────────────────

export type AiPromptType = 'association_expand' | 'counter_scenario';

export type AiSettings = {
  dailyLimit: number;
  monthlyLimit: number;
};

export type AiUsageRecord = {
  date: string;         // YYYY-MM-DD
  month: string;        // YYYY-MM
  dailyCount: number;
  monthlyCount: number;
};

export type AiCacheEntry = {
  key: string;          // hypothesisId + ':' + promptType
  prompt: string;
  result: string;
  createdAt: string;    // ISO string
};

// ─── Backtest ───────────────────────────────────────────────────────────────

export type PriceRow = {
  date: string;   // YYYY-MM-DD
  ticker: string;
  close: number;
};

export type BacktestEventRow = {
  hypothesisId: string;
  eventDate: string;  // YYYY-MM-DD
  ticker: string;
  notes: string;
};

export type BacktestResult = {
  hypothesisId: string;
  eventDate: string;
  ticker: string;
  notes: string;
  t1Return: number | null;
  t3Return: number | null;
  t5Return: number | null;
};
