interface Props {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
  label?: string;
}

export function Pager({ page, pageCount, onChange, label = '一覧' }: Props) {
  if (pageCount <= 1) return null;
  return (
    <nav className="pager" aria-label={`${label}のページ送り`}>
      <button type="button" className="btn btn-ghost" onClick={() => onChange(page - 1)} disabled={page === 0} aria-label="前のページ">‹</button>
      <span className="pager-pos">{page + 1} / {pageCount}</span>
      <button type="button" className="btn btn-ghost" onClick={() => onChange(page + 1)} disabled={page >= pageCount - 1} aria-label="次のページ">›</button>
    </nav>
  );
}
