import type { AppState } from '../domain/types';
import { CATEGORY_LABELS } from '../ui/labels';
import type { View } from '../components/shell/nav';

type DashboardProps = {
  state: AppState;
  onLoadSample: () => void;
  onNavigate: (v: View) => void;
};

export function DashboardView({ state, onLoadSample, onNavigate }: DashboardProps) {
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
