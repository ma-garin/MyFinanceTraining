import type { AssociationStep } from '../domain/types';

// ─────────────────────────────────────────────────────────────────────────────
// 較正（calibration）エンジン
//
// 「予測確率」と「実際の結果」のペアから、予測の質を測定する。
// スーパーフォーキャスティング／気象予報で標準的に使われる手法を実装:
//   - Brier スコア（予測の二乗誤差。低いほど良い）
//   - Murphy 分解（信頼度 / 分解能 / 不確実性）
//   - Brier Skill Score（基準率予測に対する優位性）
//   - 較正曲線（予測確率帯ごとの実現頻度）
//   - Beta-二項ベイズ更新（カテゴリ別の基準率を事後分布で推定）
//   - 連想チェーンの積確率（各リンクの条件付き確率の積）
// ─────────────────────────────────────────────────────────────────────────────

export type ResolvedForecast = {
  id: string;
  title: string;
  category: string;     // イベントカテゴリ。未紐付けは 'unknown'
  confidence: number;   // 0..1 に正規化済みの予測確率
  outcome: 0 | 1;       // 1 = 的中(hit), 0 = 外れ(miss)
  resolvedAt: string;
};

export type CalibrationBucket = {
  rangeLabel: string;
  lower: number;
  upper: number;
  count: number;
  meanForecast: number;  // この帯の予測確率の平均
  observedRate: number;  // この帯の実際の的中率
};

export type BrierDecomposition = {
  brier: number;         // 生の Brier スコア
  reliability: number;   // 信頼度（較正誤差。低いほど良い）
  resolution: number;    // 分解能（基準率からの分離。高いほど良い）
  uncertainty: number;   // 不確実性（基準率に内在。制御不能）
};

export type CalibrationReport = {
  n: number;
  baseRate: number;            // 全体の的中率 ō
  meanConfidence: number;      // 平均予測確率
  overconfidence: number;      // meanConfidence − baseRate（正なら自信過剰）
  decomposition: BrierDecomposition;
  skillScore: number;          // Brier Skill Score（>0 で基準率超えの予測力）
  buckets: CalibrationBucket[];
};

export type CategoryBaseRate = {
  category: string;
  hits: number;
  misses: number;
  posteriorMean: number;   // Beta 事後分布の平均
  ciLow: number;           // 95% 信用区間（正規近似）
  ciHigh: number;
};

export type ChainProbability = {
  product: number | null;  // 確率が設定されたリンクの積（0..1）。0件なら null
  quantifiedLinks: number;
  totalLinks: number;
};

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

// ─── Brier スコア ─────────────────────────────────────────────────────────────

export const brierScore = (forecasts: ResolvedForecast[]): number => {
  if (forecasts.length === 0) return 0;
  const sum = forecasts.reduce((acc, f) => acc + (f.confidence - f.outcome) ** 2, 0);
  return sum / forecasts.length;
};

// ─── 較正バケット（較正曲線用） ───────────────────────────────────────────────

const BUCKET_COUNT = 5;

const bucketIndex = (p: number): number =>
  Math.min(BUCKET_COUNT - 1, Math.floor(clamp01(p) * BUCKET_COUNT));

export const calibrationBuckets = (forecasts: ResolvedForecast[]): CalibrationBucket[] => {
  const groups: ResolvedForecast[][] = Array.from({ length: BUCKET_COUNT }, () => []);
  for (const f of forecasts) groups[bucketIndex(f.confidence)].push(f);

  return groups.map((items, i) => {
    const lower = i / BUCKET_COUNT;
    const upper = (i + 1) / BUCKET_COUNT;
    const count = items.length;
    const meanForecast = count === 0 ? 0 : items.reduce((a, f) => a + f.confidence, 0) / count;
    const observedRate = count === 0 ? 0 : items.reduce((a, f) => a + f.outcome, 0) / count;
    return {
      rangeLabel: `${Math.round(lower * 100)}–${Math.round(upper * 100)}%`,
      lower, upper, count, meanForecast, observedRate,
    };
  });
};

