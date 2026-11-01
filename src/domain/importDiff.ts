import type { AppState } from './types';

export type DiffCounts = { added: number; removed: number; changed: number; unchanged: number };

export type StateDiff = {
  events: DiffCounts;
  hypotheses: DiffCounts;
  addedTitles: string[];
  removedTitles: string[];
  changedTitles: string[];
};

const TITLE_LIMIT = 5;

type Item = { id: string; title?: string };

function compare<T extends Item>(current: T[], incoming: T[]) {
  const cur = new Map(current.map(x => [x.id, x]));
  const inc = new Map(incoming.map(x => [x.id, x]));
  const added = incoming.filter(x => !cur.has(x.id));
  const removed = current.filter(x => !inc.has(x.id));
  const changed = incoming.filter(x => {
    const c = cur.get(x.id);
    return c !== undefined && JSON.stringify(c) !== JSON.stringify(x);
  });
  const counts: DiffCounts = {
    added: added.length,
    removed: removed.length,
    changed: changed.length,
    unchanged: incoming.length - added.length - changed.length,
  };
  return { counts, added, removed, changed };
}

const titles = (items: Item[]) => items.slice(0, TITLE_LIMIT).map(x => x.title ?? x.id);

export function diffStates(current: AppState, incoming: AppState): StateDiff {
  const ev = compare(current.events, incoming.events);
  const hy = compare(current.hypotheses, incoming.hypotheses);
  return {
    events: ev.counts,
    hypotheses: hy.counts,
    addedTitles: titles(hy.added),
    removedTitles: titles(hy.removed),
    changedTitles: titles(hy.changed),
  };
}
