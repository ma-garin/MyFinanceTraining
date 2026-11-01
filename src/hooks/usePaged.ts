import { useState } from 'react';

export interface Paged<T> {
  page: number;
  pageCount: number;
  pageItems: T[];
  setPage: (page: number) => void;
}

// 件数が減ってページが範囲外になっても空ページを見せないよう、描画時に丸める
export function usePaged<T>(items: readonly T[], pageSize: number): Paged<T> {
  const size = Math.max(1, Math.floor(pageSize));
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const [rawPage, setRawPage] = useState(0);
  const page = Math.min(Math.max(0, rawPage), pageCount - 1);
  return {
    page,
    pageCount,
    pageItems: items.slice(page * size, page * size + size),
    setPage: (p: number) => setRawPage(Math.min(Math.max(0, p), pageCount - 1)),
  };
}
