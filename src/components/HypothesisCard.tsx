import { useState } from 'react';
import type { Hypothesis, HypothesisStatus, MarketEvent, VerificationLog, VerificationLogResult } from '../domain/types';
import { AiDeepDive } from './AiDeepDive';
import { todayStr } from '../utils/dateUtils';

const STATUS_LABELS: Record<HypothesisStatus, string> = {
  adopted: '採用',
  watching: '様子見',
  rejected: '棄却',
  needs_test: '要検証',
};

const DIRECTION_LABELS: Record<string, string> = {
  up:    '↑ 上昇',
  down:  '↓ 下落',
  mixed: '↔ 混在',
  watch: '? 様子見',
};

const CATEGORY_LABELS: Record<string, string> = {
  geopolitics:   '地政学',
  macro:         'マクロ',
  commodity:     'コモディティ',
  semiconductor: '半導体',
  currency:      '為替',
  consumer:      '消費者',
  other:         'その他',
};

const STATUS_ICONS: Record<string, string> = {
  adopted:    '✓',
  watching:   '👁',
  rejected:   '✕',
  needs_test: '🧪',
};

const VLOG_LABELS: Record<VerificationLogResult, string> = {
  hit:     '✓ 的中',
  miss:    '✕ 外れ',
  pending: '⏳ 様子見',
};

type Props = {
  hypothesis: Hypothesis;
  events: MarketEvent[];
  onStatusChange: (id: string, status: HypothesisStatus) => void;
  canExecuteAi: boolean;
  onAiIncrement: () => void;
  onAiApply: (id: string, steps: { label: string; reason: string }[], conditions: string[]) => void;
  onAddLog?: (id: string, log: Omit<VerificationLog, 'id'>) => void;
};

export function HypothesisCard({
  hypothesis: h,
  events,
  onStatusChange,
  canExecuteAi,
  onAiIncrement,
  onAiApply,
  onAddLog,
}: Props) {
  const event = events.find(e => e.id === h.eventId);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logResult, setLogResult] = useState<VerificationLogResult>('pending');
  const [logNote, setLogNote] = useState('');

  const handleAddLog = () => {
    if (!onAddLog) return;
    onAddLog(h.id, { loggedAt: todayStr(), result: logResult, note: logNote });
    setLogNote('');
    setLogResult('pending');
    setShowLogForm(false);
  };

  return (
    <article className="hypothesis-card">
      <div className="hypothesis-title-row">
        <div>
          <p className="hypothesis-id">{h.id}</p>
          <h4>{h.title}</h4>
          {event && (
            <p className="event-ref">
              <span className={`badge badge-${event.category}`}>
                {CATEGORY_LABELS[event.category] ?? event.category}
              </span>
              {event.title}
            </p>
          )}
        </div>
        <span className={`status-pill status-${h.status}`}>
          {STATUS_ICONS[h.status]} {STATUS_LABELS[h.status]}
        </span>
      </div>

      <ol className="timeline">
        {h.associationSteps.map(step => (
          <li key={step.depth}>
            <span>{step.depth}</span>
            <div>
              <p className="step-label">{step.label}</p>
              {step.reason && <p className="step-reason">{step.reason}</p>}
            </div>
          </li>
        ))}
      </ol>

      <div className="meta-row">
        <div>
          <p className="eyebrow">方向性</p>
          <p>{DIRECTION_LABELS[h.expectedDirection] ?? h.expectedDirection}</p>
        </div>
        <div>
          <p className="eyebrow">対象テーマ</p>
          <p>{h.targetThemes.join(' / ')}</p>
        </div>
      </div>

      {h.invalidationConditions.length > 0 && (
        <div className="invalidation-block">
          <p className="eyebrow">失敗条件</p>
          <ul className="invalidation-list">
            {h.invalidationConditions.map(cond => (
              <li key={cond}>{cond}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="status-actions">
        <p className="eyebrow">ステータス変更</p>
        <div className="status-btn-group">
          {(Object.keys(STATUS_LABELS) as HypothesisStatus[]).map(s => (
            <button
              key={s}
              className={`status-btn${h.status === s ? ' active' : ''}`}
              onClick={() => onStatusChange(h.id, s)}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {onAddLog && (
        <div className="vlog-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p className="eyebrow" style={{ margin: 0 }}>検証ログ</p>
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12, padding: '4px 10px' }}
              onClick={() => setShowLogForm(v => !v)}
            >
              {showLogForm ? '閉じる' : '＋ 追加'}
            </button>
          </div>
          {h.verificationLogs && h.verificationLogs.length > 0 && (
            <div className="vlog-list">
              {h.verificationLogs.map(log => (
                <div key={log.id} className={`vlog-item vlog-${log.result}`}>
                  <div className="vlog-meta">
                    <span className="vlog-date">{log.loggedAt}</span>
                    <span className="vlog-result-label">{VLOG_LABELS[log.result]}</span>
                  </div>
                  {log.note && <span className="vlog-note">{log.note}</span>}
                </div>
              ))}
            </div>
          )}
          {showLogForm && (
            <div className="vlog-add-form">
              <div className="vlog-result-group">
                {(['hit', 'miss', 'pending'] as VerificationLogResult[]).map(r => (
                  <button
                    key={r}
                    className={`vlog-result-btn ${r}${logResult === r ? ' active' : ''}`}
                    onClick={() => setLogResult(r)}
                  >
                    {VLOG_LABELS[r]}
                  </button>
                ))}
              </div>
              <textarea
                rows={2}
                placeholder="メモ（任意）"
                value={logNote}
                onChange={e => setLogNote(e.target.value)}
                style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={handleAddLog}>
                ログを保存
              </button>
            </div>
          )}
        </div>
      )}

      <div className="ai-section">
        <AiDeepDive
          hypothesis={h}
          event={event}
          canExecute={canExecuteAi}
          onIncrement={onAiIncrement}
          onApply={(steps, conditions) => onAiApply(h.id, steps, conditions)}
        />
      </div>
    </article>
  );
}
