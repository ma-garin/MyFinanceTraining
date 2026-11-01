import { useState } from 'react';
import type { AppState, MarketEvent } from '../domain/types';
import { CATEGORY_LABELS } from '../ui/labels';
import { EventForm } from '../components/EventForm';

export function EventInputView({ state, onAdd, onDelete }: { state: AppState; onAdd: (e: MarketEvent) => void; onDelete: (id: string) => void }) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <>
      <header className="view-header">
        <p className="eyebrow">Event Input</p>
        <h2>ニュース・イベントを記録する</h2>
      </header>
      <EventForm onAdd={onAdd} />
      <article className="card">
        <div className="card-header">
          <p className="eyebrow">登録済みイベント — {state.events.length} 件</p>
        </div>
        <div className="stack">
          {state.events.length === 0 && <p className="empty-msg">まだイベントがありません</p>}
          {[...state.events].reverse().map(ev => (
            <div className="list-item" key={ev.id} style={{ position: 'relative' }}>
              <div className="list-item-meta">
                <span className={`badge badge-${ev.category}`}>{CATEGORY_LABELS[ev.category] ?? ev.category}</span>
                <span className="date-label">{ev.occurredAt}</span>
                {confirmId === ev.id ? (
                  <span style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                    <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => setConfirmId(null)}>キャンセル</button>
                    <button className="btn" style={{ fontSize: 11, padding: '2px 8px', background: '#dc2626', color: '#fff', border: 'none' }} onClick={() => { onDelete(ev.id); setConfirmId(null); }}>削除確定</button>
                  </span>
                ) : (
                  <button className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px', marginLeft: 'auto', color: 'var(--text-3)' }} onClick={() => setConfirmId(ev.id)}>削除</button>
                )}
              </div>
              <h4>{ev.title}</h4>
              <p>{ev.summary}</p>
            </div>
          ))}
        </div>
      </article>
    </>
  );
}

// ─── Association Tree ─────────────────────────────────────────────────────────
