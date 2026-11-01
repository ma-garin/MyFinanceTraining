import { useState, useMemo } from 'react';
import type { Hypothesis, Direction, HypothesisUrgency, MarketEvent } from '../domain/types';
import { buildSteps } from '../domain/hypothesisRules';
import { detectTemplates, type AssociationTemplate } from '../engine/associationEngine';
import { buildDraft, mergeDraft, reapplyDraft, emptySteps, type DraftFields, type StepDraft } from '../domain/hypothesisDraft';
import '../styles/hypothesis-draft.css';

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

const emptyForm = () => ({
  title: '',
  eventId: '',
  expectedDirection: 'up' as Direction,
  urgency: 'medium' as HypothesisUrgency,
  targetThemes: '',
  candidateStocks: '',
  invalidationConditions: '',
});

type FormState = ReturnType<typeof emptyForm>;

type Props = {
  events: MarketEvent[];
  onAdd: (hypothesis: Hypothesis) => void;
  initialEventId?: string;
};

type Snapshot = { form: FormState; steps: StepDraft[]; draft: DraftFields | null; templateId: string };

const toFields = (form: FormState, steps: StepDraft[]): DraftFields => ({
  title: form.title, steps, targetThemes: form.targetThemes,
  candidateStocks: form.candidateStocks, invalidationConditions: form.invalidationConditions,
});

const withFields = (form: FormState, fields: DraftFields): FormState => ({
  ...form, title: fields.title, targetThemes: fields.targetThemes,
  candidateStocks: fields.candidateStocks, invalidationConditions: fields.invalidationConditions,
});

// イベントを選んだ時点で最上位テンプレートの下書きを入れる。手で書いた欄は mergeDraft が残す
const selectEventSnapshot = (cur: Snapshot, events: MarketEvent[], eventId: string): Snapshot => {
  const event = events.find(e => e.id === eventId);
  if (!event) return { ...cur, form: { ...cur.form, eventId }, templateId: '' };
  const top = detectTemplates(event)[0];
  const next = buildDraft(event, top);
  const merged = mergeDraft(toFields(cur.form, cur.steps), cur.draft, next);
  return { form: withFields({ ...cur.form, eventId }, merged), steps: merged.steps, draft: next, templateId: top?.id ?? '' };
};

const initialSnapshot = (events: MarketEvent[], eventId?: string): Snapshot => {
  const blank: Snapshot = { form: emptyForm(), steps: emptySteps(), draft: null, templateId: '' };
  return eventId ? selectEventSnapshot(blank, events, eventId) : blank;
};

const splitList = (text: string, sep: RegExp): string[] => text.split(sep).map(t => t.trim()).filter(Boolean);

// PC の段組み表示（HypothesisFormDesktop）と入力状態・検証・登録処理を共有する
export function useHypothesisForm({ events, onAdd, initialEventId }: Props) {
  const [snap, setSnap] = useState<Snapshot>(() => initialSnapshot(events, initialEventId));
  const [error, setError] = useState('');
  const { form, steps, templateId: appliedTemplateId } = snap;

  const templates = useMemo<AssociationTemplate[]>(() => {
    const event = events.find(e => e.id === form.eventId);
    return event ? detectTemplates(event) : [];
  }, [form.eventId, events]);

  const setForm = (update: (prev: FormState) => FormState) => setSnap(prev => ({ ...prev, form: update(prev.form) }));

  const updateStep = (idx: number, field: keyof StepDraft, value: string) => {
    setSnap(prev => ({ ...prev, steps: prev.steps.map((s, i) => i === idx ? { ...s, [field]: value } : s) }));
  };

  const selectEvent = (eventId: string) => {
    setSnap(prev => selectEventSnapshot(prev, events, eventId));
    setError('');
  };

  const handleApplyTemplate = (template: AssociationTemplate) => {
    const event = events.find(e => e.id === form.eventId);
    if (!event) return;
    setSnap(prev => {
      const next = buildDraft(event, template);
      const fields = reapplyDraft(toFields(prev.form, prev.steps), prev.draft, next);
      return { form: withFields(prev.form, fields), steps: fields.steps, draft: next, templateId: template.id };
    });
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
    onAdd({
      id: `HYP-${Date.now()}`,
      title: form.title.trim(),
      eventId: form.eventId,
      expectedDirection: form.expectedDirection,
      urgency: form.urgency,
      targetThemes: splitList(form.targetThemes, /[,、]/),
      candidateStocks: splitList(form.candidateStocks, /\n/),
      associationSteps: buildSteps(steps),
      invalidationConditions: splitList(form.invalidationConditions, /\n/),
      status: 'needs_test',
    });
    setSnap(initialSnapshot(events));
    setError('');
  };

  return { form, setForm, steps, updateStep, error, appliedTemplateId, templates, selectEvent, handleApplyTemplate, handleSubmit };
}

