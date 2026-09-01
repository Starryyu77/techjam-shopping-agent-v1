export const V3_FPS = 30;
export const V3_DURATION_SECONDS = 180;
export const V3_DURATION_FRAMES = V3_FPS * V3_DURATION_SECONDS;

const rows = [
  [
    'problem',
    'Real shopping is rarely one clean search. People add constraints, reject earlier choices, and describe products vaguely—like the one from that video, only lighter and less formal.',
    '真实购物很少是一次干净的搜索。用户会补充条件、否定旧选择，也会含糊地说：就像刚才视频里那件，但轻一点、别太正式。',
  ],
  [
    'reveal',
    'That is why we built Shopping Copilot: a conversational product that lets the model handle understanding while the system handles memory, retrieval, ranking, and explanation across the complete shopping journey.',
    '所以我们做了 Shopping Copilot：让模型负责理解，让系统负责记忆、检索、排序和解释，贯穿一段完整的真实购物旅程。',
  ],
  [
    'qwen',
    "When rule confidence is low, our local Qwen model interprets the user's intent and dialogue action. It does not generate products, scores, or ranking decisions.",
    '当规则置信度不足，本地 Qwen 会判断用户意图和对话动作。但它不会生成商品、分数，也不会决定最终排名。',
  ],
  [
    'intent',
    'A vague request for a longer layering top with adjustable straps becomes structured intent: an item request, a Tanks and Camis category, and one soft preference.',
    '一句“想要长一点、适合打底、肩带可调的上衣”，被转成结构化意图：商品请求、吊带类别和一项软偏好。',
  ],
  [
    'retrieval',
    'Free text stops at the boundary. A versioned state records the category and preference, then SQLite FTS5 recalls candidates from fifty thousand frozen catalog products locally.',
    '自由文本到这里为止。版本化状态记录类别和偏好，随后 SQLite FTS5 在本地从五万个冻结商品中召回候选。',
  ],
  [
    'clarify',
    'Transparent rules rerank those candidates. When important attributes remain ambiguous, the question policy asks only the most discriminative follow-up, while keeping current state and uncertainty visible.',
    '透明规则重新排序。当重要属性仍有歧义，问题策略只追问最有区分度的一项，同时保留当前状态和不确定性。',
  ],
  [
    'override-message',
    'Then the shopper changes direction: forget adjustable straps, use polyester, but keep the longer silhouette. The model identifies three actions—remove, add, and retain—not three unrelated keywords.',
    '接着用户改变主意：不要可调肩带，改成聚酯纤维，但保留长版。模型识别的是删除、增加和保留三种动作，而不是三个孤立关键词。',
  ],
  [
    'rewrite',
    'Version two marks adjustable as superseded, adds polyester, and preserves the valid category. This is a bounded rewrite with history, not an append-only conflict or destructive reset.',
    '状态版本二把“可调节”标为已失效，加入“聚酯纤维”，并保留有效类别。这是有历史的有限改写，不是追加冲突，也不是清空重来。',
  ],
  [
    'rerank',
    'The updated state drives the same retrieval and ranking engine again. Products that violate the new request leave, better matches enter, and the list reorganizes continuously.',
    '更新后的状态再次驱动同一套检索和排序。不符合新条件的商品退出，更好的匹配进入，整个榜单连续重组。',
  ],
  [
    'rank-one',
    'The verified replay places the target at rank one because category and material now match and the old preference is gone. The change comes from state, not improvisation.',
    '冻结回放让目标商品升到第一名：类别和材质现在匹配，旧偏好也已移除。变化来自状态，而不是模型临时发挥。',
  ],
  [
    'mechanism',
    'Looking back, the large model sits only at the entrance, translating difficult language into structured actions. Multi-turn consistency comes from inspectable state that can add, remove, retain, and trace.',
    '回看整条路径，大模型只在入口把复杂语言翻译成结构化动作。真正维持多轮一致性的，是能增加、删除、保留和追溯的显式状态。',
  ],
  [
    'prompt-evolution',
    'An offline prompt loop then fixes repeated intent errors. On the ninety-turn dev set, v002 improved every reported metric and passed one opaque validation gate.',
    '离线提示词循环继续修复反复出现的意图错误。在九十轮 dev 集上，v002 的全部已报告指标均提升，并通过一次不透明 validation gate。',
  ],
  [
    'ads-manager',
    'To model real commerce, we added a separate advertising track. Advertisers configure keywords, bids, and budgets there; those values never enter user state, organic ranking, or official evaluation.',
    '为了模拟真实商业场景，我们加入独立广告轨道。广告主在其中配置关键词、出价和预算；这些数据不会进入用户状态、自然排名或官方评测。',
  ],
  [
    'relevance-auction',
    'A relevance floor rejects off-topic inventory, even with a higher bid. Eligible products then compete by bid times relevance, with every impression and budget deduction recorded.',
    '相关性门槛先拒绝无关商品，即使它出价更高。通过门槛的候选再按出价乘相关性竞价，每次展示和预算扣减都有记录。',
  ],
  [
    'organic-invariant',
    'The winner enters a clearly labeled sponsored position. Every organic product remains in exactly the same order, which makes the business mechanism visible without corrupting the recommendation task.',
    '胜出商品进入明确标注的赞助位，而每一件自然商品仍保持完全相同的顺序。这样商业机制可见，却不会污染推荐任务。',
  ],
  [
    'evaluation',
    'Across two hundred official public sessions, Technical Score reaches zero point eight six six five; private performance remains unknown. The model and ads are product extensions outside this evaluation contract.',
    '在两百条官方公开会话上，技术分达到 0.8665；私有表现仍然未知。大模型与广告属于该评测合同之外的产品扩展，因此不计入这一指标。',
  ],
  [
    'experience',
    'What users experience is not a metric dashboard. They can keep talking, revise a preference, inspect what changed, understand why ranking moved, and see which question comes next.',
    '用户体验到的不是指标面板。他们可以继续对话、修改偏好、检查刚才发生了什么，理解排名为什么变化，也知道下一步会问什么。',
  ],
  [
    'close',
    'The same local model may polish the final reply, but cannot alter facts, state, or organic ranking. From vague intent to explainable recommendations and transparent ads, this is Shopping Copilot.',
    '同一个本地模型可以润色回答，但不能改变事实、状态和自然排名。从模糊意图到可解释推荐与透明广告，这就是 Shopping Copilot。',
  ],
];

