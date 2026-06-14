import { sampleEvents, sampleHypotheses, targetThemes } from './data/sampleData';

const navItems = ['Dashboard', 'Event Input', 'Association Tree', 'Hypothesis Detail', 'Settings'];

function App() {
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
          {navItems.map((item) => (
            <a key={item} href={`#${item.toLowerCase().replaceAll(' ', '-')}`}>
              {item}
            </a>
          ))}
        </nav>
      </aside>

      <section className="content">
        <header className="hero">
          <p className="eyebrow">Global Event → Japan Market Reaction</p>
          <h2>ニュースから連想ツリーを作り、日本市場の仮説へ落とす</h2>
          <p>
            初期版では、AIを常時使わず、ルールベースと手入力で仮説を管理します。
            AIは3〜5段階目の深掘り、反論、失敗条件の洗い出しだけに限定します。
          </p>
        </header>

        <section className="grid two-columns" id="dashboard">
          <article className="card">
            <div className="card-header">
              <p className="eyebrow">Events</p>
              <h3>注目イベント</h3>
            </div>
            <div className="stack">
              {sampleEvents.map((event) => (
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
              {targetThemes.map((theme) => (
                <div className="theme-chip" key={theme.name}>
                  <strong>{theme.name}</strong>
                  <span>{theme.examples.join(' / ')}</span>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="card" id="association-tree">
          <div className="card-header">
            <p className="eyebrow">Association Tree</p>
            <h3>連想ツリー仮説</h3>
          </div>
          <div className="hypothesis-list">
            {sampleHypotheses.map((hypothesis) => (
              <article className="hypothesis-card" key={hypothesis.id}>
                <div className="hypothesis-title-row">
                  <div>
                    <p className="hypothesis-id">{hypothesis.id}</p>
                    <h4>{hypothesis.title}</h4>
                  </div>
                  <span className="status-pill">{hypothesis.status}</span>
                </div>

                <ol className="timeline">
                  {hypothesis.steps.map((step, index) => (
                    <li key={step}>
                      <span>{index + 1}</span>
                      <p>{step}</p>
                    </li>
                  ))}
                </ol>

                <div className="meta-row">
                  <div>
                    <p className="eyebrow">Target Themes</p>
                    <p>{hypothesis.targetThemes.join(' / ')}</p>
                  </div>
                  <div>
                    <p className="eyebrow">Invalidation</p>
                    <p>{hypothesis.invalidations.join(' / ')}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid three-columns">
          <article className="card mini-card" id="event-input">
            <p className="eyebrow">Next</p>
            <h3>Event Input</h3>
            <p>次Issueでニュース/イベント手入力フォームを追加します。</p>
          </article>
          <article className="card mini-card" id="hypothesis-detail">
            <p className="eyebrow">Next</p>
            <h3>Hypothesis Detail</h3>
            <p>仮説ID、失敗条件、採用/保留/棄却の編集を追加します。</p>
          </article>
          <article className="card mini-card" id="settings">
            <p className="eyebrow">Next</p>
            <h3>Settings</h3>
            <p>AI利用上限と任意API連携の設定を追加します。</p>
          </article>
        </section>
      </section>
    </main>
  );
}

export default App;
