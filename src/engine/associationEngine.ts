import type { MarketEvent, AssociationStep } from '../domain/types';
import { ASSOCIATION_RULES, type AssociationTemplate } from './rules';

// 英字キーワードを部分一致にすると "AI" が "mail" に当たる（BUG-14）。英数字だけの語は単語境界で照合する
const ASCII_WORD = /^[a-z0-9]+$/;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export const matchesKeyword = (text: string, kw: string): boolean => {
  const k = kw.toLowerCase();
  return ASCII_WORD.test(k) ? new RegExp(`(^|[^a-z0-9])${escapeRe(k)}([^a-z0-9]|$)`).test(text) : text.includes(k);
};

const scoreTemplate = (rule: AssociationTemplate, event: MarketEvent, text: string): number => {
  let score = 0;
  if (rule.categories.includes(event.category)) score += 2;
  rule.keywords.forEach(kw => {
    if (matchesKeyword(text, kw)) score += 1;
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
