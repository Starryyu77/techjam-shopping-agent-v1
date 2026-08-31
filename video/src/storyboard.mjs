export const FPS = 30;
export const BEAT_SECONDS = 5;
export const DURATION_SECONDS = 180;
export const DURATION_FRAMES = FPS * DURATION_SECONDS;

export const evidence = {
  scope: 'official_public_200',
  sampleCount: 200,
  privateSessions: 800,
  catalogSize: 50000,
  maxTurns: 10,
  metrics: {
    hitRateAt10: 0.995,
    mrr: 0.644355,
    mttc: 2.215,
    technicalScore: 0.866507,
  },
  starter: {
    hitRateAt10: 0.125,
    mrr: 0.068034,
    mttc: 9.81,
    technicalScore: 0.10671,
  },
  override: {
    sampleId: 'public_0004',
    category: 'Tops & Tees · Tanks & Camis',
    before: 'adjustable',
    after: 'polyester',
    finalRank: 1,
  },
};

const rawBeats = [
  ['hook', 'Shopping search rarely fails for lack of keywords.', 'Search is not the hard part.', 'query'],
  ['hook', 'It fails when people add constraints—or change course.', 'ADD · REJECT · OVERRIDE', 'conflict'],
  ['hook', 'Append-only logic conflicts. We maintain explicit state.', 'Keywords are not state.', 'state'],
  ['hook', 'Meet Shopping Copilot, spanning fifty thousand products.', 'SHOPPING COPILOT · 50,000 PRODUCTS', 'brand'],
  ['hook', 'The scored path runs offline, on CPU, without keys.', 'OFFLINE · CPU-ONLY · NO API KEYS', 'offline'],
  ['hook', 'Public-set score: zero point eight six six five.', 'PUBLIC-SET TECHNICAL SCORE · 0.866507', 'score'],

  ['contract', 'Fifty thousand frozen products. Ten turns maximum.', '50,000 FROZEN PRODUCTS · 10 TURNS', 'catalog'],
  ['contract', 'Two hundred public. Eight hundred private—and unknown.', '200 PUBLIC · 800 PRIVATE: UNKNOWN', 'boundary'],
  ['contract', 'Four cases: buying, browsing, override, and boundary.', 'BUYING · BROWSING · OVERRIDE · BOUNDARY', 'scenarios'],
  ['trace', 'Follow owner-approved public trace zero zero zero four.', 'COMPETITION EVIDENCE · PUBLIC_0004', 'trace'],
  ['trace', 'The shopper wants a long-torso camisole with adjustable straps.', '“Long torso camisole · adjustable straps”', 'message'],
  ['trace', 'The router fixes the category and item intent.', 'ROUTE: ITEM · CATEGORY: TANKS & CAMIS', 'route'],

  ['trace', 'Adjustable enters state as a soft preference.', '+ SOFT PREFERENCE · ADJUSTABLE', 'add'],
  ['trace', 'Clarification targets what best separates remaining products.', 'NEXT QUESTION · SIZE', 'clarify'],
  ['trace', 'The target is outside Top Ten; state remains visible.', 'TARGET OUTSIDE TOP-10 · STATE VISIBLE', 'rank-miss'],
  ['override', 'Then the shopper overrides adjustable with polyester.', '“IGNORE MY EARLIER PREFERENCE · POLYESTER”', 'override-message'],
  ['override', 'Append-only logic would keep both conflicting values.', 'APPEND-ONLY STATE ✕', 'append-conflict'],
  ['override', 'Shopping Copilot marks adjustable as superseded.', 'SUPERSEDED · ADJUSTABLE', 'supersede'],

  ['override', 'The old preference leaves the active state.', '− ADJUSTABLE', 'erase'],
  ['override', 'Polyester enters; the valid category remains.', '+ POLYESTER · CATEGORY RETAINED', 'replace'],
  ['override', 'Ranking pivots. The target reaches Rank One.', 'TARGET RANK · #1', 'rank-one'],
  ['override', 'A bounded rewrite—not a destructive reset.', 'ERASE & REWRITE · KEEP VALID STATE', 'bounded'],
  ['mechanism', 'Messages become intent, action, and state changes.', 'MESSAGE → INTENT → VERSIONED STATE', 'intent'],
  ['mechanism', 'State drives SQLite F-T-S-five retrieval.', 'STATE → SQLITE FTS5 → CANDIDATES', 'retrieval'],

  ['mechanism', 'Transparent rules rerank and select clarification.', 'RERANK → CLARIFY → TOP-10', 'rerank'],
  ['mechanism', 'The evaluated path is deterministic and model-free.', 'DETERMINISTIC · STDLIB · MODEL-FREE', 'deterministic'],
  ['evidence', 'Every public target entered the candidate pool.', '200 / 200 RETRIEVABLE', 'recall'],
  ['evidence', 'One hundred ninety-nine reached the final Top Ten.', '199 / 200 TOP-10 HITS', 'top10'],
  ['evidence', 'Hit Rate: point nine nine five.', 'HIT RATE@10 · 0.995', 'hr'],
  ['evidence', 'M-R-R is point six four four; latency stays low.', 'MRR · 0.644355   MTTC · 2.215', 'mrr'],

  ['evidence', 'Together: Technical Score point eight six six five.', 'PUBLIC-SET TECHNICAL SCORE · 0.866507', 'final-score'],
  ['experiment', 'The official starter scored point one zero six seven one.', 'OFFICIAL STARTER · 0.10671 → 0.866507', 'starter'],
  ['experiment', 'Local cross-encoders reduced the composite score.', 'CROSS-ENCODER EXPERIMENT · SCORE ↓', 'cross-encoder'],
  ['experiment', 'So reliability won—not model size.', 'RELIABILITY OVER MODEL SIZE', 'decision'],
  ['commercial', 'Demo-only sponsorship preserves organic order.', 'DEMO-ONLY SIMULATION · ORGANIC ORDER PRESERVED', 'ads'],
  ['close', 'Code and evidence are public. Private results remain unknown.', 'CODE · EVIDENCE · LIMITATIONS · PRIVATE: UNKNOWN', 'close'],
];

export const beats = rawBeats.map(([act, narration, screenText, focus], index) => ({
  id: `beat-${String(index + 1).padStart(2, '0')}`,
  index,
  act,
  focus,
  start: index * BEAT_SECONDS,
  end: (index + 1) * BEAT_SECONDS,
  narration,
  caption: narration,
  screenText,
}));
