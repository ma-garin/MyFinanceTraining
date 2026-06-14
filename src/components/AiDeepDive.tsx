import { useState } from 'react';
import type { Hypothesis, MarketEvent, AiPromptType } from '../domain/types';
import { generatePrompt, parsePastedResult } from '../services/aiService';
import { findCacheEntry, addCacheEntry } from '../infrastructure/aiStorage';

const PROMPT_TYPES: { value: AiPromptType; label: string; desc: string }[] = [
  { value: 'association_expand', label: '連想を深掘り', desc: '3〜5段階目の追加連想を生成' },
  { value: 'counter_scenario', label: '失敗条件を追加', desc: '反対シナリオ・失敗条件を生成' },
];

type Props = {
  hypothesis: Hypothesis;
  event: MarketEvent | undefined;
  canExecute: boolean;
  onIncrement: () => void;
  onApply: (steps: { label: string; reason: string }[], conditions: string[]) => void;
};

export function AiDeepDive({ hypothesis, event, canExecute, onIncrement, onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [promptType, setPromptType] = useState<AiPromptType>('association_expand');
  const [pasted, setPasted] = useState('');
  const [applied, setApplied] = useState(false);
  const [copied, setCopied] = useState(false);

  const cacheKey = `${hypothesis.id}:${promptType}`;
  const cached = findCacheEntry(cacheKey);
  const prompt = generatePrompt(promptType, hypothesis, event);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleApply = () => {
    const { steps, conditions } = parsePastedResult(promptType, pasted);
    onApply(steps, conditions);
    addCacheEntry({ key: cacheKey, prompt, result: pasted, createdAt: new Date().toISOString() });
    onIncrement();
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };

  const loadCached = () => {
    if (cached) setPasted(cached.result);
  };

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
            onClick={() => { setPromptType(pt.value); setPasted(''); setApplied(false); }}
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
            キャッシュを読み込む（{cached.createdAt.slice(0, 10)}）
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
        disabled={!pasted.trim() || applied}
        onClick={handleApply}
      >
        {applied ? '✓ 取り込み完了' : '仮説に取り込む'}
      </button>
    </div>
  );
}
