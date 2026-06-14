import { useState, useMemo } from 'react';
import type { Hypothesis, Direction, MarketEvent } from '../domain/types';
import { detectTemplates, applyTemplate, type AssociationTemplate } from '../engine/associationEngine';

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: 'up', label: '↑ 上昇' },
  { value: 'down', label: '↓ 下落' },
  { value: 'mixed', label: '↔ 混在' },
  { value: 'watch', label: '? 様子見' },
];

type StepDraft = { label: string; reason: string };

const emptySteps = (): StepDraft[] =>
  Array.from({ length: 5 }, () => ({ label: '', reason: '' }));

const emptyForm = () => ({
  title: '',
  eventId: '',
  expectedDirection: 'up' as Direction,
  targetThemes: '',
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

  const handleApplyTemplate = (template: AssociationTemplate) => {
    const { steps: tSteps, themes, invalidationConditions } = applyTemplate(template);
    setSteps(tSteps.map(s => ({ label: s.label, reason: s.reason })));
    setForm(prev => ({
      ...prev,
      targetThemes: themes.join(', '),
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

    const filledSteps = steps
      .map((s, i) => ({ depth: (i + 1) as 1 | 2 | 3 | 4 | 5, label: s.label.trim(), reason: s.reason.trim() }))
      .filter(s => s.label !== '');

    const themes = form.targetThemes
      .split(/[,、]/)
      .map(t => t.trim())
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
      targetThemes: themes,
      associationSteps: filledSteps,
      invalidationConditions: conditions,
      status: 'needs_test',
    });

    setForm(emptyForm);
    setSteps(emptySteps);
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
        <legend>連想ステップ（1〜5段階）</legend>
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
          </div>
        ))}
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
