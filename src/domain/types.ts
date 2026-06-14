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
};

export type Hypothesis = {
  id: string;
  title: string;
  eventId: string;
  expectedDirection: Direction;
  targetThemes: string[];
  associationSteps: AssociationStep[];
  invalidationConditions: string[];
  status: HypothesisStatus;
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
