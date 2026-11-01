import { useState } from 'react';
import type { Hypothesis, HypothesisStatus, MarketEvent, VerificationLog, VerificationLogResult } from '../domain/types';
import { AiDeepDive } from './AiDeepDive';
import { StatusChangeForm } from './StatusChangeForm';
import { StatusHistory } from './StatusHistory';
import { todayStr } from '../utils/dateUtils';
import { STATUS_LABELS, STATUS_ICONS, DIRECTION_LABELS, URGENCY_LABELS, VLOG_LABELS, categoryLabel } from '../ui/labels';







type Props = {
  hypothesis: Hypothesis;
  events: MarketEvent[];
  onStatusChange: (id: string, status: HypothesisStatus, reason: string) => void;
  onDelete?: (id: string) => void;
  canExecuteAi: boolean;
  onAiIncrement: () => boolean;
  onAiApply: (id: string, steps: { label: string; reason: string }[], conditions: string[]) => void;
  onAddLog?: (id: string, log: Omit<VerificationLog, 'id'>) => void;
};

export function HypothesisCard({
  hypothesis: h,
  events,
  onStatusChange,
  onDelete,
  canExecuteAi,
  onAiIncrement,
  onAiApply,
  onAddLog,
}: Props) {
  const event = events.find(e => e.id === h.eventId);
  const [showLogForm, setShowLogForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [logResult, setLogResult] = useState<VerificationLogResult>('pending');
  const [logNote, setLogNote] = useState('');
  const [pendingStatus, setPendingStatus] = useState<HypothesisStatus | null>(null);

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p className="hypothesis-id" style={{ margin: 0 }}>{h.id}</p>
            {h.urgency && (
              <span className={`urgency-badge urgency-${h.urgency}`}>
                {URGENCY_LABELS[h.urgency]}
              </span>
            )}
          </div>
          <h4>{h.title}</h4>
          {event && (
            <p className="event-ref">
              <span className={`badge badge-${event.category}`}>
                {categoryLabel(event.category)}
              </span>
              {event.title}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span className={`status-pill status-${h.status}`}>
            {STATUS_ICONS[h.status]} {STATUS_LABELS[h.status]}
          </span>
          {onDelete && (
            confirmDelete ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 11, padding: '2px 8px' }}
                  onClick={() => setConfirmDelete(false)}
                >キャンセル</button>
                <button
                  className="btn"
                  style={{ fontSize: 11, padding: '2px 8px', background: '#dc2626', color: '#fff', border: 'none' }}
                  onClick={() => onDelete(h.id)}
                >削除確定</button>
              </div>
            ) : (
              <button
                className="btn btn-ghost"
                style={{ fontSize: 11, padding: '2px 8px', color: 'var(--text-3)' }}
                onClick={() => setConfirmDelete(true)}
              >削除</button>
            )
          )}
        </div>
      </div>

      <ol className="timeline">
        {h.associationSteps.map((step, i) => (
          <li key={`${step.depth}-${i}`}>
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

      {h.candidateStocks && h.candidateStocks.length > 0 && (
        <div className="candidate-stocks-block">
          <p className="eyebrow">候補銘柄</p>
          <div className="candidate-stocks-list">
            {h.candidateStocks.map(s => (
              <span key={s} className="stock-chip">{s}</span>
            ))}
          </div>
        </div>
      )}

      {h.invalidationConditions.length > 0 && (
        <div className="invalidation-block">
          <p className="eyebrow">失敗条件</p>
          <ul className="invalidation-list">
            {h.invalidationConditions.map((cond, i) => (
              <li key={`${i}-${cond}`}>{cond}</li>
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
              onClick={() => { if (s !== h.status) setPendingStatus(s); }}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        {pendingStatus && (
          <StatusChangeForm
            from={h.status}
            to={pendingStatus}
            onSubmit={reason => {
              onStatusChange(h.id, pendingStatus, reason);
              setPendingStatus(null);
            }}
            onCancel={() => setPendingStatus(null)}
          />
        )}
        <StatusHistory history={h.statusHistory} />
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
