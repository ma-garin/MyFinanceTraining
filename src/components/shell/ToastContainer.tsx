import type { Toast } from '../../hooks/useToast';

export function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className="toast">
          {t.message}
          {t.undoFn && (
            <button className="btn-toast-undo" onClick={() => { t.undoFn!(); onDismiss(t.id); }}>
              取り消す
            </button>
          )}
          <button className="btn-toast-close" onClick={() => onDismiss(t.id)}>×</button>
        </div>
      ))}
    </div>
  );
}

// ─── Mobile Header ────────────────────────────────────────────────────────────
