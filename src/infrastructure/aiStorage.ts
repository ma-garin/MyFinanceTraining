import type { AiSettings, AiUsageRecord, AiCacheEntry } from '../domain/types';
import { todayStr, monthStr } from '../utils/dateUtils';

const SETTINGS_KEY = 'mft_ai_settings';
const USAGE_KEY    = 'mft_ai_usage';
const CACHE_KEY    = 'mft_ai_cache';

const DEFAULT_SETTINGS: AiSettings = { dailyLimit: 5, monthlyLimit: 50 };

const load = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

// 呼び出し側が利用者に失敗を伝えられるよう、成否を返す（BUG-07）
const save = <T>(key: string, value: T): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error('aiStorage save failed:', err);
    return false;
  }
};

export const loadAiSettings = (): AiSettings => load(SETTINGS_KEY, DEFAULT_SETTINGS);
export const saveAiSettings = (s: AiSettings): boolean => save(SETTINGS_KEY, s);

export const loadAiUsage = (): AiUsageRecord => {
  const today = todayStr();
  const month  = monthStr();
  const defaultUsage: AiUsageRecord = { date: today, month, dailyCount: 0, monthlyCount: 0 };
  const stored = load(USAGE_KEY, defaultUsage);
  return {
    date:         today,
    month:        month,
    dailyCount:   stored.date  === today ? stored.dailyCount   : 0,
    monthlyCount: stored.month === month  ? stored.monthlyCount : 0,
  };
};

export const saveAiUsage = (u: AiUsageRecord): boolean => save(USAGE_KEY, u);

export const loadAiCache = (): AiCacheEntry[] => load<AiCacheEntry[]>(CACHE_KEY, []);

export const findCacheEntry = (key: string): AiCacheEntry | null =>
  loadAiCache().find(e => e.key === key) ?? null;

// 上限が無いと localStorage の容量を食い潰し本体データの保存まで失敗する（BUG-18）。古い順に捨てる
export const MAX_CACHE_ENTRIES = 50;
export const addCacheEntry = (entry: AiCacheEntry): boolean => {
  const cache = loadAiCache().filter(e => e.key !== entry.key);
  return save(CACHE_KEY, [...cache, entry].slice(-MAX_CACHE_ENTRIES));
};
