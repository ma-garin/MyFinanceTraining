import type { AppState } from '../domain/types';

type Props = {
  current: AppState;
  incoming: AppState;
  onConfirm: () => void;
  onCancel: () => void;
};

// インポートは現在のデータを丸ごと置き換える破壊的操作なので、件数を見せて明示的に確認させる（BUG-09）
export function ImportConfirm({ current, incoming, onConfirm, onCancel }: Props) {
  return (
    <div className="card import-confirm" role="dialog" aria-modal="false" aria-labelledby="import-confirm-title">
      <h3 id="import-confirm-title">インポートで現在のデータを置き換えます</h3>
      <p>現在のデータは元に戻せません。必要なら先にエクスポートしてください。</p>
      <table className="import-compare">
        <thead><tr><th></th><th>現在</th><th>インポート後</th></tr></thead>
        <tbody>
          <tr><th>イベント</th><td>{current.events.length}</td><td>{incoming.events.length}</td></tr>
          <tr><th>仮説</th><td>{current.hypotheses.length}</td><td>{incoming.hypotheses.length}</td></tr>
        </tbody>
      </table>
      <div className="recovery-actions">
        <button className="btn btn-danger" onClick={onConfirm}>置き換える</button>
        <button className="btn" onClick={onCancel}>キャンセル</button>
      </div>
    </div>
  );
}
