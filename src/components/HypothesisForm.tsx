import { useState, useMemo } from 'react';
import type { Hypothesis, Direction, HypothesisUrgency, MarketEvent, AssociationStep } from '../domain/types';
import { detectTemplates, applyTemplate, type AssociationTemplate } from '../engine/associationEngine';
import { chainProbability } from '../engine/calibrationEngine';

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: 'up', label: '↑ 上昇' },
  { value: 'down', label: '↓ 下落' },
  { value: 'mixed', label: '↔ 混在' },
  { value: 'watch', label: '? 様子見' },
];

const URGENCIES: { value: HypothesisUrgency; label: string }[] = [
  { value: 'high', label: '🔴 今週中' },
  { value: 'medium', label: '🟡 今月中' },
  { value: 'low', label: '🔵 長期観察' },
];

type StepDraft = { label: string; reason: string; probability: string };

const emptySteps = (): StepDraft[] =>
  Array.from({ length: 5 }, () => ({ label: '', reason: '', probability: '' }));

const emptyForm = () => ({
  title: '',
  eventId: '',
  expectedDirection: 'up' as Direction,
  urgency: 'medium' as HypothesisUrgency,
  confidence: '60',
  targetThemes: '',
  candidateStocks: '',
  invalidationConditions: '',
});

type Props = {
  events: MarketEvent[];
  onAdd: (hypothesis: Hypothesis) => void;
};

