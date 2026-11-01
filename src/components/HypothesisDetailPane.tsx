import { useState } from 'react';
import type { Hypothesis, HypothesisStatus, MarketEvent, VerificationLog, VerificationLogResult } from '../domain/types';
import { STATUS_LABELS, STATUS_ICONS, DIRECTION_LABELS, URGENCY_LABELS, VLOG_LABELS, categoryLabel } from '../ui/labels';
import { todayStr } from '../utils/dateUtils';
import { Tabs } from './desktop/Tabs';
import { StatusChangeForm } from './StatusChangeForm';
import { PagedRows, TextRow } from './PagedRows';
import { AiDeepDiveDesktop } from './AiDeepDiveDesktop';

export type DetailPaneProps = {
  hypothesis: Hypothesis;
  events: MarketEvent[];
  onStatusChange: (id: string, status: HypothesisStatus, reason: string) => void;
  onDelete?: (id: string) => void;
  canExecuteAi: boolean;
  onAiIncrement: () => boolean;
  onAiApply: (id: string, steps: { label: string; reason: string }[], conditions: string[]) => void;
  onAddLog?: (id: string, log: Omit<VerificationLog, 'id'>) => void;
};

function DeleteControl({ onConfirm }: { onConfirm: () => void }) {
  const [confirm, setConfirm] = useState(false);
  if (!confirm) return <button type="button" className="btn btn-ghost hdp-mini" onClick={() => setConfirm(true)}>削除</button>;
  return (
    <span className="hdp-inline">
      <button type="button" className="btn btn-ghost hdp-mini" onClick={() => setConfirm(false)}>キャンセル</button>
      <button type="button" className="btn hdp-mini hdp-danger" onClick={onConfirm}>削除確定</button>
    </span>
  );
}

