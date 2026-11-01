import { useState } from 'react';
import type { Hypothesis, BacktestResult } from '../domain/types';
import { runBacktest, summarizeBacktest, type BacktestSummary } from '../services/backtestEngine';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { usePaged } from '../hooks/usePaged';
import { useFitCount } from '../hooks/useFitCount';
import { Pager } from '../components/desktop/Pager';
import { SplitPane } from '../components/desktop/SplitPane';
import { Tabs } from '../components/desktop/Tabs';
import { PagedRows, TextRow } from '../components/PagedRows';
import { parsePriceCsv, parseEventCsv, PRICE_CSV_SAMPLE, EVENT_CSV_SAMPLE } from '../services/csvParser';

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const BT_ROW_H = 32;
const retCls = (n: number | null | undefined) => (n == null ? '' : n >= 0 ? 'ret-pos' : 'ret-neg');

// 行高を固定した表。ヘッダー行も同じ高さなので、収まる行数 - 1 が 1 ページの件数
function PagedTable<T>({ items, head, row, label }: { items: T[]; head: string[]; row: (item: T) => React.ReactNode; label: string }) {
  const [ref, fit] = useFitCount<HTMLDivElement>(BT_ROW_H);
  const { page, pageCount, pageItems, setPage } = usePaged(items, Math.max(1, fit - 1));
  return (
    <>
      <div className="fit-area bt-fit" ref={ref}>
        <table className="bt-table">
          <thead><tr>{head.map(h => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{pageItems.map(row)}</tbody>
        </table>
      </div>
      <Pager page={page} pageCount={pageCount} onChange={setPage} label={label} />
    </>
  );
}

function SummaryRow({ s }: { s: BacktestSummary }) {
  return (
    <tr>
      <td><strong>{s.ticker}</strong></td>
      <td>{s.count}{s.sampleWarning && <span title="サンプル数不足" style={{ marginLeft: 4, color: '#d97706' }}>⚠</span>}</td>
      <td className={s.winRate1 >= 0.5 ? 'ret-pos' : 'ret-neg'}>{pct(s.winRate1)}</td>
      <td className={s.winRate3 >= 0.5 ? 'ret-pos' : 'ret-neg'}>{pct(s.winRate3)}</td>
      <td className={s.winRate5 >= 0.5 ? 'ret-pos' : 'ret-neg'}>{pct(s.winRate5)}</td>
      <td className={s.avgReturn1 >= 0 ? 'ret-pos' : 'ret-neg'}>{pct(s.avgReturn1)}</td>
      <td className={s.avgReturn3 >= 0 ? 'ret-pos' : 'ret-neg'}>{pct(s.avgReturn3)}</td>
      <td className={s.avgReturn5 >= 0 ? 'ret-pos' : 'ret-neg'}>{pct(s.avgReturn5)}</td>
      <td>{pct(s.stdDev1)}</td><td>{pct(s.stdDev3)}</td><td>{pct(s.stdDev5)}</td>
      <td className="ret-neg">{pct(s.worstT5Return)}</td>
      <td className="ret-neg">{s.maxDrawdown === null ? '—' : pct(s.maxDrawdown)}</td>
    </tr>
  );
}

const SUMMARY_HEAD = ['銘柄', '件数', '勝率 T+1', '勝率 T+3', '勝率 T+5', '平均 T+1', '平均 T+3', '平均 T+5', 'σ T+1', 'σ T+3', 'σ T+5', 'T+5 最悪値', '最大DD'];
const DETAIL_HEAD = ['仮説 ID', 'イベント日', '銘柄', 'T+1', 'T+3', 'T+5', '備考'];

export function BacktestView({ hypotheses }: { hypotheses: Hypothesis[] }) {
  const [priceText, setPriceText] = useState('');
  const [eventText, setEventText] = useState('');
  const [results, setResults] = useState<BacktestResult[]>([]);
  const [summary, setSummary] = useState<BacktestSummary[]>([]);
  const [error, setError] = useState('');

  const handleRun = () => {
    try {
      const priceRows = parsePriceCsv(priceText);
      const eventRows = parseEventCsv(eventText);
      if (priceRows.length === 0) { setError('価格CSVが空または不正です'); return; }
      if (eventRows.length === 0) { setError('イベントCSVが空または不正です'); return; }
      const res = runBacktest(priceRows, eventRows);
      setResults(res);
      setSummary(summarizeBacktest(res));
      setError('');
    } catch (e) {
      setError(`解析エラー: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const isDesktop = useIsDesktop();

  if (isDesktop) {
    const input = (
      <>
        {error && <p className="form-error">{error}</p>}
        <Tabs label="CSV 入力" tabs={[
          { id: 'bt-price', label: '価格CSV', content: (
            <textarea className="bt-textarea" aria-label="価格データ CSV" placeholder={PRICE_CSV_SAMPLE} value={priceText} onChange={e => setPriceText(e.target.value)} />
          ) },
          { id: 'bt-event', label: 'イベントCSV', content: (
            <textarea className="bt-textarea" aria-label="イベント CSV" placeholder={EVENT_CSV_SAMPLE} value={eventText} onChange={e => setEventText(e.target.value)} />
          ) },
          { id: 'bt-ids', label: '仮説ID', content: (
            <>
              <p className="bt-hint">hypothesis_id は登録済み仮説ID、または任意の文字列</p>
              <PagedRows items={hypotheses} label="仮説ID" empty="登録済みの仮説はありません"
                keyOf={h => h.id} renderRow={h => <TextRow main={h.id} sub={h.title} />} />
            </>
          ) },
        ]} />
        <button className="btn btn-primary" onClick={handleRun}>バックテスト実行</button>
      </>
    );
    const output = results.length === 0
      ? <p className="bt-hint">CSV を入力して実行すると、ここに結果が表示されます。</p>
      : (
        <Tabs label="結果" tabs={[
          { id: 'bt-summary', label: '銘柄別サマリー', content: (
            <PagedTable items={summary} head={SUMMARY_HEAD} label="サマリー" row={s => <SummaryRow key={s.ticker} s={s} />} />
          ) },
          { id: 'bt-detail', label: '詳細結果', content: (
            <PagedTable items={results} head={DETAIL_HEAD} label="詳細結果" row={r => (
              <tr key={`${r.hypothesisId}-${r.eventDate}-${r.ticker}`}>
                <td className="bt-cell-id">{r.hypothesisId}</td><td>{r.eventDate}</td><td>{r.ticker}</td>
                <td className={retCls(r.t1Return)}>{r.t1Return == null ? '—' : pct(r.t1Return)}</td>
                <td className={retCls(r.t3Return)}>{r.t3Return == null ? '—' : pct(r.t3Return)}</td>
                <td className={retCls(r.t5Return)}>{r.t5Return == null ? '—' : pct(r.t5Return)}</td>
                <td className="bt-cell-note">{r.notes}</td>
              </tr>
            )} />
          ) },
        ]} />
      );
    return (
      <div className="view-root bt-root">
        <header className="view-header">
          <p className="eyebrow">Backtest</p>
          <h2>CSV バックテスト</h2>
        </header>
        <SplitPane list={input} detail={output} listLabel="CSV 入力" detailLabel="バックテスト結果" />
      </div>
    );
  }

  return (
    <>
      <header className="view-header">
        <p className="eyebrow">Backtest</p>
        <h2>CSV バックテスト</h2>
      </header>

      <article className="card">
        <div className="card-header">
          <p className="eyebrow">CSV フォーマット</p>
          <h3>入力形式</h3>
        </div>
        <div className="grid two-columns">
          <div>
            <p className="eyebrow">価格データ CSV</p>
            <pre className="csv-sample">{PRICE_CSV_SAMPLE}</pre>
          </div>
          <div>
            <p className="eyebrow">イベント CSV</p>
            <pre className="csv-sample">{EVENT_CSV_SAMPLE}</pre>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8 }}>
              hypothesis_id は登録済み仮説ID、または任意の文字列
            </p>
          </div>
        </div>
        {hypotheses.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p className="eyebrow">登録済み仮説 ID</p>
            <div className="template-chips" style={{ marginTop: 6 }}>
              {hypotheses.map(h => (
                <span key={h.id} className="template-chip-btn" style={{ cursor: 'default' }}>{h.id}</span>
              ))}
            </div>
          </div>
        )}
      </article>

      <article className="card">
        <div className="card-header"><p className="eyebrow">CSV 入力</p></div>
        {error && <p className="form-error">{error}</p>}
        <div className="grid two-columns">
          <div className="form-group">
            <label>価格データ CSV</label>
            <textarea rows={8} placeholder={PRICE_CSV_SAMPLE} value={priceText} onChange={e => setPriceText(e.target.value)} />
          </div>
          <div className="form-group">
            <label>イベント CSV</label>
            <textarea rows={8} placeholder={EVENT_CSV_SAMPLE} value={eventText} onChange={e => setEventText(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleRun}>バックテスト実行</button>
      </article>

      {results.length > 0 && (
        <>
          <article className="card">
            <div className="card-header">
              <p className="eyebrow">銘柄別サマリー</p>
              <h3>勝率・平均リターン・標準偏差</h3>
            </div>
            <div className="bt-table-wrap">
              <table className="bt-table">
                <thead>
                  <tr>
                    <th>銘柄</th><th>件数</th>
                    <th>勝率 T+1</th><th>勝率 T+3</th><th>勝率 T+5</th>
                    <th>平均 T+1</th><th>平均 T+3</th><th>平均 T+5</th>
                    <th>σ T+1</th><th>σ T+3</th><th>σ T+5</th>
                    <th>T+5 最悪値</th><th>最大DD</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((s: BacktestSummary) => (
                    <tr key={s.ticker}>
                      <td><strong>{s.ticker}</strong></td>
                      <td>
                        {s.count}
                        {s.sampleWarning && <span title="サンプル数不足" style={{ marginLeft: 4, color: '#d97706' }}>⚠</span>}
                      </td>
                      <td className={s.winRate1 >= 0.5 ? 'ret-pos' : 'ret-neg'}>{pct(s.winRate1)}</td>
                      <td className={s.winRate3 >= 0.5 ? 'ret-pos' : 'ret-neg'}>{pct(s.winRate3)}</td>
                      <td className={s.winRate5 >= 0.5 ? 'ret-pos' : 'ret-neg'}>{pct(s.winRate5)}</td>
                      <td className={s.avgReturn1 >= 0 ? 'ret-pos' : 'ret-neg'}>{pct(s.avgReturn1)}</td>
                      <td className={s.avgReturn3 >= 0 ? 'ret-pos' : 'ret-neg'}>{pct(s.avgReturn3)}</td>
                      <td className={s.avgReturn5 >= 0 ? 'ret-pos' : 'ret-neg'}>{pct(s.avgReturn5)}</td>
                      <td>{pct(s.stdDev1)}</td>
                      <td>{pct(s.stdDev3)}</td>
                      <td>{pct(s.stdDev5)}</td>
                      <td className="ret-neg">{pct(s.worstT5Return)}</td>
                      <td className="ret-neg">{s.maxDrawdown === null ? '—' : pct(s.maxDrawdown)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="card">
            <div className="card-header"><p className="eyebrow">詳細結果</p></div>
            <div className="bt-table-wrap">
              <table className="bt-table">
                <thead>
                  <tr>
                    <th>仮説 ID</th><th>イベント日</th><th>銘柄</th>
                    <th>T+1</th><th>T+3</th><th>T+5</th><th>備考</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: 12 }}>{r.hypothesisId}</td>
                      <td>{r.eventDate}</td>
                      <td>{r.ticker}</td>
                      <td className={r.t1Return == null ? '' : r.t1Return >= 0 ? 'ret-pos' : 'ret-neg'}>
                        {r.t1Return == null ? '—' : pct(r.t1Return)}
                      </td>
                      <td className={r.t3Return == null ? '' : r.t3Return >= 0 ? 'ret-pos' : 'ret-neg'}>
                        {r.t3Return == null ? '—' : pct(r.t3Return)}
                      </td>
                      <td className={r.t5Return == null ? '' : r.t5Return >= 0 ? 'ret-pos' : 'ret-neg'}>
                        {r.t5Return == null ? '—' : pct(r.t5Return)}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </>
      )}
    </>
  );
}

// ─── Settings ────────────────────────────────────────────────────────────────
