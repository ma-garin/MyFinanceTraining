import { useState } from 'react';
import type { AppState } from '../domain/types';
import { STATUS_LABELS } from '../ui/labels';
import {
  formatRate, hypothesisStats, monthlyReview, statusTimeline, themeStats, toMarkdown,
} from '../services/reportService';

const currentMonth = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export function ReportView({ state }: { state: AppState }) {
  const [month, setMonth] = useState(currentMonth);
  const [error, setError] = useState<string | null>(null);
  const review = monthlyReview(state, month);
  const themes = themeStats(state);
  const timeline = statusTimeline(state);

  const download = () => {
    try {
      const blob = new Blob([toMarkdown(state, month)], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `myfinancetraining-report-${month}.md`;
      a.click();
      URL.revokeObjectURL(url);
      setError(null);
    } catch (e) {
      console.error(e);
      setError('ダウンロードに失敗しました。時間をおいてもう一度お試しください。');
    }
  };

  return (
    <div className="report-view">
      <header className="view-header">
        <h2>レポート</h2>
        <p>検証ログと採否の変更履歴から、仮説の成績を振り返ります。</p>
      </header>

      <article className="card">
        <div className="card-header">
          <label>
            対象月{' '}
            <input type="month" value={month} onChange={e => e.target.value && setMonth(e.target.value)} />
          </label>
        </div>
        <h3>月次レビュー</h3>
        <p>検証ログ {review.logs} 件（的中 {review.hit} / 外れ {review.miss}）</p>
        <p>ステータス変更 {review.statusChanges} 件（採用 {review.adopted} / 棄却 {review.rejected}）</p>
        <button className="btn btn-primary" onClick={download}>Markdownをダウンロード</button>
        {error && <p role="alert">{error}</p>}
      </article>

      <article className="card">
        <h3>仮説別成績</h3>
        <div className="table-scroll" style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>仮説</th><th>状態</th><th>的中</th><th>外れ</th><th>未判定</th><th>的中率</th></tr></thead>
            <tbody>
              {state.hypotheses.map(h => {
                const s = hypothesisStats(h);
                return (
                  <tr key={h.id}>
                    <td>{h.title}</td>
                    <td><span className={`status-pill status-${h.status}`}>{STATUS_LABELS[h.status]}</span></td>
                    <td>{s.hit}</td><td>{s.miss}</td><td>{s.pending}</td><td>{formatRate(s.hitRate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>

      <article className="card">
        <h3>テーマ別成績</h3>
        <div className="table-scroll" style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>テーマ</th><th>仮説数</th><th>的中</th><th>外れ</th><th>的中率</th></tr></thead>
            <tbody>
              {themes.map(t => (
                <tr key={t.themeId}>
                  <td>{t.name}</td><td>{t.hypotheses}</td><td>{t.hit}</td><td>{t.miss}</td><td>{formatRate(t.hitRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <article className="card">
        <h3>採否履歴</h3>
        {timeline.length === 0 ? (
          <p className="empty-msg">まだ採否の変更履歴はありません</p>
        ) : (
          <div className="stack">
            {timeline.map((c, i) => (
              <div className="list-item" key={`${c.hypothesisTitle}-${c.date}-${i}`}>
                <h4>{c.hypothesisTitle}</h4>
                <p>{c.date.slice(0, 10)} {STATUS_LABELS[c.from]} → {STATUS_LABELS[c.to]}</p>
                <p>理由: {c.reason}</p>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
