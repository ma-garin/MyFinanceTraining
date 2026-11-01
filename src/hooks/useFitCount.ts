import { useEffect, useRef, useState } from 'react';

// 枠の高さに収まる行数を数え、ページ送りの 1 ページ件数にする（PC で枠内スクロールを出さないため）
export function useFitCount<T extends HTMLElement>(rowHeight: number, fallback = 8) {
  const ref = useRef<T>(null);
  const [count, setCount] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const h = el.clientHeight;
      if (h > 0) setCount(Math.max(1, Math.floor(h / rowHeight)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rowHeight]);
  return [ref, count] as const;
}
