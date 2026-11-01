import { useState } from 'react';
import type { Hypothesis, MarketEvent } from '../domain/types';
import { useAiDeepDive, PROMPT_TYPES, AiAskButtons } from './AiDeepDive';
import { PagedRows } from './PagedRows';
import { isoToTokyoDateStr } from '../utils/dateUtils';

type Props = {
  hypothesis: Hypothesis;
  event: MarketEvent | undefined;
  canExecute: boolean;
  onIncrement: () => boolean;
  onApply: (steps: { label: string; reason: string }[], conditions: string[]) => void;
};

// PC はプロンプトのコピーと結果の貼り付けを 1 段ずつ見せて枠に収める。判定と保存は useAiDeepDive と共有
export function AiDeepDiveDesktop(props: Props) {
  const [stage, setStage] = useState<1 | 2>(1);
  // API の回答は ② に入るので、結果と取り込みの成否が見える段へ移す
  const ai = useAiDeepDive(props, () => setStage(2));
  const lines = ai.prompt.split('\n').map((text, i) => ({ text: text || ' ', i }));

  return (
    <div className="ai-desk">
      <div className="ai-desk-head">
        <div className="ai-desk-types" role="group" aria-label="深掘りの種類">
          {PROMPT_TYPES.map(pt => (
            <button
              key={pt.value}
              type="button"
              title={pt.desc}
              className={`filter-chip${ai.promptType === pt.value ? ' active' : ''}`}
              disabled={ai.api.asking}
              onClick={() => ai.selectType(pt.value)}
            >{pt.label}</button>
          ))}
        </div>
        <div className="ai-desk-stages" role="group" aria-label="手順">
          <button type="button" className={`btn btn-ghost${stage === 1 ? ' active' : ''}`} aria-pressed={stage === 1} onClick={() => setStage(1)}>① プロンプト</button>
          <button type="button" className={`btn btn-ghost${stage === 2 ? ' active' : ''}`} aria-pressed={stage === 2} onClick={() => setStage(2)}>② 結果を貼り付け</button>
        </div>
      </div>

      {!props.canExecute && (
        <p className="ai-limit-msg">本日の実行上限に達しました。Settings で上限を変更できます。</p>
      )}

      {stage === 1 ? (
        <>
          <p className="ai-step-label">{ai.api.hasKey
            ? '「AI に聞く」で回答を取り込みます。手動ならプロンプトをコピーして外部の AI に貼り付け'
            : '① プロンプトをコピーして Claude.ai 等に貼り付け（設定で API キーを登録すると 1 回で聞けます）'}</p>
          <div className="ai-desk-prompt">
            <PagedRows
              key={ai.promptType}
              items={lines}
              label="プロンプト"
              empty=""
              rowHeight={22}
              keyOf={l => String(l.i)}
              renderRow={l => <p className="ai-desk-line">{l.text}</p>}
            />
          </div>
          <div className="ai-desk-actions">
            {ai.api.hasKey && <AiAskButtons api={ai.api} canExecute={props.canExecute} />}
            <button type="button" className="btn btn-sm" onClick={ai.handleCopy}>{ai.copied ? '✓ コピー済み' : 'コピー'}</button>
            {ai.cached && (
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => { ai.loadCached(); setStage(2); }}>
                キャッシュを読み込む（{isoToTokyoDateStr(ai.cached.createdAt)}）
              </button>
            )}
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setStage(2)}>次へ ›</button>
          </div>
        </>
      ) : (
        <>
          <p className="ai-step-label">② AI の出力結果を貼り付ける</p>
          <textarea
            className="ai-result-area ai-desk-paste"
            rows={6}
            placeholder="AIの出力をここに貼り付けてください"
            value={ai.pasted}
            onChange={e => ai.setPasted(e.target.value)}
          />
          <div className="ai-desk-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!props.canExecute || !ai.pasted.trim() || ai.applied || ai.api.asking}
              onClick={ai.handleApply}
            >{ai.applied ? '✓ 取り込み完了' : '仮説に取り込む'}</button>
          </div>
        </>
      )}
      {ai.message && (
        <p className={ai.message.kind === 'error' ? 'ai-limit-msg' : 'ai-info-msg'} role={ai.message.kind === 'error' ? 'alert' : 'status'}>
          {ai.message.text}
        </p>
      )}
    </div>
  );
}
