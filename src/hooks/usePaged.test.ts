import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePaged } from './usePaged';

describe('usePaged', () => {
  it('ページ単位で切り出し、範囲外へは進まない', () => {
    const { result } = renderHook(() => usePaged([1, 2, 3, 4, 5], 2));
    expect(result.current.pageCount).toBe(3);
    expect(result.current.pageItems).toEqual([1, 2]);
    act(() => { result.current.setPage(9); });
    expect(result.current.page).toBe(2);
    expect(result.current.pageItems).toEqual([5]);
  });

  it('件数が減って範囲外になったら最終ページに丸める', () => {
    const { result, rerender } = renderHook(({ items }) => usePaged(items, 2), { initialProps: { items: [1, 2, 3, 4, 5] } });
    act(() => { result.current.setPage(2); });
    rerender({ items: [1, 2] });
    expect(result.current.page).toBe(0);
    expect(result.current.pageItems).toEqual([1, 2]);
  });

  it('0 件でも 1 ページとして扱う', () => {
    const { result } = renderHook(() => usePaged([], 4));
    expect(result.current.pageCount).toBe(1);
    expect(result.current.pageItems).toEqual([]);
  });
});
