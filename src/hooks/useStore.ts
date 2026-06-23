import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  AppState, MarketEvent, Hypothesis, HypothesisStatus,
  AssociationStep, VerificationLog, ForecastOutcome,
} from '../domain/types';
import { loadState, saveState } from '../infrastructure/storage';
import { initialState } from '../data/sampleData';

const DEBOUNCE_MS = 300;

export const useStore = () => {
  const [state, setState] = useState<AppState>(() => loadState() ?? initialState);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveState(state), DEBOUNCE_MS);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [state]);

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
      hypotheses: prev.hypotheses.map(h => {
        if (h.id !== id) return h;
        const existingDepths = h.associationSteps.map(s => s.depth);
        const nextDepth = (Math.max(0, ...existingDepths) + 1) as AssociationStep['depth'];
        const stepsToAdd: AssociationStep[] = newSteps.slice(0, 5 - h.associationSteps.length).map((s, i) => ({
          depth: Math.min(5, nextDepth + i) as AssociationStep['depth'],
          label: s.label,
          reason: s.reason,
        }));
        return {
          ...h,
          associationSteps: [...h.associationSteps, ...stepsToAdd],
          invalidationConditions: [...h.invalidationConditions, ...newConditions],
        };
      }),
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

  // 較正のための結果確定。status も hit→adopted / miss→rejected に同期する
  const resolveHypothesis = useCallback((id: string, outcome: ForecastOutcome, note: string) => {
    setState(prev => ({
      ...prev,
      hypotheses: prev.hypotheses.map(h =>
        h.id === id
          ? {
              ...h,
              resolution: { outcome, resolvedAt: new Date().toISOString().slice(0, 10), note },
              status: outcome === 'hit' ? 'adopted' : 'rejected',
            }
          : h
      ),
    }));
  }, []);

  const clearResolution = useCallback((id: string) => {
    setState(prev => ({
      ...prev,
      hypotheses: prev.hypotheses.map(h => {
        if (h.id !== id) return h;
        const { resolution: _omit, ...rest } = h;
        return rest;
      }),
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
    addEvent,
    addHypothesis,
    updateHypothesisStatus,
    appendAiResult,
    addVerificationLog,
    resolveHypothesis,
    clearResolution,
    deleteEvent,
    deleteHypothesis,
    replaceState,
  };
};
