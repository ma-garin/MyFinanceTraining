import { useMemo, useState, type ReactNode } from 'react';
import type { Hypothesis, HypothesisStatus } from '../domain/types';
import {
  filterRows, lastUpdated, nextSort, sortRows, themeOptions,
  type CompareFilter, type CompareKey, type CompareRow, type SortDir,
} from '../domain/hypothesisCompare';
import { formatRate, hypothesisStats } from '../services/reportService';
import { STATUS_LABELS } from '../ui/labels';
import { useFitCount } from '../hooks/useFitCount';
import { usePaged } from '../hooks/usePaged';
import { Pager } from './desktop/Pager';
import '../styles/desktop/hypothesis-compare.css';

export type HypothesisViewMode = 'list' | 'compare';
type Sort = { key: CompareKey; dir: SortDir };

const COLUMNS: { key: CompareKey; label: string; title?: string }[] = [
  { key: 'title', label: 'タイトル' },
  { key: 'status', label: '状態' },
  { key: 'themes', label: 'テーマ' },
  { key: 'depth', label: '段数', title: '連想の段数' },
  { key: 'verify', label: '検証', title: '的中 / 外れ / 未判定' },
  { key: 'rate', label: '的中率' },
  { key: 'updated', label: '最終更新' },
];
const ROW_H = 44;

const toRow = (h: Hypothesis): CompareRow => ({
  id: h.id, title: h.title, status: h.status, themes: h.targetThemes,
  depth: h.associationSteps.length, ...hypothesisStats(h), updatedAt: lastUpdated(h),
});
const verifyText = (r: CompareRow) => `的${r.hit} 外${r.miss} 未${r.pending}`;
const sortState = (sort: Sort, key: CompareKey) => (sort.key === key ? (sort.dir === 'asc' ? '（昇順で表示中）' : '（降順で表示中）') : '');
const dirMark = (sort: Sort, key: CompareKey) => (sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '');

export function ViewModeToggle({ mode, onChange }: { mode: HypothesisViewMode; onChange: (m: HypothesisViewMode) => void }) {
  const item = (m: HypothesisViewMode, label: string) => (
    <button type="button" className={`hc-toggle-btn${mode === m ? ' active' : ''}`} aria-pressed={mode === m} onClick={() => onChange(m)}>{label}</button>
  );
  return <div className="hc-toggle" role="group" aria-label="表示の切り替え">{item('list', '一覧・詳細')}{item('compare', '比較表')}</div>;
}

type Props = { hypotheses: readonly Hypothesis[]; onOpen: (id: string) => void; compact?: boolean };

// 並べ替え・絞り込みの状態は表示形（PC の表／スマホの行リスト）に依らず共通にする
export function HypothesisCompare({ hypotheses, onOpen, compact = false }: Props) {
  const [sort, setSort] = useState<Sort>({ key: 'updated', dir: 'desc' });
  const [filter, setFilter] = useState<CompareFilter>({ status: '', theme: '' });
  const all = useMemo(() => hypotheses.map(toRow), [hypotheses]);
  const rows = useMemo(() => sortRows(filterRows(all, filter), sort.key, sort.dir), [all, filter, sort]);
  const themes = useMemo(() => themeOptions(all), [all]);
  return (
    <section className={compact ? 'hc-root hc-compact' : 'hc-root'} aria-label="仮説の比較表">
      <CompareFilters filter={filter} themes={themes} onChange={setFilter} count={rows.length} total={all.length}>
        {compact && <SortControls sort={sort} onChange={setSort} />}
      </CompareFilters>
      {compact
        ? <CompareList rows={rows} onOpen={onOpen} />
        : <CompareTable rows={rows} sort={sort} onSort={k => setSort(s => nextSort(s, k))} onOpen={onOpen} />}
    </section>
  );
}

type FilterProps = { filter: CompareFilter; themes: string[]; onChange: (f: CompareFilter) => void; count: number; total: number; children?: ReactNode };

