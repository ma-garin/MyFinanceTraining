import { useState } from 'react';
import type { Hypothesis, BacktestResult } from '../domain/types';
import { runBacktest, summarizeBacktest, type BacktestSummary } from '../services/backtestEngine';
import { parsePriceCsv, parseEventCsv, PRICE_CSV_SAMPLE, EVENT_CSV_SAMPLE } from '../services/csvParser';

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

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
