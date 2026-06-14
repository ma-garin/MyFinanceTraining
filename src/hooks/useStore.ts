import { useState, useEffect, useCallback } from 'react';
import type { AppState, MarketEvent, Hypothesis, HypothesisStatus, AssociationStep } from '../domain/types';
import { loadState, saveState } from '../infrastructure/storage';
import { initialState } from '../data/sampleData';

export const useStore = () => {
  const [state, setState] = useState<AppState>(() => loadState() ?? initialState);

  useEffect(() => {
    saveState(state);
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

  return { state, addEvent, addHypothesis, updateHypothesisStatus, appendAiResult };
};
