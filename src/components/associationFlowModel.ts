import type { Hypothesis, MarketEvent } from '../domain/types';

export const FLOW_COLUMNS = ['イベント', '直接影響', '行動変化', '需要/供給変化', '業種変化', '候補銘柄/ETF'] as const;

export type FlowReason = { hypId: string; text: string };

export type FlowNode = {
  key: string;
  col: number;
  row: number;
  label: string;
  reasons: FlowReason[];
  hypIds: string[];
};

export type FlowEdge = { key: string; from: string; to: string; hypIds: string[] };

export type FlowModel = { columns: FlowNode[][]; edges: FlowEdge[]; nodes: Map<string, FlowNode> };

const UNLINKED_LABEL = 'イベント未紐付け';

function clampDepth(depth: number): number {
  return Math.min(5, Math.max(1, Math.round(depth) || 1));
}

// 同じ深さに複数ステップがある仮説も 1 列 1 ノードにまとめる（列の高さを仮説数で抑え、PC で枠内に収めるため）
function stepsByDepth(h: Hypothesis): Map<number, { label: string; reason: string }> {
  const out = new Map<number, { label: string; reason: string }>();
  for (const s of h.associationSteps) {
    const d = clampDepth(s.depth);
    const label = s.label.trim();
    if (!label) continue;
    const prev = out.get(d);
    out.set(d, prev
      ? { label: `${prev.label}／${label}`, reason: [prev.reason, s.reason].filter(Boolean).join('\n') }
      : { label, reason: s.reason });
  }
  return out;
}

type Draft = { nodes: Map<string, FlowNode>; edges: Map<string, FlowEdge>; rows: number[] };

function touchNode(d: Draft, key: string, col: number, label: string, reason: FlowReason | null): void {
  const prev = d.nodes.get(key);
  const hypId = reason?.hypId;
  if (prev) {
    d.nodes.set(key, {
      ...prev,
      hypIds: hypId && !prev.hypIds.includes(hypId) ? [...prev.hypIds, hypId] : prev.hypIds,
      reasons: reason && reason.text ? [...prev.reasons, reason] : prev.reasons,
    });
    return;
  }
  const row = d.rows[col];
  d.rows[col] = row + 1;
  d.nodes.set(key, { key, col, row, label, hypIds: hypId ? [hypId] : [], reasons: reason && reason.text ? [reason] : [] });
}

function touchEdge(d: Draft, from: string, to: string, hypId: string): void {
  const key = `${from}>${to}`;
  const prev = d.edges.get(key);
  d.edges.set(key, prev
    ? { ...prev, hypIds: prev.hypIds.includes(hypId) ? prev.hypIds : [...prev.hypIds, hypId] }
    : { key, from, to, hypIds: [hypId] });
}

// 深さと文言が同じノードは 1 つにまとめる。複数の仮説が通るノードが「合流」、1 つのノードから複数へ出る線が「分岐」になる
export function buildFlow(events: MarketEvent[], hypotheses: Hypothesis[]): FlowModel {
  const d: Draft = { nodes: new Map(), edges: new Map(), rows: FLOW_COLUMNS.map(() => 0) };
  for (const h of hypotheses) {
    const ev = events.find(e => e.id === h.eventId);
    const evKey = ev ? `e:${ev.id}` : 'e:__unlinked__';
    const evReason = ev?.summary ? { hypId: h.id, text: ev.summary } : { hypId: h.id, text: '' };
    touchNode(d, evKey, 0, ev ? ev.title : UNLINKED_LABEL, evReason);
    let prevKey = evKey;
    for (const [depth, step] of [...stepsByDepth(h)].sort((a, b) => a[0] - b[0])) {
      const key = `d${depth}:${step.label}`;
      touchNode(d, key, depth, step.label, { hypId: h.id, text: step.reason });
      touchEdge(d, prevKey, key, h.id);
      prevKey = key;
    }
  }
  const all = [...d.nodes.values()];
  const columns = FLOW_COLUMNS.map((_, col) => all.filter(n => n.col === col).sort((a, b) => a.row - b.row));
  // イベントの概要は仮説ごとに重複するので 1 件だけ残す
  const nodes = new Map(all.map(n => [n.key, n.col === 0 ? { ...n, reasons: n.reasons.slice(0, 1) } : n]));
  return { columns: columns.map(c => c.map(n => nodes.get(n.key) ?? n)), edges: [...d.edges.values()], nodes };
}

const SHORT_MAX = 14;

// CSS の行数省略は枠からのはみ出し検査に「切れた中身」と数えられるため、文字数で 2 行に収まる長さへ切る
export function shortLabel(label: string, max = SHORT_MAX): string {
  const chars = [...label];
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : label;
}
