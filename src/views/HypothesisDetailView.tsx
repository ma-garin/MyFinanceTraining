import { useState } from 'react';
import type { AppState, Hypothesis, HypothesisStatus, VerificationLog } from '../domain/types';
import { HypothesisCard } from '../components/HypothesisCard';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { HypothesisDetailDesktop } from './HypothesisDetailDesktop';
import { HypothesisCompare, ViewModeToggle, type HypothesisViewMode } from '../components/HypothesisCompare';

type DetailProps = {
  state: AppState;
  onStatusChange: (id: string, status: HypothesisStatus, reason: string) => void;
  onDelete: (id: string) => void;
  canExecuteAi: boolean;
  onAiIncrement: () => boolean;
  onAiApply: (id: string, steps: { label: string; reason: string }[], conditions: string[]) => void;
  onAddLog: (id: string, log: Omit<VerificationLog, 'id'>) => void;
};

// PC（961px 以上）だけ 2 ペインの骨格に切り替える。スマホの表示は従来の縦並びのまま
export function HypothesisDetailView(props: DetailProps) {
  const isDesktop = useIsDesktop();
  return isDesktop ? <HypothesisDetailDesktop {...props} /> : <HypothesisDetailMobile {...props} />;
}

function HypothesisDetailMobile({ state, onStatusChange, onDelete, canExecuteAi, onAiIncrement, onAiApply, onAddLog }: DetailProps) {
  const [selectedId, setSelectedId] = useState('');
  const [mode, setMode] = useState<HypothesisViewMode>('list');
  const openDetail = (id: string) => { setSelectedId(id); setMode('list'); };
  // 選択中の仮説が削除・インポートで消えても先頭へ落とし、select と表示を必ず一致させる（BUG-12）
  const hypothesis = state.hypotheses.find(h => h.id === selectedId) ?? state.hypotheses[0];
  const currentId = hypothesis?.id ?? '';

  return (
    <>
      <header className="view-header">
        <p className="eyebrow">Hypothesis Detail</p>
        <h2>仮説詳細・ステータス管理</h2>
      </header>
      <div className="hc-mobile-toggle"><ViewModeToggle mode={mode} onChange={setMode} /></div>
      {mode === 'compare'
        ? <HypothesisCompare hypotheses={state.hypotheses} onOpen={openDetail} compact />
        : <MobileDetail state={state} currentId={currentId} onSelect={setSelectedId} hypothesis={hypothesis}
            onStatusChange={onStatusChange} onDelete={onDelete} canExecuteAi={canExecuteAi}
            onAiIncrement={onAiIncrement} onAiApply={onAiApply} onAddLog={onAddLog} />}
    </>
  );
}

type MobileDetailProps = DetailProps & { currentId: string; onSelect: (id: string) => void; hypothesis: Hypothesis | undefined };

function MobileDetail({ state, currentId, onSelect, hypothesis, onStatusChange, onDelete, canExecuteAi, onAiIncrement, onAiApply, onAddLog }: MobileDetailProps) {
  return (
    <>
      <div className="form-group">
        <label htmlFor="hyp-select">仮説を選択</label>
        <select id="hyp-select" value={currentId} onChange={e => onSelect(e.target.value)}>
          {state.hypotheses.length === 0 && <option value="">仮説がありません</option>}
          {state.hypotheses.map(h => (
            <option key={h.id} value={h.id}>{h.title}</option>
          ))}
        </select>
      </div>
      {hypothesis && (
        <HypothesisCard
          key={hypothesis.id}
          hypothesis={hypothesis}
          events={state.events}
          onStatusChange={onStatusChange}
          onDelete={(id) => { onDelete(id); onSelect(''); }}
          canExecuteAi={canExecuteAi}
          onAiIncrement={onAiIncrement}
          onAiApply={onAiApply}
          onAddLog={onAddLog}
        />
      )}
    </>
  );
}

