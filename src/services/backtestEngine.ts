import type { PriceRow, BacktestEventRow, BacktestResult } from '../domain/types';

type TickerSeries = {
  dates: string[];                  // 昇順の営業日
  closeByDate: Map<string, number>;
};

// 日本市場は土日以外にも祝日・年末年始休場があり、カレンダーを固定表で持つと毎年保守が要る。
// 取り込んだ株価CSVに存在する日付の集合がそのまま実際の営業日なので、そこから暦を導出する。
const buildSeries = (rows: PriceRow[]): Map<string, TickerSeries> => {
  const map = new Map<string, TickerSeries>();
  for (const { ticker, date, close } of rows) {
    if (!map.has(ticker)) map.set(ticker, { dates: [], closeByDate: new Map() });
    const s = map.get(ticker)!;
    if (!s.closeByDate.has(date)) s.dates.push(date);
    s.closeByDate.set(date, close);
  }
  for (const s of map.values()) s.dates.sort();
  return map;
};

// イベント日が休場なら翌営業日を起点にする（当日が営業日ならその日）。
const baseIndexOf = (dates: string[], eventDate: string): number => {
  let lo = 0;
  let hi = dates.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (dates[mid] < eventDate) lo = mid + 1;
    else hi = mid;
  }
  return lo < dates.length ? lo : -1;
};

const closeAtOffset = (s: TickerSeries, baseIdx: number, offset: number): number | null => {
  const i = baseIdx + offset;
  return i < s.dates.length ? s.closeByDate.get(s.dates[i]) ?? null : null;
};

const calcReturn = (base: number | null, target: number | null): number | null =>
  base != null && target != null && base !== 0 ? (target - base) / base : null;

export const runBacktest = (
  priceRows: PriceRow[],
  eventRows: BacktestEventRow[],
): BacktestResult[] => {
  const series = buildSeries(priceRows);

  return eventRows.map(ev => {
    const empty: BacktestResult = {
      hypothesisId: ev.hypothesisId,
      eventDate: ev.eventDate,
      baseDate: null,
      ticker: ev.ticker,
      notes: ev.notes,
      t1Return: null,
      t3Return: null,
      t5Return: null,
    };

    const s = series.get(ev.ticker);
    if (!s) return empty;

    const baseIdx = baseIndexOf(s.dates, ev.eventDate);
    if (baseIdx < 0) return empty;

    const base = closeAtOffset(s, baseIdx, 0);
    return {
      ...empty,
      baseDate: s.dates[baseIdx],
      t1Return: calcReturn(base, closeAtOffset(s, baseIdx, 1)),
      t3Return: calcReturn(base, closeAtOffset(s, baseIdx, 3)),
      t5Return: calcReturn(base, closeAtOffset(s, baseIdx, 5)),
    };
  });
};

export type BacktestSummary = {
  ticker: string;
  count: number;
  measuredCount: number;   // T+5 を実測できた件数（データ欠損で落ちた分を除く）
  winRate1: number;
  winRate3: number;
  winRate5: number;
  avgReturn1: number;
  avgReturn3: number;
  avgReturn5: number;
  stdDev1: number;
  stdDev3: number;
  stdDev5: number;
  worstReturn5: number;    // T+5 リターンの最悪値。equity curve 上の最大ドローダウンではない
  sampleWarning: boolean;
};

const avg = (nums: number[]): number =>
  nums.length === 0 ? 0 : nums.reduce((a, b) => a + b, 0) / nums.length;

// 母集団ではなく標本なので不偏分散（n-1）を使う
const stdDev = (nums: number[]): number => {
  if (nums.length < 2) return 0;
  const mean = avg(nums);
  return Math.sqrt(nums.reduce((sum, n) => sum + (n - mean) ** 2, 0) / (nums.length - 1));
};

const validReturns = (returns: (number | null)[]): number[] =>
  returns.filter((r): r is number => r !== null);

const winRate = (returns: (number | null)[]): number => {
  const valid = validReturns(returns);
  if (valid.length === 0) return 0;
  return valid.filter(r => r > 0).length / valid.length;
};

export const summarizeBacktest = (results: BacktestResult[]): BacktestSummary[] => {
  const byTicker = new Map<string, BacktestResult[]>();
  for (const r of results) {
    if (!byTicker.has(r.ticker)) byTicker.set(r.ticker, []);
    byTicker.get(r.ticker)!.push(r);
  }

  return [...byTicker.entries()].map(([ticker, rows]) => {
    const v1 = validReturns(rows.map(r => r.t1Return));
    const v3 = validReturns(rows.map(r => r.t3Return));
    const v5 = validReturns(rows.map(r => r.t5Return));

    return {
      ticker,
      count:         rows.length,
      measuredCount: v5.length,
      winRate1:      winRate(rows.map(r => r.t1Return)),
      winRate3:      winRate(rows.map(r => r.t3Return)),
      winRate5:      winRate(rows.map(r => r.t5Return)),
      avgReturn1:    avg(v1),
      avgReturn3:    avg(v3),
      avgReturn5:    avg(v5),
      stdDev1:       stdDev(v1),
      stdDev3:       stdDev(v3),
      stdDev5:       stdDev(v5),
      worstReturn5:  v5.length === 0 ? 0 : Math.min(0, ...v5),
      sampleWarning: v5.length < 5,
    };
  });
};
