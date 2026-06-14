import type { PriceRow, BacktestEventRow } from '../domain/types';

const parseLines = (csv: string): string[][] =>
  csv.trim().split('\n').slice(1).map(line => line.split(',').map(c => c.trim()));

export const parsePriceCsv = (csv: string): PriceRow[] =>
  parseLines(csv)
    .filter(cols => cols.length >= 3 && cols[2] !== '')
    .map(([date, ticker, close]) => ({ date, ticker, close: parseFloat(close) }));

export const parseEventCsv = (csv: string): BacktestEventRow[] =>
  parseLines(csv)
    .filter(cols => cols.length >= 3)
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
