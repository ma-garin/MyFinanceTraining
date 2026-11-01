import type { AppState } from '../domain/types';
import { diffStates } from '../domain/importDiff';

type Props = {
  current: AppState;
  incoming: AppState;
  onConfirm: () => void;
  onCancel: () => void;
};

function TitleList({ label, titles }: { label: string; titles: string[] }) {
  if (titles.length === 0) return null;
  return (
    <div>
      <strong>{label}</strong>
      <ul>{titles.map((t, i) => <li key={`${i}-${t}`}>{t}</li>)}</ul>
    </div>
  );
}

// インポートは現在のデータを丸ごと置き換える破壊的操作なので、件数と差分を見せて明示的に確認させる（BUG-09）
export function ImportConfirm({ current, incoming, onConfirm, onCancel }: Props) {
  const diff = diffStates(current, incoming);
  const h = diff.hypotheses;
  const e = diff.events;
  return (
    <div className="card import-confirm" role="dialog" aria-modal="false" aria-labelledby="import-confirm-title">
      <h3 id="import-confirm-title">インポートで現在のデータを置き換えます</h3>
      <p>取り込み後、この画面を開いている間は『取り込みを元に戻す』で戻せます。念のため先にエクスポートを推奨します</p>
      <table className="import-compare">
        <thead><tr><th></th><th>現在</th><th>インポート後</th></tr></thead>
        <tbody>
          <tr><th>イベント</th><td>{current.events.length}</td><td>{incoming.events.length}</td></tr>
          <tr><th>仮説</th><td>{current.hypotheses.length}</td><td>{incoming.hypotheses.length}</td></tr>
        </tbody>
      </table>
      <p data-testid="diff-events">イベント: 追加{e.added} / 削除{e.removed} / 変更{e.changed}</p>
      <p data-testid="diff-hypotheses">仮説: 追加{h.added} / 削除{h.removed} / 変更{h.changed}</p>
      <TitleList label="追加される仮説" titles={diff.addedTitles} />
      <TitleList label="削除される仮説" titles={diff.removedTitles} />
      <TitleList label="変更される仮説" titles={diff.changedTitles} />
      <div className="recovery-actions">
        <button className="btn btn-danger" onClick={onConfirm}>置き換える</button>
        <button className="btn" onClick={onCancel}>キャンセル</button>
      </div>
    </div>
  );
}
