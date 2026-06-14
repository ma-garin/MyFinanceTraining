import { useState, useEffect, useCallback } from 'react';
import type { AppState, MarketEvent, Hypothesis, HypothesisStatus } from '../domain/types';
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

  return { state, addEvent, addHypothesis, updateHypothesisStatus };
};
