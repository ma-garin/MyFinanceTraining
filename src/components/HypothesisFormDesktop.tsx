import { useState } from 'react';
import type { Hypothesis, MarketEvent } from '../domain/types';
import {
  useHypothesisForm, BasicFields, TemplateSuggestions, StepFields, ThemeField, StocksField, InvalidationField,
} from './HypothesisForm';

type Props = {
  events: MarketEvent[];
  onAdd: (hypothesis: Hypothesis) => void;
};

const PAGES = ['基本', '連想ステップ', 'テーマ・候補銘柄', '失敗条件・登録'] as const;

// PC は 1 段ずつ見せて枠に収める。入力状態・検証・登録はスマホのフォームと同じフックを使う
export function HypothesisFormDesktop({ events, onAdd }: Props) {
  const f = useHypothesisForm({ events, onAdd });
  const [page, setPage] = useState(0);
  const last = PAGES.length - 1;

  const handleSubmit = (e: React.FormEvent) => {
    // 検証で止まった項目のある段へ戻し、エラーと入力欄を同時に見せる
    if (!f.form.title.trim()) setPage(0);
    else if (!f.steps[0].label.trim()) setPage(1);
    else setPage(0);
    f.handleSubmit(e);
  };

  return (
    <form className="form-panel hyp-form-desk" onSubmit={handleSubmit} noValidate>
      <div className="hyp-form-desk-head">
        <h3>仮説を追加</h3>
        <ol className="hyp-form-desk-steps" aria-label="入力の段">
          {PAGES.map((p, i) => (
            <li key={p}>
              <button type="button" className={`filter-chip${page === i ? ' active' : ''}`} aria-current={page === i ? 'step' : undefined} onClick={() => setPage(i)}>
                {i + 1}. {p}
              </button>
            </li>
          ))}
        </ol>
      </div>
      {f.error && <p className="form-error">{f.error}</p>}

      <div className="hyp-form-desk-body">
        {page === 0 && <><BasicFields f={f} events={events} /><TemplateSuggestions f={f} /></>}
        {page === 1 && <StepFields f={f} />}
        {page === 2 && <><ThemeField f={f} /><StocksField f={f} rows={6} /></>}
        {page === 3 && <InvalidationField f={f} rows={6} />}
      </div>

      <div className="hyp-form-desk-nav">
        <button type="button" className="btn btn-ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹ 前へ</button>
        <span className="pager-pos">{page + 1} / {PAGES.length}</span>
        {page < last
          ? <button type="button" className="btn btn-ghost" onClick={() => setPage(p => p + 1)}>次へ ›</button>
          : <button type="submit" className="btn btn-primary">仮説を登録</button>}
      </div>
    </form>
  );
}
