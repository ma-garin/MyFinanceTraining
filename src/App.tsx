import { useState, useEffect, useCallback } from 'react';
import { useStore } from './hooks/useStore';
import { useAiSettings } from './hooks/useAiSettings';
import { useToast } from './hooks/useToast';
import { exportStateAsJson, importStateFromJson } from './infrastructure/storage';
import { initialState } from './data/sampleData';
import type { AppState, HypothesisStatus } from './domain/types';
import { STATUS_LABELS } from './ui/labels';
import { NAV_ITEMS, type View } from './components/shell/nav';
import { MobileHeader } from './components/shell/MobileHeader';
import { BottomNav } from './components/shell/BottomNav';
import { ToastContainer } from './components/shell/ToastContainer';
import { DashboardView } from './views/DashboardView';
import { EventInputView } from './views/EventInputView';
import { AssociationTreeView } from './views/AssociationTreeView';
import { HypothesisDetailView } from './views/HypothesisDetailView';
import { BacktestView } from './views/BacktestView';
import { SettingsView } from './views/SettingsView';
import { RecoveryScreen } from './components/shell/RecoveryScreen';
import { ImportConfirm } from './components/ImportConfirm';
import UpdateBanner from './components/shell/UpdateBanner';
import { ReportView } from './views/ReportView';

const THEME_KEY = 'theme';

const readTheme = (): 'light' | 'dark' => {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* 保存領域が使えなくても OS 設定で表示できる */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};
export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const { state, recovery, saveError, resolveRecoveryByReset, addEvent, addHypothesis, updateHypothesisStatus, appendAiResult, addVerificationLog, deleteEvent, deleteHypothesis, replaceState, canUndoReplace, undoReplace } = useStore();
  const [pendingImport, setPendingImport] = useState<AppState | null>(null);
  const { settings, usage, updateSettings, canExecute, incrementUsage } = useAiSettings();
  const { toasts, pushToast, dismissToast } = useToast();

  const [theme, setTheme] = useState<'light' | 'dark'>(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (err) {
      console.error('theme save failed:', err);
    }
  }, [theme]);

  const handleStatusChange = useCallback((id: string, status: HypothesisStatus, reason = '') => {
    const prev = state.hypotheses.find(h => h.id === id)?.status;
    updateHypothesisStatus(id, status, reason);
    pushToast(
      `ステータスを「${STATUS_LABELS[status]}」に変更しました`,
      3000,
      prev !== undefined ? () => updateHypothesisStatus(id, prev, '直前の変更を取り消し') : undefined,
    );
  }, [state.hypotheses, updateHypothesisStatus, pushToast]);

  const handleLoadSample = useCallback(() => {
    replaceState(initialState);
    pushToast('サンプルデータを読み込みました');
  }, [replaceState, pushToast]);

  const handleExport = useCallback(() => {
    pushToast(exportStateAsJson(state) ? 'JSONをエクスポートしました' : 'エクスポートに失敗しました。別のブラウザで再度お試しください');
  }, [state, pushToast]);

  const handleImport = useCallback((file: File) => {
    importStateFromJson(
      file,
      (s) => setPendingImport(s),
      (msg) => pushToast(`インポートできませんでした: ${msg}。エクスポートした JSON ファイルを選んでください`),
    );
  }, [pushToast]);

  const confirmImport = useCallback(() => {
    if (!pendingImport) return;
    replaceState(pendingImport);
    setPendingImport(null);
    pushToast('データをインポートしました。設定の「取り込みを元に戻す」で戻せます');
  }, [pendingImport, replaceState, pushToast]);

  const handleUndoImport = useCallback(() => {
    pushToast(undoReplace() ? '取り込み前のデータに戻しました' : '戻せるデータがありません');
  }, [undoReplace, pushToast]);

  const handleDeleteEvent = useCallback((id: string) => {
    deleteEvent(id);
    pushToast('イベントを削除しました');
  }, [deleteEvent, pushToast]);

  const handleDeleteHypothesis = useCallback((id: string) => {
    deleteHypothesis(id);
    pushToast('仮説を削除しました');
  }, [deleteHypothesis, pushToast]);

  if (recovery) return <RecoveryScreen recovery={recovery} onReset={resolveRecoveryByReset} />;

  const aiProps = {
    canExecuteAi: canExecute(),
    onAiIncrement: incrementUsage,
    onAiApply: appendAiResult,
    onAddLog: addVerificationLog,
  };

  return (
    <main className="app-shell">
      <MobileHeader theme={theme} onToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} />

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
        <UpdateBanner />
        {saveError && (
          <div className="save-error-banner" role="alert">
            データを保存できませんでした。ブラウザの保存容量やプライベートモードを確認し、設定からエクスポートで退避してください。
          </div>
        )}
        {pendingImport && (
          <ImportConfirm
            current={state}
            incoming={pendingImport}
            onConfirm={confirmImport}
            onCancel={() => setPendingImport(null)}
          />
        )}
        {view === 'dashboard' && (
          <DashboardView state={state} onLoadSample={handleLoadSample} onNavigate={setView} />
        )}
        {view === 'event-input' && <EventInputView state={state} onAdd={addEvent} onDelete={handleDeleteEvent} onAddHypothesis={addHypothesis} />}
        {view === 'association-tree' && (
          <AssociationTreeView
            state={state}
            onAdd={addHypothesis}
            onStatusChange={handleStatusChange}
            onDelete={handleDeleteHypothesis}
            {...aiProps}
          />
        )}
        {view === 'hypothesis-detail' && (
          <HypothesisDetailView
            state={state}
            onStatusChange={handleStatusChange}
            onDelete={handleDeleteHypothesis}
            {...aiProps}
          />
        )}
        {view === 'backtest' && <BacktestView hypotheses={state.hypotheses} />}
        {view === 'report' && <ReportView state={state} />}
        {view === 'settings' && (
          <SettingsView
            settings={settings}
            usage={usage}
            onUpdate={updateSettings}
            onExport={handleExport}
            onImport={handleImport}
            canUndoImport={canUndoReplace}
            onUndoImport={handleUndoImport}
          />
        )}
      </section>

      <BottomNav view={view} onNavigate={setView} />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}
