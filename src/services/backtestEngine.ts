import type { PriceRow, BacktestEventRow, BacktestResult } from '../domain/types';

// 'YYYY-MM-DD' は UTC 0 時として解釈されるため、加算・曜日判定も UTC で揃えないと端末 TZ で日付がずれる
const addBusinessDays = (dateStr: string, days: number): string => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  let added = 0;
  while (added < days) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d.toISOString().slice(0, 10);
};

type PriceMap = Map<string, Map<string, number>>; // ticker → date → close

const buildPriceMap = (rows: PriceRow[]): PriceMap => {
  const map: PriceMap = new Map();
  for (const { ticker, date, close } of rows) {
    if (!map.has(ticker)) map.set(ticker, new Map());
    map.get(ticker)!.set(date, close);
  }
  return map;
};

const lookupClose = (map: PriceMap, ticker: string, date: string): number | null =>
  map.get(ticker)?.get(date) ?? null;

const calcReturn = (base: number | null, target: number | null): number | null =>
  base != null && target != null && base !== 0 ? (target - base) / base : null;

// 窓内に欠損が1点でもあると谷を見逃すため、全点が揃わなければ null にする
const calcMaxDrawdown = (map: PriceMap, ticker: string, baseDate: string, days: number): number | null => {
  const closes: number[] = [];
  for (let i = 0; i <= days; i++) {
    const c = lookupClose(map, ticker, i === 0 ? baseDate : addBusinessDays(baseDate, i));
    if (c == null || c <= 0) return null;
    closes.push(c);
  }
  let peak = closes[0];
  let worst = 0;
  for (const c of closes) {
    peak = Math.max(peak, c);
    worst = Math.min(worst, (c - peak) / peak);
  }
  return worst;
};

export const runBacktest = (
  priceRows: PriceRow[],
  eventRows: BacktestEventRow[],
): BacktestResult[] => {
  const priceMap = buildPriceMap(priceRows);

  return eventRows.map(ev => {
    const base   = lookupClose(priceMap, ev.ticker, ev.eventDate);
    const t1Date = addBusinessDays(ev.eventDate, 1);
    const t3Date = addBusinessDays(ev.eventDate, 3);
    const t5Date = addBusinessDays(ev.eventDate, 5);
    return {
      hypothesisId: ev.hypothesisId,
      eventDate: ev.eventDate,
      ticker: ev.ticker,
      notes: ev.notes,
      t1Return: calcReturn(base, lookupClose(priceMap, ev.ticker, t1Date)),
      t3Return: calcReturn(base, lookupClose(priceMap, ev.ticker, t3Date)),
      t5Return: calcReturn(base, lookupClose(priceMap, ev.ticker, t5Date)),
      maxDrawdown: calcMaxDrawdown(priceMap, ev.ticker, ev.eventDate, 5),
    };
  });
};

export type BacktestSummary = {
  ticker: string;
  count: number;
  winRate1: number;
  winRate3: number;
  winRate5: number;
  avgReturn1: number;
  avgReturn3: number;
  avgReturn5: number;
  stdDev1: number;
  stdDev3: number;
  stdDev5: number;
  worstT5Return: number;
  maxDrawdown: number | null;
  sampleWarning: boolean;
};

const avg = (nums: number[]): number =>
  nums.length === 0 ? 0 : nums.reduce((a, b) => a + b, 0) / nums.length;

const stdDev = (nums: number[]): number => {
  if (nums.length < 2) return 0;
  const mean = avg(nums);
  return Math.sqrt(nums.reduce((sum, n) => sum + (n - mean) ** 2, 0) / nums.length);
};

const winRate = (returns: (number | null)[]): number => {
  const valid = returns.filter((r): r is number => r !== null);
  if (valid.length === 0) return 0;
  return valid.filter(r => r > 0).length / valid.length;
};

const validReturns = (returns: (number | null)[]): number[] =>
  returns.filter((r): r is number => r !== null);

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
    const dds = validReturns(rows.map(r => r.maxDrawdown));
    const maxDD = v5.length === 0 ? 0 : Math.min(0, ...v5);

    return {
      ticker,
      count:         rows.length,
      winRate1:      winRate(rows.map(r => r.t1Return)),
      winRate3:      winRate(rows.map(r => r.t3Return)),
      winRate5:      winRate(rows.map(r => r.t5Return)),
      avgReturn1:    avg(v1),
      avgReturn3:    avg(v3),
      avgReturn5:    avg(v5),
      stdDev1:       stdDev(v1),
      stdDev3:       stdDev(v3),
      stdDev5:       stdDev(v5),
      worstT5Return:   maxDD,
      maxDrawdown:   dds.length === 0 ? null : Math.min(...dds),
      sampleWarning: rows.length < 5,
    };
  });
};