export type FormApi = ReturnType<typeof useHypothesisForm>;

export function BasicFields({ f, events }: { f: FormApi; events: MarketEvent[] }) {
  const { form, setForm, selectEvent } = f;
  return (
    <>
      <div className="form-group">
        <label htmlFor="hyp-event">起点イベント（選ぶと下書きを自動で入れます）</label>
        <select id="hyp-event" value={form.eventId} onChange={e => selectEvent(e.target.value)}>
          <option value="">-- 選択 --</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>{ev.title}</option>
          ))}
        </select>
      </div>

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
    </>
  );
}

export function MetaFields({ f }: { f: FormApi }) {
  const { form, setForm } = f;
  return (
    <div className="form-row">
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
  );
}

export function TemplateSuggestions({ f }: { f: FormApi }) {
  const { templates, appliedTemplateId, handleApplyTemplate } = f;
  if (templates.length === 0) return null;
  return (
    <div className="template-suggestions">
      <p className="eyebrow">下書きのテンプレート — 押すと選び直せます</p>
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
  );
}

export function StepFields({ f }: { f: FormApi }) {
  const { steps, updateStep } = f;
  return (
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
  );
}

export function ThemeField({ f }: { f: FormApi }) {
  const { form, setForm } = f;
  return (
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
  );
}

export function StocksField({ f, rows = 4 }: { f: FormApi; rows?: number }) {
  const { form, setForm } = f;
  return (
    <div className="form-group">
      <label htmlFor="hyp-stocks">候補銘柄（1行1件、コード＋銘柄名）</label>
      <textarea
        id="hyp-stocks"
        rows={rows}
        placeholder={'8035 東京エレクトロン\n6857 アドバンテスト\n7974 任天堂（相対優位）'}
        value={form.candidateStocks}
        onChange={e => setForm(prev => ({ ...prev, candidateStocks: e.target.value }))}
      />
    </div>
  );
}

export function InvalidationField({ f, rows = 3 }: { f: FormApi; rows?: number }) {
  const { form, setForm } = f;
  return (
    <div className="form-group">
      <label htmlFor="hyp-invalidation">失敗条件（1行1件）</label>
      <textarea
        id="hyp-invalidation"
        rows={rows}
        placeholder={'全面リスクオフ\n個別銘柄悪材料\n政策転換'}
        value={form.invalidationConditions}
        onChange={e => setForm(prev => ({ ...prev, invalidationConditions: e.target.value }))}
      />
    </div>
  );
}

const stepPreview = (steps: StepDraft[]): string => {
  const labels = steps.map(s => s.label.trim()).filter(Boolean);
  return labels.length === 0 ? '未入力' : `${labels.length} 段: ${labels[0]} → … → ${labels[labels.length - 1]}`;
};

export function HypothesisForm({ events, onAdd, initialEventId }: Props) {
  const f = useHypothesisForm({ events, onAdd, initialEventId });
  const [stepsOpen, setStepsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  // 必須のステップ1が空のあいだは閉じさせない。強制で開いた時の toggle を利用者の操作として記録しない
  const mustShowSteps = !f.steps[0].label.trim();
  return (
    <form className="form-panel hyp-draft-form" onSubmit={f.handleSubmit} noValidate>
      <h3>仮説を追加</h3>
      {f.error && <p className="form-error">{f.error}</p>}

      <BasicFields f={f} events={events} />

      <TemplateSuggestions f={f} />

      <details className="hyp-draft-fold" open={stepsOpen || mustShowSteps} onToggle={e => { if (!mustShowSteps) setStepsOpen(e.currentTarget.open); }}>
        <summary>連想ステップ <span className="hyp-draft-preview">{stepPreview(f.steps)}</span></summary>
        <StepFields f={f} />
      </details>

      <details className="hyp-draft-fold" open={moreOpen} onToggle={e => setMoreOpen(e.currentTarget.open)}>
        <summary>方向性・緊急度・テーマ・候補銘柄・失敗条件</summary>
        <MetaFields f={f} />
        <ThemeField f={f} />
        <StocksField f={f} />
        <InvalidationField f={f} />
      </details>

      <button type="submit" className="btn btn-primary">仮説を登録</button>
    </form>
  );
}
