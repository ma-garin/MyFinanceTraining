import { CapacitorHttp } from '@capacitor/core';
import type { PriceRow } from '../domain/types';

const BASE = 'https://api.jquants.com/v1';

export type JquantsCredentials =
  | { kind: 'refreshToken'; refreshToken: string }
  | { kind: 'password'; mailaddress: string; password: string };

export class JquantsError extends Error {}

type HttpResponse = { status: number; data: unknown };

// ブラウザからの fetch は J-Quants が CORS を許可していないため通らない。
// Capacitor のネイティブ HTTP は WebView の外で発行されるので制約を受けない。
const post = async (url: string, body: unknown): Promise<HttpResponse> =>
  CapacitorHttp.post({ url, headers: { 'Content-Type': 'application/json' }, data: body });

const get = async (url: string, idToken: string): Promise<HttpResponse> =>
  CapacitorHttp.get({ url, headers: { Authorization: `Bearer ${idToken}` } });

const asRecord = (data: unknown): Record<string, unknown> =>
  data != null && typeof data === 'object' ? (data as Record<string, unknown>) : {};

const failureMessage = (status: number, data: unknown): string => {
  const msg = asRecord(data).message;
  const detail = typeof msg === 'string' ? `：${msg}` : '';
  if (status === 400) return `リクエストが不正です${detail}`;
  if (status === 401) return `認証に失敗しました。リフレッシュトークンの期限切れ（1週間）か、値が誤っています${detail}`;
  if (status === 403) return `このプランでは取得できないデータです${detail}`;
  if (status === 413) return `取得範囲が広すぎます。期間を狭めてください${detail}`;
  return `J-Quants API エラー (HTTP ${status})${detail}`;
};

export const fetchRefreshToken = async (
  mailaddress: string,
  password: string,
): Promise<string> => {
  const res = await post(`${BASE}/token/auth_user`, { mailaddress, password });
  if (res.status !== 200) throw new JquantsError(failureMessage(res.status, res.data));
  const token = asRecord(res.data).refreshToken;
  if (typeof token !== 'string') throw new JquantsError('リフレッシュトークンを取得できませんでした');
  return token;
};

export const fetchIdToken = async (refreshToken: string): Promise<string> => {
  // refreshtoken はボディではなくクエリ文字列で渡す仕様
  const url = `${BASE}/token/auth_refresh?refreshtoken=${encodeURIComponent(refreshToken)}`;
  const res = await post(url, {});
  if (res.status !== 200) throw new JquantsError(failureMessage(res.status, res.data));
  const token = asRecord(res.data).idToken;
  if (typeof token !== 'string') throw new JquantsError('IDトークンを取得できませんでした');
  return token;
};

export const resolveIdToken = async (cred: JquantsCredentials): Promise<string> => {
  const refreshToken = cred.kind === 'refreshToken'
    ? cred.refreshToken
    : await fetchRefreshToken(cred.mailaddress, cred.password);
  return fetchIdToken(refreshToken);
};

type DailyQuote = {
  Date?: unknown;
  Code?: unknown;
  Close?: unknown;
  AdjustmentClose?: unknown;
};

// 株式分割をまたぐと生の終値は不連続になり、リターンが分割比率のぶん誤る。
// J-Quants は調整済み終値を返すので、あればそちらを使う。
const toPriceRow = (q: DailyQuote, ticker: string): PriceRow | null => {
  const date = typeof q.Date === 'string' ? q.Date : null;
  const raw = typeof q.AdjustmentClose === 'number' ? q.AdjustmentClose
            : typeof q.Close === 'number' ? q.Close
            : null;
  if (date == null || raw == null || raw <= 0) return null;
  return { date, ticker, close: raw };
};

// "6857 アドバンテスト" / "6857.T" / "6857" のいずれからも4桁コードを取り出す
export const normalizeCode = (input: string): string | null => {
  const m = input.trim().match(/\d{4,5}/);
  return m ? m[0] : null;
};

export const fetchDailyQuotes = async (
  idToken: string,
  code: string,
  from: string,
  to: string,
): Promise<PriceRow[]> => {
  const rows: PriceRow[] = [];
  let pagination: string | undefined;

  // 期間が長いとレスポンスが分割される。pagination_key が返る限り追う。
  do {
    const params = new URLSearchParams({ code, from, to });
    if (pagination) params.set('pagination_key', pagination);
    const res = await get(`${BASE}/prices/daily_quotes?${params}`, idToken);
    if (res.status !== 200) throw new JquantsError(failureMessage(res.status, res.data));

    const body = asRecord(res.data);
    const quotes = Array.isArray(body.daily_quotes) ? (body.daily_quotes as DailyQuote[]) : [];
    for (const q of quotes) {
      const row = toPriceRow(q, code);
      if (row) rows.push(row);
    }
    pagination = typeof body.pagination_key === 'string' ? body.pagination_key : undefined;
  } while (pagination);

  return rows;
};
