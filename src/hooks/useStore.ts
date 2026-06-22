import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  AppState, MarketEvent, Hypothesis, HypothesisStatus,
  AssociationStep, VerificationLog,
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
    deleteEvent,
    deleteHypothesis,
    replaceState,
  };
};
