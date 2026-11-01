import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssociationFlow } from './AssociationFlow';
import { buildFlow, shortLabel } from './associationFlowModel';
import { makeEvent, makeHyp } from '../test/fixtures';

const ev = makeEvent({ id: 'ev-1', title: '円安進行', summary: 'ドル円が急伸' });
const hA = makeHyp({
  id: 'h-a', title: '輸出株', associationSteps: [
    { depth: 1, label: '輸入物価上昇', reason: '円安で輸入品が高くなる' },
    { depth: 2, label: '訪日客増加', reason: '旅行が割安になる' },
  ],
});
const hB = makeHyp({
  id: 'h-b', title: '百貨店', associationSteps: [
    { depth: 1, label: '輸出採算改善', reason: '外貨建て売上が膨らむ' },
    { depth: 2, label: '訪日客増加', reason: '免税売上が伸びる' },
  ],
});

describe('buildFlow', () => {
  it('同じ深さ・同じ文言のノードは合流し、イベントからは仮説の数だけ分岐する', () => {
    const m = buildFlow([ev], [hA, hB]);
    expect(m.columns[0]).toHaveLength(1);
    expect(m.columns[1].map(n => n.label)).toEqual(['輸入物価上昇', '輸出採算改善']);
    expect(m.columns[2]).toHaveLength(1);
    expect(m.columns[2][0].hypIds).toEqual(['h-a', 'h-b']);
    expect(m.edges.filter(e => e.from === 'e:ev-1')).toHaveLength(2);
  });

  it('イベントが無い仮説は「イベント未紐付け」にまとめ、深さの範囲外は 1〜5 に丸める', () => {
    const h = makeHyp({ eventId: '', associationSteps: [{ depth: 9 as 5, label: '銘柄X', reason: '' }] });
    const m = buildFlow([], [h]);
    expect(m.columns[0][0].label).toBe('イベント未紐付け');
    expect(m.columns[5][0].label).toBe('銘柄X');
  });

  it('長い文言は 14 文字で省略する', () => {
    expect(shortLabel('あ'.repeat(20))).toBe(`${'あ'.repeat(13)}…`);
    expect(shortLabel('短い')).toBe('短い');
  });
});

describe('AssociationFlow', () => {
  it('列の見出しに段の名前を出す', () => {
    render(<AssociationFlow events={[ev]} hypotheses={[hA]} layout="horizontal" />);
    expect(screen.getByText('直接影響')).toBeInTheDocument();
    expect(screen.getByText('候補銘柄/ETF')).toBeInTheDocument();
  });

  it('仮説を選ぶとその経路以外を薄くする', () => {
    render(<AssociationFlow events={[ev]} hypotheses={[hA, hB]} layout="horizontal" />);
    fireEvent.click(screen.getByRole('button', { name: /輸出株/ }));
    expect(screen.getByRole('button', { name: '輸出採算改善' })).toHaveClass('dim');
    expect(screen.getByRole('button', { name: '輸入物価上昇' })).not.toHaveClass('dim');
    expect(screen.getByRole('button', { name: /訪日客増加/ })).not.toHaveClass('dim');
  });

  it('ノードを選ぶと理由の全文を詳細欄に出し、合流ノードは仮説ごとの理由を並べる', () => {
    render(<AssociationFlow events={[ev]} hypotheses={[hA, hB]} layout="vertical" />);
    fireEvent.click(screen.getByRole('button', { name: /訪日客増加/ }));
    expect(screen.getByText('旅行が割安になる')).toBeInTheDocument();
    expect(screen.getByText('免税売上が伸びる')).toBeInTheDocument();
  });

  it('仮説が多いときはページで切り替える', () => {
    const many = Array.from({ length: 4 }, (_, i) => makeHyp({ id: `h-${i}`, title: `仮説${i}` }));
    render(<AssociationFlow events={[ev]} hypotheses={many} layout="horizontal" />);
    expect(screen.queryByRole('button', { name: /仮説3/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '次の仮説' }));
    expect(screen.getByRole('button', { name: /仮説3/ })).toBeInTheDocument();
  });
});
