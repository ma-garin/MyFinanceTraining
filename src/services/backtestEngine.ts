import type { PriceRow, BacktestEventRow, BacktestResult } from '../domain/types';

const addBusinessDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d.toISOString().slice(0, 10);
};

type PriceMap = Map<string, Map<string, number>>; // ticker -> date -> close

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

export const runBacktest = (
  priceRows: PriceRow[],
  eventRows: BacktestEventRow[],
): BacktestResult[] => {
  const priceMap = buildPriceMap(priceRows);

  return eventRows.map(ev => {
    const base = lookupClose(priceMap, ev.ticker, ev.eventDate);
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
};

const avg = (nums: number[]): number =>
  nums.length === 0 ? 0 : nums.reduce((a, b) => a + b, 0) / nums.length;

const winRate = (returns: (number | null)[]): number => {
  const valid = returns.filter((r): r is number => r !== null);
  if (valid.length === 0) return 0;
  return valid.filter(r => r > 0).length / valid.length;
};

export const summarizeBacktest = (results: BacktestResult[]): BacktestSummary[] => {
  const byTicker = new Map<string, BacktestResult[]>();
  for (const r of results) {
    if (!byTicker.has(r.ticker)) byTicker.set(r.ticker, []);
    byTicker.get(r.ticker)!.push(r);
  }

  return [...byTicker.entries()].map(([ticker, rows]) => ({
    ticker,
    count: rows.length,
    winRate1: winRate(rows.map(r => r.t1Return)),
    winRate3: winRate(rows.map(r => r.t3Return)),
    winRate5: winRate(rows.map(r => r.t5Return)),
    avgReturn1: avg(rows.map(r => r.t1Return).filter((r): r is number => r !== null)),
    avgReturn3: avg(rows.map(r => r.t3Return).filter((r): r is number => r !== null)),
    avgReturn5: avg(rows.map(r => r.t5Return).filter((r): r is number => r !== null)),
  }));
};
