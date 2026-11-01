import { useState } from 'react';
import type { AppState, HypothesisStatus, VerificationLog } from '../domain/types';
import { statusWithIcon, URGENCY_LABELS } from '../ui/labels';
import { SplitPane } from '../components/desktop/SplitPane';
import { PagedRows } from '../components/PagedRows';
import { HypothesisDetailPane } from '../components/HypothesisDetailPane';

type Props = {
  state: AppState;
  onStatusChange: (id: string, status: HypothesisStatus, reason: string) => void;
  onDelete: (id: string) => void;
  canExecuteAi: boolean;
  onAiIncrement: () => boolean;
  onAiApply: (id: string, steps: { label: string; reason: string }[], conditions: string[]) => void;
  onAddLog: (id: string, log: Omit<VerificationLog, 'id'>) => void;
};

// PC: 左に仮説一覧（ページ送り）、右に選んだ 1 件の詳細。画面も枠もスクロールさせない
export function HypothesisDetailDesktop({ state, onStatusChange, onDelete, canExecuteAi, onAiIncrement, onAiApply, onAddLog }: Props) {
  const [selectedId, setSelectedId] = useState('');
  // 選択中の仮説が削除・インポートで消えても先頭へ落とし、一覧の選択と詳細を一致させる（BUG-12）
  const hypothesis = state.hypotheses.find(h => h.id === selectedId) ?? state.hypotheses[0];
  const currentId = hypothesis?.id ?? '';

  const list = (
    <>
      <p className="eyebrow">仮説（{state.hypotheses.length} 件）</p>
      <PagedRows
        items={state.hypotheses}
        label="仮説一覧"
        empty="仮説がありません。連想ツリーの「仮説を追加」から登録してください。"
        keyOf={h => h.id}
        renderRow={h => (
          <button type="button" className={`row-item${h.id === currentId ? ' selected' : ''}`} aria-pressed={h.id === currentId} title={h.title} onClick={() => setSelectedId(h.id)}>
            <span>{h.title}</span>
            <span className="row-sub">{statusWithIcon(h.status)}{h.urgency ? `\u3000${URGENCY_LABELS[h.urgency]}` : ''}</span>
          </button>
        )}
      />
    </>
  );

  const detail = hypothesis ? (
    <HypothesisDetailPane
      key={hypothesis.id}
      hypothesis={hypothesis}
      events={state.events}
      onStatusChange={onStatusChange}
      onDelete={id => { onDelete(id); setSelectedId(''); }}
      canExecuteAi={canExecuteAi}
      onAiIncrement={onAiIncrement}
      onAiApply={onAiApply}
      onAddLog={onAddLog}
    />
  ) : <p className="pane-empty">左の一覧から仮説を選ぶと、ここに詳細が表示されます。</p>;

  return (
    <div className="view-root hyp-desk">
      <header className="view-header">
        <p className="eyebrow">Hypothesis Detail</p>
        <h2>仮説詳細・ステータス管理</h2>
      </header>
      <SplitPane list={list} detail={detail} listLabel="仮説一覧" detailLabel="仮説の詳細" />
    </div>
  );
}
