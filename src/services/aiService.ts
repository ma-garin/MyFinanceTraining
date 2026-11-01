import { MAX_STEPS } from '../domain/hypothesisRules';
import type { Hypothesis, MarketEvent, AiPromptType } from '../domain/types';

export const generatePrompt = (
  type: AiPromptType,
  hypothesis: Hypothesis,
  event: MarketEvent | undefined,
): string => {
  const stepLines = hypothesis.associationSteps
    .map(s => `${s.depth}. ${s.label}${s.reason ? `（${s.reason}）` : ''}`)
    .join('\n');

  if (type === 'association_expand') {
    return `あなたは日本株の連想分析アシスタントです。投資助言・売買推奨は含めないでください。

【起点イベント】
${event ? `${event.title}：${event.summary}` : hypothesis.title}

【現在の連想ステップ】
${stepLines}

上記の連想の続きとして、3〜5個の追加連想候補を生成してください。
日本株市場での実際の行動変化・資金ローテーションの観点で考えてください。

出力形式（各候補を以下の形式で）：
- 連想先: [内容] / 理由: [理由]`;
  }

  const condLines = hypothesis.invalidationConditions.length > 0
    ? hypothesis.invalidationConditions.map(c => `・${c}`).join('\n')
    : '（まだ登録されていません）';

  if (type === 'missing_angle') {
    return `あなたは日本株仮説の検証アシスタントです。投資助言・売買推奨は含めないでください。

【仮説】
${hypothesis.title}

【連想ステップ】
${stepLines}

【既存の失敗条件】
${condLines}

この仮説が見落としている観点を挙げ、それぞれを失敗条件として番号付きで出力してください。
観点の例：別の波及経路／逆方向の要因／時間軸のずれ／既に織り込み済みの可能性。
既存の失敗条件と重複せず、この仮説固有の観点にしてください。

出力形式（各条件を以下の形式で）：
1. [失敗条件の内容]`;
  }

  return `あなたは日本株仮説の検証アシスタントです。投資助言・売買推奨は含めないでください。

【仮説】
${hypothesis.title}

【連想ステップ】
${stepLines}

【既存の失敗条件】
${condLines}

この仮説が成立しない反対シナリオ・失敗条件を3〜5個追加してください。
「全面リスクオフ」のような一般論ではなく、この仮説固有のリスクを考えてください。

出力形式（各条件を以下の形式で）：
- [失敗条件の内容]`;
};

const LIST_ITEM = /^(?:[-・]|\d+\.)\s*/;

export const parsePastedResult = (
  type: AiPromptType,
  rawText: string,
): { steps: { label: string; reason: string }[]; conditions: string[] } => {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

  if (type === 'association_expand') {
    // 連想は最大 5 段。'・' 始まりの行も箇条書きとして拾う（BUG-15・16）
    const steps = lines
      .filter(l => LIST_ITEM.test(l))
      .map(l => {
        const body = l.replace(LIST_ITEM, '');
        const m = body.match(/連想先[：:]\s*(.+?)\s*[/／]\s*理由[：:]\s*(.+)/);
        if (m) return { label: m[1].trim(), reason: m[2].trim() };
        return { label: body.trim(), reason: '' };
      })
      .filter(s => s.label !== '')
      .slice(0, MAX_STEPS);
    return { steps, conditions: [] };
  }

  const conditions = lines
    .filter(l => LIST_ITEM.test(l))
    .map(l => l.replace(LIST_ITEM, '').trim())
    .filter(Boolean);
  return { steps: [], conditions };
};
