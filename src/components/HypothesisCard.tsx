import type { Hypothesis, HypothesisStatus, MarketEvent } from '../domain/types';
import { AiDeepDive } from './AiDeepDive';

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

type Props = {
  hypothesis: Hypothesis;
  events: MarketEvent[];
  onStatusChange: (id: string, status: HypothesisStatus) => void;
  canExecuteAi: boolean;
  onAiIncrement: () => void;
  onAiApply: (id: string, steps: { label: string; reason: string }[], conditions: string[]) => void;
};

export function HypothesisCard({
  hypothesis: h,
  events,
  onStatusChange,
  canExecuteAi,
  onAiIncrement,
  onAiApply,
}: Props) {
  const event = events.find(e => e.id === h.eventId);

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
