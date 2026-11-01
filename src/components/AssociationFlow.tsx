import { useState } from 'react';
import type { Hypothesis, MarketEvent } from '../domain/types';
import { STATUS_COLOR, statusWithIcon } from '../ui/labels';
import { buildFlow, FLOW_COLUMNS, shortLabel, type FlowModel, type FlowNode } from './associationFlowModel';

type Props = {
  events: MarketEvent[];
  hypotheses: Hypothesis[];
  layout: 'horizontal' | 'vertical';
  onOpenHypothesis?: (id: string) => void;
  pageSize?: number;
};

type Active = Set<string> | null;

const COLS = FLOW_COLUMNS.length;
const GAP = 0.8;

const isOn = (active: Active, ids: string[]) => !active || ids.some(id => active.has(id));

function nodeClass(n: FlowNode, active: Active, selected: boolean): string {
  return ['aflow-node', isOn(active, n.hypIds) ? '' : 'dim', selected ? 'selected' : '', n.hypIds.length > 1 ? 'merge' : '']
    .filter(Boolean).join(' ');
}

function NodeButton({ n, active, selected, onPick, short }: { n: FlowNode; active: Active; selected: boolean; onPick: (k: string) => void; short: boolean }) {
  return (
    <button type="button" className={nodeClass(n, active, selected)} aria-pressed={selected} title={n.label} onClick={() => onPick(n.key)}>
      <span className="aflow-node-label">{short ? shortLabel(n.label) : n.label}</span>
      {n.hypIds.length > 1 && <span className="aflow-merge">合流 {n.hypIds.length}</span>}
    </button>
  );
}

function centerY(model: FlowModel, n: FlowNode): number {
  return ((n.row + 0.5) / model.columns[n.col].length) * 1000;
}

function HorizontalGraph({ model, active, selNode, onPick }: { model: FlowModel; active: Active; selNode: string | null; onPick: (k: string) => void }) {
  const colW = 100 / COLS;
  return (
    <>
      <div className="aflow-heads" aria-hidden="true">
        {FLOW_COLUMNS.map((c, i) => <span key={c} className="aflow-head">{i > 0 && <span className="aflow-arrow">→</span>}{c}</span>)}
      </div>
      <div className="aflow-graph">
        <svg className="aflow-lines" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
          {model.edges.map(e => {
            const a = model.nodes.get(e.from);
            const b = model.nodes.get(e.to);
            if (!a || !b) return null;
            const x1 = ((a.col + 1) * colW - GAP) * 10;
            const x2 = (b.col * colW + GAP) * 10;
            const xm = (x1 + x2) / 2;
            const [y1, y2] = [centerY(model, a), centerY(model, b)];
            return <path key={e.key} className={isOn(active, e.hypIds) ? 'on' : 'dim'} d={`M${x1} ${y1} C${xm} ${y1} ${xm} ${y2} ${x2} ${y2}`} vectorEffect="non-scaling-stroke" />;
          })}
        </svg>
        {model.columns.map((col, i) => (
          // 等しい余白で並べると中心が (row+0.5)/n に来るので、線の端と揃う。文言が折り返して高さが増えても枠からはみ出さない
          <div key={FLOW_COLUMNS[i]} className="aflow-col" style={{ left: `${i * colW + GAP}%`, width: `${colW - GAP * 2}%` }}>
            {col.map(n => <NodeButton key={n.key} n={n} active={active} selected={selNode === n.key} onPick={onPick} short />)}
          </div>
        ))}
      </div>
    </>
  );
}

function VerticalGraph({ model, active, selNode, onPick }: { model: FlowModel; active: Active; selNode: string | null; onPick: (k: string) => void }) {
  return (
    <ol className="aflow-vertical">
      {model.columns.map((col, i) => col.length === 0 ? null : (
        <li key={FLOW_COLUMNS[i]} className="aflow-stage">
          <p className="eyebrow aflow-stage-name">{i > 0 ? `${i}. ` : ''}{FLOW_COLUMNS[i]}</p>
          <div className="aflow-stage-nodes">
            {col.map(n => <NodeButton key={n.key} n={n} active={active} selected={selNode === n.key} onPick={onPick} short={false} />)}
          </div>
        </li>
      ))}
    </ol>
  );
}

