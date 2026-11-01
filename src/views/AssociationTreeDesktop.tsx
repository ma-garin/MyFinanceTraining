import { useState } from 'react';
import type { AppState, Hypothesis, HypothesisStatus, HypothesisUrgency, MarketEvent, VerificationLog } from '../domain/types';
import { STATUS_LABELS, statusWithIcon, URGENCY_LABELS, categoryLabel } from '../ui/labels';
import { SplitPane } from '../components/desktop/SplitPane';
import { PagedRows } from '../components/PagedRows';
import { HypothesisDetailPane } from '../components/HypothesisDetailPane';
import { HypothesisFormDesktop } from '../components/HypothesisFormDesktop';

type Props = {
  state: AppState;
  onAdd: (h: Hypothesis) => void;
  onStatusChange: (id: string, status: HypothesisStatus, reason: string) => void;
  onDelete: (id: string) => void;
  canExecuteAi: boolean;
  onAiIncrement: () => boolean;
  onAiApply: (id: string, steps: { label: string; reason: string }[], conditions: string[]) => void;
  onAddLog: (id: string, log: Omit<VerificationLog, 'id'>) => void;
};

const ALL = '__all__';
const UNLINKED = '__unlinked__';
type Group = { id: string; title: string; sub: string };
type Mode = { kind: 'list' } | { kind: 'form' } | { kind: 'detail'; id: string };

function buildGroups(events: MarketEvent[], hyps: Hypothesis[]): Group[] {
  const count = (pred: (h: Hypothesis) => boolean) => hyps.filter(pred).length;
  const unlinked = count(h => !events.some(e => e.id === h.eventId));
  return [
    { id: ALL, title: 'すべての仮説', sub: `仮説 ${hyps.length} 件` },
    ...events.map(e => ({ id: e.id, title: e.title, sub: `${categoryLabel(e.category)}・${e.occurredAt}・仮説 ${count(h => h.eventId === e.id)} 件` })),
    ...(unlinked > 0 ? [{ id: UNLINKED, title: 'イベント未紐付け', sub: `仮説 ${unlinked} 件` }] : []),
  ];
}

// PC: 左にイベント一覧（ページ送り）、右に選んだイベントの仮説一覧・詳細・追加フォームを切り替えて出す
export function AssociationTreeDesktop(props: Props) {
  const { state, onAdd, onDelete } = props;
  const [groupId, setGroupId] = useState(ALL);
  const [mode, setMode] = useState<Mode>({ kind: 'list' });
  const [status, setStatus] = useState<HypothesisStatus | 'all'>('all');
  const [urgency, setUrgency] = useState<HypothesisUrgency | 'all'>('all');

  const groups = buildGroups(state.events, state.hypotheses);
  const group = groups.find(g => g.id === groupId) ?? groups[0];
  const inGroup = (h: Hypothesis) => group.id === ALL
    || (group.id === UNLINKED ? !state.events.some(e => e.id === h.eventId) : h.eventId === group.id);
  const scoped = [...state.hypotheses].reverse().filter(inGroup);
  const filtered = scoped
    .filter(h => status === 'all' || h.status === status)
    .filter(h => urgency === 'all' || h.urgency === urgency);
  const selected = mode.kind === 'detail' ? state.hypotheses.find(h => h.id === mode.id) : undefined;

  const list = (
    <>
      <p className="eyebrow">イベント（{state.events.length} 件）</p>
      <PagedRows
        items={groups}
        label="イベント一覧"
        empty="イベントがありません。"
        keyOf={g => g.id}
        renderRow={g => (
          <button type="button" className={`row-item${g.id === group.id ? ' selected' : ''}`} aria-pressed={g.id === group.id} title={g.title} onClick={() => { setGroupId(g.id); setMode({ kind: 'list' }); }}>
            <span>{g.title}</span>
            <span className="row-sub">{g.sub}</span>
          </button>
        )}
      />
    </>
  );

  const back = <button type="button" className="btn btn-ghost hdp-mini" onClick={() => setMode({ kind: 'list' })}>‹ 仮説一覧へ</button>;

  const hypList = (
    <>
      <div className="atd-head">
        <h3 className="hdp-title" title={group.title}>{group.title}</h3>
        <button type="button" className="btn btn-primary" onClick={() => setMode({ kind: 'form' })}>＋ 仮説を追加</button>
      </div>
      <div className="atd-filters">
        <label>ステータス
          <select value={status} onChange={e => setStatus(e.target.value as HypothesisStatus | 'all')}>
            <option value="all">全て</option>
            {(Object.keys(STATUS_LABELS) as HypothesisStatus[]).map(s => <option key={s} value={s}>{statusWithIcon(s)}</option>)}
          </select>
        </label>
        <label>緊急度
          <select value={urgency} onChange={e => setUrgency(e.target.value as HypothesisUrgency | 'all')}>
            <option value="all">全期間</option>
            {(Object.keys(URGENCY_LABELS) as HypothesisUrgency[]).map(u => <option key={u} value={u}>{URGENCY_LABELS[u]}</option>)}
          </select>
        </label>
        <p className="filter-count">{filtered.length} / {scoped.length} 件</p>
      </div>
      <PagedRows
        key={`${group.id}-${status}-${urgency}`}
        items={filtered}
        label="仮説一覧"
        empty={scoped.length === 0 ? '仮説がありません。「仮説を追加」から登録してください。' : 'フィルター条件に一致する仮説がありません。'}
        keyOf={h => h.id}
        renderRow={h => (
          <button type="button" className="row-item" title={h.title} onClick={() => setMode({ kind: 'detail', id: h.id })}>
            <span>{h.title}</span>
            <span className="row-sub">{statusWithIcon(h.status)}{h.urgency ? `\u3000${URGENCY_LABELS[h.urgency]}` : ''}</span>
          </button>
        )}
      />
    </>
  );

  let detail = hypList;
  if (mode.kind === 'form') {
    detail = (<><div className="atd-head">{back}</div><HypothesisFormDesktop events={state.events} onAdd={h => { onAdd(h); setMode({ kind: 'list' }); }} /></>);
  } else if (selected) {
    detail = (
      <>
        <div className="atd-head">{back}</div>
        <HypothesisDetailPane {...props} key={selected.id} hypothesis={selected} events={state.events} onDelete={id => { onDelete(id); setMode({ kind: 'list' }); }} />
      </>
    );
  }

  return (
    <div className="view-root atd">
      <header className="view-header">
        <p className="eyebrow">Association Tree</p>
        <h2>連想ツリーと投資仮説</h2>
      </header>
      <SplitPane list={list} detail={detail} listLabel="イベント一覧" detailLabel="選んだイベントの仮説" />
    </div>
  );
}
