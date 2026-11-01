import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReportView } from './ReportView';
import { makeHyp, makeState } from '../test/fixtures';

describe('ReportView', () => {
  it('履歴0件のメッセージと見出しを描画', () => {
    render(<ReportView state={makeState()} />);
    expect(screen.getByRole('heading', { level: 2, name: 'レポート' })).toBeInTheDocument();
    expect(screen.getByText('まだ採否の変更履歴はありません')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Markdownをダウンロード' })).toBeInTheDocument();
  });
  it('成績と履歴理由を描画', () => {
    const h = makeHyp({
      title: '仮説X', targetThemes: ['t1'],
      verificationLogs: [{ id: '1', loggedAt: '2026-11-01', result: 'hit', note: '' }],
      statusHistory: [{ date: '2026-11-02', from: 'watching', to: 'adopted', reason: '理由テキスト' }],
    });
    const { container } = render(
      <ReportView state={makeState({ hypotheses: [h], themes: [{ id: 't1', name: '半導体', examples: [], description: '', positiveDrivers: [], negativeDrivers: [] }] })} />,
    );
    expect(screen.getAllByText('仮説X').length).toBeGreaterThan(0);
    expect(screen.getByText('半導体')).toBeInTheDocument();
    expect(screen.getByText('理由: 理由テキスト')).toBeInTheDocument();
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.table-scroll')).toHaveLength(2);
  });

  describe('PC 分岐', () => {
    afterEach(() => vi.unstubAllGlobals());
    it('タブ切替とページ送りができる', () => {
      vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener() {}, removeEventListener() {} })));
      const hs = Array.from({ length: 12 }, (_, i) => makeHyp({
        id: `h${i}`, title: `仮説${i}`,
        statusHistory: [{ date: '2026-11-02', from: 'watching', to: 'adopted', reason: `理由${i}` }],
      }));
      const { container } = render(<ReportView state={makeState({ hypotheses: hs })} />);
      expect(container.querySelector('.view-root')).not.toBeNull();
      expect(container.querySelectorAll('.table-scroll')).toHaveLength(0);
      expect(screen.getByRole('tab', { name: '仮説別' })).toHaveAttribute('aria-selected', 'true');
      fireEvent.click(screen.getByRole('tab', { name: '採否履歴' }));
      expect(screen.getByText('理由: 理由0')).toBeInTheDocument();
      // jsdom は高さ 0 なので 1 ページ 8 件（fallback）。2 ページ目へ送る
      expect(screen.queryByText('理由: 理由8')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: '次のページ' }));
      expect(screen.getByText('理由: 理由8')).toBeInTheDocument();
    });
  });
});
