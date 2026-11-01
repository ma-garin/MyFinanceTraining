import { useEffect, useRef, useState } from 'react';
import type { Hypothesis, MarketEvent, AiPromptType } from '../domain/types';
import { generatePrompt, parsePastedResult } from '../services/aiService';
import { findCacheEntry, addCacheEntry } from '../infrastructure/aiStorage';
import { decideAiApply } from '../application/aiApply';
import { isoToTokyoDateStr } from '../utils/dateUtils';

export const PROMPT_TYPES: { value: AiPromptType; label: string; desc: string }[] = [
  { value: 'association_expand', label: '連想を深掘り', desc: '3〜5段階目の追加連想を生成' },
  { value: 'counter_scenario', label: '失敗条件を追加', desc: '反対シナリオ・失敗条件を生成' },
  { value: 'missing_angle', label: '見落とし観点', desc: '見落としている観点を失敗条件として生成' },
];

type Props = {
  hypothesis: Hypothesis;
  event: MarketEvent | undefined;
  canExecute: boolean;
  onIncrement: () => boolean;
  onApply: (steps: { label: string; reason: string }[], conditions: string[]) => void;
};

// PC 用の段組み（AiDeepDiveDesktop）と同じ取り込み判定を使うため、状態と操作を共有する
export function useAiDeepDive({ hypothesis, event, canExecute, onIncrement, onApply }: Props) {
  const [promptType, setPromptType] = useState<AiPromptType>('association_expand');
  const [pasted, setPasted] = useState('');
  const [applied, setApplied] = useState(false);
  const [copied, setCopied] = useState(false);
  // 再描画前の連打は古い props で判定されるため、同期フラグで 2 回目を止める（BUG-20）
  const applyingRef = useRef(false);
  // 取り込みが親に反映され新しい hypothesis が届いた時点で、次の取り込みを受け付ける
  useEffect(() => { applyingRef.current = false; }, [hypothesis]);
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  const cacheKey = `${hypothesis.id}:${promptType}`;
  const cached = findCacheEntry(cacheKey);
  const prompt = generatePrompt(promptType, hypothesis, event);

  // 非 HTTPS・権限拒否・未対応ブラウザで clipboard は失敗する。黙って失敗させない（BUG-08）
  const handleCopy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(prompt);
      setMessage(null);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('clipboard write failed:', err);
      setMessage({ kind: 'error', text: 'コピーできませんでした。プロンプト欄を長押し（または選択）して手動でコピーしてください。' });
    }
  };

  const handleApply = () => {
    if (applyingRef.current) return;
    const { steps, conditions } = parsePastedResult(promptType, pasted);
    const decision = decideAiApply({ canExecute, hypothesis, steps, conditions });
    if (!decision.ok) { setMessage({ kind: 'error', text: decision.reason }); return; }
    applyingRef.current = true;
    onApply(decision.merge.addedSteps, decision.merge.addedConditions);
    const cacheSaved = addCacheEntry({ key: cacheKey, prompt, result: pasted, createdAt: new Date().toISOString() });
    const usageSaved = onIncrement();
    const added = `連想 ${decision.merge.addedSteps.length} 件・失敗条件 ${decision.merge.addedConditions.length} 件を追加しました。`;
    setMessage(cacheSaved && usageSaved
      ? { kind: 'info', text: added }
      : { kind: 'error', text: `${added} ただし実行回数またはキャッシュを保存できませんでした（ブラウザの保存容量を確認してください）。` });
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  const loadCached = () => {
    if (cached) setPasted(cached.result);
  };

  const selectType = (t: AiPromptType) => { setPromptType(t); setPasted(''); setApplied(false); };

  return { promptType, selectType, pasted, setPasted, applied, copied, message, cached, prompt, handleCopy, handleApply, loadCached };
}

export function AiDeepDive(props: Props) {
  const { canExecute } = props;
  const [open, setOpen] = useState(false);
  const { promptType, selectType, pasted, setPasted, applied, copied, message, cached, prompt, handleCopy, handleApply, loadCached } = useAiDeepDive(props);

  if (!open) {
    return (
      <button className="btn btn-ai" onClick={() => setOpen(true)}>
        AI 深掘り
      </button>
    );
  }

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <span className="eyebrow">AI 深掘り — 手動実行</span>
        <button className="btn-close" onClick={() => setOpen(false)}>✕</button>
      </div>

      {!canExecute && (
        <p className="ai-limit-msg">本日の実行上限に達しました。Settings で上限を変更できます。</p>
      )}

      <div className="ai-type-tabs">
        {PROMPT_TYPES.map(pt => (
          <button
            key={pt.value}
            className={`ai-tab${promptType === pt.value ? ' active' : ''}`}
            onClick={() => selectType(pt.value)}
          >
            {pt.label}
            <span className="ai-tab-desc">{pt.desc}</span>
          </button>
        ))}
      </div>

      <div className="ai-step">
        <p className="ai-step-label">① 以下のプロンプトをコピーして Claude.ai 等に貼り付け</p>
        <div className="ai-prompt-box">
          <pre>{prompt}</pre>
          <button className="btn btn-sm" onClick={handleCopy}>
            {copied ? '✓ コピー済み' : 'コピー'}
          </button>
        </div>
        {cached && (
          <button className="btn btn-sm btn-ghost" onClick={loadCached}>
            キャッシュを読み込む（{isoToTokyoDateStr(cached.createdAt)}）
          </button>
        )}
      </div>

      <div className="ai-step">
        <p className="ai-step-label">② AI の出力結果を貼り付ける</p>
        <textarea
          className="ai-result-area"
          rows={6}
          placeholder="AIの出力をここに貼り付けてください"
          value={pasted}
          onChange={e => setPasted(e.target.value)}
        />
      </div>

      <button
        className="btn btn-primary"
        disabled={!canExecute || !pasted.trim() || applied}
        onClick={handleApply}
      >
        {applied ? '✓ 取り込み完了' : '仮説に取り込む'}
      </button>
      {message && (
        <p className={message.kind === 'error' ? 'ai-limit-msg' : 'ai-info-msg'} role={message.kind === 'error' ? 'alert' : 'status'}>
          {message.text}
        </p>
      )}
    </div>
  );
}
