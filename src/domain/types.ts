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
