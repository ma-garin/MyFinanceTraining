import { useState } from 'react';
import { statusWithIcon, URGENCY_LABELS } from '../ui/labels';
import type { AppState, Hypothesis, HypothesisStatus, HypothesisUrgency, VerificationLog } from '../domain/types';
import { HypothesisForm } from '../components/HypothesisForm';
import { HypothesisCard } from '../components/HypothesisCard';
import { EventTree } from '../components/EventTree';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { AssociationTreeDesktop } from './AssociationTreeDesktop';

type FilterStatus = HypothesisStatus | 'all';
type FilterUrgency = HypothesisUrgency | 'all';

const FILTER_STATUS_OPTS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: '全て' },
  { value: 'needs_test', label: statusWithIcon('needs_test') },
  { value: 'adopted', label: statusWithIcon('adopted') },
  { value: 'watching', label: statusWithIcon('watching') },
  { value: 'rejected', label: statusWithIcon('rejected') },
];

const FILTER_URGENCY_OPTS: { value: FilterUrgency; label: string }[] = [
  { value: 'all', label: '全期間' },
  { value: 'high', label: URGENCY_LABELS.high },
  { value: 'medium', label: URGENCY_LABELS.medium },
  { value: 'low', label: URGENCY_LABELS.low },
];

type TreeProps = {
  state: AppState;
  onAdd: (h: Hypothesis) => void;
  onStatusChange: (id: string, status: HypothesisStatus, reason: string) => void;
  onDelete: (id: string) => void;
  canExecuteAi: boolean;
  onAiIncrement: () => boolean;
  onAiApply: (id: string, steps: { label: string; reason: string }[], conditions: string[]) => void;
  onAddLog: (id: string, log: Omit<VerificationLog, 'id'>) => void;
};

// PC（961px 以上）だけ 2 ペインの骨格に切り替える。スマホの表示は従来の縦並びのまま
export function AssociationTreeView(props: TreeProps) {
  const isDesktop = useIsDesktop();
  return isDesktop ? <AssociationTreeDesktop {...props} /> : <AssociationTreeMobile {...props} />;
}

function AssociationTreeMobile({ state, onAdd, onStatusChange, onDelete, canExecuteAi, onAiIncrement, onAiApply, onAddLog }: TreeProps) {
  const [showForm, setShowForm] = useState(false);
  const [showTree, setShowTree] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterUrgency, setFilterUrgency] = useState<FilterUrgency>('all');

  const handleAdd = (h: Hypothesis) => { onAdd(h); setShowForm(false); };

  const filtered = [...state.hypotheses]
    .reverse()
    .filter(h => filterStatus === 'all' || h.status === filterStatus)
    .filter(h => filterUrgency === 'all' || h.urgency === filterUrgency);

  return (
    <>
      <header className="view-header">
        <p className="eyebrow">Association Tree</p>
        <h2>連想ツリーと投資仮説</h2>
      </header>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? '閉じる' : '＋ 仮説を追加'}
        </button>
        <button className="btn btn-ghost" onClick={() => setShowTree(v => !v)}>
          {showTree ? '連想フローを閉じる' : '🌲 連想フロー'}
        </button>
      </div>
      {showForm && <HypothesisForm events={state.events} onAdd={handleAdd} />}
      {showTree && <EventTree events={state.events} hypotheses={state.hypotheses} />}

      <div className="filter-bar">
        <div className="filter-group">
          <span className="eyebrow">ステータス</span>
          <div className="filter-chips">
            {FILTER_STATUS_OPTS.map(o => (
              <button
                key={o.value}
                className={`filter-chip${filterStatus === o.value ? ' active' : ''}`}
                onClick={() => setFilterStatus(o.value)}
              >{o.label}</button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <span className="eyebrow">緊急度</span>
          <div className="filter-chips">
            {FILTER_URGENCY_OPTS.map(o => (
              <button
                key={o.value}
                className={`filter-chip${filterUrgency === o.value ? ' active' : ''}`}
                onClick={() => setFilterUrgency(o.value)}
              >{o.label}</button>
            ))}
          </div>
        </div>
        <p className="filter-count">{filtered.length} / {state.hypotheses.length} 件</p>
      </div>

      <div className="hypothesis-list">
        {filtered.length === 0 && (
          <p className="empty-msg">
            {state.hypotheses.length === 0
              ? '仮説がありません。「仮説を追加」から登録してください。'
              : 'フィルター条件に一致する仮説がありません。'}
          </p>
        )}
        {filtered.map(h => (
          <HypothesisCard
            key={h.id}
            hypothesis={h}
            events={state.events}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
            canExecuteAi={canExecuteAi}
            onAiIncrement={onAiIncrement}
            onAiApply={onAiApply}
            onAddLog={onAddLog}
          />
        ))}
      </div>
    </>
  );
}

// ─── Hypothesis Detail ───────────────────────────────────────────────────────
