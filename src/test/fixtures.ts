import type { Hypothesis, MarketEvent, AppState } from '../domain/types';

export const makeEvent = (over: Partial<MarketEvent> = {}): MarketEvent => ({
  id: 'ev-1', title: 'イベント1', category: 'macro', occurredAt: '2026-01-01', summary: '', ...over,
});

export const makeHyp = (over: Partial<Hypothesis> = {}): Hypothesis => ({
  id: 'h-1', title: '仮説1', eventId: 'ev-1', expectedDirection: 'up', targetThemes: [],
  candidateStocks: [], urgency: 'medium', associationSteps: [], invalidationConditions: [],
  status: 'watching', ...over,
});

export const makeState = (over: Partial<AppState> = {}): AppState => ({
  events: [makeEvent()], hypotheses: [makeHyp()], themes: [], ...over,
});
