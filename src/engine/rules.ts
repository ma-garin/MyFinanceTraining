import type { EventCategory } from '../domain/types';

export type AssociationTemplate = {
  id: string;
  label: string;
  keywords: string[];
  categories: EventCategory[];
  themes: string[];
  steps: { label: string; reason: string }[];
  invalidationConditions: string[];
};

export const ASSOCIATION_RULES: AssociationTemplate[] = [
  {
    id: 'mideast-conflict',
    label: '中東情勢悪化',
    keywords: ['中東', '紛争', '戦争', '地政学', 'イスラエル', 'イラン', 'サウジ', 'ロシア', '軍事'],
    categories: ['geopolitics'],
    themes: ['原油', '防衛', 'ゲーム', '旅行警戒', '商社'],
    steps: [
      { label: '中東情勢悪化', reason: '地政学リスクの高まり' },
      { label: '原油供給不安', reason: '中東は主要産油地域' },
      { label: '移動費上昇', reason: 'ガソリン・航空費が上昇' },
      { label: '外出・旅行心理の低下', reason: 'コスト増で外出を抑制' },
      { label: '内篭り需要でゲーム関連が意識される', reason: '在宅時間増でエンタメ需要' },
    ],
    invalidationConditions: ['停戦・和平合意', '原油高の短期収束', '全面リスクオフで一律売り'],
  },
  {
    id: 'oil-surge',
    label: '原油急騰',
    keywords: ['原油', '石油', 'WTI', 'OPEC', 'エネルギー', '油価', 'ブレント'],
    categories: ['commodity'],
    themes: ['石油', '商社', '防衛', '空運警戒'],
    steps: [
      { label: '原油急騰', reason: '供給制約・地政学リスク' },
      { label: 'エネルギーコスト上昇', reason: '燃料費が全産業に波及' },
      { label: '空運・物流コストの上昇', reason: '航空燃料・配送費が増加' },
      { label: '石油株・商社株への資金流入', reason: 'エネルギー関連の業績改善期待' },
      { label: '外出抑制で内需セクターへの影響を確認', reason: 'ガソリン高で消費行動が変化' },
    ],
    invalidationConditions: ['OPEC増産合意', '景気後退による需要減', '代替エネルギー普及加速'],
  },
  {
    id: 'us-jobs-strong',
    label: '米雇用統計上振れ',
    keywords: ['雇用統計', '雇用', 'NFP', '失業率', '賃金', '非農業', 'ペイロール'],
    categories: ['macro'],
    themes: ['AI・半導体警戒', '小売', '銀行', 'REIT警戒'],
    steps: [
      { label: '米雇用統計が予想を上回る', reason: '雇用市場の底堅さを確認' },
      { label: 'AI代替ストーリーが揺らぐ', reason: '人が増えていてもAI代替はまだ先' },
      { label: 'AI・半導体の高PERが正当化しづらくなる', reason: '成長ストーリーの根拠が弱まる' },
      { label: '日本半導体にも売りが波及', reason: 'グローバルセクターローテーション' },
      { label: '小売・内需が資金の逃げ先として意識される', reason: '低PER・ディフェンシブ選好' },
    ],
    invalidationConditions: ['雇用強いが金利低下', '半導体の個別好決算', '全面リスクオフ'],
  },
  {
    id: 'sox-plunge',
    label: 'SOX急落',
    keywords: ['SOX', '半導体', 'NVIDIA', 'エヌビディア', 'AMD', 'フィラデルフィア', 'エヌビ'],
    categories: ['semiconductor'],
    themes: ['日本半導体警戒', '小売', '内需'],
    steps: [
      { label: 'SOX（フィラデルフィア半導体指数）が急落', reason: 'AI需要鈍化・在庫調整懸念' },
      { label: '半導体セクター全面安', reason: 'グローバルに売りが波及' },
      { label: '日本半導体株への売り（東京エレクトロン等）', reason: '連動性の高さ' },
      { label: 'バリュー株・内需株への資金シフト', reason: '成長株から逃避' },
      { label: '小売・内需ローテーションが意識される', reason: '低PER・ディフェンシブ選好' },
    ],
    invalidationConditions: ['半導体の好決算・上方修正', '市場全体の反発', 'AI需要の再確認材料'],
  },
  {
    id: 'yen-weak',
    label: '円安進行',
    keywords: ['円安', 'ドル円', '為替', '円相場', 'ドル高', '円下落'],
    categories: ['currency'],
    themes: ['輸出', 'インバウンド', '輸入コスト警戒'],
    steps: [
      { label: '円安が進行', reason: '日米金利差の拡大' },
      { label: '輸出企業の採算が改善', reason: '円建て売上が増加' },
      { label: 'インバウンド需要が増加', reason: '外国人旅行者にとって日本が割安に' },
      { label: '輸入コストが上昇', reason: '食品・エネルギー輸入価格が上昇' },
      { label: '内需・小売の選別が始まる', reason: 'コスト転嫁できる企業とできない企業で差' },
    ],
    invalidationConditions: ['急速な円高反転', '日銀利上げによる円高', '輸出企業の業績下振れ'],
  },
  {
    id: 'yen-strong',
    label: '円高・日銀利上げ',
    keywords: ['円高', '日銀', '利上げ', '金融正常化', '政策金利', '利上げ示唆', '円高進行'],
    categories: ['currency', 'macro'],
    themes: ['輸出警戒', '小売', '銀行'],
    steps: [
      { label: '円高が進行（または日銀利上げ示唆）', reason: '日米金利差の縮小観測' },
      { label: '輸出企業の採算が悪化', reason: '円建て売上が減少' },
      { label: '自動車・精密機器など輸出株が売られる', reason: '業績下方修正リスク' },
      { label: '内需・小売へ資金シフト', reason: '輸入物価下落で消費者に恩恵' },
      { label: '銀行株は金利上昇メリットで物色される', reason: '利ザヤ改善期待' },
    ],
    invalidationConditions: ['円安反転', '輸出企業の好決算', '銀行の不良債権懸念'],
  },
  {
    id: 'us-cpi',
    label: '米CPI上昇（インフレ）',
    keywords: ['CPI', 'インフレ', '物価', 'PCE', 'インフレ率', '消費者物価'],
    categories: ['macro'],
    themes: ['金利警戒', '金融株', '高PER警戒'],
    steps: [
      { label: '米CPIが市場予想を上回る', reason: 'インフレ粘着性の確認' },
      { label: '利上げ継続・長期高止まり観測が強まる', reason: 'FRBの政策転換が遠のく' },
      { label: '長期金利が上昇', reason: '債券売り・利回り上昇' },
      { label: 'グロース株・高PERへの売り圧力', reason: '将来キャッシュフローの割引率上昇' },
      { label: '日本のバリュー・金融株に注目', reason: '金利上昇環境でバリュー選好' },
    ],
    invalidationConditions: ['CPIが予想内に収まる', '景気後退懸念が優先される', '日銀の緩和継続'],
  },
];
