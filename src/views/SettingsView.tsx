import type { useAiSettings } from '../hooks/useAiSettings';
import { useState } from 'react';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { Tabs } from '../components/desktop/Tabs';
import { useClaudeConfig } from '../hooks/useAiSettings';
import { AI_MODELS, type AiModelId } from '../infrastructure/aiStorage';
import { testClaudeConnection } from '../infrastructure/claudeClient';
import '../styles/ai-connect.css';

type Notice = { kind: 'error' | 'info'; text: string };

function useApiKeyForm() {
  const cfg = useClaudeConfig();
  const [draft, setDraft] = useState(cfg.apiKey);
  const [visible, setVisible] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const save = () => {
    if (!draft.trim()) { setNotice({ kind: 'error', text: 'API キーを入力してから保存してください。' }); return; }
    setNotice(cfg.saveKey(draft)
      ? { kind: 'info', text: 'API キーをこの端末に保存しました。' }
      : { kind: 'error', text: '保存できませんでした。ブラウザの保存容量を確認してください。' });
  };
  const remove = () => {
    cfg.clearKey();
    setDraft('');
    setNotice({ kind: 'info', text: 'API キーを削除しました。AI 深掘りは手動コピー方式に戻ります。' });
  };
  const test = async () => {
    const key = draft.trim() || cfg.apiKey;
    if (!key) { setNotice({ kind: 'error', text: 'API キーを入力してから確かめてください。' }); return; }
    setTesting(true);
    setNotice({ kind: 'info', text: '接続を確かめています…' });
    const r = await testClaudeConnection(key, cfg.model);
    setTesting(false);
    setNotice(r.ok ? { kind: 'info', text: '接続できました。AI 深掘りで「AI に聞く」が使えます。' } : { kind: 'error', text: r.message });
  };
  return { cfg, draft, setDraft, visible, setVisible, testing, notice, save, remove, test };
}

function ApiKeyCard() {
  const f = useApiKeyForm();
  return (
    <article className="card api-card">
      <div className="card-header">
        <p className="eyebrow">AI 接続</p>
        <h3>Claude API キー</h3>
      </div>
      <ul className="api-notes">
        <li>API の利用は<strong>従量課金</strong>です。呼び出すたびに Anthropic から費用が請求されます。</li>
        <li>キーは<strong>この端末のブラウザだけ</strong>に保存し、JSON エクスポートには含めません。</li>
      </ul>
      <div className="form-group">
        <label htmlFor="api-key">API キー{f.cfg.hasKey ? '（保存済み）' : ''}</label>
        <div className="api-key-row">
          <input id="api-key" type={f.visible ? 'text' : 'password'} autoComplete="off" spellCheck={false}
            placeholder="sk-ant-…" value={f.draft} onChange={e => f.setDraft(e.target.value)} />
          <button type="button" className="btn btn-ghost" aria-pressed={f.visible} onClick={() => f.setVisible(v => !v)}>
            {f.visible ? '隠す' : '表示'}
          </button>
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="api-model">モデル</label>
        <select id="api-model" value={f.cfg.model} onChange={e => f.cfg.setModel(e.target.value as AiModelId)}>
          {AI_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
      </div>
      <div className="api-actions">
        <button type="button" className="btn btn-primary" onClick={f.save}>保存</button>
        <button type="button" className="btn" disabled={f.testing} aria-busy={f.testing} onClick={f.test}>
          {f.testing ? '確かめています…' : '接続を確かめる'}
        </button>
        <button type="button" className="btn btn-ghost" disabled={!f.cfg.hasKey} onClick={f.remove}>削除</button>
      </div>
      {f.notice && (
        <p className={f.notice.kind === 'error' ? 'ai-limit-msg' : 'ai-info-msg'} role={f.notice.kind === 'error' ? 'alert' : 'status'}>
          {f.notice.text}
        </p>
      )}
    </article>
  );
}

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
        AI 深掘りの実行回数を記録し、上限を超えた場合は実行できません（API 呼び出し・手動の取り込みの両方に適用）。
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
            { id: 'api', label: 'AI 接続', content: <ApiKeyCard /> },
            { id: 'data', label: 'データ管理', content: dataCard },
            { id: 'notice', label: '免責事項', content: noticeCard },
          ]} />
        </div>
      ) : (
        <>
          {aiCard}
          <ApiKeyCard />
          {dataCard}
          {noticeCard}
        </>
      )}
    </div>
  );
}