function CompareFilters({ filter, themes, onChange, count, total, children }: FilterProps) {
  return (
    <div className="hc-filters">
      <label className="hc-field">状態
        <select value={filter.status} onChange={e => onChange({ ...filter, status: e.target.value as HypothesisStatus | '' })}>
          <option value="">すべて</option>
          {(Object.keys(STATUS_LABELS) as HypothesisStatus[]).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </label>
      <label className="hc-field">テーマ
        <select value={filter.theme} onChange={e => onChange({ ...filter, theme: e.target.value })}>
          <option value="">すべて</option>
          {themes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      {children}
      <span className="hc-count" aria-live="polite">{count} / {total} 件</span>
    </div>
  );
}

function SortControls({ sort, onChange }: { sort: Sort; onChange: (s: Sort) => void }) {
  return (
    <div className="hc-sort">
      <label className="hc-field">並べ替え
        <select value={sort.key} onChange={e => onChange({ key: e.target.value as CompareKey, dir: 'asc' })}>
          {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.title ?? c.label}</option>)}
        </select>
      </label>
      <button type="button" className="btn btn-ghost hc-dir" onClick={() => onChange({ ...sort, dir: sort.dir === 'asc' ? 'desc' : 'asc' })}>
        {sort.dir === 'asc' ? '昇順 ▲' : '降順 ▼'}
      </button>
    </div>
  );
}

const EMPTY = '条件に合う仮説がありません。絞り込みを「すべて」に戻してください。';

function CompareTable({ rows, sort, onSort, onOpen }: { rows: CompareRow[]; sort: Sort; onSort: (k: CompareKey) => void; onOpen: (id: string) => void }) {
  const [ref, count] = useFitCount<HTMLDivElement>(ROW_H);
  const { page, pageCount, pageItems, setPage } = usePaged(rows, count);
  return (
    <div className="hc-table" aria-label="仮説の比較">
      <div className="hc-grid hc-head">
        {COLUMNS.map(c => (
          <button key={c.key} type="button" className={`hc-sort-btn${sort.key === c.key ? ' active' : ''}`} title={c.title}
            aria-label={`${c.title ?? c.label}で並べ替え${sortState(sort, c.key)}`} onClick={() => onSort(c.key)}>{c.label}{dirMark(sort, c.key)}</button>
        ))}
      </div>
      <div ref={ref} className="fit-area hc-body">
        {rows.length === 0 ? <p className="pane-empty">{EMPTY}</p> : pageItems.map(r => <TableRow key={r.id} r={r} onOpen={onOpen} />)}
      </div>
      <Pager page={page} pageCount={pageCount} onChange={setPage} label="比較表" />
    </div>
  );
}

function TableRow({ r, onOpen }: { r: CompareRow; onOpen: (id: string) => void }) {
  const themes = r.themes.join('、') || '-';
  return (
    <button type="button" className="hc-grid hc-row" title={r.title} aria-label={`${r.title}の詳細を開く`} onClick={() => onOpen(r.id)}>
      <span className="hc-cell">{r.title}</span>
      <span><span className={`status-pill status-${r.status} hc-pill`}>{STATUS_LABELS[r.status]}</span></span>
      <span className="hc-cell" title={themes}>{themes}</span>
      <span className="hc-num">{r.depth}</span>
      <span className="hc-cell">{verifyText(r)}</span>
      <span className="hc-num">{formatRate(r.hitRate)}</span>
      <span className="hc-cell">{r.updatedAt || '-'}</span>
    </button>
  );
}

function CompareList({ rows, onOpen }: { rows: CompareRow[]; onOpen: (id: string) => void }) {
  if (rows.length === 0) return <p className="pane-empty">{EMPTY}</p>;
  return (
    <ul className="hc-list">
      {rows.map(r => (
        <li key={r.id}>
          <button type="button" className="hc-item" aria-label={`${r.title}の詳細を開く`} onClick={() => onOpen(r.id)}>
            <span className="hc-item-top">
              <span className="hc-item-title">{r.title}</span>
              <span className={`status-pill status-${r.status} hc-pill`}>{STATUS_LABELS[r.status]}</span>
            </span>
            <span className="hc-item-sub">{r.themes.join('、') || 'テーマなし'}</span>
            <span className="hc-item-sub">{r.depth}段・{verifyText(r)}・的中率 {formatRate(r.hitRate)}・{r.updatedAt || '更新日なし'}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