export function HypothesisForm({ events, onAdd }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [steps, setSteps] = useState<StepDraft[]>(emptySteps);
  const [error, setError] = useState('');
  const [appliedTemplateId, setAppliedTemplateId] = useState('');

  const templates = useMemo<AssociationTemplate[]>(() => {
    const event = events.find(e => e.id === form.eventId);
    return event ? detectTemplates(event) : [];
  }, [form.eventId, events]);

  const updateStep = (idx: number, field: keyof StepDraft, value: string) => {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  // 入力中の連想チェーンの積確率をライブ計算（確信度との乖離チェック用）
  const liveChain = useMemo(() => chainProbability(
    steps
      .filter(s => s.label.trim() !== '')
      .map((s, i) => ({
        depth: (i + 1) as 1 | 2 | 3 | 4 | 5,
        label: s.label,
        reason: s.reason,
        probability: s.probability.trim() === '' ? undefined : Number(s.probability),
      })),
  ), [steps]);

  const handleApplyTemplate = (template: AssociationTemplate) => {
    const { steps: tSteps, themes, candidateStocks, invalidationConditions } = applyTemplate(template);
    setSteps(tSteps.map(s => ({ label: s.label, reason: s.reason, probability: '' })));
    setForm(prev => ({
      ...prev,
      targetThemes: themes.join(', '),
      candidateStocks: candidateStocks.join('\n'),
      invalidationConditions: invalidationConditions.join('\n'),
    }));
    setAppliedTemplateId(template.id);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('仮説タイトルを入力してください');
      return;
    }
    if (!steps[0].label.trim()) {
      setError('連想ステップ1を入力してください');
      return;
    }

    const filledSteps: AssociationStep[] = steps
      .map((s, i) => {
        const prob = s.probability.trim() === '' ? undefined : Number(s.probability);
        const step: AssociationStep = {
          depth: (i + 1) as 1 | 2 | 3 | 4 | 5,
          label: s.label.trim(),
          reason: s.reason.trim(),
        };
        if (prob !== undefined && !Number.isNaN(prob)) step.probability = Math.max(0, Math.min(100, prob));
        return step;
      })
      .filter(s => s.label !== '');

    const confidenceNum = form.confidence.trim() === '' ? undefined : Math.max(0, Math.min(100, Number(form.confidence)));

    const themes = form.targetThemes
      .split(/[,、]/)
      .map(t => t.trim())
      .filter(Boolean);

    const stocks = form.candidateStocks
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

    const conditions = form.invalidationConditions
      .split('\n')
      .map(c => c.trim())
      .filter(Boolean);

    onAdd({
      id: `HYP-${Date.now()}`,
      title: form.title.trim(),
      eventId: form.eventId,
      expectedDirection: form.expectedDirection,
      urgency: form.urgency,
      confidence: confidenceNum !== undefined && !Number.isNaN(confidenceNum) ? confidenceNum : undefined,
      targetThemes: themes,
      candidateStocks: stocks,
      associationSteps: filledSteps,
      invalidationConditions: conditions,
      status: 'needs_test',
    });

    setForm(emptyForm());
    setSteps(emptySteps());
    setAppliedTemplateId('');
    setError('');
  };

  return (
    <form className="form-panel" onSubmit={handleSubmit} noValidate>
      <h3>仮説を追加</h3>
      {error && <p className="form-error">{error}</p>}

      <div className="form-group">
        <label htmlFor="hyp-title">仮説タイトル *</label>
        <input
          id="hyp-title"
          type="text"
          placeholder="例: 原油高から防衛株へ資金ローテーション"
          value={form.title}
          onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="hyp-event">起点イベント</label>
          <select
            id="hyp-event"
            value={form.eventId}
            onChange={e => {
              setForm(prev => ({ ...prev, eventId: e.target.value }));
              setAppliedTemplateId('');
            }}
          >
            <option value="">-- 選択 --</option>
            {events.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="hyp-direction">方向性</label>
          <select
            id="hyp-direction"
            value={form.expectedDirection}
            onChange={e => setForm(prev => ({ ...prev, expectedDirection: e.target.value as Direction }))}
          >
            {DIRECTIONS.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="hyp-urgency">緊急度</label>
          <select
            id="hyp-urgency"
            value={form.urgency}
            onChange={e => setForm(prev => ({ ...prev, urgency: e.target.value as HypothesisUrgency }))}
          >
            {URGENCIES.map(u => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group confidence-group">
        <label htmlFor="hyp-confidence">
          確信度（この仮説が当たると考える主観確率）— <strong>{form.confidence || 0}%</strong>
        </label>
        <input
          id="hyp-confidence"
          type="range"
          min={0}
          max={100}
          step={5}
          value={form.confidence || '0'}
          onChange={e => setForm(prev => ({ ...prev, confidence: e.target.value }))}
        />
        <p className="field-hint">
          結果確定後にBrierスコアで「予測の当たり方」を測定します。50%＝コイン投げ。正直な数値を。
        </p>
      </div>

      {templates.length > 0 && (
        <div className="template-suggestions">
          <p className="eyebrow">ルールベース提案 — クリックで自動入力</p>
          <div className="template-chips">
            {templates.map(t => (
              <button
                key={t.id}
                type="button"
                className={`template-chip-btn${appliedTemplateId === t.id ? ' applied' : ''}`}
                onClick={() => handleApplyTemplate(t)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <fieldset className="step-fieldset">
        <legend>連想ステップ（1〜5段階）／各リンクの条件付き確率（％・任意）</legend>
        {steps.map((step, idx) => (
          <div key={idx} className="step-row">
            <span className="step-num">{idx + 1}</span>
            <input
              type="text"
              placeholder={idx === 0 ? 'ニュース・起点イベント *' : `第${idx + 1}段階の連想`}
              value={step.label}
              onChange={e => updateStep(idx, 'label', e.target.value)}
            />
            <input
              type="text"
              placeholder="理由（任意）"
              value={step.reason}
              onChange={e => updateStep(idx, 'reason', e.target.value)}
            />
            <input
              className="step-prob-input"
              type="number"
              min={0}
              max={100}
              placeholder="％"
              value={step.probability}
              onChange={e => updateStep(idx, 'probability', e.target.value)}
            />
          </div>
        ))}
        {liveChain.product !== null && (
          <div className="chain-preview">
            <span>論理積確率（各リンクの積）: <strong>{(liveChain.product * 100).toFixed(1)}%</strong></span>
            <span className="chain-meta">
              {liveChain.quantifiedLinks}/{liveChain.totalLinks} リンクに確率を設定
              {Number(form.confidence) > 0 && Math.abs(Number(form.confidence) / 100 - liveChain.product) >= 0.2 && (
                <span className="chain-warn">　⚠ 確信度と{(Math.abs(Number(form.confidence) - liveChain.product * 100)).toFixed(0)}pt乖離</span>
              )}
            </span>
          </div>
        )}
      </fieldset>

      <div className="form-group">
        <label htmlFor="hyp-themes">対象テーマ（カンマ区切り）</label>
        <input
          id="hyp-themes"
          type="text"
          placeholder="例: ゲーム, 防衛, 小売"
          value={form.targetThemes}
          onChange={e => setForm(prev => ({ ...prev, targetThemes: e.target.value }))}
        />
      </div>

      <div className="form-group">
        <label htmlFor="hyp-stocks">候補銘柄（1行1件、コード＋銘柄名）</label>
        <textarea
          id="hyp-stocks"
          rows={4}
          placeholder={'8035 東京エレクトロン\n6857 アドバンテスト\n7974 任天堂（相対優位）'}
          value={form.candidateStocks}
          onChange={e => setForm(prev => ({ ...prev, candidateStocks: e.target.value }))}
        />
      </div>

      <div className="form-group">
        <label htmlFor="hyp-invalidation">失敗条件（1行1件）</label>
        <textarea
          id="hyp-invalidation"
          rows={3}
          placeholder={'全面リスクオフ\n個別銘柄悪材料\n政策転換'}
          value={form.invalidationConditions}
          onChange={e => setForm(prev => ({ ...prev, invalidationConditions: e.target.value }))}
        />
      </div>

      <button type="submit" className="btn btn-primary">仮説を登録</button>
    </form>
  );
}
