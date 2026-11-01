import { useState } from 'react';
import type { MarketEvent, EventCategory } from '../domain/types';
import { CATEGORY_OPTIONS } from '../ui/labels';
import { todayStr } from '../utils/dateUtils';


type Props = {
  onAdd: (event: MarketEvent) => void;
};

const emptyForm = () => ({
  title: '',
  category: 'geopolitics' as EventCategory,
  occurredAt: todayStr(),
  summary: '',
});

export function EventForm({ onAdd }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('タイトルを入力してください');
      return;
    }
    if (!form.summary.trim()) {
      setError('概要を入力してください');
      return;
    }
    onAdd({
      id: `EVT-${Date.now()}`,
      title: form.title.trim(),
      category: form.category,
      occurredAt: form.occurredAt,
      summary: form.summary.trim(),
    });
    setForm(emptyForm);
    setError('');
  };

  return (
    <form className="form-panel" onSubmit={handleSubmit} noValidate>
      <h3>イベントを追加</h3>
      {error && <p className="form-error">{error}</p>}

      <div className="form-group">
        <label htmlFor="ev-title">タイトル *</label>
        <input
          id="ev-title"
          type="text"
          placeholder="例: 米国CPI上振れ"
          value={form.title}
          onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="ev-category">カテゴリ</label>
          <select
            id="ev-category"
            value={form.category}
            onChange={e => setForm(prev => ({ ...prev, category: e.target.value as EventCategory }))}
          >
            {CATEGORY_OPTIONS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="ev-date">発生日</label>
          <input
            id="ev-date"
            type="date"
            value={form.occurredAt}
            onChange={e => setForm(prev => ({ ...prev, occurredAt: e.target.value }))}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="ev-summary">概要 *</label>
        <textarea
          id="ev-summary"
          rows={3}
          placeholder="このイベントから日本市場への影響を考えるきっかけを書く"
          value={form.summary}
          onChange={e => setForm(prev => ({ ...prev, summary: e.target.value }))}
        />
      </div>

      <button type="submit" className="btn btn-primary">追加する</button>
    </form>
  );
}
