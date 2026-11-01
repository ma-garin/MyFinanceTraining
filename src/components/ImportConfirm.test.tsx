import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ImportConfirm } from './ImportConfirm';
import type { AppState } from '../domain/types';

const st = (hypotheses: unknown[]) => ({ events: [], hypotheses, themes: [] }) as unknown as AppState;

describe('ImportConfirm', () => {
  it('差分件数とタイトルを表示する', () => {
    render(
      <ImportConfirm
        current={st([{ id: 'a', title: '旧A' }, { id: 'b', title: '旧B' }])}
        incoming={st([{ id: 'b', title: '旧B', x: 1 }, { id: 'c', title: '新C' }])}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByTestId('diff-hypotheses').textContent).toBe('仮説: 追加1 / 削除1 / 変更1');
    expect(screen.getByText('新C')).toBeTruthy();
    expect(screen.getByText('旧A')).toBeTruthy();
    expect(screen.getByText(/取り込みを元に戻す/)).toBeTruthy();
  });
});
