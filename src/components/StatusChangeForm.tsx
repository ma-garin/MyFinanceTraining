import { useState } from 'react';
import type { HypothesisStatus } from '../domain/types';
import { STATUS_LABELS } from '../ui/labels';

type Props = {
  from: HypothesisStatus;
  to: HypothesisStatus;
  onSubmit: (reason: string) => void;
  onCancel: () => void;
};

// 採用・棄却は後から判断根拠を辿れるよう理由を必須にする
const REASON_REQUIRED: HypothesisStatus[] = ['adopted', 'rejected'];

export function StatusChangeForm({ from, to, onSubmit, onCancel }: Props) {
  const [reason, setReason] = useState('');
  const required = REASON_REQUIRED.includes(to);
  const blocked = required && reason.trim() === '';

  return (
    <div className="status-change-form">
      <h5>{STATUS_LABELS[from]} → {STATUS_LABELS[to]} に変更</h5>
      <label>
        判断理由
        <textarea
          rows={3}
          placeholder="なぜこの判断にしたか（検証結果・失敗条件の該当など）"
          value={reason}
          onChange={e => setReason(e.target.value)}
          style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box' }}
        />
      </label>
      {blocked && <p className="eyebrow">採用・棄却には理由が必要です</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={blocked}
          onClick={() => onSubmit(reason.trim())}
        >変更する</button>
        <button type="button" className="btn" onClick={onCancel}>キャンセル</button>
      </div>
    </div>
  );
}
