import type { Hypothesis } from '../domain/types';
import { mergeAiResult, type AiMergeResult } from '../domain/hypothesisRules';

export type AiApplyDecision =
  | { ok: true; merge: AiMergeResult }
  | { ok: false; reason: string };

// UI の disabled だけでは回避できるため、上限判定と 0 件判定をここで必ず通す（BUG-01/02）
export const decideAiApply = (input: {
  canExecute: boolean;
  hypothesis: Hypothesis;
  steps: readonly { label: string; reason: string }[];
  conditions: readonly string[];
}): AiApplyDecision => {
  if (!input.canExecute) {
    return { ok: false, reason: 'AI の実行上限に達しています。設定で上限を変更できます。' };
  }
  if (input.steps.length === 0 && input.conditions.length === 0) {
    return { ok: false, reason: '貼り付けた結果から連想・失敗条件を読み取れませんでした。番号付きの行や「・」で始まる行を含めてください。' };
  }
  const merge = mergeAiResult(input.hypothesis, input.steps, input.conditions);
  if (merge.addedSteps.length === 0 && merge.addedConditions.length === 0) {
    return { ok: false, reason: '追加できる項目がありません（連想は最大5段、失敗条件は既存と同じ内容です）。' };
  }
  return { ok: true, merge };
};
