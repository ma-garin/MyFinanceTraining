import { useState, useCallback } from 'react';
import type { AiSettings, AiUsageRecord } from '../domain/types';
import { todayStr, monthStr } from '../utils/dateUtils';
import {
  loadAiSettings, saveAiSettings,
  loadAiUsage, saveAiUsage,
} from '../infrastructure/aiStorage';

export const useAiSettings = () => {
  const [settings, setSettings] = useState<AiSettings>(loadAiSettings);
  const [usage, setUsage]       = useState<AiUsageRecord>(loadAiUsage);

  const updateSettings = useCallback((next: AiSettings) => {
    setSettings(next);
    saveAiSettings(next);
  }, []);

  const canExecute = (): boolean => {
    const today = todayStr();
    const month  = monthStr();
    const daily   = usage.date  === today ? usage.dailyCount   : 0;
    const monthly = usage.month === month  ? usage.monthlyCount : 0;
    return daily < settings.dailyLimit && monthly < settings.monthlyLimit;
  };

  const incrementUsage = useCallback(() => {
    const today = todayStr();
    const month  = monthStr();
    const next: AiUsageRecord = {
      date:         today,
      month:        month,
      dailyCount:   (usage.date  === today ? usage.dailyCount   : 0) + 1,
      monthlyCount: (usage.month === month  ? usage.monthlyCount : 0) + 1,
    };
    setUsage(next);
    saveAiUsage(next);
  }, [usage]);

  return { settings, usage, updateSettings, canExecute, incrementUsage };
};
