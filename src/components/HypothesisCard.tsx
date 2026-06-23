import { useState } from 'react';
import type { Hypothesis, HypothesisStatus, HypothesisUrgency, MarketEvent, VerificationLog, VerificationLogResult, ForecastOutcome } from '../domain/types';
import { AiDeepDive } from './AiDeepDive';
import { chainProbability } from '../engine/calibrationEngine';
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

const URGENCY_LABELS: Record<HypothesisUrgency, string> = {
  high:   '🔴 今週中',
  medium: '🟡 今月中',
  low:    '🔵 長期',
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
  onDelete?: (id: string) => void;
  onResolve?: (id: string, outcome: ForecastOutcome, note: string) => void;
  onClearResolution?: (id: string) => void;
  canExecuteAi: boolean;
  onAiIncrement: () => void;
  onAiApply: (id: string, steps: { label: string; reason: string }[], conditions: string[]) => void;
  onAddLog?: (id: string, log: Omit<VerificationLog, 'id'>) => void;
};

export function HypothesisCard({
  hypothesis: h,
  events,
  onStatusChange,
  onDelete,
  onResolve,
  onClearResolution,
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
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resolveNote, setResolveNote] = useState('');

  const chain = chainProbability(h.associationSteps);
  const confidencePct = typeof h.confidence === 'number' ? h.confidence : null;
  const chainPct = chain.product !== null ? chain.product * 100 : null;
  const gap = confidencePct !== null && chainPct !== null ? Math.abs(confidencePct - chainPct) : null;

  const handleResolve = (outcome: ForecastOutcome) => {
    if (!onResolve) return;
    onResolve(h.id, outcome, resolveNote.trim());
    setResolveNote('');
    setShowResolveForm(false);
  };

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
                {CATEGORY_LABELS[event.category] ?? event.category}
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
        {h.associationSteps.map(step => (
          <li key={step.depth}>
            <span>{step.depth}</span>
            <div>
              <p className="step-label">
                {step.label}
                {typeof step.probability === 'number' && (
                  <span className="step-prob-badge">{step.probability}%</span>
                )}
              </p>
              {step.reason && <p className="step-reason">{step.reason}</p>}
            </div>
          </li>
        ))}
      </ol>

      {(confidencePct !== null || chainPct !== null) && (
        <div className="forecast-block">
          {confidencePct !== null && (
            <div className="forecast-metric">
              <p className="eyebrow">確信度（予測）</p>
              <p className="forecast-value">{confidencePct}%</p>
            </div>
          )}
          {chainPct !== null && (
            <div className="forecast-metric">
              <p className="eyebrow">論理積確率</p>
              <p className="forecast-value">
                {chainPct.toFixed(1)}%
                <span className="forecast-sub"> （{chain.quantifiedLinks}/{chain.totalLinks}リンク）</span>
              </p>
            </div>
          )}
          {gap !== null && gap >= 20 && (
            <div className="forecast-metric forecast-gap">
              <p className="eyebrow">乖離</p>
              <p className="forecast-value">⚠ {gap.toFixed(0)}pt</p>
            </div>
          )}
        </div>
      )}

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

      {onResolve && (
        <div className="resolve-section">
          {h.resolution ? (
            <div className={`resolution-banner resolution-${h.resolution.outcome}`}>
              <div>
                <span className="resolution-label">
                  {h.resolution.outcome === 'hit' ? '✓ 的中で確定' : '✕ 外れで確定'}
                </span>
                <span className="resolution-date">{h.resolution.resolvedAt}</span>
                {confidencePct !== null && (
                  <span className="resolution-brier">
                    Brier {(((h.resolution.outcome === 'hit' ? 1 : 0) - confidencePct / 100) ** 2).toFixed(3)}
                  </span>
                )}
              </div>
              {h.resolution.note && <p className="resolution-note">{h.resolution.note}</p>}
              {onClearResolution && (
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 11, padding: '2px 8px', color: 'var(--text-3)', marginTop: 6 }}
                  onClick={() => onClearResolution(h.id)}
                >確定を取り消す</button>
              )}
            </div>
          ) : showResolveForm ? (
            <div className="vlog-add-form">
              <p className="eyebrow" style={{ margin: 0 }}>結果を確定（較正に反映）</p>
              <textarea
                rows={2}
                placeholder="確定理由・根拠（任意）"
                value={resolveNote}
                onChange={e => setResolveNote(e.target.value)}
                style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" style={{ flex: 1, background: '#16a34a', color: '#fff', border: 'none', fontSize: 13 }} onClick={() => handleResolve('hit')}>✓ 的中で確定</button>
                <button className="btn" style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', fontSize: 13 }} onClick={() => handleResolve('miss')}>✕ 外れで確定</button>
                <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowResolveForm(false)}>取消</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-ghost" style={{ fontSize: 12, width: '100%' }} onClick={() => setShowResolveForm(true)}>
              🎯 結果を確定する（較正に反映）
            </button>
          )}
        </div>
      )}

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
