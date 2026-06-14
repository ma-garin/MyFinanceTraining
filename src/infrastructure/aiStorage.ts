import type { AiSettings, AiUsageRecord, AiCacheEntry } from '../domain/types';

const SETTINGS_KEY = 'mft_ai_settings';
const USAGE_KEY = 'mft_ai_usage';
const CACHE_KEY = 'mft_ai_cache';

const todayStr = () => new Date().toISOString().slice(0, 10);
const monthStr = () => new Date().toISOString().slice(0, 7);

const DEFAULT_SETTINGS: AiSettings = { dailyLimit: 5, monthlyLimit: 50 };

const DEFAULT_USAGE: AiUsageRecord = {
  date: todayStr(),
  month: monthStr(),
  dailyCount: 0,
  monthlyCount: 0,
};

const load = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const save = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('aiStorage save failed:', err);
  }
};

export const loadAiSettings = (): AiSettings => load(SETTINGS_KEY, DEFAULT_SETTINGS);
export const saveAiSettings = (s: AiSettings): void => save(SETTINGS_KEY, s);

export const loadAiUsage = (): AiUsageRecord => {
  const stored = load(USAGE_KEY, DEFAULT_USAGE);
  const today = todayStr();
  const month = monthStr();
  // Reset counters when date/month changes
  return {
    date: today,
    month: month,
    dailyCount: stored.date === today ? stored.dailyCount : 0,
    monthlyCount: stored.month === month ? stored.monthlyCount : 0,
  };
};
export const saveAiUsage = (u: AiUsageRecord): void => save(USAGE_KEY, u);

export const loadAiCache = (): AiCacheEntry[] => load<AiCacheEntry[]>(CACHE_KEY, []);

export const findCacheEntry = (key: string): AiCacheEntry | null => {
  const cache = loadAiCache();
  return cache.find(e => e.key === key) ?? null;
};

export const addCacheEntry = (entry: AiCacheEntry): void => {
  const cache = loadAiCache().filter(e => e.key !== entry.key);
  save(CACHE_KEY, [...cache, entry]);
};
