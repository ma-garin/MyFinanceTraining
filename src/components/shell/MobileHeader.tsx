export function MobileHeader({ theme, onToggle }: { theme: 'light' | 'dark'; onToggle: () => void }) {
  return (
    <header className="app-header-mobile">
      <div className="mobile-brand">
        <div className="mobile-brand-mark">FT</div>
        <span className="mobile-brand-name">投資仮説OS</span>
      </div>
      <button className="mobile-theme-btn" onClick={onToggle} aria-label="テーマ切替">
        {theme === 'dark' ? '☀' : '🌙'}
      </button>
    </header>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
