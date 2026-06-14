export const sampleEvents = [
  {
    id: 'event-001',
    title: '中東情勢悪化',
    category: 'geopolitics',
    occurredAt: '2026-06-14',
    summary: '原油供給不安、移動費上昇、生活者行動の変化を起点に日本市場の反応を考える。',
  },
  {
    id: 'event-002',
    title: '米雇用統計上振れ',
    category: 'macro',
    occurredAt: '2026-06-14',
    summary: '金利上昇、AI相場の物語変化、半導体から小売へのローテーションを考える。',
  },
];

export const sampleHypotheses = [
  {
    id: 'MIDEAST-OIL-UP-STAYHOME-GAME-UP',
    title: '中東情勢悪化から内篭り需要を経由してゲーム関連が意識される',
    eventId: 'event-001',
    targetThemes: ['原油', '防衛', 'ゲーム', '旅行警戒'],
    status: 'needs_test',
    steps: [
      '中東情勢悪化',
      '原油供給不安',
      '移動費上昇',
      '外出・旅行心理の低下',
      '内篭り需要とゲーム関連の連想',
    ],
    invalidations: ['全面リスクオフ', '原油高の短期収束', 'ゲーム株の個別材料悪化'],
  },
  {
    id: 'US-JOBS-STRONG-AI-DOWN-JP-RETAIL-UP',
    title: '強い米雇用統計でAI代替ストーリーが揺らぎ日本小売が逃げ先になる',
    eventId: 'event-002',
    targetThemes: ['AI・半導体警戒', '小売', '銀行', 'REIT警戒'],
    status: 'needs_test',
    steps: [
      '米雇用統計が強い',
      'AIによる雇用代替期待が揺らぐ',
      'AI・半導体の高PERが正当化しづらくなる',
      '日本半導体にも売りが波及する',
      '資金の逃げ先として小売が意識される',
    ],
    invalidations: ['雇用強いが金利低下', '半導体好決算', '市場全体の全面リスクオフ'],
  },
];

export const targetThemes = [
  { name: '半導体', examples: ['東京エレクトロン', 'アドバンテスト', 'ディスコ', 'SCREEN', 'レーザーテック'] },
  { name: '小売', examples: ['百貨店', 'ドラッグストア', 'ディスカウント', 'コンビニ', '専門店'] },
  { name: '防衛', examples: ['三菱重工', '川崎重工', 'IHI', '日本製鋼所'] },
  { name: '原油', examples: ['INPEX', '石油資源開発', 'ENEOS', '出光興産'] },
  { name: 'ゲーム', examples: ['任天堂', 'ソニーG', 'カプコン', 'コナミG', 'バンナムHD'] },
];
