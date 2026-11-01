import type { StatusChange } from '../domain/types';
import { STATUS_LABELS } from '../ui/labels';

type Props = { history?: StatusChange[] };

export function StatusHistory({ history }: Props) {
  if (!history || history.length === 0) return null;
  const items = [...history].reverse();
  return (
    <div className="status-history">
      <p className="eyebrow">ステータス履歴</p>
      <ol>
        {items.map((c, i) => (
          <li key={`${c.date}-${i}`}>
            <span>{c.date.slice(0, 10)}</span>{' '}
            <span>{STATUS_LABELS[c.from]} → {STATUS_LABELS[c.to]}</span>{' '}
            <span>{c.reason || '理由なし'}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
