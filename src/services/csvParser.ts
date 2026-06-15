import type { PriceRow, BacktestEventRow } from '../domain/types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Handles quoted fields (e.g. "7,800.5")
const parseQuotedCsv = (csv: string): string[][] => {
  const rows: string[][] = [];
  for (const line of csv.trim().split('\n').slice(1)) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let inQuote = false;
    let cur = '';
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
};

export const parsePriceCsv = (csv: string): PriceRow[] =>
  parseQuotedCsv(csv)
    .filter(cols => cols.length >= 3 && DATE_RE.test(cols[0]) && cols[1] && cols[2])
    .map(([date, ticker, close]) => ({ date, ticker, close: parseFloat(close) }))
    .filter(r => !Number.isNaN(r.close) && r.close > 0);

export const parseEventCsv = (csv: string): BacktestEventRow[] =>
  parseQuotedCsv(csv)
    .filter(cols => cols.length >= 3 && cols[0] && DATE_RE.test(cols[1]) && cols[2])
    .map(([hypothesisId, eventDate, ticker, notes = '']) => ({
      hypothesisId, eventDate, ticker, notes,
    }));

export const PRICE_CSV_SAMPLE = `date,ticker,close
2024-06-03,7974.T,7800.0
2024-06-04,7974.T,7950.0
2024-06-05,7974.T,8100.0
2024-06-06,7974.T,8050.0
2024-06-07,7974.T,8200.0
2024-06-10,7974.T,8180.0`;

export const EVENT_CSV_SAMPLE = `hypothesis_id,event_date,ticker,notes
MIDEAST-OIL-UP-STAYHOME-GAME-UP,2024-06-03,7974.T,任天堂
MIDEAST-OIL-UP-STAYHOME-GAME-UP,2024-06-03,9766.T,コナミG`;
