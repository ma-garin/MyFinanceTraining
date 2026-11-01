import type { useAiSettings } from '../hooks/useAiSettings';
import { useState } from 'react';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { Tabs } from '../components/desktop/Tabs';

type SettingsProps = {
  settings: ReturnType<typeof useAiSettings>['settings'];
  usage: ReturnType<typeof useAiSettings>['usage'];
  onUpdate: (s: ReturnType<typeof useAiSettings>['settings']) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  canUndoImport: boolean;
  onUndoImport: () => void;
};

export function SettingsView({ settings, usage, onUpdate, onExport, onImport, canUndoImport, onUndoImport }: SettingsProps) {
  const [daily, setDaily] = useState(String(settings.dailyLimit));
  const [monthly, setMonthly] = useState(String(settings.monthlyLimit));
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onUpdate({ dailyLimit: Number(daily) || 5, monthlyLimit: Number(monthly) || 50 });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const isDesktop = useIsDesktop();

  const aiCard = (
    <article className="card">
      <div className="card-header">
        <p className="eyebrow">AI 深掘り設定</p>
        <h3>利用上限管理</h3>
      </div>
      <p style={{ color: 'var(--text-2)', marginBottom: 16 }}>
        AI深掘りは手動実行のみです。Claude.ai 等の外部サービスへのプロンプトコピーで利用します。
        実行回数を記録し、上限を超えた場合は実行できません。
      </p>
      <div className="form-row">
        <div className="form-group">
          <label>1日の上限（回）</label>
          <input type="number" min={1} max={100} value={daily} onChange={e => setDaily(e.target.value)} />
        </div>
        <div className="form-group">
          <label>月間上限（回）</label>
          <input type="number" min={1} max={1000} value={monthly} onChange={e => setMonthly(e.target.value)} />
        </div>
      </div>
      <div className="usage-display">
        <div className="usage-item">
          <p className="eyebrow">本日の使用</p>
          <p><strong>{usage.dailyCount}</strong> / {settings.dailyLimit} 回</p>
        </div>
        <div className="usage-item">
          <p className="eyebrow">今月の使用</p>
          <p><strong>{usage.monthlyCount}</strong> / {settings.monthlyLimit} 回</p>
        </div>
      </div>
      <button className="btn btn-primary" onClick={handleSave}>
        {saved ? '✓ 保存しました' : '保存'}
      </button>
    </article>
  );

  const dataCard = (
    <article className="card">
      <div className="card-header">
        <p className="eyebrow">データ管理</p>
        <h3>バックアップ・復元</h3>
      </div>
      <p style={{ color: 'var(--text-2)', marginBottom: 16 }}>
        データは localStorage に保存されています。JSONファイルでバックアップ・移行できます。
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn btn-primary" onClick={onExport}>⬇ JSONエクスポート</button>
        <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
          ⬆ JSONインポート
          <input
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.[0]) onImport(e.target.files[0]); e.target.value = ''; }}
          />
        </label>
        {canUndoImport && <button className="btn" onClick={onUndoImport}>取り込みを元に戻す</button>}
      </div>
    </article>
  );

  const noticeCard = (
    <article className="card">
      <p style={{ color: 'var(--text-2)', margin: 0 }}>
        このツールは投資助言・自動売買ツールではありません。
        個人の仮説管理・検証・判断補助のためのOSです。
      </p>
    </article>
  );

  return (
    <div className="view-root settings-root">
      <header className="view-header">
        <p className="eyebrow">Settings</p>
        <h2>設定</h2>
      </header>
      {isDesktop ? (
        <div className="view-body settings-body">
          <Tabs label="設定" tabs={[
            { id: 'ai', label: 'AI 深掘り設定', content: aiCard },
            { id: 'data', label: 'データ管理', content: dataCard },
          ]} />
          {noticeCard}
        </div>
      ) : (
        <>
          {aiCard}
          {dataCard}
          {noticeCard}
        </>
      )}
    </div>
  );
}
