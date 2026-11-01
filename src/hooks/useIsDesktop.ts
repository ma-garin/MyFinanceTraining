import { useEffect, useState } from 'react';

// styles/desktop.css の @media (min-width: 961px) と同じ境界。スマホ表示は従来どおり縦スクロール
export const DESKTOP_QUERY = '(min-width: 961px)';

const matches = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(DESKTOP_QUERY).matches;

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(matches);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}
