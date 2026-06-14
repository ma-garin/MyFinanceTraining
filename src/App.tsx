import { useState } from 'react';
import { useStore } from './hooks/useStore';
import { EventForm } from './components/EventForm';
import { HypothesisForm } from './components/HypothesisForm';
import { HypothesisCard } from './components/HypothesisCard';
import type { AppState, MarketEvent, Hypothesis, HypothesisStatus } from './domain/types';

type View = 'dashboard' | 'event-input' | 'association-tree' | 'hypothesis-detail' | 'settings';

const NAV_ITEMS: { label: string; view: View }[] = [
  { label: 'Dashboard', view: 'dashboard' },
  { label: 'Event Input', view: 'event-input' },
  { label: 'Association Tree', view: 'association-tree' },
  { label: 'Hypothesis Detail', view: 'hypothesis-detail' },
  { label: 'Settings', view: 'settings' },
];

function DashboardView({ state }: { state: AppState }) {
  return (
    <>
      <header className="hero">
        <p className="eyebrow">Global Event → Japan Market Reaction</p>
        <h2>ニュースから連想ツリーを作り、日本市場の仮説へ落とす</h2>
        <p>
          AIを常時使わず、ルールベースと手入力で仮説を管理します。
          AIは3〜5段階目の深掘り、反論、失敗条件の洗い出しだけに限定します。
        </p>
      </header>

      <div className="grid two-columns">
        <article className="card">
          <div className="card-header">
            <p className="eyebrow">Events</p>
            <h3>注目イベント</h3>
          </div>
          <div className="stack">
            {state.events.length === 0 && <p className="empty-msg">イベントがありません</p>}
            {state.events.map(event => (
              <div className="list-item" key={event.id}>
                <span className="badge">{event.category}</span>
                <h4>{event.title}</h4>
                <p>{event.summary}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <div className="card-header">
            <p className="eyebrow">Themes</p>
            <h3>日本株テーマ</h3>
          </div>
          <div className="theme-list">
            {state.themes.map(theme => (
              <div className="theme-chip" key={theme.id}>
                <strong>{theme.name}</strong>
                <span>{theme.examples.join(' / ')}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="card">
        <div className="card-header">
          <p className="eyebrow">Hypotheses</p>
          <h3>仮説サマリー — {state.hypotheses.length} 件</h3>
        </div>
        <div className="stack">
          {state.hypotheses.length === 0 && <p className="empty-msg">仮説がありません</p>}
          {state.hypotheses.map(h => (
            <div className="list-item" key={h.id}>
              <span className={`status-pill status-${h.status}`}>
                {{ adopted: '採用', watching: '様子見', rejected: '棄却', needs_test: '要検証' }[h.status]}
              </span>
              <h4>{h.title}</h4>
              <p>{h.associationSteps[0]?.label} → … → {h.associationSteps[h.associationSteps.length - 1]?.label}</p>
            </div>
          ))}
        </div>
      </article>
    </>
  );
}

function EventInputView({ state, onAdd }: { state: AppState; onAdd: (e: MarketEvent) => void }) {
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
            <div className="list-item" key={ev.id}>
              <div className="list-item-meta">
                <span className="badge">{ev.category}</span>
                <span className="date-label">{ev.occurredAt}</span>
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

function AssociationTreeView({
  state,
  onAdd,
  onStatusChange,
}: {
  state: AppState;
  onAdd: (h: Hypothesis) => void;
  onStatusChange: (id: string, status: HypothesisStatus) => void;
}) {
  const [showForm, setShowForm] = useState(false);

  const handleAdd = (h: Hypothesis) => {
    onAdd(h);
    setShowForm(false);
  };

  return (
    <>
      <header className="view-header">
        <p className="eyebrow">Association Tree</p>
        <h2>連想ツリーと投資仮説</h2>
      </header>

      <div className="toolbar">
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? '閉じる' : '+ 仮説を追加'}
        </button>
      </div>

      {showForm && <HypothesisForm events={state.events} onAdd={handleAdd} />}

      <div className="hypothesis-list">
        {state.hypotheses.length === 0 && (
          <p className="empty-msg">仮説がありません。「仮説を追加」から登録してください。</p>
        )}
        {[...state.hypotheses].reverse().map(h => (
          <HypothesisCard
            key={h.id}
            hypothesis={h}
            events={state.events}
            onStatusChange={onStatusChange}
          />
        ))}
      </div>
    </>
  );
}

function HypothesisDetailView({
  state,
  onStatusChange,
}: {
  state: AppState;
  onStatusChange: (id: string, status: HypothesisStatus) => void;
}) {
  const [selectedId, setSelectedId] = useState(state.hypotheses[0]?.id ?? '');
  const hypothesis = state.hypotheses.find(h => h.id === selectedId);

  return (
    <>
      <header className="view-header">
        <p className="eyebrow">Hypothesis Detail</p>
        <h2>仮説詳細・ステータス管理</h2>
      </header>

      <div className="form-group">
        <label htmlFor="hyp-select">仮説を選択</label>
        <select
          id="hyp-select"
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
        >
          {state.hypotheses.length === 0 && <option value="">仮説がありません</option>}
          {state.hypotheses.map(h => (
            <option key={h.id} value={h.id}>{h.title}</option>
          ))}
        </select>
      </div>

      {hypothesis && (
        <HypothesisCard
          hypothesis={hypothesis}
          events={state.events}
          onStatusChange={onStatusChange}
        />
      )}
    </>
  );
}

function SettingsView() {
  return (
    <>
      <header className="view-header">
        <p className="eyebrow">Settings</p>
        <h2>設定</h2>
      </header>
      <article className="card">
        <p>AI利用上限と任意API連携の設定は次のIssueで追加します。</p>
        <p style={{ color: '#64748b', marginTop: 8 }}>
          このツールは投資助言・自動売買ツールではありません。
          個人の仮説管理・検証・判断補助のためのOSです。
        </p>
      </article>
    </>
  );
}

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const { state, addEvent, addHypothesis, updateHypothesisStatus } = useStore();

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">FT</span>
          <div>
            <p className="eyebrow">MyFinanceTraining</p>
            <h1>投資仮説OS</h1>
          </div>
        </div>
        <nav className="nav-list" aria-label="Main navigation">
          {NAV_ITEMS.map(({ label, view: v }) => (
            <button
              key={v}
              className={`nav-btn${view === v ? ' active' : ''}`}
              onClick={() => setView(v)}
            >
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="content">
        {view === 'dashboard' && <DashboardView state={state} />}
        {view === 'event-input' && (
          <EventInputView state={state} onAdd={addEvent} />
        )}
        {view === 'association-tree' && (
          <AssociationTreeView
            state={state}
            onAdd={addHypothesis}
            onStatusChange={updateHypothesisStatus}
          />
        )}
        {view === 'hypothesis-detail' && (
          <HypothesisDetailView
            state={state}
            onStatusChange={updateHypothesisStatus}
          />
        )}
        {view === 'settings' && <SettingsView />}
      </section>
    </main>
  );
}
