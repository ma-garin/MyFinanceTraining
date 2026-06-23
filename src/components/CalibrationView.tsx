import { useMemo } from 'react';
import type { AppState } from '../domain/types';
import {
  calibrationReport, categoryBaseRates,
  type ResolvedForecast, type CalibrationReport, type CategoryBaseRate,
} from '../engine/calibrationEngine';

const CATEGORY_LABELS: Record<string, string> = {
  geopolitics: '地政学', macro: 'マクロ', commodity: 'コモディティ',
  semiconductor: '半導体', currency: '為替', consumer: '消費者',
  other: 'その他', unknown: '未分類',
};

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

// Brier スコアの解釈（0=完璧, 0.25=無情報コイン投げ相当）
const brierVerdict = (b: number): { label: string; cls: string } => {
  if (b < 0.10) return { label: '優秀', cls: 'verdict-good' };
  if (b < 0.18) return { label: '良好', cls: 'verdict-ok' };
  if (b < 0.25) return { label: '平凡', cls: 'verdict-mid' };
  return { label: '要改善（コイン投げ以下）', cls: 'verdict-bad' };
};

const skillVerdict = (s: number): { label: string; cls: string } => {
  if (s > 0.15) return { label: '基準率を明確に上回る予測力', cls: 'verdict-good' };
  if (s > 0)    return { label: '基準率をわずかに上回る', cls: 'verdict-ok' };
  if (s === 0)  return { label: '基準率と同等', cls: 'verdict-mid' };
  return { label: '基準率を下回る（予測が逆効果）', cls: 'verdict-bad' };
};

// ─── 信頼度ダイアグラム（reliability diagram） ────────────────────────────────

function ReliabilityDiagram({ report }: { report: CalibrationReport }) {
  const S = 200, PAD = 28;
  const x = (p: number) => PAD + p * S;
  const y = (p: number) => PAD + (1 - p) * S;
  const pts = report.buckets.filter(b => b.count > 0);
  const maxCount = Math.max(1, ...pts.map(b => b.count));

  return (
    <svg className="reliability-svg" viewBox={`0 0 ${S + PAD * 2} ${S + PAD * 2}`} role="img" aria-label="信頼度ダイアグラム">
      {/* グリッド */}
      {[0, 0.25, 0.5, 0.75, 1].map(g => (
        <g key={g}>
          <line x1={x(g)} y1={y(0)} x2={x(g)} y2={y(1)} className="rd-grid" />
          <line x1={x(0)} y1={y(g)} x2={x(1)} y2={y(g)} className="rd-grid" />
        </g>
      ))}
      {/* 完全較正の対角線 */}
      <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} className="rd-diagonal" />
      {/* 折れ線（予測 vs 実現） */}
      <polyline
        className="rd-line"
        points={pts.map(b => `${x(b.meanForecast)},${y(b.observedRate)}`).join(' ')}
      />
      {/* バケット点（サイズ＝件数） */}
      {pts.map(b => (
        <circle
          key={b.rangeLabel}
          cx={x(b.meanForecast)}
          cy={y(b.observedRate)}
          r={4 + (b.count / maxCount) * 7}
          className="rd-point"
        />
      ))}
      {/* 軸ラベル */}
      <text x={x(0.5)} y={S + PAD * 2 - 4} className="rd-axis" textAnchor="middle">予測確率 →</text>
      <text x={8} y={y(0.5)} className="rd-axis" textAnchor="middle" transform={`rotate(-90 8 ${y(0.5)})`}>実現頻度 →</text>
    </svg>
  );
}

// ─── カテゴリ別ベイズ基準率 ───────────────────────────────────────────────────

