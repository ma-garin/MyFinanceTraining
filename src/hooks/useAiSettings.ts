import { useState, useCallback } from 'react';
import type { AiSettings, AiUsageRecord } from '../domain/types';
import { todayStr, monthStr } from '../utils/dateUtils';
import {
  loadAiSettings, saveAiSettings,
  loadAiUsage, saveAiUsage,
  loadApiKey, saveApiKey, clearApiKey,
  loadAiModel, saveAiModel, type AiModelId,
} from '../infrastructure/aiStorage';

export const useAiSettings = () => {
  const [settings, setSettings] = useState<AiSettings>(loadAiSettings);
  const [usage, setUsage]       = useState<AiUsageRecord>(loadAiUsage);

  const updateSettings = useCallback((next: AiSettings): boolean => {
    setSettings(next);
    return saveAiSettings(next);
  }, []);

  const canExecute = (): boolean => {
    const today = todayStr();
    const month  = monthStr();
    const daily   = usage.date  === today ? usage.dailyCount   : 0;
    const monthly = usage.month === month  ? usage.monthlyCount : 0;
    return daily < settings.dailyLimit && monthly < settings.monthlyLimit;
  };

  const incrementUsage = useCallback((): boolean => {
    const today = todayStr();
    const month  = monthStr();
    const next: AiUsageRecord = {
      date:         today,
      month:        month,
      dailyCount:   (usage.date  === today ? usage.dailyCount   : 0) + 1,
      monthlyCount: (usage.month === month  ? usage.monthlyCount : 0) + 1,
    };
    setUsage(next);
    return saveAiUsage(next);
  }, [usage]);

  return { settings, usage, updateSettings, canExecute, incrementUsage };
};

// API キーとモデルは App 経由の props にせず各画面で読む。キーを AppState の流れに乗せないため
export const useClaudeConfig = () => {
  const [apiKey, setApiKey] = useState<string>(loadApiKey);
  const [model, setModelState] = useState<AiModelId>(loadAiModel);

  const saveKey = useCallback((key: string): boolean => {
    const ok = saveApiKey(key);
    if (ok) setApiKey(key.trim());
    return ok;
  }, []);

  const clearKey = useCallback((): boolean => {
    const ok = clearApiKey();
    if (ok) setApiKey('');
    return ok;
  }, []);

  const setModel = useCallback((m: AiModelId): boolean => {
    setModelState(m);
    return saveAiModel(m);
  }, []);

  return { apiKey, hasKey: apiKey !== '', model, saveKey, clearKey, setModel };
};
