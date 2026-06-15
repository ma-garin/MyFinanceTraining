import { useState } from 'react';
import type { MarketEvent, Hypothesis } from '../domain/types';

const STATUS_COLOR: Record<string, string> = {
  adopted:    '#16a34a',
  watching:   '#d97706',
  rejected:   '#dc2626',
  needs_test: '#7c3aed',
};

const STATUS_LABELS: Record<string, string> = {
  adopted:    '✓ 採用',
  watching:   '👁 様子見',
  rejected:   '✕ 棄却',
  needs_test: '🧪 要検証',
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

type Props = {
  events: MarketEvent[];
  hypotheses: Hypothesis[];
};

function HypBranch({ h, expanded, onToggle }: {
  h: Hypothesis;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="tree-hyp-item">
      <button
        className={`tree-hyp-node${expanded ? ' expanded' : ''}`}
        style={{ borderLeftColor: STATUS_COLOR[h.status] }}
        onClick={onToggle}
      >
        <span style={{ color: STATUS_COLOR[h.status], fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
          {STATUS_LABELS[h.status]}
        </span>
        <span className="tree-hyp-title">{h.title}</span>
        <span className="tree-expand-icon">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="tree-step-list">
          {h.associationSteps.map(step => (
            <div key={step.depth} className="tree-step-item">
              <span className="step-num" style={{ width: 28, height: 28, fontSize: 12 }}>{step.depth}</span>
              <div>
                <p className="step-label">{step.label}</p>
                {step.reason && <p className="step-reason">{step.reason}</p>}
              </div>
            </div>
          ))}
          {h.invalidationConditions.length > 0 && (
            <div style={{ padding: '8px 0 0', borderTop: '1px dashed var(--border)', marginTop: 4 }}>
              <p className="eyebrow" style={{ marginBottom: 4 }}>失敗条件</p>
              {h.invalidationConditions.map(c => (
                <p key={c} style={{ margin: '2px 0', fontSize: 12, color: 'var(--text-3)' }}>✕ {c}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function EventTree({ events, hypotheses }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggle = (id: string) => setExpandedId(prev => prev === id ? null : id);

  const unlinked = hypotheses.filter(h => !events.find(e => e.id === h.eventId));

  return (
    <div className="event-tree">
      {events.map(ev => {
        const evHyps = hypotheses.filter(h => h.eventId === ev.id);
        return (
          <div key={ev.id} className="tree-event-block">
            <div className="tree-event-node">
              <span className={`badge badge-${ev.category}`}>
                {CATEGORY_LABELS[ev.category] ?? ev.category}
              </span>
              <p className="tree-event-title">{ev.title}</p>
              <span className="date-label">{ev.occurredAt}</span>
              {evHyps.length === 0 && <span className="tree-no-hyp">仮説なし</span>}
            </div>
            {evHyps.length > 0 && (
              <div className="tree-hyp-list">
                {evHyps.map(h => (
                  <HypBranch
                    key={h.id}
                    h={h}
                    expanded={expandedId === h.id}
                    onToggle={() => toggle(h.id)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {unlinked.length > 0 && (
        <div className="tree-event-block">
          <div className="tree-event-node">
            <p className="eyebrow" style={{ margin: 0 }}>イベント未紐付け</p>
          </div>
          <div className="tree-hyp-list">
            {unlinked.map(h => (
              <HypBranch
                key={h.id}
                h={h}
                expanded={expandedId === h.id}
                onToggle={() => toggle(h.id)}
              />
            ))}
          </div>
        </div>
      )}

      {events.length === 0 && hypotheses.length === 0 && (
        <p className="empty-msg">イベントと仮説を登録するとツリーが表示されます</p>
      )}
    </div>
  );
}
