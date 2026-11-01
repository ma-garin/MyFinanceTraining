import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardView } from './DashboardView';
import { SettingsView } from './SettingsView';
import { initialState } from '../data/sampleData';

describe('PC 分岐', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn(() => ({ matches: true, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('Dashboard は3枠構成で view-root を持つ', () => {
    const { container } = render(<DashboardView state={initialState} onLoadSample={() => {}} onNavigate={() => {}} />);
    expect(container.querySelector('.view-root')).not.toBeNull();
    expect(container.querySelectorAll('.dash-col').length).toBe(3);
  });

  it('Settings はタブで分かれる', () => {
    render(<SettingsView settings={{ dailyLimit: 5, monthlyLimit: 50 }} usage={{ dailyCount: 0, monthlyCount: 0 } as never}
      onUpdate={() => {}} onExport={() => {}} onImport={() => {}} canUndoImport={false} onUndoImport={() => {}} />);
    expect(screen.getByRole('tab', { name: 'データ管理' })).toBeTruthy();
    expect(screen.queryByText('バックアップ・復元')).toBeNull();
  });
});
