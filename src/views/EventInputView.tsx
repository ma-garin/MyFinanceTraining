import { useState } from 'react';
import type { AppState, Hypothesis, MarketEvent } from '../domain/types';
import { CATEGORY_LABELS } from '../ui/labels';
import { EventForm } from '../components/EventForm';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { useFitCount } from '../hooks/useFitCount';
import { usePaged } from '../hooks/usePaged';
import { Pager } from '../components/desktop/Pager';
import { SplitPane } from '../components/desktop/SplitPane';
import { HypothesisForm } from '../components/HypothesisForm';
import { HypothesisFormDesktop } from '../components/HypothesisFormDesktop';
import '../styles/hypothesis-draft.css';

// onAddHypothesis が無いときは下書き導線を出さない（呼び出し側の配線前でも画面が壊れないように）
type Props = {
  state: AppState;
  onAdd: (e: MarketEvent) => void;
  onDelete: (id: string) => void;
  onAddHypothesis?: (h: Hypothesis) => void;
};

type DraftPromptProps = { event: MarketEvent; done: boolean; onStart: () => void; onClose: () => void };

function DraftPrompt({ event, done, onStart, onClose }: DraftPromptProps) {
  return (
    <div className="draft-prompt" role="status">
      <p>{done ? '仮説を登録しました。連想ツリーで検証を続けられます。' : `「${event.title}」を追加しました。`}</p>
      <span style={{ display: 'flex', gap: 6 }}>
        {!done && <button type="button" className="btn btn-primary" onClick={onStart}>このイベントから仮説の下書きを作る</button>}
        <button type="button" className="btn btn-ghost" onClick={onClose}>閉じる</button>
      </span>
    </div>
  );
}

type DraftFlow = { eventId: string; phase: 'prompt' | 'form' | 'done' } | null;

// イベント追加の直後に下書き導線を出す。状態はスマホと PC で共通
function useDraftFlow(onAdd: Props['onAdd'], onAddHypothesis: Props['onAddHypothesis']) {
  const [flow, setFlow] = useState<DraftFlow>(null);
  const addEvent = (ev: MarketEvent) => {
    onAdd(ev);
    if (onAddHypothesis) setFlow({ eventId: ev.id, phase: 'prompt' });
  };
  const start = (eventId: string) => setFlow({ eventId, phase: 'form' });
  const addHypothesis = (h: Hypothesis) => {
    onAddHypothesis?.(h);
    setFlow(prev => (prev ? { ...prev, phase: 'done' } : prev));
  };
  return { flow, setFlow, addEvent, start, addHypothesis };
}

function DesktopEventInput({ state, onAdd, onDelete, onAddHypothesis }: Props) {
  const d = useDraftFlow(onAdd, onAddHypothesis);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [ref, count] = useFitCount<HTMLDivElement>(56);
  const events = [...state.events].reverse();
  const { page, pageCount, pageItems, setPage } = usePaged(events, count);
  const selected = state.events.find(e => e.id === selectedId) ?? null;
  const promptEvent = d.flow && d.flow.phase !== 'form' ? state.events.find(e => e.id === d.flow?.eventId) ?? null : null;

  const list = (
    <>
      <p className="eyebrow">登録済みイベント — {events.length} 件</p>
      <div className="fit-area" ref={ref}>
        {events.length === 0 && <p className="empty-msg">まだイベントがありません</p>}
        {pageItems.map(ev => (
          <button
            type="button"
            key={ev.id}
            className={`row-item${ev.id === selectedId ? ' selected' : ''}`}
            onClick={() => { setSelectedId(ev.id); setConfirmId(null); d.setFlow(null); }}
          >
            <span>{ev.title}</span>
            <span className="row-sub">{CATEGORY_LABELS[ev.category] ?? ev.category} · {ev.occurredAt}</span>
          </button>
        ))}
      </div>
      <Pager page={page} pageCount={pageCount} onChange={setPage} label="イベント一覧" />
    </>
  );

  const detail = selected ? (
    <div className="event-detail">
      <div className="list-item-meta">
        <span className={`badge badge-${selected.category}`}>{CATEGORY_LABELS[selected.category] ?? selected.category}</span>
        <span className="date-label">{selected.occurredAt}</span>
        <button type="button" className="btn btn-ghost event-detail-new" onClick={() => setSelectedId(null)}>新規追加</button>
      </div>
      <h3>{selected.title}</h3>
      <p className="event-detail-summary">{selected.summary}</p>
      <div className="event-detail-actions">
        {onAddHypothesis && <button type="button" className="btn btn-primary" onClick={() => d.start(selected.id)}>このイベントから仮説の下書きを作る</button>}
        {confirmId === selected.id ? (
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmId(null)}>キャンセル</button>
            <button type="button" className="btn" style={{ background: '#dc2626', color: '#fff', border: 'none' }} onClick={() => { onDelete(selected.id); setConfirmId(null); setSelectedId(null); }}>削除確定</button>
          </>
        ) : (
          <button type="button" className="btn btn-ghost" style={{ color: 'var(--text-3)' }} onClick={() => setConfirmId(selected.id)}>削除</button>
        )}
      </div>
    </div>
  ) : (
    <>
      {promptEvent && <DraftPrompt event={promptEvent} done={d.flow?.phase === 'done'} onStart={() => d.start(promptEvent.id)} onClose={() => d.setFlow(null)} />}
      <EventForm onAdd={d.addEvent} />
    </>
  );
  const draftDetail = d.flow?.phase === 'form' ? (
    <div className="draft-prompt-panel">
      <button type="button" className="btn btn-ghost draft-prompt-back" onClick={() => d.setFlow(null)}>‹ イベントへ戻る</button>
      <HypothesisFormDesktop events={state.events} initialEventId={d.flow.eventId} onAdd={h => { d.addHypothesis(h); setSelectedId(null); }} />
    </div>
  ) : null;

  return (
    <div className="view-root event-input-view">
      <header className="view-header">
        <p className="eyebrow">Event Input</p>
        <h2>ニュース・イベントを記録する</h2>
      </header>
      <SplitPane list={list} detail={draftDetail ?? detail} listLabel="登録済みイベント" detailLabel={draftDetail ? '仮説の下書き' : selected ? 'イベント詳細' : 'イベント追加'} />
    </div>
  );
}

export function EventInputView(props: Props) {
  const isDesktop = useIsDesktop();
  return isDesktop ? <DesktopEventInput {...props} /> : <MobileEventInput {...props} />;
}

function MobileEventInput({ state, onAdd, onDelete, onAddHypothesis }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const d = useDraftFlow(onAdd, onAddHypothesis);
  const flowEvent = d.flow ? state.events.find(e => e.id === d.flow?.eventId) ?? null : null;

  return (
    <>
      <header className="view-header">
        <p className="eyebrow">Event Input</p>
        <h2>ニュース・イベントを記録する</h2>
      </header>
      {flowEvent && d.flow?.phase !== 'form' && (
        <DraftPrompt event={flowEvent} done={d.flow?.phase === 'done'} onStart={() => d.start(flowEvent.id)} onClose={() => d.setFlow(null)} />
      )}
      {flowEvent && d.flow?.phase === 'form' ? (
        <>
          <button type="button" className="btn btn-ghost draft-prompt-back" onClick={() => d.setFlow(null)}>‹ イベントの追加へ戻る</button>
          <HypothesisForm events={state.events} initialEventId={flowEvent.id} onAdd={d.addHypothesis} />
        </>
      ) : (
        <EventForm onAdd={d.addEvent} />
      )}
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
