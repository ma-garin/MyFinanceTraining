import { describe, it, expect } from 'vitest';
import { generatePrompt, parsePastedResult } from './aiService';
import type { Hypothesis, MarketEvent } from '../domain/types';

const hypothesis = (over: Partial<Hypothesis> = {}): Hypothesis => ({
  title: '仮説タイトル',
  associationSteps: [
    { depth: 1, label: '原油高', reason: '供給不安' },
    { depth: 2, label: '外出減', reason: '' },
  ],
  invalidationConditions: [],
  ...over,
} as Hypothesis);

const event: MarketEvent = {
  id: 'e1', title: '中東紛争', category: 'geopolitics', occurredAt: '2024-06-03', summary: '緊張が拡大',
};

describe('generatePrompt: association_expand', () => {
  it('イベントがあれば「タイトル：要約」を起点に含める', () => {
    expect(generatePrompt('association_expand', hypothesis(), event)).toContain('中東紛争：緊張が拡大');
  });

  it('イベントが無ければ仮説タイトルを起点にする', () => {
    expect(generatePrompt('association_expand', hypothesis(), undefined)).toContain('【起点イベント】\n仮説タイトル');
  });

  it('ステップは「n. label（reason）」で、reason が空なら括弧を付けない', () => {
    const p = generatePrompt('association_expand', hypothesis(), event);
    expect(p).toContain('1. 原油高（供給不安）');
    expect(p).toContain('2. 外出減\n');
    expect(p).not.toContain('2. 外出減（');
  });

  it('投資助言を含めない旨と出力形式を指示する', () => {
    const p = generatePrompt('association_expand', hypothesis(), event);
    expect(p).toContain('投資助言・売買推奨は含めないでください');
    expect(p).toContain('- 連想先: [内容] / 理由: [理由]');
  });
});

describe('generatePrompt: counter_scenario', () => {
  it('失敗条件が無ければ未登録の旨を出す', () => {
    expect(generatePrompt('counter_scenario', hypothesis(), event)).toContain('（まだ登録されていません）');
  });

  it('既存の失敗条件を「・」付きで列挙する', () => {
    const p = generatePrompt('counter_scenario', hypothesis({ invalidationConditions: ['停戦', '原油急落'] }), event);
    expect(p).toContain('・停戦\n・原油急落');
    expect(p).not.toContain('まだ登録されていません');
  });

  it('イベント有無に関わらず仮説タイトルを含む', () => {
    expect(generatePrompt('counter_scenario', hypothesis(), undefined)).toContain('【仮説】\n仮説タイトル');
  });
});

describe('parsePastedResult: association_expand', () => {
  it('「連想先: X / 理由: Y」形式から label/reason を抽出する', () => {
    const r = parsePastedResult('association_expand', '- 連想先: ゲーム需要 / 理由: 在宅増');
    expect(r).toEqual({ steps: [{ label: 'ゲーム需要', reason: '在宅増' }], conditions: [] });
  });

  it('全角コロン・全角スラッシュも受け付ける', () => {
    const r = parsePastedResult('association_expand', '- 連想先：海運 ／ 理由：運賃上昇');
    expect(r.steps).toEqual([{ label: '海運', reason: '運賃上昇' }]);
  });

  it('番号付き行も対象で、形式外は本文を label・reason 空にする', () => {
    const r = parsePastedResult('association_expand', '1. 防衛関連\n2. 連想先: 商社 / 理由: 資源');
    expect(r.steps).toEqual([
      { label: '防衛関連', reason: '' },
      { label: '商社', reason: '資源' },
    ]);
  });

  it('箇条書きでない行は無視する', () => {
    expect(parsePastedResult('association_expand', '前置きです\n- 連想先: A / 理由: B').steps).toHaveLength(1);
  });

  it('BUG-15: 連想は最大 5 段で打ち切る（先頭 5 件を残す）', () => {
    const raw = Array.from({ length: 7 }, (_, i) => `- 連想先: L${i} / 理由: R${i}`).join('\n');
    expect(parsePastedResult('association_expand', raw).steps.map(s => s.label)).toEqual(['L0', 'L1', 'L2', 'L3', 'L4']);
  });

  it('空文字・空白のみ・箇条書き無しは空の steps', () => {
    expect(parsePastedResult('association_expand', '').steps).toEqual([]);
    expect(parsePastedResult('association_expand', '  \n \n').steps).toEqual([]);
    expect(parsePastedResult('association_expand', 'ただの文章').steps).toEqual([]);
  });

  it('中身の無い箇条書き（"-" のみ）は除外する', () => {
    expect(parsePastedResult('association_expand', '-\n- ').steps).toEqual([]);
  });

  it('理由が欠けた崩れた形式は本文全体を label にする', () => {
    const r = parsePastedResult('association_expand', '- 連想先: ゲーム');
    expect(r.steps).toEqual([{ label: '連想先: ゲーム', reason: '' }]);
  });
});

describe('parsePastedResult: counter_scenario', () => {
  it('「-」「・」「n.」の各行頭記号を除いて条件を抽出する', () => {
    const r = parsePastedResult('counter_scenario', '- 停戦合意\n・原油急落\n3. 円高進行');
    expect(r).toEqual({ steps: [], conditions: ['停戦合意', '原油急落', '円高進行'] });
  });

  it('記号の無い行・空入力は条件にしない', () => {
    expect(parsePastedResult('counter_scenario', '前置き\n\n').conditions).toEqual([]);
    expect(parsePastedResult('counter_scenario', '').conditions).toEqual([]);
  });

  it('件数の上限は設けていない', () => {
    const raw = Array.from({ length: 8 }, (_, i) => `- C${i}`).join('\n');
    expect(parsePastedResult('counter_scenario', raw).conditions).toHaveLength(8);
  });
});

import { parsePastedResult as parse2 } from './aiService';
describe('BUG-15・16 連想拡張の解析', () => {
  it('・ 始まりの行も拾い、最大 5 段で打ち切る', () => {
    const text = ['・連想先: A / 理由: r', '- B', '1. C', '2. D', '3. E', '4. F'].join('\n');
    const { steps } = parse2('association_expand', text);
    expect(steps.map(s => s.label)).toEqual(['A', 'B', 'C', 'D', 'E']);
  });
  it('本文中の "1.5倍" は番号として削らない', () => {
    expect(parse2('counter_scenario', '- 原油が1.5倍になる').conditions).toEqual(['原油が1.5倍になる']);
  });
});
