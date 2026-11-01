import type { MarketEvent } from './types';

export type StepDraft = { label: string; reason: string };

// 連想テンプレートの形だけを受け取る。domain は engine に依存しない（spec §2.3）
export type DraftSource = {
  steps: StepDraft[];
  themes: string[];
  candidateStocks: string[];
  invalidationConditions: string[];
};

export type DraftFields = {
  title: string;
  steps: StepDraft[];
  targetThemes: string;
  candidateStocks: string;
  invalidationConditions: string;
};

export const STEP_COUNT = 5;

export const emptySteps = (): StepDraft[] =>
  Array.from({ length: STEP_COUNT }, () => ({ label: '', reason: '' }));

const padSteps = (steps: StepDraft[]): StepDraft[] =>
  Array.from({ length: STEP_COUNT }, (_, i) => ({
    label: steps[i]?.label ?? '',
    reason: steps[i]?.reason ?? '',
  }));

export const draftTitle = (event: MarketEvent, source?: DraftSource): string => {
  const themes = source?.themes.slice(0, 2) ?? [];
  return themes.length > 0
    ? `${event.title} → ${themes.join('・')}への波及（仮説）`
    : `${event.title} からの連想（仮説）`;
};

export const buildDraft = (event: MarketEvent, source?: DraftSource): DraftFields => {
  if (!source) {
    // テンプレートが無くても必須のステップ1だけは埋め、入力を 1 つ減らす
    const steps = emptySteps().map((s, i) => (i === 0 ? { ...s, label: event.title } : s));
    return { title: draftTitle(event), steps, targetThemes: '', candidateStocks: '', invalidationConditions: '' };
  }
  return {
    title: draftTitle(event, source),
    steps: padSteps(source.steps),
    targetThemes: source.themes.join(', '),
    candidateStocks: source.candidateStocks.join('\n'),
    invalidationConditions: source.invalidationConditions.join('\n'),
  };
};

const sameSteps = (a: StepDraft[], b: StepDraft[]): boolean =>
  a.length === b.length && a.every((s, i) => s.label === b[i].label && s.reason === b[i].reason);

const isBlankSteps = (steps: StepDraft[]): boolean => steps.every(s => !s.label.trim() && !s.reason.trim());

// 利用者が手で書き換えた欄は残し、空欄か前回の下書きのままの欄だけを差し替える
export const mergeDraft = (current: DraftFields, prevDraft: DraftFields | null, next: DraftFields): DraftFields => {
  const pick = (key: 'title' | 'targetThemes' | 'candidateStocks' | 'invalidationConditions'): string =>
    !current[key].trim() || (prevDraft !== null && current[key] === prevDraft[key]) ? next[key] : current[key];
  const keepSteps = !isBlankSteps(current.steps) && !(prevDraft !== null && sameSteps(current.steps, prevDraft.steps));
  return {
    title: pick('title'),
    steps: keepSteps ? current.steps : next.steps,
    targetThemes: pick('targetThemes'),
    candidateStocks: pick('candidateStocks'),
    invalidationConditions: pick('invalidationConditions'),
  };
};

// テンプレートの選び直しは明示操作なので、タイトル以外を上書きする（FR-RB-03）
export const reapplyDraft = (current: DraftFields, prevDraft: DraftFields | null, next: DraftFields): DraftFields => ({
  ...next,
  title: mergeDraft(current, prevDraft, next).title,
});
