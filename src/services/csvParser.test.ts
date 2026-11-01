import { describe, it, expect } from 'vitest';
import { parsePriceCsv, parseEventCsv, PRICE_CSV_SAMPLE, EVENT_CSV_SAMPLE } from './csvParser';

describe('parsePriceCsv: 正常系', () => {
  it('日付・銘柄・終値を数値化して返す', () => {
    expect(parsePriceCsv('date,ticker,close\n2024-06-03,7974.T,7800.5')).toEqual([
      { date: '2024-06-03', ticker: '7974.T', close: 7800.5 },
    ]);
  });

  it('BUG-13: 引用符内の桁区切りを除いて終値を読む', () => {
    expect(parsePriceCsv('h\n2024-06-03,7974.T,"7,800.5"')[0].close).toBe(7800.5);
  });

  it('サンプルCSVは6行すべて有効', () => {
    expect(parsePriceCsv(PRICE_CSV_SAMPLE)).toHaveLength(6);
  });
});

describe('parsePriceCsv: 不正入力の除外', () => {
  it('1行目は内容に関わらずヘッダとして読み飛ばす（ヘッダ名は検証しない）', () => {
    expect(parsePriceCsv('foo,bar,baz\n2024-06-03,A,1')).toHaveLength(1);
    expect(parsePriceCsv('2024-06-03,A,1')).toEqual([]);
  });

  it('空文字・ヘッダのみは空配列', () => {
    expect(parsePriceCsv('')).toEqual([]);
    expect(parsePriceCsv('date,ticker,close')).toEqual([]);
  });

  it('空行・空白のみの行は無視する', () => {
    expect(parsePriceCsv('h\n\n   \n2024-06-03,A,1\n\n')).toHaveLength(1);
  });

  it('日付形式不正・列不足・空の銘柄/終値は除外する', () => {
    const csv = ['h', '2024/06/03,A,1', '2024-6-3,A,1', '2024-06-03,A', '2024-06-03,,1', '2024-06-03,A,'].join('\n');
    expect(parsePriceCsv(csv)).toEqual([]);
  });

  it('数値でない終値・0・負数は除外する', () => {
    expect(parsePriceCsv('h\n2024-06-03,A,abc\n2024-06-03,A,0\n2024-06-03,A,-5')).toEqual([]);
  });

  it('BUG-13: 数値として読めない終値（末尾ゴミ）は誤読せず除外する', () => {
    expect(parsePriceCsv('h\n2024-06-03,A,12abc')).toEqual([]);
  });

  it('BUG-13: 引用符なしの "7,800" は列がずれるため誤った終値を採用せず除外する', () => {
    expect(parsePriceCsv('h\n2024-06-03,A,7,800')).toEqual([]);
  });

  it('レビュー指摘: 4 列以上のヘッダ（volume 付き）の CSV も先頭 3 列で読める', () => {
    expect(parsePriceCsv('date,ticker,close,volume\n2024-06-03,A,5,1000')).toEqual([{ date: '2024-06-03', ticker: 'A', close: 5 }]);
  });

  it('レビュー指摘: 行末カンマ付きの行も読める', () => {
    expect(parsePriceCsv('date,ticker,close,\n2024-06-03,A,5,')).toHaveLength(1);
  });

  it('CRLF 改行でも終値を読める（trim される）', () => {
    expect(parsePriceCsv('h\r\n2024-06-03,A,5\r\n')).toEqual([{ date: '2024-06-03', ticker: 'A', close: 5 }]);
  });
});

describe('parseEventCsv', () => {
  it('仮説ID・日付・銘柄・メモを返す。メモ省略時は空文字', () => {
    expect(parseEventCsv('h\nH1,2024-06-03,7974.T,任天堂\nH2,2024-06-04,9766.T')).toEqual([
      { hypothesisId: 'H1', eventDate: '2024-06-03', ticker: '7974.T', notes: '任天堂' },
      { hypothesisId: 'H2', eventDate: '2024-06-04', ticker: '9766.T', notes: '' },
    ]);
  });

  it('サンプルCSVは2行すべて有効', () => {
    expect(parseEventCsv(EVENT_CSV_SAMPLE)).toHaveLength(2);
  });

  it('仮説ID空・日付不正・列不足・銘柄空の行は除外する', () => {
    const csv = ['h', ',2024-06-03,A', 'H,2024/06/03,A', 'H,2024-06-03', 'H,2024-06-03,'].join('\n');
    expect(parseEventCsv(csv)).toEqual([]);
  });

  it('空文字・ヘッダのみ・空行のみは空配列', () => {
    expect(parseEventCsv('')).toEqual([]);
    expect(parseEventCsv('a,b,c\n\n')).toEqual([]);
  });
});
