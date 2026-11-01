export type View = 'dashboard' | 'event-input' | 'association-tree' | 'hypothesis-detail' | 'backtest' | 'report' | 'settings';

export const NAV_ITEMS: { icon: string; label: string; mobileLabel: string; view: View }[] = [
  { icon: '◈', label: 'ダッシュボード', mobileLabel: 'ホーム',  view: 'dashboard' },
  { icon: '＋', label: 'イベント',        mobileLabel: '入力',   view: 'event-input' },
  { icon: '⟿', label: '連想ツリー',      mobileLabel: '仮説',   view: 'association-tree' },
  { icon: '◉', label: '仮説詳細',        mobileLabel: '詳細',   view: 'hypothesis-detail' },
  { icon: '↗', label: 'バックテスト',    mobileLabel: 'テスト', view: 'backtest' },
  { icon: '▤', label: 'レポート',        mobileLabel: '成績',   view: 'report' },
  { icon: '⚙', label: '設定',           mobileLabel: '設定',   view: 'settings' },
];
