import { CapacitorHttp } from '@capacitor/core';
import type { PriceRow } from '../domain/types';

// V2 は API キー方式。V1 のトークン交換（refreshToken → idToken → Bearer）は使わない。
const BASE = 'https://api.jquants.com/v2';

export class JquantsError extends Error {}

type HttpResponse = { status: number; data: unknown };

// ブラウザからの fetch は J-Quants が CORS を許可していないため通らない。
// Capacitor のネイティブ HTTP は WebView の外で発行されるので制約を受けない。
const get = async (path: string, apiKey: string, params: Record<string, string>): Promise<HttpResponse> => {
  const query = new URLSearchParams(params).toString();
  return CapacitorHttp.get({
    url: `${BASE}${path}${query ? `?${query}` : ''}`,
    headers: { 'x-api-key': apiKey },
  });
};

const asRecord = (data: unknown): Record<string, unknown> =>
  data != null && typeof data === 'object' ? (data as Record<string, unknown>) : {};

// どの操作で失敗したかを message に含める。含めないと、認証の問題なのか
// 取得範囲の問題なのか画面から切り分けられない。
const failureMessage = (operation: string, status: number, data: unknown): string => {
  const msg = asRecord(data).message;
  const detail = typeof msg === 'string' && msg ? `：${msg}` : '';
  const reason =
    status === 400 ? 'リクエストが不正です' :
    status === 401 ? 'APIキーが正しくありません。余分な空白や改行が入っていないか確認してください' :
    status === 403 ? 'このプランでは取得できません。契約プランのデータ期間外か、対象外のAPIです' :
    status === 413 ? '取得範囲が広すぎます。期間を狭めてください' :
    status === 429 ? 'リクエスト数の上限に達しました。時間をおいて再試行してください' :
    `HTTP ${status}`;
  return `${operation}に失敗しました（${reason}）${detail}`;
};

// 疎通確認には Free プランでも使える取引カレンダーを使う。
// 株価で試すとプラン範囲外の期間を引いて 403 になり、鍵の問題と区別できない。
export const testApiKey = async (apiKey: string): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);
  const res = await get('/markets/calendar', apiKey, { from: today, to: today });
  if (res.status !== 200) throw new JquantsError(failureMessage('接続確認', res.status, res.data));
};

const pickString = (rec: Record<string, unknown>, keys: string[]): string | null => {
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === 'string' && v) return v;
  }
  return null;
};

const pickNumber = (rec: Record<string, unknown>, keys: string[]): number | null => {
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v !== '' && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
};

// 株式分割をまたぐと調整前の終値は不連続になり、リターンが分割比率のぶん誤る。
// 調整済み終値があればそちらを優先する。フィールド名は表記ゆれを吸収する。
const toPriceRow = (row: unknown, ticker: string): PriceRow | null => {
  const rec = asRecord(row);
  const date = pickString(rec, ['Date', 'date']);
  const close = pickNumber(rec, [
    'AdjustmentClose', 'adjustment_close', 'adjustmentClose',
    'Close', 'close',
  ]);
  if (date == null || close == null || close <= 0) return null;
  return { date, ticker, close };
};

// "6857 アドバンテスト" / "6857.T" / "6857" のいずれからも銘柄コードを取り出す
export const normalizeCode = (input: string): string | null => {
  const m = input.trim().match(/\d{4,5}/);
  return m ? m[0] : null;
};

export const fetchDailyBars = async (
  apiKey: string,
  code: string,
  from: string,
  to: string,
): Promise<PriceRow[]> => {
  const rows: PriceRow[] = [];
  let pagination: string | undefined;

  // 期間が長いとレスポンスが分割される。pagination_key が返る限り追う。
  do {
    const params: Record<string, string> = { code, from, to };
    if (pagination) params.pagination_key = pagination;
    const res = await get('/equities/bars/daily', apiKey, params);
    if (res.status !== 200) {
      throw new JquantsError(failureMessage(`株価取得（${code}）`, res.status, res.data));
    }

    const body = asRecord(res.data);
    const data = Array.isArray(body.data) ? body.data : [];
    for (const row of data) {
      const priceRow = toPriceRow(row, code);
      if (priceRow) rows.push(priceRow);
    }
    pagination = typeof body.pagination_key === 'string' ? body.pagination_key : undefined;
  } while (pagination);

  return rows;
};
