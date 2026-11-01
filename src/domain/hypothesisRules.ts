import type { AssociationStep, Hypothesis } from './types';

export const MAX_STEPS = 5;
type Depth = AssociationStep['depth'];
const ALL_DEPTHS: readonly Depth[] = [1, 2, 3, 4, 5];

// depth は React key と連想の段番号を兼ねるので一意でなければならない（BUG-03）
export const normalizeStepDepths = (steps: readonly AssociationStep[]): AssociationStep[] => {
  const unique = new Set(steps.map(s => s.depth)).size === steps.length;
  if (unique || steps.length > MAX_STEPS) return [...steps];
  const sorted = steps.map((s, i) => ({ s, i })).sort((a, b) => a.s.depth - b.s.depth || a.i - b.i);
  return sorted.map(({ s }, i) => ({ ...s, depth: ALL_DEPTHS[i] }));
};

export const buildSteps = (inputs: readonly { label: string; reason: string }[]): AssociationStep[] =>
  inputs
    .filter(s => s.label.trim())
    .slice(0, MAX_STEPS)
    .map((s, i) => ({ depth: ALL_DEPTHS[i], label: s.label.trim(), reason: s.reason.trim() }));

export type AiMergeResult = {
  hypothesis: Hypothesis;
  addedSteps: AssociationStep[];
  addedConditions: string[];
};

// 同一文言の失敗条件そのものは禁止しない。AI 取り込みを再実行しても増殖しないよう、既存と同じ文言だけを除く（BUG-05）
export const mergeAiResult = (
  h: Hypothesis,
  steps: readonly { label: string; reason: string }[],
  conditions: readonly string[],
): AiMergeResult => {
  const used = new Set(h.associationSteps.map(s => s.depth));
  const free = ALL_DEPTHS.filter(d => !used.has(d));
  const addedSteps: AssociationStep[] = steps
    .filter(s => s.label.trim())
    .slice(0, free.length)
    .map((s, i) => ({ depth: free[i], label: s.label.trim(), reason: s.reason.trim() }));
  const seen = new Set(h.invalidationConditions);
  const addedConditions: string[] = [];
  for (const raw of conditions) {
    const c = raw.trim();
    if (!c || seen.has(c)) continue;
    seen.add(c);
    addedConditions.push(c);
  }
  const hypothesis: Hypothesis = {
    ...h,
    associationSteps: [...h.associationSteps, ...addedSteps].sort((a, b) => a.depth - b.depth),
    invalidationConditions: [...h.invalidationConditions, ...addedConditions],
  };
  return { hypothesis, addedSteps, addedConditions };
};
