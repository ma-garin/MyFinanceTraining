import { useState } from 'react';
import type { Recovery } from '../../hooks/useStore';
import { downloadCorruptRaw } from '../../infrastructure/storage';

type Props = { recovery: Recovery; onReset: () => boolean };

// 破損データを検出したら自動保存を止めたまま、利用者に退避か初期化かを選ばせる（BUG-06）
export function RecoveryScreen({ recovery, onReset }: Props) {
  const [error, setError] = useState('');
  const hasRaw = recovery.raw.length > 0;

  const handleDownload = () => {
    if (!downloadCorruptRaw(recovery.raw)) setError('ダウンロードできませんでした。別のブラウザで開き直すか、保存領域の空きを確認してください。');
  };
  const handleReset = () => {
    if (!onReset()) setError('破損データを退避できなかったため、初期化を中止しました。先に「破損データをダウンロード」で保存してください。');
  };

  return (
    <main className="app-shell recovery-shell">
      <section className="content">
        <div className="card recovery-card" role="alert">
          <p className="eyebrow">データの復旧が必要です</p>
          <h2>保存データを読み込めませんでした</h2>
          <p>原因: {recovery.reason}</p>
          <p>データを守るため、自動保存を停止しています。この画面で操作するまで、保存データは書き換えません。</p>
          <div className="recovery-actions">
            {hasRaw && (
              <button className="btn btn-primary" onClick={handleDownload}>破損データをダウンロード</button>
            )}
            <button className="btn" onClick={handleReset}>
              {hasRaw ? '破損データを別の場所に退避して初期化' : '初期データで始める'}
            </button>
          </div>
          {error && <p className="ai-limit-msg">{error}</p>}
        </div>
      </section>
    </main>
  );
}
