import { NAV_ITEMS, type View } from './nav';

export function BottomNav({ view, onNavigate }: { view: View; onNavigate: (v: View) => void }) {
  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {NAV_ITEMS.map(({ icon, mobileLabel, view: v }) => (
        <button
          key={v}
          className={`bottom-nav-btn${view === v ? ' active' : ''}`}
          onClick={() => onNavigate(v)}
        >
          <span className="bottom-nav-icon">{icon}</span>
          <span className="bottom-nav-label">{mobileLabel}</span>
        </button>
      ))}
    </nav>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
