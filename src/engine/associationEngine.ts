import type { MarketEvent, AssociationStep } from '../domain/types';
import { ASSOCIATION_RULES, type AssociationTemplate } from './rules';

const scoreTemplate = (rule: AssociationTemplate, event: MarketEvent, text: string): number => {
  let score = 0;
  if (rule.categories.includes(event.category)) score += 2;
  rule.keywords.forEach(kw => {
    if (text.includes(kw.toLowerCase())) score += 1;
  });
  return score;
};

export const detectTemplates = (event: MarketEvent): AssociationTemplate[] => {
  const text = `${event.title} ${event.summary}`.toLowerCase();
  return ASSOCIATION_RULES
    .map(rule => ({ rule, score: scoreTemplate(rule, event, text) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ rule }) => rule);
};

export const applyTemplate = (template: AssociationTemplate): {
  steps: AssociationStep[];
  themes: string[];
  candidateStocks: string[];
  invalidationConditions: string[];
} => ({
  steps: template.steps.map((s, i) => ({
    depth: (i + 1) as 1 | 2 | 3 | 4 | 5,
    label: s.label,
    reason: s.reason,
  })),
  themes: [...template.themes],
  candidateStocks: [...template.candidateStocks],
  invalidationConditions: [...template.invalidationConditions],
});

export type { AssociationTemplate };
