import { useState, useCallback } from 'react';
import type { PriceRow } from '../domain/types';
import { fetchIdToken, fetchDailyQuotes, normalizeCode, JquantsError } from '../services/jquantsClient';
import {
  loadRefreshToken, saveRefreshToken,
  loadIdToken, saveIdToken, clearIdToken,
} from '../infrastructure/jquantsStorage';

export type JquantsStatus = 'idle' | 'loading' | 'ok' | 'error';

const messageOf = (err: unknown): string =>
  err instanceof JquantsError ? err.message
  : err instanceof Error ? `通信に失敗しました：${err.message}`
  : '不明なエラーが発生しました';

export const useJquants = () => {
  const [refreshToken, setRefreshTokenState] = useState<string>(loadRefreshToken);
  const [status, setStatus] = useState<JquantsStatus>('idle');
  const [message, setMessage] = useState<string>('');

  const setRefreshToken = useCallback((token: string) => {
    setRefreshTokenState(token);
    saveRefreshToken(token);
    // 別アカウントのトークンに差し替えたとき、古いIDトークンを使い続けない
    clearIdToken();
    setStatus('idle');
    setMessage('');
  }, []);

  const ensureIdToken = useCallback(async (): Promise<string> => {
    const cached = loadIdToken();
    if (cached) return cached;
    if (!refreshToken) throw new JquantsError('リフレッシュトークンが未設定です');
    const token = await fetchIdToken(refreshToken);
    saveIdToken(token);
    return token;
  }, [refreshToken]);

  const testConnection = useCallback(async () => {
    setStatus('loading');
    setMessage('接続を確認しています…');
    try {
      await ensureIdToken();
      setStatus('ok');
      setMessage('接続に成功しました');
    } catch (err) {
      setStatus('error');
      setMessage(messageOf(err));
    }
  }, [ensureIdToken]);

  // 仮説の銘柄候補は "6857 アドバンテスト" 形式なので、コードだけ取り出して問い合わせる
  const fetchPrices = useCallback(async (
    tickers: string[],
    from: string,
    to: string,
  ): Promise<PriceRow[]> => {
    setStatus('loading');
    const codes = [...new Set(tickers.map(normalizeCode).filter((c): c is string => c !== null))];
    if (codes.length === 0) {
      setStatus('error');
      setMessage('銘柄コードを読み取れませんでした');
      return [];
    }

    try {
      const idToken = await ensureIdToken();
      const rows: PriceRow[] = [];
      for (const [i, code] of codes.entries()) {
        setMessage(`株価を取得中… (${i + 1}/${codes.length}) ${code}`);
        rows.push(...await fetchDailyQuotes(idToken, code, from, to));
      }
      setStatus('ok');
      setMessage(`${codes.length}銘柄 / ${rows.length}行を取得しました`);
      return rows;
    } catch (err) {
      setStatus('error');
      setMessage(messageOf(err));
      return [];
    }
  }, [ensureIdToken]);

  return { refreshToken, setRefreshToken, status, message, testConnection, fetchPrices };
};
