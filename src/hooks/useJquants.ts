import { useState, useCallback } from 'react';
import type { PriceRow } from '../domain/types';
import { testApiKey, fetchDailyBars, normalizeCode, JquantsError } from '../services/jquantsClient';
import { loadApiKey, saveApiKey } from '../infrastructure/jquantsStorage';

export type JquantsStatus = 'idle' | 'loading' | 'ok' | 'error';

const messageOf = (err: unknown): string =>
  err instanceof JquantsError ? err.message
  : err instanceof Error ? `通信に失敗しました：${err.message}`
  : '不明なエラーが発生しました';

export const useJquants = () => {
  const [apiKey, setApiKeyState] = useState<string>(loadApiKey);
  const [status, setStatus] = useState<JquantsStatus>('idle');
  const [message, setMessage] = useState<string>('');

  const setApiKey = useCallback((key: string) => {
    setApiKeyState(key);
    saveApiKey(key);
    setStatus('idle');
    setMessage('');
  }, []);

  const testConnection = useCallback(async () => {
    setStatus('loading');
    setMessage('接続を確認しています…');
    try {
      await testApiKey(apiKey);
      setStatus('ok');
      setMessage('接続に成功しました');
    } catch (err) {
      setStatus('error');
      setMessage(messageOf(err));
    }
  }, [apiKey]);

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
      const rows: PriceRow[] = [];
      for (const [i, code] of codes.entries()) {
        setMessage(`株価を取得中… (${i + 1}/${codes.length}) ${code}`);
        rows.push(...await fetchDailyBars(apiKey, code, from, to));
      }
      if (rows.length === 0) {
        setStatus('error');
        setMessage(`${from}〜${to} のデータが0件でした。契約プランのデータ期間内か確認してください（無料プランは直近2年・12週遅延）`);
        return [];
      }
      setStatus('ok');
      setMessage(`${codes.length}銘柄 / ${rows.length}行を取得しました`);
      return rows;
    } catch (err) {
      setStatus('error');
      setMessage(messageOf(err));
      return [];
    }
  }, [apiKey]);

  return { apiKey, setApiKey, status, message, testConnection, fetchPrices };
};