function CategoryBaseRateTable({ rates }: { rates: CategoryBaseRate[] }) {
  if (rates.length === 0) return null;
  return (
    <article className="card">
      <div className="card-header">
        <p className="eyebrow">Bayesian Base Rate</p>
        <h3>カテゴリ別 基準率（Beta-二項の事後推定）</h3>
      </div>
      <p className="field-hint" style={{ marginTop: 0 }}>
        弱情報事前分布 Beta(1,1) を各カテゴリの的中/外れで更新。少数標本でも暴れない事後平均と95%信用区間（正規近似）。
      </p>
      <div className="bt-table-wrap">
        <table className="bt-table">
          <thead>
            <tr><th>カテゴリ</th><th>的中</th><th>外れ</th><th>事後平均</th><th>95%信用区間</th></tr>
          </thead>
          <tbody>
            {rates.map(r => (
              <tr key={r.category}>
                <td><strong>{CATEGORY_LABELS[r.category] ?? r.category}</strong></td>
                <td className="ret-pos">{r.hits}</td>
                <td className="ret-neg">{r.misses}</td>
                <td><strong>{pct(r.posteriorMean)}</strong></td>
                <td style={{ color: 'var(--text-2)' }}>{pct(r.ciLow)} – {pct(r.ciHigh)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

// ─── ルート ────────────────────────────────────────────────────────────────────

export function CalibrationView({ state }: { state: AppState }) {
  const forecasts = useMemo<ResolvedForecast[]>(() => {
    const catOf = (eventId: string) =>
      state.events.find(e => e.id === eventId)?.category ?? 'unknown';
    return state.hypotheses
      .filter(h => typeof h.confidence === 'number' && h.resolution)
      .map(h => ({
        id: h.id,
        title: h.title,
        category: catOf(h.eventId),
        confidence: (h.confidence as number) / 100,
        outcome: (h.resolution!.outcome === 'hit' ? 1 : 0) as 0 | 1,
        resolvedAt: h.resolution!.resolvedAt,
      }));
  }, [state.hypotheses, state.events]);

  const report = useMemo(() => calibrationReport(forecasts), [forecasts]);
  const rates = useMemo(() => categoryBaseRates(forecasts), [forecasts]);

  const pending = state.hypotheses.filter(h => typeof h.confidence === 'number' && !h.resolution).length;

  if (forecasts.length === 0) {
    return (
      <>
        <header className="view-header">
          <p className="eyebrow">Calibration & Track Record</p>
          <h2>較正・実績</h2>
        </header>
        <article className="card">
          <p className="empty-msg" style={{ padding: 24 }}>
            較正の対象がまだありません。<br />
            仮説に<strong>確信度</strong>を設定し、結果が出たらカードの「🎯 結果を確定する」で hit/miss を記録してください。
            {pending > 0 && <><br /><br />確信度つき・結果未確定の仮説が <strong>{pending}</strong> 件あります。</>}
          </p>
        </article>
      </>
    );
  }

  const bv = brierVerdict(report.decomposition.brier);
  const sv = skillVerdict(report.skillScore);
  const over = report.overconfidence;

  return (
    <>
      <header className="view-header">
        <p className="eyebrow">Calibration & Track Record</p>
        <h2>較正・実績 — {report.n} 件の確定予測</h2>
        <p>予測確率と実際の結果を突き合わせ、「自分の予測がどれだけ当たるか」を定量化します。</p>
      </header>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{report.decomposition.brier.toFixed(3)}</div>
          <p className="stat-label">Brier スコア</p>
          <span className={`verdict-tag ${bv.cls}`}>{bv.label}</span>
        </div>
        <div className="stat-card">
          <div className="stat-value">{report.skillScore >= 0 ? '+' : ''}{report.skillScore.toFixed(3)}</div>
          <p className="stat-label">Brier Skill Score</p>
          <span className={`verdict-tag ${sv.cls}`}>{sv.label}</span>
        </div>
        <div className="stat-card">
          <div className="stat-value">{pct(report.baseRate)}</div>
          <p className="stat-label">基準率（実際の的中率）</p>
        </div>
        <div className="stat-card">
          <div className="stat-value">{over >= 0 ? '+' : ''}{(over * 100).toFixed(0)}pt</div>
          <p className="stat-label">{over > 0.05 ? '自信過剰' : over < -0.05 ? '自信不足' : '較正良好'}</p>
          <span className="verdict-tag verdict-mid">平均予測 {pct(report.meanConfidence)}</span>
        </div>
      </div>

      <div className="grid two-columns">
        <article className="card">
          <div className="card-header">
            <p className="eyebrow">Reliability Diagram</p>
            <h3>信頼度ダイアグラム</h3>
          </div>
          <ReliabilityDiagram report={report} />
          <p className="field-hint">点が対角線上にあれば較正良好。対角線より下＝自信過剰、上＝自信不足。点の大きさ＝件数。</p>
        </article>

        <article className="card">
          <div className="card-header">
            <p className="eyebrow">Murphy Decomposition</p>
            <h3>Brier 分解</h3>
          </div>
          <div className="decomp-list">
            <div className="decomp-row">
              <span>信頼度（reliability）<small>低いほど良い</small></span>
              <strong>{report.decomposition.reliability.toFixed(3)}</strong>
            </div>
            <div className="decomp-row">
              <span>分解能（resolution）<small>高いほど良い</small></span>
              <strong>{report.decomposition.resolution.toFixed(3)}</strong>
            </div>
            <div className="decomp-row">
              <span>不確実性（uncertainty）<small>基準率に内在</small></span>
              <strong>{report.decomposition.uncertainty.toFixed(3)}</strong>
            </div>
          </div>
          <p className="field-hint">
            Brier ≈ 信頼度 − 分解能 + 不確実性。較正を改善するなら「信頼度」を下げ、選別眼を磨くなら「分解能」を上げる。
          </p>
        </article>
      </div>

      <CategoryBaseRateTable rates={rates} />

      <article className="card">
        <div className="card-header">
          <p className="eyebrow">Resolved Forecasts</p>
          <h3>確定済み予測の一覧</h3>
        </div>
        <div className="bt-table-wrap">
          <table className="bt-table">
            <thead>
              <tr><th>確定日</th><th>仮説</th><th>カテゴリ</th><th>予測</th><th>結果</th><th>Brier</th></tr>
            </thead>
            <tbody>
              {[...forecasts].sort((a, b) => b.resolvedAt.localeCompare(a.resolvedAt)).map(f => {
                const brier = (f.confidence - f.outcome) ** 2;
                return (
                  <tr key={f.id}>
                    <td>{f.resolvedAt}</td>
                    <td style={{ maxWidth: 280 }}>{f.title}</td>
                    <td>{CATEGORY_LABELS[f.category] ?? f.category}</td>
                    <td>{pct(f.confidence)}</td>
                    <td className={f.outcome === 1 ? 'ret-pos' : 'ret-neg'}>
                      {f.outcome === 1 ? '✓ 的中' : '✕ 外れ'}
                    </td>
                    <td className={brier < 0.18 ? 'ret-pos' : brier >= 0.25 ? 'ret-neg' : ''}>{brier.toFixed(3)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </article>
    </>
  );
}
