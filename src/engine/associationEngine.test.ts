import { describe, it, expect } from 'vitest';
import { detectTemplates, applyTemplate } from './associationEngine';
import { ASSOCIATION_RULES } from './rules';
import type { EventCategory, MarketEvent } from '../domain/types';

const ev = (over: Partial<MarketEvent>): MarketEvent => ({
  id: 'e1', title: '', category: 'other', occurredAt: '2024-06-03', summary: '', ...over,
});
const ids = (e: MarketEvent) => detectTemplates(e).map(t => t.id);
// ルールに存在しないカテゴリで「カテゴリ加点なし」を作るための値
const NO_CATEGORY = 'none' as unknown as EventCategory;

describe('detectTemplates: スコア加点の固定', () => {
  it('category 一致のみ（キーワード0件）でも +2 で候補になる', () => {
    expect(ids(ev({ category: 'other', title: 'zzz' }))).toEqual(['earnings-surprise-up']);
  });

  it('category 不一致・キーワード1件で +1 の候補になる', () => {
    expect(ids(ev({ category: NO_CATEGORY, title: '原油が動く' }))).toEqual(['oil-surge']);
  });

  it('category 一致(+2) + キーワード2件(+2) が、category 一致のみ(+2) より上位に来る', () => {
    const result = ids(ev({ category: 'geopolitics', title: '中東で紛争' }));
    expect(result[0]).toBe('mideast-conflict');
    expect(result).toEqual(['mideast-conflict', 'china-economy-weak', 'defense-budget-hike']);
  });

  it('同点は rules.ts の定義順を保つ（安定ソート）', () => {
    const result = ids(ev({ category: 'geopolitics', title: 'zzz' }));
    const order = ASSOCIATION_RULES.map(r => r.id);
    expect(result).toEqual(order.filter(id => result.includes(id)));
    expect(result).toEqual(['mideast-conflict', 'china-economy-weak', 'defense-budget-hike']);
  });

  it('キーワードは title と summary の両方を対象にする', () => {
    expect(ids(ev({ category: NO_CATEGORY, title: 'x', summary: '円安が進行' }))).toEqual(['yen-weak']);
  });

  it('キーワード照合は大文字小文字を区別しない', () => {
    expect(ids(ev({ category: NO_CATEGORY, title: 'wti and opec' }))).toEqual(['oil-surge']);
  });

  it('同一キーワードの重複出現は1回分(+1)しか数えない', () => {
    const once = ids(ev({ category: NO_CATEGORY, title: '原油 円安' }));
    const twice = ids(ev({ category: NO_CATEGORY, title: '原油 原油 原油 円安' }));
    expect(twice).toEqual(once);
  });

  it('短いキーワード "AI" は部分一致で無関係な語にも反応する（現状挙動）', () => {
    expect(ids(ev({ category: NO_CATEGORY, title: 'mail' }))).toEqual(['ai-demand-surge']);
  });
});

describe('detectTemplates: 0件・全カテゴリの挙動', () => {
  it('カテゴリ・キーワードとも不一致なら空配列', () => {
    expect(detectTemplates(ev({ category: NO_CATEGORY, title: 'zzz', summary: 'qqq' }))).toEqual([]);
  });

  it.each(['geopolitics', 'commodity', 'macro', 'semiconductor', 'currency', 'consumer', 'other'] as EventCategory[])(
    'カテゴリ %s は少なくとも1件の候補を返す',
    category => {
      expect(detectTemplates(ev({ category })).length).toBeGreaterThan(0);
    },
  );
});

describe('applyTemplate: テンプレート適用結果', () => {
  const template = ASSOCIATION_RULES[0];

  it('steps に 1 始まりの depth が順に振られ label/reason が引き継がれる', () => {
    const { steps } = applyTemplate(template);
    expect(steps.map(s => s.depth)).toEqual([1, 2, 3, 4, 5]);
    expect(steps[0]).toEqual({ depth: 1, label: template.steps[0].label, reason: template.steps[0].reason });
  });

  it('themes/candidateStocks/invalidationConditions は内容が同じ別配列（元を汚さない）', () => {
    const r = applyTemplate(template);
    expect(r.themes).toEqual(template.themes);
    expect(r.themes).not.toBe(template.themes);
    expect(r.candidateStocks).not.toBe(template.candidateStocks);
    expect(r.invalidationConditions).not.toBe(template.invalidationConditions);
    r.themes.push('追加');
    expect(template.themes).not.toContain('追加');
  });

  it('全ルールのステップ数は 1〜5 の範囲（depth 型の前提）', () => {
    for (const rule of ASSOCIATION_RULES) {
      expect(rule.steps.length).toBeGreaterThanOrEqual(1);
      expect(rule.steps.length).toBeLessThanOrEqual(5);
    }
  });
});
