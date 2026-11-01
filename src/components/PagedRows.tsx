import type { ReactNode } from 'react';
import { useFitCount } from '../hooks/useFitCount';
import { usePaged } from '../hooks/usePaged';
import { Pager } from './desktop/Pager';

type Props<T> = {
  items: readonly T[];
  label: string;
  empty: string;
  keyOf: (item: T, index: number) => string;
  renderRow: (item: T) => ReactNode;
  rowHeight?: number;
};

// PC の枠内スクロールを出さないため、枠の高さに入る行数ごとにページ送りする。
// useFitCount は初回描画時の要素を測るので、計測枠は常に描画しておく
export function PagedRows<T>({ items, label, empty, keyOf, renderRow, rowHeight = 56 }: Props<T>) {
  const [ref, count] = useFitCount<HTMLDivElement>(rowHeight);
  const { page, pageCount, pageItems, setPage } = usePaged(items, count);
  return (
    <>
      <div ref={ref} className="fit-area" aria-label={label}>
        {items.length === 0
          ? <p className="pane-empty">{empty}</p>
          : pageItems.map((item, i) => <div key={keyOf(item, page * count + i)} className="pane-row-slot">{renderRow(item)}</div>)}
      </div>
      <Pager page={page} pageCount={pageCount} onChange={setPage} label={label} />
    </>
  );
}

// 1 行に収まらない本文は省略し、全文は title で読めるようにする
export function TextRow({ main, sub }: { main: string; sub?: string }) {
  const full = sub ? `${main}\n${sub}` : main;
  return (
    <div className="pane-row" title={full}>
      <p className="pane-row-main">{main}</p>
      {sub && <p className="pane-row-sub">{sub}</p>}
    </div>
  );
}
