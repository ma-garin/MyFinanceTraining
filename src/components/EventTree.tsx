import { useState } from 'react';
import type { MarketEvent, Hypothesis } from '../domain/types';
import { categoryLabel } from '../ui/labels';
import { AssociationFlow } from './AssociationFlow';

type Props = {
  events: MarketEvent[];
  hypotheses: Hypothesis[];
};

const UNLINKED = '__unlinked__';

type Option = { id: string; label: string; hyps: Hypothesis[] };

function buildOptions(events: MarketEvent[], hypotheses: Hypothesis[]): Option[] {
  const opts = events.map(ev => ({
    id: ev.id,
    label: `${ev.title}（${categoryLabel(ev.category)}・${ev.occurredAt}）`,
    hyps: hypotheses.filter(h => h.eventId === ev.id),
  }));
  const unlinked = hypotheses.filter(h => !events.some(e => e.id === h.eventId));
  return unlinked.length > 0 ? [...opts, { id: UNLINKED, label: 'イベント未紐付け', hyps: unlinked }] : opts;
}

// スマホ用。イベントを 1 件ずつ選び、そのイベントから出た仮説の連想を縦のフローで見せる
export function EventTree({ events, hypotheses }: Props) {
  const options = buildOptions(events, hypotheses);
  const firstWithHyp = options.find(o => o.hyps.length > 0) ?? options[0];
  const [pickedId, setPickedId] = useState<string | null>(null);
  const picked = options.find(o => o.id === pickedId) ?? firstWithHyp;

  if (!picked) return <div className="event-tree"><p className="empty-msg">イベントと仮説を登録するとツリーが表示されます</p></div>;

  return (
    <div className="event-tree">
      <label className="aflow-event-pick">
        <span className="eyebrow">イベント</span>
        <select value={picked.id} onChange={e => setPickedId(e.target.value)}>
          {options.map(o => <option key={o.id} value={o.id}>{o.label}・仮説 {o.hyps.length} 件</option>)}
        </select>
      </label>
      {picked.hyps.length === 0
        ? <p className="tree-no-hyp">仮説なし</p>
        : <AssociationFlow key={picked.id} events={events} hypotheses={picked.hyps} layout="vertical" />}
    </div>
  );
}
