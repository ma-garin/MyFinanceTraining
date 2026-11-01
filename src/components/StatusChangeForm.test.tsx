import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusChangeForm } from './StatusChangeForm';

const PLACEHOLDER = 'なぜこの判断にしたか（検証結果・失敗条件の該当など）';

describe('StatusChangeForm', () => {
  it('adopted で理由が空なら送信不可、入力すると理由つきで送信できる', () => {
    const onSubmit = vi.fn();
    render(<StatusChangeForm from="watching" to="adopted" onSubmit={onSubmit} onCancel={() => {}} />);
    const btn = screen.getByRole('button', { name: '変更する' });
    expect(btn).toBeDisabled();
    expect(screen.getByText('採用・棄却には理由が必要です')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(PLACEHOLDER), { target: { value: '決算が好調' } });
    expect(btn).toBeEnabled();
    fireEvent.click(btn);
    expect(onSubmit).toHaveBeenCalledWith('決算が好調');
  });

  it('watching へは理由が空でも送信できる', () => {
    const onSubmit = vi.fn();
    render(<StatusChangeForm from="adopted" to="watching" onSubmit={onSubmit} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '変更する' }));
    expect(onSubmit).toHaveBeenCalledWith('');
  });
});
