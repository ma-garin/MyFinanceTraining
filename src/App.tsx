import { useState, useEffect, useCallback } from 'react';
import { useStore } from './hooks/useStore';
import { useAiSettings } from './hooks/useAiSettings';
import { useToast, type Toast } from './hooks/useToast';
import { EventForm } from './components/EventForm';
import { HypothesisForm } from './components/HypothesisForm';
import { HypothesisCard } from './components/HypothesisCard';
import { EventTree } from './components/EventTree';
import { runBacktest, summarizeBacktest, type BacktestSummary } from './services/backtestEngine';
import { parsePriceCsv, parseEventCsv, PRICE_CSV_SAMPLE, EVENT_CSV_SAMPLE } from './services/csvParser';
import { exportStateAsJson, importStateFromJson } from './infrastructure/storage';
import { initialState } from './data/sampleData';
import type { AppState, MarketEvent, Hypothesis, HypothesisStatus, BacktestResult, VerificationLog } from './domain/types';

type View = 'dashboard' | 'event-input' | 'association-tree' | 'hypothesis-detail' | 'backtest' | 'settings';

const NAV_ITEMS: { icon: string; label: string; view: View }[] = [
  { icon: '◈', label: 'ダッシュボード', view: 'dashboard' },
  { icon: '＋', label: 'イベント',        view: 'event-input' },
  { icon: '⟿', label: '連想ツリー',      view: 'association-tree' },
  { icon: '◉', label: '仮説詳細',        view: 'hypothesis-detail' },
  { icon: '↗', label: 'バックテスト',    view: 'backtest' },
  { icon: '⚙', label: '設定',           view: 'settings' },
];

const CATEGORY_LABELS: Record<string, string> = {
  geopolitics:   '地政学',
  macro:         'マクロ',
  commodity:     'コモディティ',
  semiconductor: '半導体',
  currency:      '為替',
  consumer:      '消費者',
  other:         'その他',
};

const STATUS_LABELS: Record<HypothesisStatus, string> = {
  adopted:    '採用',
  watching:   '様子見',
  rejected:   '棄却',
  needs_test: '要検証',
};

// ─── Toast Container ─────────────────────────────────────────────────────────

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
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

// ─── Dashboard ───────────────────────────────────────────────────────────────

type DashboardProps = {
  state: AppState;
  onLoadSample: () => void;
  onNavigate: (v: View) => void;
};

