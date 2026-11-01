import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  AppState, MarketEvent, Hypothesis, HypothesisStatus,
  VerificationLog,
} from '../domain/types';
import { loadState, saveState, backupCorruptRaw, readRawState, type LoadResult } from '../infrastructure/storage';
import { mergeAiResult } from '../domain/hypothesisRules';
import { initialState } from '../data/sampleData';

const DEBOUNCE_MS = 300;

export type Recovery = { raw: string; reason: string };

const initFrom = (r: LoadResult): { state: AppState; recovery: Recovery | null } =>
  r.kind === 'ok' ? { state: r.state, recovery: null }
  : r.kind === 'empty' ? { state: initialState, recovery: null }
  : { state: initialState, recovery: { raw: r.raw, reason: r.reason } };

export const useStore = () => {
  const [boot] = useState(() => initFrom(loadState()));
  const [state, setState] = useState<AppState>(boot.state);
  const [recovery, setRecovery] = useState<Recovery | null>(boot.recovery);
  const [saveError, setSaveError] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 復旧待ちの間に保存すると破損データを初期データで上書きして失う（BUG-06）
  useEffect(() => {
    if (recovery) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaveError(!saveState(state)), DEBOUNCE_MS);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [state, recovery]);

  const resolveRecoveryByReset = useCallback((): boolean => {
    if (!recovery) return true;
    // 読み取り失敗で raw が空のとき、無事な実データを初期データで上書きしないよう読み直して退避する
    const raw = recovery.raw || readRawState();
    if (raw === undefined) return false;
    if (raw && !backupCorruptRaw(raw)) return false;
    setState(initialState);
    setRecovery(null);
    return true;
  }, [recovery]);

  const addEvent = useCallback((event: MarketEvent) => {
    setState(prev => ({ ...prev, events: [...prev.events, event] }));
  }, []);

  const addHypothesis = useCallback((hypothesis: Hypothesis) => {
    setState(prev => ({ ...prev, hypotheses: [...prev.hypotheses, hypothesis] }));
  }, []);

  const updateHypothesisStatus = useCallback((id: string, status: HypothesisStatus) => {
    setState(prev => ({
      ...prev,
      hypotheses: prev.hypotheses.map(h => h.id === id ? { ...h, status } : h),
    }));
  }, []);

  const appendAiResult = useCallback((
    id: string,
    newSteps: { label: string; reason: string }[],
    newConditions: string[],
  ) => {
    setState(prev => ({
      ...prev,
      hypotheses: prev.hypotheses.map(h =>
        h.id === id ? mergeAiResult(h, newSteps, newConditions).hypothesis : h),
    }));
  }, []);

  const addVerificationLog = useCallback((id: string, log: Omit<VerificationLog, 'id'>) => {
    const logWithId: VerificationLog = { ...log, id: `log-${Date.now()}` };
    setState(prev => ({
      ...prev,
      hypotheses: prev.hypotheses.map(h =>
        h.id === id
          ? { ...h, verificationLogs: [...(h.verificationLogs ?? []), logWithId] }
          : h
      ),
    }));
  }, []);

  const deleteEvent = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      events: prev.events.filter(e => e.id !== id),
      hypotheses: prev.hypotheses.map(h => h.eventId === id ? { ...h, eventId: '' } : h),
    }));
  }, []);

  const deleteHypothesis = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      hypotheses: prev.hypotheses.filter(h => h.id !== id),
    }));
  }, []);

  const replaceState = useCallback((next: AppState) => {
    setState(next);
  }, []);

  return {
    state,
    recovery,
    saveError,
    resolveRecoveryByReset,
    addEvent,
    addHypothesis,
    updateHypothesisStatus,
    appendAiResult,
    addVerificationLog,
    deleteEvent,
    deleteHypothesis,
    replaceState,
  };
};
