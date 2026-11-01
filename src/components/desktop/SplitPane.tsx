import type { ReactNode } from 'react';

interface Props {
  list: ReactNode;
  detail: ReactNode;
  listLabel: string;
  detailLabel: string;
}

export function SplitPane({ list, detail, listLabel, detailLabel }: Props) {
  return (
    <div className="split-pane">
      <section className="split-list" aria-label={listLabel}>{list}</section>
      <section className="split-detail" aria-label={detailLabel}>{detail}</section>
    </div>
  );
}