function Overview({ hypothesis: h, events, onStatusChange, onDelete }: DetailPaneProps) {
  const event = events.find(e => e.id === h.eventId);
  const [pendingStatus, setPendingStatus] = useState<HypothesisStatus | null>(null);
  return (
    <div className="hdp-overview">
      <div className="hdp-inline">
        <span className="hypothesis-id">{h.id}</span>
        {h.urgency && <span className={`urgency-badge urgency-${h.urgency}`}>{URGENCY_LABELS[h.urgency]}</span>}
        <span className={`status-pill status-${h.status}`}>{STATUS_ICONS[h.status]} {STATUS_LABELS[h.status]}</span>
        {onDelete && <DeleteControl onConfirm={() => onDelete(h.id)} />}
      </div>
      {event && !pendingStatus && (
        <p className="event-ref hdp-ellipsis" title={event.title}>
          <span className={`badge badge-${event.category}`}>{categoryLabel(event.category)}</span>
          {event.title}
        </p>
      )}
      {!pendingStatus && (
        <div className="hdp-meta">
          <div><p className="eyebrow">方向性</p><p>{DIRECTION_LABELS[h.expectedDirection] ?? h.expectedDirection}</p></div>
          <div><p className="eyebrow">対象テーマ</p><p className="hdp-ellipsis" title={h.targetThemes.join(' / ')}>{h.targetThemes.join(' / ') || '—'}</p></div>
        </div>
      )}
      <div className="status-actions">
        <p className="eyebrow">ステータス変更</p>
        <div className="status-btn-group">
          {(Object.keys(STATUS_LABELS) as HypothesisStatus[]).map(s => (
            <button key={s} type="button" className={`status-btn${h.status === s ? ' active' : ''}`} onClick={() => { if (s !== h.status) setPendingStatus(s); }}>
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        {pendingStatus && (
          <StatusChangeForm
            from={h.status}
            to={pendingStatus}
            onSubmit={reason => { onStatusChange(h.id, pendingStatus, reason); setPendingStatus(null); }}
            onCancel={() => setPendingStatus(null)}
          />
        )}
      </div>
    </div>
  );
}

function LogTab({ hypothesis: h, onAdd }: { hypothesis: Hypothesis; onAdd: (log: Omit<VerificationLog, 'id'>) => void }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<VerificationLogResult>('pending');
  const [note, setNote] = useState('');
  const save = () => { onAdd({ loggedAt: todayStr(), result, note }); setNote(''); setResult('pending'); setOpen(false); };
  return (
    <>
      <div className="hdp-tab-head">
        <p className="eyebrow">検証ログ（{h.verificationLogs?.length ?? 0} 件）</p>
        <button type="button" className="btn btn-ghost hdp-mini" onClick={() => setOpen(v => !v)}>{open ? '閉じる' : '＋ 追加'}</button>
      </div>
      {open && (
        <div className="vlog-add-form">
          <div className="vlog-result-group">
            {(['hit', 'miss', 'pending'] as VerificationLogResult[]).map(r => (
              <button key={r} type="button" className={`vlog-result-btn ${r}${result === r ? ' active' : ''}`} onClick={() => setResult(r)}>{VLOG_LABELS[r]}</button>
            ))}
          </div>
          <textarea rows={2} placeholder="メモ（任意）" value={note} onChange={e => setNote(e.target.value)} />
          <button type="button" className="btn btn-primary hdp-mini" onClick={save}>ログを保存</button>
        </div>
      )}
      <PagedRows
        items={h.verificationLogs ?? []}
        label="検証ログ"
        empty="検証ログはまだありません。"
        keyOf={l => l.id}
        renderRow={l => <TextRow main={`${l.loggedAt}\u3000${VLOG_LABELS[l.result]}`} sub={l.note || undefined} />}
      />
    </>
  );
}

// 仮説 1 件の詳細を PC 用にタブで分け、各タブの一覧はページ送りにする（連想ツリー・仮説詳細の両ビューで使う）
export function HypothesisDetailPane(props: DetailPaneProps) {
  const { hypothesis: h, events, onAddLog, onAiApply } = props;
  const event = events.find(e => e.id === h.eventId);
  const history = [...(h.statusHistory ?? [])].reverse();
  const tabs = [
    { id: 'overview', label: '概要', content: <Overview {...props} /> },
    { id: 'steps', label: '連想', content: <PagedRows items={h.associationSteps} label="連想ステップ" empty="連想ステップはありません。" keyOf={(s, i) => `${s.depth}-${i}`} renderRow={s => <TextRow main={`${s.depth}. ${s.label}`} sub={s.reason || undefined} />} /> },
    { id: 'conditions', label: '失敗条件', content: <PagedRows items={h.invalidationConditions} label="失敗条件" empty="失敗条件はありません。" keyOf={(c, i) => `${i}-${c}`} renderRow={c => <TextRow main={`✕ ${c}`} />} /> },
    { id: 'stocks', label: '候補銘柄', content: <PagedRows items={h.candidateStocks ?? []} label="候補銘柄" empty="候補銘柄はありません。" keyOf={(s, i) => `${i}-${s}`} renderRow={s => <TextRow main={s} />} /> },
    ...(onAddLog ? [{ id: 'logs', label: '検証ログ', content: <LogTab hypothesis={h} onAdd={log => onAddLog(h.id, log)} /> }] : []),
    { id: 'history', label: '採否履歴', content: <PagedRows items={history} label="ステータス履歴" empty="ステータス履歴はありません。" keyOf={(c, i) => `${c.date}-${i}`} renderRow={c => <TextRow main={`${c.date.slice(0, 10)}\u3000${STATUS_LABELS[c.from]} → ${STATUS_LABELS[c.to]}`} sub={c.reason || '理由なし'} />} /> },
    { id: 'ai', label: 'AI 深掘り', content: <AiDeepDiveDesktop hypothesis={h} event={event} canExecute={props.canExecuteAi} onIncrement={props.onAiIncrement} onApply={(steps, conditions) => onAiApply(h.id, steps, conditions)} /> },
  ];
  return (
    <div className="hyp-detail-pane">
      <h3 className="hdp-title" title={h.title}>{h.title}</h3>
      <Tabs label="仮説詳細の項目" tabs={tabs} />
    </div>
  );
}