// ─── Murphy 分解（BS ≈ 信頼度 − 分解能 + 不確実性） ───────────────────────────

const decompose = (forecasts: ResolvedForecast[], baseRate: number): BrierDecomposition => {
  const n = forecasts.length;
  const brier = brierScore(forecasts);
  const uncertainty = baseRate * (1 - baseRate);
  if (n === 0) return { brier, reliability: 0, resolution: 0, uncertainty };

  const buckets = calibrationBuckets(forecasts);
  let reliability = 0;
  let resolution = 0;
  for (const b of buckets) {
    if (b.count === 0) continue;
    reliability += b.count * (b.meanForecast - b.observedRate) ** 2;
    resolution  += b.count * (b.observedRate - baseRate) ** 2;
  }
  return { brier, reliability: reliability / n, resolution: resolution / n, uncertainty };
};

// ─── 較正レポート（総合） ──────────────────────────────────────────────────────

export const calibrationReport = (forecasts: ResolvedForecast[]): CalibrationReport => {
  const n = forecasts.length;
  const baseRate = n === 0 ? 0 : forecasts.reduce((a, f) => a + f.outcome, 0) / n;
  const meanConfidence = n === 0 ? 0 : forecasts.reduce((a, f) => a + f.confidence, 0) / n;
  const decomposition = decompose(forecasts, baseRate);
  // BSS = 1 − BS / BS_ref。BS_ref は常に基準率を予測した場合の Brier（=不確実性）
  const ref = decomposition.uncertainty;
  const skillScore = ref === 0 ? 0 : 1 - decomposition.brier / ref;
  return {
    n, baseRate, meanConfidence,
    overconfidence: meanConfidence - baseRate,
    decomposition, skillScore,
    buckets: calibrationBuckets(forecasts),
  };
};

// ─── カテゴリ別ベイズ基準率（Beta-二項） ──────────────────────────────────────

// 弱情報事前分布 Beta(1,1)（一様）。データが少なくても暴れない事後平均を返す。
const PRIOR_ALPHA = 1;
const PRIOR_BETA = 1;

const betaPosterior = (hits: number, misses: number): { mean: number; ciLow: number; ciHigh: number } => {
  const a = PRIOR_ALPHA + hits;
  const b = PRIOR_BETA + misses;
  const mean = a / (a + b);
  // 95% 信用区間は Beta 分位点の正規近似（標本が少ない個人用途では十分）
  const variance = (a * b) / ((a + b) ** 2 * (a + b + 1));
  const sd = Math.sqrt(variance);
  return { mean, ciLow: clamp01(mean - 1.96 * sd), ciHigh: clamp01(mean + 1.96 * sd) };
};

export const categoryBaseRates = (forecasts: ResolvedForecast[]): CategoryBaseRate[] => {
  const byCat = new Map<string, { hits: number; misses: number }>();
  for (const f of forecasts) {
    const c = byCat.get(f.category) ?? { hits: 0, misses: 0 };
    if (f.outcome === 1) c.hits++; else c.misses++;
    byCat.set(f.category, c);
  }
  return [...byCat.entries()]
    .map(([category, { hits, misses }]) => {
      const { mean, ciLow, ciHigh } = betaPosterior(hits, misses);
      return { category, hits, misses, posteriorMean: mean, ciLow, ciHigh };
    })
    .sort((a, b) => (b.hits + b.misses) - (a.hits + a.misses));
};

// ─── 連想チェーンの積確率 ──────────────────────────────────────────────────────

export const chainProbability = (steps: AssociationStep[]): ChainProbability => {
  const quantified = steps.filter(s => typeof s.probability === 'number');
  if (quantified.length === 0) {
    return { product: null, quantifiedLinks: 0, totalLinks: steps.length };
  }
  const product = quantified.reduce((acc, s) => acc * clamp01((s.probability ?? 0) / 100), 1);
  return { product, quantifiedLinks: quantified.length, totalLinks: steps.length };
};
