import { describe, it, expect } from 'vitest';
import { runBacktest, summarizeBacktest } from './backtestEngine';
import type { BacktestResult, PriceRow } from '../domain/types';

// 2024-06-03 は月曜。営業日加算は週末スキップのみ（祝日は考慮しない）を runBacktest 経由で固定する
const px = (date: string, close: number, ticker = 'A'): PriceRow => ({ date, ticker, close });
const evt = (eventDate: string, ticker = 'A') => ({ hypothesisId: 'H', eventDate, ticker, notes: 'n' });

describe('runBacktest: 営業日加算（週末スキップ）', () => {
  it('月曜起点の T+1/T+3/T+5 は火/木/翌月曜を参照する', () => {
    const prices = [
      px('2024-06-03', 100), px('2024-06-04', 110), px('2024-06-06', 120), px('2024-06-10', 150),
    ];
    const [r] = runBacktest(prices, [evt('2024-06-03')]);
    expect(r.t1Return).toBeCloseTo(0.1);
    expect(r.t3Return).toBeCloseTo(0.2);
    expect(r.t5Return).toBeCloseTo(0.5);
  });

  it('金曜起点の T+1 は土日を飛ばして月曜になる', () => {
    const prices = [px('2024-06-07', 100), px('2024-06-08', 999), px('2024-06-10', 90)];
    const [r] = runBacktest(prices, [evt('2024-06-07')]);
    expect(r.t1Return).toBeCloseTo(-0.1);
  });

  it('土曜起点でも T+1 は月曜（週末起点の加算）', () => {
    const prices = [px('2024-06-08', 100), px('2024-06-10', 120)];
    const [r] = runBacktest(prices, [evt('2024-06-08')]);
    expect(r.t1Return).toBeCloseTo(0.2);
  });
});

describe('runBacktest: 欠損の扱い', () => {
  it('基準日の価格が無ければ全リターンが null', () => {
    const [r] = runBacktest([px('2024-06-04', 110)], [evt('2024-06-03')]);
    expect([r.t1Return, r.t3Return, r.t5Return]).toEqual([null, null, null]);
  });

  it('対象日の価格が無い期間だけ null', () => {
    const [r] = runBacktest([px('2024-06-03', 100), px('2024-06-04', 110)], [evt('2024-06-03')]);
    expect(r.t1Return).toBeCloseTo(0.1);
    expect(r.t3Return).toBeNull();
    expect(r.t5Return).toBeNull();
  });

  it('銘柄ごとに価格を分離し、メタ情報を結果に引き継ぐ', () => {
    const prices = [px('2024-06-03', 100, 'A'), px('2024-06-04', 200, 'B')];
    const [r] = runBacktest(prices, [evt('2024-06-03', 'A')]);
    expect(r.t1Return).toBeNull();
    expect(r).toMatchObject({ hypothesisId: 'H', ticker: 'A', eventDate: '2024-06-03', notes: 'n' });
  });

  it('入力が空なら空配列', () => {
    expect(runBacktest([], [])).toEqual([]);
    expect(runBacktest([px('2024-06-03', 1)], [])).toEqual([]);
  });
});

const res = (ticker: string, t1: number | null, t3: number | null, t5: number | null): BacktestResult => ({
  hypothesisId: 'H', eventDate: '2024-06-03', ticker, notes: '', t1Return: t1, t3Return: t3, t5Return: t5,
});

describe('summarizeBacktest: 銘柄別集計', () => {
  it('銘柄ごとにまとめ、件数・勝率・平均を出す', () => {
    const [s] = summarizeBacktest([res('A', 0.1, 0.2, 0.3), res('A', -0.1, 0.2, -0.3)]);
    expect(s.ticker).toBe('A');
    expect(s.count).toBe(2);
    expect(s.winRate1).toBe(0.5);
    expect(s.winRate3).toBe(1);
    expect(s.avgReturn1).toBeCloseTo(0);
    expect(s.avgReturn3).toBeCloseTo(0.2);
  });

  it('標準偏差は母標準偏差（n で割る）', () => {
    const [s] = summarizeBacktest([res('A', 0.1, null, null), res('A', 0.3, null, null)]);
    expect(s.stdDev1).toBeCloseTo(0.1);
  });

  it('有効値が1件以下の標準偏差は 0', () => {
    const [s] = summarizeBacktest([res('A', 0.1, null, null)]);
    expect(s.stdDev1).toBe(0);
  });

  it('null は勝率・平均の母数から除外するが count には含める', () => {
    const [s] = summarizeBacktest([res('A', 0.1, null, null), res('A', null, null, null)]);
    expect(s.count).toBe(2);
    expect(s.winRate1).toBe(1);
    expect(s.avgReturn1).toBeCloseTo(0.1);
    expect(s.winRate3).toBe(0);
    expect(s.avgReturn3).toBe(0);
  });

  it('リターン 0 は勝ちに数えない', () => {
    expect(summarizeBacktest([res('A', 0, 0, 0)])[0].winRate1).toBe(0);
  });

  it('複数銘柄は初出順に別行になる。空入力は空配列', () => {
    expect(summarizeBacktest([res('B', 0, 0, 0), res('A', 0, 0, 0)]).map(s => s.ticker)).toEqual(['B', 'A']);
    expect(summarizeBacktest([])).toEqual([]);
  });

  it('サンプル警告は5件未満で true、5件以上で false', () => {
    const rows = (n: number) => Array.from({ length: n }, () => res('A', 0.1, 0.1, 0.1));
    expect(summarizeBacktest(rows(4))[0].sampleWarning).toBe(true);
    expect(summarizeBacktest(rows(5))[0].sampleWarning).toBe(false);
  });
});

describe('summarizeBacktest: worstT5Return（T+5 リターン最小値と0の小さい方）', () => {
  it('T+5 に負値があれば最小値を返す', () => {
    const [s] = summarizeBacktest([res('A', 0, 0, 0.2), res('A', 0, 0, -0.05), res('A', 0, 0, -0.3)]);
    expect(s.worstT5Return).toBeCloseTo(-0.3);
  });

  it('T+5 がすべて正なら 0', () => {
    expect(summarizeBacktest([res('A', 0, 0, 0.2)])[0].worstT5Return).toBe(0);
  });

  it('T+5 が全件 null なら 0', () => {
    expect(summarizeBacktest([res('A', 0.1, 0.1, null)])[0].worstT5Return).toBe(0);
  });
});
