import { useState, useCallback } from 'react';

export type Toast = {
  id: string;
  message: string;
  undoFn?: () => void;
};

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((message: string, duration = 3000, undoFn?: () => void) => {
    const id = String(Date.now());
    setToasts(prev => [...prev, { id, message, undoFn }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration + 300);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, pushToast, dismissToast };
};