function DashboardView({ state, onLoadSample, onNavigate }: DashboardProps) {
  const total    = state.hypotheses.length;
  const adopted  = state.hypotheses.filter(h => h.status === 'adopted').length;
  const watching = state.hypotheses.filter(h => h.status === 'watching').length;
  const needsTest = state.hypotheses.filter(h => h.status === 'needs_test').length;

  const isEmpty = state.events.length === 0 && state.hypotheses.length === 0;

  return (
    <>
      <header className="view-header">
        <p className="eyebrow">Global Event → Japan Market Reaction</p>
        <h2>ニュースから連想ツリーを作り、日本市場の仮説へ落とす</h2>
        <p>AIを常時使わず、ルールベースと手入力で仮説を管理します。AIは深掘り・失敗条件の洗い出しだけに限定します。</p>
      </header>

      {isEmpty ? (
        <div className="onboarding-hero">
          <div>
            <p className="eyebrow">はじめに</p>
            <h3 style={{ margin: '4px 0 8px' }}>3ステップで仮説管理を始めましょう</h3>
          </div>
          <div className="onboarding-steps">
            {[
              { n: '1', title: 'イベントを記録する', desc: 'ニュース・マクロイベントをカテゴリ付きで登録します。' },
              { n: '2', title: '連想ツリーを作る', desc: 'イベントから銘柄・テーマへの連想ステップを手入力します。' },
              { n: '3', title: '仮説を検証する', desc: 'バックテスト・検証ログでフィードバックを積み重ねます。' },
            ].map(s => (
              <div key={s.n} className="onboarding-step">
                <div className="onboarding-num">{s.n}</div>
                <div><strong>{s.title}</strong><p>{s.desc}</p></div>
              </div>
            ))}
          </div>
          <div className="onboarding-actions">
            <button className="btn btn-primary" onClick={onLoadSample}>サンプルを読み込む</button>
            <button className="btn btn-ghost" onClick={() => onNavigate('event-input')}>最初のイベントを追加する</button>
          </div>
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card stat-total">
              <div className="stat-value">{total}</div>
              <p className="stat-label">仮説 合計</p>
            </div>
            <div className="stat-card stat-adopted">
              <div className="stat-value">{adopted}</div>
              <p className="stat-label">✓ 採用</p>
            </div>
            <div className="stat-card stat-watching">
              <div className="stat-value">{watching}</div>
              <p className="stat-label">👁 様子見</p>
            </div>
            <div className="stat-card stat-needs-test">
              <div className="stat-value">{needsTest}</div>
              <p className="stat-label">🧪 要検証</p>
            </div>
          </div>

          <div className="grid two-columns">
            <article className="card">
              <div className="card-header">
                <p className="eyebrow">Events</p>
                <h3>注目イベント</h3>
              </div>
              <div className="stack">
                {state.events.length === 0 && <p className="empty-msg">イベントがありません</p>}
                {state.events.map(ev => (
                  <div className="list-item" key={ev.id}>
                    <span className={`badge badge-${ev.category}`}>{CATEGORY_LABELS[ev.category] ?? ev.category}</span>
                    <h4>{ev.title}</h4>
                    <p>{ev.summary}</p>
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
                    {{ adopted: '✓ 採用', watching: '👁 様子見', rejected: '✕ 棄却', needs_test: '🧪 要検証' }[h.status]}
                  </span>
                  <h4>{h.title}</h4>
                  <p>{h.associationSteps[0]?.label} → … → {h.associationSteps[h.associationSteps.length - 1]?.label}</p>
                </div>
              ))}
            </div>
          </article>
        </>
      )}
    </>
  );
}

// ─── Event Input ─────────────────────────────────────────────────────────────

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
                <span className={`badge badge-${ev.category}`}>{CATEGORY_LABELS[ev.category] ?? ev.category}</span>
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

// ─── Association Tree ─────────────────────────────────────────────────────────

type TreeProps = {
  state: AppState;
  onAdd: (h: Hypothesis) => void;
  onStatusChange: (id: string, status: HypothesisStatus) => void;
  canExecuteAi: boolean;
  onAiIncrement: () => void;
  onAiApply: (id: string, steps: { label: string; reason: string }[], conditions: string[]) => void;
  onAddLog: (id: string, log: Omit<VerificationLog, 'id'>) => void;
};

function AssociationTreeView({ state, onAdd, onStatusChange, canExecuteAi, onAiIncrement, onAiApply, onAddLog }: TreeProps) {
  const [showForm, setShowForm] = useState(false);
  const [showTree, setShowTree] = useState(false);

  const handleAdd = (h: Hypothesis) => { onAdd(h); setShowForm(false); };

  return (
    <>
      <header className="view-header">
        <p className="eyebrow">Association Tree</p>
        <h2>連想ツリーと投資仮説</h2>
      </header>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? '閉じる' : '＋ 仮説を追加'}
        </button>
        <button className="btn btn-ghost" onClick={() => setShowTree(v => !v)}>
          {showTree ? 'ツリーを閉じる' : '🌲 ツリー表示'}
        </button>
      </div>
      {showForm && <HypothesisForm events={state.events} onAdd={handleAdd} />}
      {showTree && <EventTree events={state.events} hypotheses={state.hypotheses} />}
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
            canExecuteAi={canExecuteAi}
            onAiIncrement={onAiIncrement}
            onAiApply={onAiApply}
            onAddLog={onAddLog}
          />
        ))}
      </div>
    </>
  );
}

// ─── Hypothesis Detail ───────────────────────────────────────────────────────

type DetailProps = {
  state: AppState;
  onStatusChange: (id: string, status: HypothesisStatus) => void;
  canExecuteAi: boolean;
  onAiIncrement: () => void;
  onAiApply: (id: string, steps: { label: string; reason: string }[], conditions: string[]) => void;
  onAddLog: (id: string, log: Omit<VerificationLog, 'id'>) => void;
};