function HypBar({ hyps, page, pages, selHyp, onPage, onPick }: { hyps: Hypothesis[]; page: number; pages: number; selHyp: string | null; onPage: (p: number) => void; onPick: (id: string) => void }) {
  return (
    <div className="aflow-hyps" role="group" aria-label="経路を強調する仮説">
      {hyps.map(h => (
        <button key={h.id} type="button" className={`aflow-hyp${selHyp === h.id ? ' selected' : ''}`} aria-pressed={selHyp === h.id} title={h.title} onClick={() => onPick(h.id)}>
          <span className="aflow-dot" style={{ background: STATUS_COLOR[h.status] }} aria-hidden="true" />
          <span className="aflow-hyp-title">{h.title}</span>
        </button>
      ))}
      {pages > 1 && (
        <span className="aflow-pager">
          <button type="button" className="btn btn-ghost hdp-mini" disabled={page === 0} aria-label="前の仮説" onClick={() => onPage(page - 1)}>‹</button>
          <span>{page + 1}/{pages}</span>
          <button type="button" className="btn btn-ghost hdp-mini" disabled={page >= pages - 1} aria-label="次の仮説" onClick={() => onPage(page + 1)}>›</button>
        </span>
      )}
    </div>
  );
}

function Detail({ model, hyps, selNode, selHyp, onOpenHypothesis }: { model: FlowModel; hyps: Hypothesis[]; selNode: string | null; selHyp: string | null; onOpenHypothesis?: (id: string) => void }) {
  const node = selNode ? model.nodes.get(selNode) : undefined;
  const hyp = hyps.find(h => h.id === selHyp);
  const titleOf = (id: string) => hyps.find(h => h.id === id)?.title ?? '';
  if (!node && !hyp) return <div className="aflow-detail" aria-live="polite"><p className="aflow-hint">仮説を選ぶと経路を強調します。ノードを選ぶと理由の全文を表示します。</p></div>;
  return (
    <div className="aflow-detail" aria-live="polite">
      {node && (
        <>
          <p className="aflow-detail-head"><span className="eyebrow">{FLOW_COLUMNS[node.col]}</span> {node.label}</p>
          {node.reasons.length === 0 && <p className="aflow-hint">理由は登録されていません。</p>}
          {node.reasons.map(r => (
            <p key={r.hypId} className="aflow-reason">{node.col > 0 && node.hypIds.length > 1 && <strong>{titleOf(r.hypId)}: </strong>}{r.text}</p>
          ))}
        </>
      )}
      {hyp && !node && (
        <>
          <p className="aflow-detail-head"><span className="eyebrow">{statusWithIcon(hyp.status)}</span> {hyp.title}</p>
          {hyp.invalidationConditions.length > 0 && <p className="aflow-reason">失敗条件: {hyp.invalidationConditions.join(' ／ ')}</p>}
        </>
      )}
      {hyp && onOpenHypothesis && <button type="button" className="btn btn-ghost hdp-mini" onClick={() => onOpenHypothesis(hyp.id)}>仮説の詳細を開く ›</button>}
    </div>
  );
}

// 仮説の選択で経路を、ノードの選択で理由を見せる。PC は横向きの列（枠内に収める）、スマホは縦に並べる
export function AssociationFlow({ events, hypotheses, layout, onOpenHypothesis, pageSize = 3 }: Props) {
  const [page, setPage] = useState(0);
  const [selHyp, setSelHyp] = useState<string | null>(null);
  const [selNode, setSelNode] = useState<string | null>(null);
  const pages = Math.max(1, Math.ceil(hypotheses.length / pageSize));
  const current = Math.min(page, pages - 1);
  const hyps = hypotheses.slice(current * pageSize, (current + 1) * pageSize);
  if (hyps.length === 0) return <p className="empty-msg">表示できる仮説がありません。</p>;
  const model = buildFlow(events, hyps);
  const node = selNode ? model.nodes.get(selNode) : undefined;
  const active: Active = selHyp ? new Set([selHyp]) : node ? new Set(node.hypIds) : null;
  const pickNode = (k: string) => setSelNode(prev => prev === k ? null : k);
  const pickHyp = (id: string) => { setSelHyp(prev => prev === id ? null : id); setSelNode(null); };
  const goPage = (p: number) => { setPage(p); setSelHyp(null); setSelNode(null); };
  const graphProps = { model, active, selNode: node ? node.key : null, onPick: pickNode };
  return (
    <div className={`aflow aflow-${layout}`}>
      <HypBar hyps={hyps} page={current} pages={pages} selHyp={selHyp} onPage={goPage} onPick={pickHyp} />
      {layout === 'horizontal' ? <HorizontalGraph {...graphProps} /> : <VerticalGraph {...graphProps} />}
      <Detail model={model} hyps={hyps} selNode={node ? node.key : null} selHyp={selHyp} onOpenHypothesis={onOpenHypothesis} />
    </div>
  );
}