export const v3Segments = rows.map(([focus, narration, zh], index) => ({
  id: `v3-${String(index + 1).padStart(2, '0')}`,
  index,
  focus,
  start: index * 10,
  end: (index + 1) * 10,
  narration,
  zh,
}));

const subtitlePairs = [
  ['Real shopping is rarely one clean search.', 'People add constraints, reject choices, and speak vaguely.', '真实购物很少是一次干净的搜索。', '用户会补充条件、否定旧选择，也会含糊地描述商品。'],
  ['That is why we built Shopping Copilot.', 'The model understands; the system remembers, retrieves, ranks, and explains.', '所以我们做了 Shopping Copilot。', '模型负责理解；系统负责记忆、检索、排序和解释。'],
  ['When rule confidence is low, local Qwen interprets intent and action.', 'It does not generate products, scores, or ranking decisions.', '规则置信度不足时，本地 Qwen 识别意图和动作。', '它不会生成商品、分数或排名决策。'],
  ['A vague request becomes structured intent.', 'Item request · Tanks and Camis · adjustable as a soft preference.', '一句含糊需求被转成结构化意图。', '商品请求 · 吊带类别 · “可调节”软偏好。'],
  ['Free text stops at the boundary; versioned state records the change.', 'SQLite FTS5 recalls candidates from fifty thousand frozen products.', '自由文本到边界为止；版本化状态记录变化。', 'SQLite FTS5 从五万个冻结商品中召回候选。'],
  ['Transparent rules rerank the recalled candidates.', 'The policy asks only the most discriminative follow-up.', '透明规则重新排序候选。', '问题策略只追问最有区分度的一项。'],
  ['Then the shopper changes direction: forget adjustable; use polyester.', 'The model identifies remove, add, and retain—not isolated keywords.', '接着用户改变主意：不要可调，改成聚酯纤维。', '模型识别删除、增加和保留，而不是孤立关键词。'],
  ['Version two marks adjustable as superseded and adds polyester.', 'A bounded rewrite with history—not append-only conflict or reset.', '版本二将“可调节”标为已失效，并加入聚酯纤维。', '这是有历史的有限改写，不是追加冲突或清空重来。'],
  ['The updated state drives the same retrieval and ranking engine.', 'Violating products leave; better matches enter; the list reorganizes.', '更新状态再次驱动同一套检索和排序。', '不符合条件的退出，更好的匹配进入，榜单连续重组。'],
  ['The verified replay places the target at rank one.', 'Category and material match; the old preference is gone.', '冻结回放让目标商品升到第一名。', '类别与材质匹配，旧偏好已经移除。'],
  ['The large model sits only at the entrance.', 'Multi-turn consistency comes from inspectable, versioned state.', '大模型只位于入口。', '多轮一致性来自可检查、可追溯的版本化状态。'],
  ['An offline prompt loop fixes repeated intent errors.', 'On ninety dev turns, v002 improved every metric and passed an opaque gate.', '离线提示词循环修复反复出现的意图错误。', '九十轮 dev 上，v002 全指标提升，并通过一次不透明验证门。'],
  ['To model real commerce, we added a separate advertising track.', 'Keywords, bids, and budgets never enter state, organic ranking, or evaluation.', '为了模拟真实商业场景，我们加入独立广告轨道。', '关键词、出价和预算不会进入状态、自然排名或官方评测。'],
  ['A relevance floor rejects off-topic inventory—even at a higher bid.', 'Eligible products compete by bid times relevance; spend is recorded.', '相关性门槛拒绝无关商品，即使它出价更高。', '合格候选按出价乘相关性竞价，预算消耗全程记录。'],
  ['The winner enters a clearly labeled sponsored position.', 'Every organic product remains in exactly the same order.', '胜出商品进入明确标注的赞助位。', '每一件自然商品仍保持完全相同的顺序。'],
  ['Public 200: Technical Score 0.8665; private performance remains unknown.', 'The model and ads are product extensions outside this evaluation contract.', '公开集 200 条：技术分 0.8665；私有表现仍然未知。', '大模型与广告属于评测合同之外的产品扩展。'],
  ['Users experience a conversation—not a metric dashboard.', 'They can revise, inspect changes, understand ranking, and continue.', '用户体验到的是对话，而不是指标面板。', '他们可以修改偏好、检查变化、理解排名并继续交流。'],
  ['The local model may polish replies, but cannot alter facts or ranking.', 'From vague intent to explainable recommendations and transparent ads.', '本地模型可以润色回答，但不能改变事实或排名。', '从模糊意图，到可解释推荐与透明广告。'],
];

export const v3SubtitlePages = subtitlePairs.flatMap(([enA, enB, zhA, zhB], segmentIndex) => [
  {id: `v3-page-${String(segmentIndex * 2 + 1).padStart(2, '0')}`, start: segmentIndex * 10, end: segmentIndex * 10 + 5, en: enA, zh: zhA},
  {id: `v3-page-${String(segmentIndex * 2 + 2).padStart(2, '0')}`, start: segmentIndex * 10 + 5, end: (segmentIndex + 1) * 10, en: enB, zh: zhB},
]);