function HypothesisDetailView({ state, onStatusChange, canExecuteAi, onAiIncrement, onAiApply, onAddLog }: DetailProps) {
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
        <select id="hyp-select" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
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
          canExecuteAi={canExecuteAi}
          onAiIncrement={onAiIncrement}
          onAiApply={onAiApply}
          onAddLog={onAddLog}
        />
      )}
    </>
  );
}

// ─── Backtest ────────────────────────────────────────────────────────────────

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function BacktestView({ hypotheses }: { hypotheses: Hypothesis[] }) {
  const [priceText, setPriceText] = useState('');
  const [eventText, setEventText] = useState('');
  const [results, setResults] = useState<BacktestResult[]>([]);
  const [summary, setSummary] = useState<BacktestSummary[]>([]);
  const [error, setError] = useState('');

  const handleRun = () => {
    try {
      const priceRows = parsePriceCsv(priceText);
      const eventRows = parseEventCsv(eventText);
      if (priceRows.length === 0) { setError('価格CSVが空または不正です'); return; }
      if (eventRows.length === 0) { setError('イベントCSVが空または不正です'); return; }
      const res = runBacktest(priceRows, eventRows);
      setResults(res);
      setSummary(summarizeBacktest(res));
      setError('');
    } catch (e) {
      setError(`解析エラー: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <>
      <header className="view-header">
        <p className="eyebrow">Backtest</p>
        <h2>CSV バックテスト</h2>
      </header>

      <article className="card">
        <div className="card-header">
          <p className="eyebrow">CSV フォーマット</p>
          <h3>入力形式</h3>
        </div>
        <div className="grid two-columns">
          <div>
            <p className="eyebrow">価格データ CSV</p>
            <pre className="csv-sample">{PRICE_CSV_SAMPLE}</pre>
          </div>
          <div>
            <p className="eyebrow">イベント CSV</p>
            <pre className="csv-sample">{EVENT_CSV_SAMPLE}</pre>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8 }}>
              hypothesis_id は登録済み仮説ID、または任意の文字列
            </p>
          </div>
        </div>
        {hypotheses.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <p className="eyebrow">登録済み仮説 ID</p>
            <div className="template-chips" style={{ marginTop: 6 }}>
              {hypotheses.map(h => (
                <span key={h.id} className="template-chip-btn" style={{ cursor: 'default' }}>{h.id}</span>
              ))}
            </div>
          </div>
        )}
      </article>

      <article className="card">
        <div className="card-header"><p className="eyebrow">CSV 入力</p></div>
        {error && <p className="form-error">{error}</p>}
        <div className="grid two-columns">
          <div className="form-group">
            <label>価格データ CSV</label>
            <textarea rows={8} placeholder={PRICE_CSV_SAMPLE} value={priceText} onChange={e => setPriceText(e.target.value)} />
          </div>
          <div className="form-group">
            <label>イベント CSV</label>
            <textarea rows={8} placeholder={EVENT_CSV_SAMPLE} value={eventText} onChange={e => setEventText(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleRun}>バックテスト実行</button>
      </article>

      {results.length > 0 && (
        <>
          <article className="card">
            <div className="card-header">
              <p className="eyebrow">銘柄別サマリー</p>
              <h3>勝率・平均リターン・標準偏差</h3>
            </div>
            <div className="bt-table-wrap">
              <table className="bt-table">
                <thead>
                  <tr>
                    <th>銘柄</th><th>件数</th>
                    <th>勝率 T+1</th><th>勝率 T+3</th><th>勝率 T+5</th>
                    <th>平均 T+1</th><th>平均 T+3</th><th>平均 T+5</th>
                    <th>σ T+1</th><th>σ T+3</th><th>σ T+5</th>
                    <th>最大 DD</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((s: BacktestSummary) => (
                    <tr key={s.ticker}>
                      <td><strong>{s.ticker}</strong></td>
                      <td>
                        {s.count}
                        {s.sampleWarning && <span title="サンプル数不足" style={{ marginLeft: 4, color: '#d97706' }}>⚠</span>}
                      </td>
                      <td className={s.winRate1 >= 0.5 ? 'ret-pos' : 'ret-neg'}>{pct(s.winRate1)}</td>
                      <td className={s.winRate3 >= 0.5 ? 'ret-pos' : 'ret-neg'}>{pct(s.winRate3)}</td>
                      <td className={s.winRate5 >= 0.5 ? 'ret-pos' : 'ret-neg'}>{pct(s.winRate5)}</td>
                      <td className={s.avgReturn1 >= 0 ? 'ret-pos' : 'ret-neg'}>{pct(s.avgReturn1)}</td>
                      <td className={s.avgReturn3 >= 0 ? 'ret-pos' : 'ret-neg'}>{pct(s.avgReturn3)}</td>
                      <td className={s.avgReturn5 >= 0 ? 'ret-pos' : 'ret-neg'}>{pct(s.avgReturn5)}</td>
                      <td>{pct(s.stdDev1)}</td>
                      <td>{pct(s.stdDev3)}</td>
                      <td>{pct(s.stdDev5)}</td>
                      <td className="ret-neg">{pct(s.maxDrawdown)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="card">
            <div className="card-header"><p className="eyebrow">詳細結果</p></div>
            <div className="bt-table-wrap">
              <table className="bt-table">
                <thead>
                  <tr>
                    <th>仮説 ID</th><th>イベント日</th><th>銘柄</th>
                    <th>T+1</th><th>T+3</th><th>T+5</th><th>備考</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: 12 }}>{r.hypothesisId}</td>
                      <td>{r.eventDate}</td>
                      <td>{r.ticker}</td>
                      <td className={r.t1Return == null ? '' : r.t1Return >= 0 ? 'ret-pos' : 'ret-neg'}>
                        {r.t1Return == null ? '—' : pct(r.t1Return)}
                      </td>
                      <td className={r.t3Return == null ? '' : r.t3Return >= 0 ? 'ret-pos' : 'ret-neg'}>
                        {r.t3Return == null ? '—' : pct(r.t3Return)}
                      </td>
                      <td className={r.t5Return == null ? '' : r.t5Return >= 0 ? 'ret-pos' : 'ret-neg'}>
                        {r.t5Return == null ? '—' : pct(r.t5Return)}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{r.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </>
      )}
    </>
  );
}

// ─── Settings ────────────────────────────────────────────────────────────────

type SettingsProps = {
  settings: ReturnType<typeof useAiSettings>['settings'];
  usage: ReturnType<typeof useAiSettings>['usage'];
  onUpdate: (s: ReturnType<typeof useAiSettings>['settings']) => void;
  onExport: () => void;
  onImport: (file: File) => void;
};

function SettingsView({ settings, usage, onUpdate, onExport, onImport }: SettingsProps) {
  const [daily, setDaily] = useState(String(settings.dailyLimit));
  const [monthly, setMonthly] = useState(String(settings.monthlyLimit));
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onUpdate({ dailyLimit: Number(daily) || 5, monthlyLimit: Number(monthly) || 50 });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <>
      <header className="view-header">
        <p className="eyebrow">Settings</p>
        <h2>設定</h2>
      </header>

      <article className="card">
        <div className="card-header">
          <p className="eyebrow">AI 深掘り設定</p>
          <h3>利用上限管理</h3>
        </div>
        <p style={{ color: 'var(--text-2)', marginBottom: 16 }}>
          AI深掘りは手動実行のみです。Claude.ai 等の外部サービスへのプロンプトコピーで利用します。
          実行回数を記録し、上限を超えた場合は実行できません。
        </p>
        <div className="form-row">
          <div className="form-group">
            <label>1日の上限（回）</label>
            <input type="number" min={1} max={100} value={daily} onChange={e => setDaily(e.target.value)} />
          </div>
          <div className="form-group">
            <label>月間上限（回）</label>
            <input type="number" min={1} max={1000} value={monthly} onChange={e => setMonthly(e.target.value)} />
          </div>
        </div>
        <div className="usage-display">
          <div className="usage-item">
            <p className="eyebrow">本日の使用</p>
            <p><strong>{usage.dailyCount}</strong> / {settings.dailyLimit} 回</p>
          </div>
          <div className="usage-item">
            <p className="eyebrow">今月の使用</p>
            <p><strong>{usage.monthlyCount}</strong> / {settings.monthlyLimit} 回</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSave}>
          {saved ? '✓ 保存しました' : '保存'}
        </button>
      </article>

      <article className="card">
        <div className="card-header">
          <p className="eyebrow">データ管理</p>
          <h3>バックアップ・復元</h3>
        </div>
        <p style={{ color: 'var(--text-2)', marginBottom: 16 }}>
          データは localStorage に保存されています。JSONファイルでバックアップ・移行できます。
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={onExport}>⬇ JSONエクスポート</button>
          <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
            ⬆ JSONインポート
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.[0]) onImport(e.target.files[0]); e.target.value = ''; }}
            />
          </label>
        </div>
      </article>

      <article className="card">
        <p style={{ color: 'var(--text-2)', margin: 0 }}>
          このツールは投資助言・自動売買ツールではありません。
          個人の仮説管理・検証・判断補助のためのOSです。
        </p>
      </article>
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const { state, addEvent, addHypothesis, updateHypothesisStatus, appendAiResult, addVerificationLog, replaceState } = useStore();
  const { settings, usage, updateSettings, canExecute, incrementUsage } = useAiSettings();
  const { toasts, pushToast, dismissToast } = useToast();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleStatusChange = useCallback((id: string, status: HypothesisStatus) => {
    const prev = state.hypotheses.find(h => h.id === id)?.status;
    updateHypothesisStatus(id, status);
    pushToast(
      `ステータスを「${STATUS_LABELS[status]}」に変更しました`,
      3000,
      prev !== undefined ? () => updateHypothesisStatus(id, prev) : undefined,
    );
  }, [state.hypotheses, updateHypothesisStatus, pushToast]);

  const handleLoadSample = useCallback(() => {
    replaceState(initialState);
    pushToast('サンプルデータを読み込みました');
  }, [replaceState, pushToast]);

  const handleExport = useCallback(() => {
    exportStateAsJson(state);
    pushToast('JSONをエクスポートしました');
  }, [state, pushToast]);

  const handleImport = useCallback((file: File) => {
    importStateFromJson(
      file,
      (s) => { replaceState(s); pushToast('データをインポートしました'); },
      (msg) => pushToast(`インポートエラー: ${msg}`),
    );
  }, [replaceState, pushToast]);

  const aiProps = {
    canExecuteAi: canExecute(),
    onAiIncrement: incrementUsage,
    onAiApply: appendAiResult,
    onAddLog: addVerificationLog,
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">FT</span>
          <div className="brand-text">
            <p className="eyebrow">MyFinanceTraining</p>
            <h1>投資仮説OS</h1>
          </div>
        </div>
        <nav className="nav-list" aria-label="Main navigation">
          {NAV_ITEMS.map(({ icon, label, view: v }) => (
            <button
              key={v}
              className={`nav-btn${view === v ? ' active' : ''}`}
              onClick={() => setView(v)}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </button>
          ))}
        </nav>
        <button
          className="theme-toggle"
          onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          aria-label="テーマ切替"
        >
          {theme === 'dark' ? '☀ ライト' : '🌙 ダーク'}
        </button>
      </aside>

      <section className="content">
        {view === 'dashboard' && (
          <DashboardView state={state} onLoadSample={handleLoadSample} onNavigate={setView} />
        )}
        {view === 'event-input' && <EventInputView state={state} onAdd={addEvent} />}
        {view === 'association-tree' && (
          <AssociationTreeView
            state={state}
            onAdd={addHypothesis}
            onStatusChange={handleStatusChange}
            {...aiProps}
          />
        )}
        {view === 'hypothesis-detail' && (
          <HypothesisDetailView
            state={state}
            onStatusChange={handleStatusChange}
            {...aiProps}
          />
        )}
        {view === 'backtest' && <BacktestView hypotheses={state.hypotheses} />}
        {view === 'settings' && (
          <SettingsView
            settings={settings}
            usage={usage}
            onUpdate={updateSettings}
            onExport={handleExport}
            onImport={handleImport}
          />
        )}
      </section>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}
