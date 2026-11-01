import { useEffect, useRef, useState } from 'react';
import type { Hypothesis, MarketEvent, AiPromptType } from '../domain/types';
import { generatePrompt, parsePastedResult } from '../services/aiService';
import { findCacheEntry, addCacheEntry } from '../infrastructure/aiStorage';
import { decideAiApply } from '../application/aiApply';
import { callClaude } from '../infrastructure/claudeClient';
import { useClaudeConfig } from '../hooks/useAiSettings';
import '../styles/ai-connect.css';
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

const LIMIT_MSG = '本日の実行上限に達しました。Settings で上限を変更できます。';
type Notice = { kind: 'error' | 'info'; text: string };

// API 呼び出しの状態だけを持つ。取り込みは手動貼り付けと同じ経路（applyText）に渡す
function useAiAsk(opts: { prompt: string; canExecute: boolean; onText: (text: string) => void; onNotice: (n: Notice) => void }) {
  const { apiKey, hasKey, model } = useClaudeConfig();
  const [asking, setAsking] = useState(false);
  // 連打は再描画前に届くため、state でなく ref で二重送信を止める
  const ctrlRef = useRef<AbortController | null>(null);
  useEffect(() => () => ctrlRef.current?.abort(), []);

  const ask = async () => {
    if (ctrlRef.current || !hasKey) return;
    if (!opts.canExecute) { opts.onNotice({ kind: 'error', text: LIMIT_MSG }); return; }
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setAsking(true);
    opts.onNotice({ kind: 'info', text: 'AI に問い合わせています（最大 60 秒）…' });
    const r = await callClaude({ apiKey, model, prompt: opts.prompt, signal: ctrl.signal });
    ctrlRef.current = null;
    setAsking(false);
    if (!r.ok) { opts.onNotice({ kind: r.kind === 'cancelled' ? 'info' : 'error', text: r.message }); return; }
    opts.onText(r.text);
  };
  const cancel = () => ctrlRef.current?.abort();
  return { hasKey, asking, ask, cancel };
}

const appliedNotice = (steps: number, conditions: number, saved: boolean): Notice => {
  const added = `連想 ${steps} 件・失敗条件 ${conditions} 件を追加しました。`;
  return saved
    ? { kind: 'info', text: added }
    : { kind: 'error', text: `${added} ただし実行回数またはキャッシュを保存できませんでした（ブラウザの保存容量を確認してください）。` };
};

function useCopyPrompt(prompt: string, setMessage: (n: Notice | null) => void) {
  const [copied, setCopied] = useState(false);
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

  return { copied, handleCopy };
}

// PC 用の段組み（AiDeepDiveDesktop）と同じ取り込み判定を使うため、状態と操作を共有する
export function useAiDeepDive({ hypothesis, event, canExecute, onIncrement, onApply }: Props, onAnswered?: () => void) {
  const [promptType, setPromptType] = useState<AiPromptType>('association_expand');
  const [pasted, setPasted] = useState('');
  const [applied, setApplied] = useState(false);
  // 再描画前の連打は古い props で判定されるため、同期フラグで 2 回目を止める（BUG-20）
  const applyingRef = useRef(false);
  // 取り込みが親に反映され新しい hypothesis が届いた時点で、次の取り込みを受け付ける
  useEffect(() => { applyingRef.current = false; }, [hypothesis]);
  const [message, setMessage] = useState<Notice | null>(null);

  const cacheKey = `${hypothesis.id}:${promptType}`;
  const cached = findCacheEntry(cacheKey);
  const prompt = generatePrompt(promptType, hypothesis, event);

  const { copied, handleCopy } = useCopyPrompt(prompt, setMessage);

  // preCounted: API 呼び出しは課金された時点で回数に数えるため、取り込み時に二重に数えない
  const applyText = (text: string, preCounted: boolean | null) => {
    if (applyingRef.current) return;
    const { steps, conditions } = parsePastedResult(promptType, text);
    const decision = decideAiApply({ canExecute, hypothesis, steps, conditions });
    if (!decision.ok) {
      setMessage({ kind: 'error', text: preCounted === null ? decision.reason : `${decision.reason} AI の回答は貼り付け欄に残しています。` });
      return;
    }
    applyingRef.current = true;
    onApply(decision.merge.addedSteps, decision.merge.addedConditions);
    const cacheSaved = addCacheEntry({ key: cacheKey, prompt, result: text, createdAt: new Date().toISOString() });
    const usageSaved = preCounted ?? onIncrement();
    setMessage(appliedNotice(decision.merge.addedSteps.length, decision.merge.addedConditions.length, cacheSaved && usageSaved));
    setApplied(true);
    setTimeout(() => setApplied(false), 2000);
  };
  const handleApply = () => applyText(pasted, null);

  const onText = (text: string) => {
    setPasted(text);
    applyText(text, onIncrement());
    onAnswered?.();
  };
  const api = useAiAsk({ prompt, canExecute, onText, onNotice: setMessage });

  const loadCached = () => {
    if (cached) setPasted(cached.result);
  };

  const selectType = (t: AiPromptType) => { if (api.asking) return; setPromptType(t); setPasted(''); setApplied(false); };

  return { promptType, selectType, pasted, setPasted, applied, copied, message, cached, prompt, handleCopy, handleApply, loadCached, api };
}

export function AiDeepDive(props: Props) {
  const { canExecute } = props;
  const [open, setOpen] = useState(false);
  const { promptType, selectType, pasted, setPasted, applied, copied, message, cached, prompt, handleCopy, handleApply, loadCached, api } = useAiDeepDive(props);

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
        <span className="eyebrow">{api.hasKey ? 'AI 深掘り' : 'AI 深掘り — 手動実行'}</span>
        <button className="btn-close" onClick={() => setOpen(false)}>✕</button>
      </div>

      {!canExecute && (
        <p className="ai-limit-msg">{LIMIT_MSG}</p>
      )}

      <div className="ai-type-tabs">
        {PROMPT_TYPES.map(pt => (
          <button
            key={pt.value}
            className={`ai-tab${promptType === pt.value ? ' active' : ''}`}
            disabled={api.asking}
            onClick={() => selectType(pt.value)}
          >
            {pt.label}
            <span className="ai-tab-desc">{pt.desc}</span>
          </button>
        ))}
      </div>

      {api.hasKey ? (
        <div className="ai-step ai-ask">
          <AiAskButtons api={api} canExecute={canExecute} />
          <p className="ai-ask-note">回答は自動で貼り付け欄に入り、取り込みまで行います。手動で進める場合は下の ① ② を使ってください。</p>
        </div>
      ) : (
        <p className="ai-ask-note">設定の「AI 接続」で API キーを登録すると、ボタン 1 回で AI に聞けます。</p>
      )}

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
        disabled={!canExecute || !pasted.trim() || applied || api.asking}
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

type AskApi = ReturnType<typeof useAiAsk>;

export function AiAskButtons({ api, canExecute }: { api: AskApi; canExecute: boolean }) {
  return (
    <div className="ai-ask-actions">
      <button type="button" className="btn btn-primary" disabled={!canExecute || api.asking} aria-busy={api.asking} onClick={api.ask}>
        {api.asking ? <><span className="ai-spinner" aria-hidden="true" />問い合わせ中…</> : 'AI に聞く'}
      </button>
      {api.asking && <button type="button" className="btn btn-ghost" onClick={api.cancel}>キャンセル</button>}
    </div>
  );
}
