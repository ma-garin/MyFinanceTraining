import type { PriceRow, BacktestEventRow } from '../domain/types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const splitLine = (line: string): string[] => {
  const cols: string[] = [];
  let inQuote = false;
  let cur = '';
  for (const ch of line) {
    if (ch === '"') { inQuote = !inQuote; continue; }
    if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  cols.push(cur.trim());
  // 行末カンマの空列は列数の判定から外す
  while (cols.length > 1 && cols[cols.length - 1] === '') cols.pop();
  return cols;
};

// Handles quoted fields (e.g. "7,800.5") and CRLF line endings
const parseQuotedCsv = (csv: string): { width: number; rows: string[][] } => {
  const lines = csv.trim().split(/\r?\n/);
  const width = Math.max(3, splitLine(lines[0] ?? '').length);
  const rows = lines.slice(1).filter(l => l.trim()).map(splitLine);
  return { width, rows };
};

// 桁区切り付きの終値を parseFloat に渡すと "7,800.5" が 7 と誤読される（BUG-13）
const NUMERIC_RE = /^-?\d+(\.\d+)?$/;
const parseClose = (raw: string): number => {
  const s = raw.replace(/,/g, '');
  return NUMERIC_RE.test(s) ? Number(s) : Number.NaN;
};

// 列数がヘッダより多い行は引用符なしの桁区切りで列がずれた可能性があり、誤った終値を採用しないよう除外する
export const parsePriceCsv = (csv: string): PriceRow[] => {
  const { width, rows } = parseQuotedCsv(csv);
  return rows
    .filter(cols => cols.length >= 3 && cols.length <= width && DATE_RE.test(cols[0]) && cols[1] && cols[2])
    .map(([date, ticker, close]) => ({ date, ticker, close: parseClose(close) }))
    .filter(r => !Number.isNaN(r.close) && r.close > 0);
};

export const parseEventCsv = (csv: string): BacktestEventRow[] =>
  parseQuotedCsv(csv).rows
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
