/* ===================================================================
   Shopping Copilot bilingual presentation layer

   The English DOM remains the source of truth. This layer reversibly
   translates UI and explanatory copy while preserving raw public-session
   messages, product titles, identifiers, metrics, and commands.
   =================================================================== */
'use strict';

(function createShoppingCopilotI18n() {
  const STORAGE_KEY = 'shopping-copilot-language';
  const supported = new Set(['en', 'zh']);
  const textSource = new WeakMap();
  const attributeSource = new WeakMap();
  let currentLanguage = 'en';
  let observer = null;

  const zh = new Map(Object.entries({
    // Global chrome
    'Built for TikTok TechJam 2026 · Track 4': '为 TikTok TechJam 2026 · 赛题四打造',
    'Offline · Verified': '离线 · 已验证',
    'Tour': '导览',
    'Evidence': '证据',
    'Sandbox': '沙箱',
    'Source': '源码',
    '0 · Results': '0 · 结果',
    '1 · Data Contract': '1 · 数据合同',
    '2 · Replay': '2 · 回放',
    '3 · Mechanism': '3 · 机制',
    '4 · Evaluation': '4 · 评测',
    '5 · Ads': '5 · 广告',
    '6 · Close': '6 · 总结',

    // Step 0
    'Judge-facing evidence tour': '面向评委的证据导览',
    'Find the purchased product earlier and rank it higher — across 50,000 catalog items, in at most 10 turns.': '在 5 万件商品中，用不超过 10 轮对话更早找到目标商品，并把它排得更靠前。',
    'Start evidence tour': '开始证据导览',
    'Inspect verified results': '查看已验证结果',
    'Deterministic': '确定性',
    'Offline CPU': '离线 CPU',
    'Inspectable traces': '可检查轨迹',
    'Public evaluation': '公开集评测',
    'Verified': '已验证',
    'Rules V1.3 · frozen public evidence': 'Rules V1.3 · 冻结公开证据',
    'Competition Evidence': '比赛证据',
    'Official public evaluator ·': '官方公开集评测器 ·',
    'sessions': '个会话',
    'Python standard library · No API keys': 'Python 标准库 · 无需 API Key',
    'Private 800-session performance remains unknown.': '私有 800 个会话的表现仍未知。',
    'NEW · 3-MINUTE V3 FILM': '新增 · 三分钟 V3 影片',
    'Watch the complete product story.': '观看完整的产品故事。',
    'From vague social-commerce intent to versioned state, Rank #1, and transparent advertising — with English voice, bilingual burned-in subtitles, and an original score.': '从模糊的社交电商意图，到版本化状态、第 1 名和透明广告 — 配有英文旁白、双语内嵌字幕与原创配乐。',
    'English subtitles': '英文字幕',
    'Shopping Copilot three-minute V3 demo film': 'Shopping Copilot 三分钟 V3 演示影片',
    'NEW · 3-MINUTE V3 FILM': '全新 · 3 分钟 V3 成片',
    'Watch the complete product story.': '观看完整产品故事。',
    'From vague social-commerce intent to versioned state, Rank #1, and transparent advertising — with English voice, bilingual burned-in subtitles, and an original score.': '从模糊的社交电商意图，到版本化状态、Rank #1 与透明广告——包含英文配音、中英双语内嵌字幕和原创配乐。',
    'English subtitles': '英文字幕',

    // Step 1
    'Competition Data Contract': '比赛数据合同',
    'What we agreed to solve': '我们承诺解决的问题',
    'Dataset': '数据集',
    'Category': '品类',
    'Catalog Size': '商品目录规模',
    'Public Sessions': '公开会话',
    'Private Sessions': '私有会话',
    'Max Turns': '最大轮数',
    'Scored Identifier': '计分标识符',
    'Catalog': '商品目录',
    'Read-only': '只读',
    'SCENARIO MIX': '场景分布',
    'Buying': '购买',
    'Browsing': '浏览',
    'Override': '意图改写',
    'Boundary': '边界',
    'Catalog Samples': '商品目录样例',
    'Text-only metadata — no product images': '纯文本元数据 — 不使用商品图片',
    'Results': '结果',
    'See how one session evolves': '查看一次会话如何演进',
    '← Results': '← 结果',
    'See how one session evolves →': '查看一次会话如何演进 →',

    // Step 2
    'Scenario Replay': '场景回放',
    'Real public sessions from the official evaluator': '来自官方评测器的真实公开会话',
    '🛒 Buying': '🛒 购买',
    '👀 Browsing': '👀 浏览',
    '🔄 Intent Override': '🔄 意图改写',
    '🔲 Boundary · Edge case': '🔲 边界 · 极端情况',
    'Answer unlocks the target': '一次回答解锁目标',
    'Outside Top-10 on Turns 1–2; the material answer moves the target to Rank #1 on Turn 3.': '前两轮目标不在 Top-10；材质回答让目标在第三轮升至第 1 名。',
    'Rich preference bundle': '丰富偏好组合',
    'A detailed color and material answer brings a previously absent watch to Rank #1.': '详细的颜色与材质回答让原本缺席的手表升至第 1 名。',
    'Four-turn refinement': '四轮逐步细化',
    'The target stays outside Top-10 for three turns, then the closure answer moves it to Rank #2.': '目标前三轮都不在 Top-10，最后一次闭合回答让它升至第 2 名。',
    'Six-turn exploration': '六轮探索',
    'Vague browsing becomes leather, brown, rubber, casual, and soft; the target enters at Rank #1 on Turn 6.': '模糊浏览逐步明确为皮革、棕色、橡胶、休闲和柔软；目标在第六轮以第 1 名进入列表。',
    'Material clarification': '材质澄清',
    'The target is absent for two turns; a polyester and spandex answer moves it to Rank #1.': '目标连续两轮缺席；涤纶与氨纶回答让它升至第 1 名。',
    'Fast clarification': '快速澄清',
    'A vague shorts request becomes specific after one stretch-feature answer and reaches Rank #1.': '模糊的短裤需求经过一次弹性功能回答后变得明确，并达到第 1 名。',
    'Reset, then recover': '重置后恢复',
    'Remove the earlier stainless-steel preference, continue refining, and bring the target from outside Top-10 to Rank #1 on Turn 5.': '移除早先的不锈钢偏好并继续细化，让目标在第五轮从 Top-10 外升至第 1 名。',
    'Rank #5 to Rank #1': '从第 5 名到第 1 名',
    'Material evidence moves the target from #5 to #1; override then removes cotton and polyester while retaining wool.': '材质证据让目标从第 5 名升到第 1 名；随后改写删除棉和涤纶，同时保留羊毛。',
    'Rewrite multiple slots': '重写多个槽位',
    'Remove black, comfortable, and lightweight; add stainless steel and hypoallergenic; the scored target reaches Rank #1.': '删除黑色、舒适和轻量，新增不锈钢与低致敏；计分目标达到第 1 名。',
    'No-preference boundary': '无偏好边界',
    'An explicit no-preference answer is handled without losing the valid category state.': '系统处理明确的“无偏好”回答，同时保留有效的品类状态。',
    'Before override': '改写前',
    'Removed': '已移除',
    'Retained': '已保留',
    'Added': '已新增',
    'After override': '改写后',
    'None': '无',
    'Recommendation impact': '推荐影响',
    'User signal': '用户信号',
    'Initial Top-10': '初始 Top-10',
    'Initial list': '初始列表',
    'Scored hit': '计分命中',
    'Not scored yet': '尚未计分',
    'Outside Top-10': 'Top-10 之外',
    'Keep refining': '继续细化',
    'Source:': '来源：',
    'official public development session': '官方公开开发集会话',
    'Scenario:': '场景：',
    'Target labels visible because this is the labeled public split.': '由于这是带标签的公开划分，因此展示目标标签。',
    'Route': '路由',
    'Hard Constraints': '硬约束',
    'Soft Preferences': '软偏好',
    'Negative Constraints': '负向约束',
    'Ask Attribute': '追问属性',
    'Top-10 Recommendations': 'Top-10 推荐',
    'NEW': '新增',
    '★ Scored target': '★ 计分目标',
    'Public preview': '公开标签预览',
    'Not an official hit until the override gate is satisfied.': '在满足意图改写门槛前，不计作官方命中。',
    'Target not in Top-10 this turn': '本轮目标不在 Top-10',
    'Prev': '上一轮',
    'Next': '下一轮',
    'Auto': '自动播放',
    'Pause': '暂停',
    'Restart': '重新开始',
    '← Prev': '← 上一轮',
    'Next →': '下一轮 →',
    '▶ Auto': '▶ 自动播放',
    '⏸ Pause': '⏸ 暂停',
    '↻ Restart': '↻ 重新开始',
    'Data Contract': '数据合同',
    'How it works': '查看工作机制',
    '← Data Contract': '← 数据合同',
    'How it works →': '查看工作机制 →',

    // Step 3
    'Mechanism Inspection': '机制检查',
    'How the pipeline processes a real request': '流水线如何处理真实请求',
    'Shipped Pipeline': '正式流水线',
    'Prompt Evolution Lab': '提示词演化实验室',
    'Scheme B · Accepted Continuous Iteration': '方案 B · 已接受的持续迭代',
    'Prompt Evolution Lab · v002': '提示词演化实验室 · v002',
    'Codex-guided prompt evolution with a Qwen target, strict dev gate, opaque validation, and untouched held-out labels.': '由 Codex 引导提示词演化，Qwen 作为目标模型，并采用严格开发集门禁、不透明验证门禁和未触碰的保留集标签。',
    'Protected metric comparison': '受保护指标对比',
    'v001 → v002 · 90 dev turns': 'v001 → v002 · 90 个开发集轮次',
    'Leakage-safe promotion path': '防泄漏升级路径',
    'Codex optimizer · Qwen target': 'Codex 优化器 · Qwen 目标模型',
    'Behavior contract: v001 vs v002': '行为合同：v001 对比 v002',
    'Prompt-level rules · not live model output': '提示词层规则 · 非实时模型输出',
    'Promotion walkthrough': '升级流程演示',
    'Artifact-backed · deterministic': '产物支撑 · 确定性',
    'Intent-parser evidence only · official Rules V1.3 score unchanged · held-out not run': '仅代表意图解析器证据 · 官方 Rules V1.3 分数不变 · 保留集未运行',
    'Inspect Scheme B branch ↗': '查看方案 B 分支 ↗',
    'v001 composite': 'v001 综合分',
    'v002 composite': 'v002 综合分',
    'Absolute lift': '绝对提升',
    'DEV ACCEPTED': '开发集已接受',
    'VALIDATION ACCEPTED · OPAQUE': '验证集已接受 · 不透明门禁',
    'HELD-OUT NOT RUN': '保留集未运行',
    'Composite': '综合分',
    'Domain accuracy': '领域意图准确率',
    'Dialogue-act accuracy': '对话动作准确率',
    'Clarity accuracy': '清晰度准确率',
    'Slot F1': '槽位 F1',
    'Rollout state exact': '滚动状态完全一致率',
    'No-mutation preservation': '无变更保持率',
    'Selection accuracy': '选择准确率',
    'JSON compliance': 'JSON 合规率',
    'Scrub dev evidence': '清洗开发集证据',
    'Codex writes candidate': 'Codex 编写候选提示词',
    'Qwen target evaluates': 'Qwen 目标模型评估',
    'Strict dev gate': '严格开发集门禁',
    'Opaque validation gate': '不透明验证门禁',
    'Promote v002': '升级到 v002',
    'all protected metrics non-regressing': '所有受保护指标均不退化',
    'accept / reject only; terminal': '仅返回接受/拒绝；随后终止',
    'No validation text or metric feedback reaches the optimizer': '验证文本和指标反馈不会传给优化器',
    'Reject any protected-metric regression': '拒绝任何受保护指标退化',
    'Reject copied dev sentences, IDs, missing markers, or >15% length drift': '拒绝复制开发集句子、ID、缺失标记或超过 15% 的长度漂移',
    'Held-out labels remain unbundled and not run': '保留集标签不打包且未运行',
    'v001 contract': 'v001 合同',
    'v002 contract': 'v002 合同',
    'Dev gate': '开发集门禁',
    'Validation gate': '验证门禁',
    'Promote': '升级',
    'Composite improved and every protected metric was non-regressing': '综合分提升，且每个受保护指标均未退化',
    'Accepted through one opaque, terminal accept/reject check': '通过一次不透明且终止式的接受/拒绝检查',
    'system_prompt_v002.md became the current optional LLM prompt': 'system_prompt_v002.md 成为当前可选 LLM 提示词',
    'Category-only shopping': '仅品类购物请求',
    'Answer hardness': '回答值硬度',
    'No preference': '无偏好',
    'Reject recommendations': '拒绝推荐',
    'Fresh goal vs reset': '新目标与重置',
    'Explicit replacement': '显式替换',
    'Negative vs remove': '排除与移除',
    'Numeric selection': '数字选择',
    'Chinese normalization': '中文规范化',
    'Recognize vague shopping, but category extraction is not mandatory.': '能识别模糊购物，但不强制提取品类。',
    'Return VAGUE and explicitly emit category=Shoes.': '返回 VAGUE，并明确输出 category=Shoes。',
    'ANSWER is recognized, but the extracted value may remain soft.': '能识别 ANSWER，但提取值可能仍是软偏好。',
    'Values emitted by ANSWER are hard constraints.': 'ANSWER 输出的值必须是硬约束。',
    'No-preference intent is known, but the exact state delta is underspecified.': '能识别无偏好意图，但具体状态差异不够明确。',
    'Return VAGUE + L2 + NO_PREFERENCE and emit color/no_preference.': '返回 VAGUE + L2 + NO_PREFERENCE，并输出 color/no_preference。',
    'May recognize rejection without an explicit preservation rule.': '可能识别为拒绝，但没有明确的状态保留规则。',
    'Reject shown items while preserving budget, color, category, and other constraints.': '拒绝已展示商品，同时保留预算、颜色、品类等约束。',
    'May classify the phrase as RESET and clear all state.': '可能将该表达判为 RESET 并清空全部状态。',
    'A fresh requirement is NEW; only a pure restart command is RESET.': '出现新需求时判为 NEW；只有纯粹的重新开始命令才是 RESET。',
    'May write blue while leaving red active.': '可能写入蓝色，同时让旧红色继续生效。',
    'Remove the old red value and set blue in the same OVERRIDE.': '在同一个 OVERRIDE 中删除旧红色并写入蓝色。',
    'The boundary between exclusion and cancellation is less explicit.': '排除与取消旧要求之间的边界不够明确。',
    'negative excludes a value; remove only cancels a previous requirement.': 'negative 表示明确排除；remove 仅取消之前的要求。',
    'Extract rank two, with looser title-mining boundaries.': '提取第二个商品，但从标题挖掘属性的边界较宽松。',
    'Record selected_rank=2 and never mine attributes from product titles.': '只记录 selected_rank=2，禁止从商品标题重新提取属性。',
    'Translate obvious Chinese-English equivalents.': '转换明显的中英文同义词。',
    'Require canonical English categories and distinguish material, feature, and use_case.': '要求标准英文品类，并区分 material、feature 和 use_case。',
    'Intent Router': '意图路由器',
    'Buying or Browsing?': '购买还是浏览？',
    'Versioned State': '版本化状态',
    'Add, retain, or erase?': '新增、保留还是删除？',
    'SQLite FTS5 Recall': 'SQLite FTS5 召回',
    'Retrieve a broad pool': '召回广泛候选池',
    'Rule Reranker': '规则重排器',
    'Score matches transparently': '透明计算匹配分',
    'Question Policy': '追问策略',
    'Ask only what separates candidates': '只追问能区分候选的问题',
    'Input': '输入',
    'Decision': '决策',
    'Output': '输出',
    'Failure avoided': '规避的失败',
    'FAILURE PREVENTED': '已规避的失败',
    'Observed evidence': '观测证据',
    'Live trace evidence': '实时轨迹证据',
    'Live official trace': '官方实时轨迹',
    'Load a Replay case to inspect its live mechanism trace.': '请先加载一个回放案例，再检查对应的实时机制轨迹。',
    'MECHANISM': '机制',
    'User': '用户',
    'USER': '用户',
    'Message': '消息',
    'BUYING': '购买',
    'Lock constraints': '锁定约束',
    'BROWSING': '浏览',
    'Ask before filtering': '筛选前先追问',
    'DIALOGUE ACT': '对话动作',
    'Dialogue act': '对话动作',
    'DOMAIN_INTENT': '领域意图',
    'DIALOGUE_ACT': '对话动作',
    'CONFIDENCE': '置信度',
    'NEXT QUESTION': '下一个问题',
    'domain_intent': '领域意图',
    'dialogue_act': '对话动作',
    'confidence': '置信度',
    'next question': '下一个问题',
    'Failure prevented': '已规避的失败',
    'Before': '之前',
    'After': '之后',
    'values': '个值',
    'Frozen catalog': '冻结商品目录',
    'FTS5 OR terms': 'FTS5 OR 查询词',
    'Lexical pool': '词法候选池',
    'Broad recall': '广泛召回',
    'Visible list': '可见列表',
    'FTS5 terms': 'FTS5 查询词',
    'visible candidates': '可见候选',
    'returned list': '返回列表',
    'negative filter': '负向过滤',
    'none': '无',
    'OR query preview': 'OR 查询预览',
    'Deterministic order': '确定性顺序',
    'constraint score band → log1p(review_count) tie-break': '约束分数区间 → log1p(review_count) 平局裁决',
    'Candidates': '候选商品',
    'Score attributes': '属性评分',
    'Ask': '追问',
    'selected attribute': '选中属性',
    'visible Top-10': '可见 Top-10',
    'known constraints': '已知约束',
    'threshold': '阈值',
    'Decision rule': '决策规则',
    'max(coverage × entropy), excluding known and already-asked attributes': '取 coverage × entropy 最大值，并排除已知和已追问属性',
    'Raw user message + pending question context': '原始用户消息 + 待回答问题上下文',
    'Detect ITEM vs VAGUE intent and NEW / ANSWER / OVERRIDE / NOOP dialogue act. Concrete Buying locks constraints; vague Browsing asks before narrowing.': '识别 ITEM / VAGUE 意图以及 NEW / ANSWER / OVERRIDE / NOOP 对话动作。明确购买请求锁定约束；模糊浏览请求先追问再缩小范围。',
    'domain_intent + dialogue_act + extracted clauses': 'domain_intent + dialogue_act + 提取后的子句',
    'Premature Buying classification filters a vague request before the user has expressed useful constraints.': '过早分类为购买会在用户表达有效约束前就筛掉模糊请求。',
    'Buying HR 0.988 · Browsing HR 1.000': '购买 HR 0.988 · 浏览 HR 1.000',
    'Intent parse + previous ShoppingState': '意图解析 + 上一版 ShoppingState',
    'Apply hard, soft, and negative constraints. OVERRIDE erases superseded soft values before writing replacements instead of appending conflicts.': '应用硬约束、软偏好和负向约束。OVERRIDE 会先删除被替代的软偏好，再写入新值，而不是追加冲突。',
    'New inspectable state + added / removed / retained diff': '新的可检查状态 + 新增 / 移除 / 保留差异',
    'Append-only memory leaves contradictory preferences active and blocks the intended product.': '只追加不删除的记忆会让冲突偏好同时生效，从而阻挡目标商品。',
    'Intent Override HR 1.000 across 30 public sessions': '30 个公开会话中的意图改写 HR 为 1.000',
    'Category + hard/soft values + retrieval evidence + profile fallback': '品类 + 硬/软约束值 + 检索证据 + 画像回退',
    'Build a deduplicated OR query, retrieve a broad lexical pool, then remove rejected and negative-constraint products.': '构建去重的 OR 查询，召回广泛词法候选池，再移除已拒绝和违反负向约束的商品。',
    'Up to 50 policy candidates + requested Top-10': '最多 50 个策略候选 + 请求的 Top-10',
    'Narrow recall makes reranking irrelevant because the purchased product never reaches the candidate pool.': '召回过窄会让重排失去意义，因为目标商品根本无法进入候选池。',
    'Public target recall saturated at 200 / 200': '公开目标召回已达到 200 / 200 饱和',
    'FTS5 candidates + constraint state + user profile': 'FTS5 候选 + 约束状态 + 用户画像',
    'Start with 3 / (rank + 1), reward category and matched constraints, penalize missing hard attributes, then use popularity only inside near-tied score bands.': '以 3 / (rank + 1) 起始，奖励品类与约束匹配，惩罚硬属性缺失，并只在近似同分区间内使用人气信号。',
    'Deterministic ordered Top-10 parent_asin list': '确定性排序的 Top-10 parent_asin 列表',
    'Unbanded popularity can displace a clearly better constraint match; random ties bury relevant products.': '不分带的人气权重可能挤掉明显更符合约束的商品；随机平局也会埋没相关结果。',
    'TechnicalScore 0.826 → 0.867 with banded tie-breaking': '分带平局裁决让 TechnicalScore 从 0.826 提升到 0.867',
    'Current policy candidate pool + already known/asked attributes': '当前策略候选池 + 已知/已问属性',
    'For each remaining attribute, compute coverage × entropy. Ask the highest-information attribute only when its score clears 0.15.': '为每个剩余属性计算覆盖度 × 信息熵；只有最高信息量属性得分超过 0.15 时才追问。',
    'ask_attribute or null when the candidate set is focused': '候选集聚焦时返回 ask_attribute，否则为 null',
    'Fixed-order questions waste turns on attributes that do not separate the current products.': '固定顺序追问会把轮次浪费在无法区分当前商品的属性上。',
    'MTTC improved from 3.50 → 2.22': 'MTTC 从 3.50 改善到 2.22',
    'Cross-encoder reranker:': 'Cross-encoder 重排器：',
    'Built a full local MiniLM cross-encoder. Per-scenario analysis: helps Buying (+0.46 summed RR) but hurts Browsing (−1.38) because generic queries mislead the semantic ranker. Net effect: flat to slightly negative.': '我们构建了完整的本地 MiniLM cross-encoder。分场景分析显示：它改善购买场景（累计 RR +0.46），但损害浏览场景（−1.38），因为宽泛查询会误导语义重排。整体效果持平或略微下降。',
    'Decision: ship rules-only, keep experiment for transparency.': '决策：正式路径仅使用规则，同时保留实验以确保透明。',
    'Ranking score anatomy': '排序分数构成',
    'Transparent weights from the shipped rules path': '正式规则路径中的透明权重',
    'Recall rank': '召回位次',
    'Category match': '品类匹配',
    'Hard value': '硬约束值',
    'Hard miss': '硬约束缺失',
    'Soft value': '软偏好值',
    'Profile tag': '画像标签',
    'Rating': '评分',
    'Popularity': '人气',
    'tie-break only': '仅用于打破平局',
    'Experiments we did not ship': '未进入正式路径的实验',
    'Negative Result': '负向结果',
    'Experimental LLM Layer · Continuous Iteration': '实验性 LLM 层 · 持续迭代',
    'Evaluate, diagnose, rewrite, guard, and re-evaluate a localhost Qwen intent prompt.': '对本地 Qwen 意图提示词进行评估、诊断、改写、守护与重新评估。',
    'Six-round evaluation': '六轮评估',
    'Train / test · direct labels': '训练 / 测试 · 直接标签',
    'Iteration loop': '迭代闭环',
    'Guarded rewrite workflow': '带守护机制的改写流程',
    'Evaluate': '评估',
    'Mine bad cases': '挖掘错误案例',
    'Diagnose confusion': '诊断混淆',
    'Rewrite': '改写',
    'Guard': '守护检查',
    'Re-evaluate': '重新评估',
    'Abstract shared rules instead of enumerating cases': '抽象共享规则，而不是枚举具体案例',
    'Separate train-only noise from test generalization signals': '区分训练集噪声与测试集泛化信号',
    'Keep already-passing dimensions unchanged': '保持已经通过的维度不变',
    'Reject rewrites below 85% length or missing required structural markers': '拒绝长度低于 85% 或缺少必要结构标记的改写',
    'Sensitivity monitor': '敏感性监测',
    'Controlled A/B · test score': '受控 A/B · 测试分数',
    'Seed · as-is': '种子 · 原样',
    'Seed · normalized': '种子 · 规范化',
    'Round 1 · as-is': '第 1 轮 · 原样',
    'Round 1 · + newline': '第 1 轮 · 添加换行',
    'Whitespace sensitivity is tracked as a robustness signal for continued iteration.': '持续跟踪空白字符敏感性，作为后续迭代的稳健性信号。',
    'Seed prompt evaluated': '已评估种子提示词',
    'Trailing newline normalized': '已规范化尾部换行',
    'Guarded prompt retained': '保留通过守护检查的提示词',
    'Confusion signal': '混淆信号',
    'Iteration action': '迭代动作',
    'Prompt ends with newline': '提示词以换行结尾',
    'Prompt normalized without trailing newline': '提示词已规范化，不含尾部换行',
    'Train': '训练',
    'Test': '测试',
    'train': '训练',
    'test': '测试',
    'Prompt': '提示词',
    'Δ test': 'Δ 测试',
    'Golden-case simulator': '黄金案例模拟器',
    'Deterministic walkthrough · real case contracts': '确定性演示 · 真实案例合同',
    'Run walkthrough': '运行演示',
    'Running': '运行中',
    'Run again': '再次运行',
    '▶ Run walkthrough': '▶ 运行演示',
    '⏸ Running': '⏸ 运行中',
    '↻ Run again': '↻ 再次运行',
    'Deterministic walkthrough using a real golden-case contract': '使用真实黄金案例合同的确定性演示',
    'Expected contract': '预期合同',
    'Diagnose': '诊断',
    'Abstract a shared rule; do not enumerate this exact phrase': '抽象共享规则，不枚举这一条具体表达',
    'Check train/test split, length, and required output markers': '检查训练/测试划分、长度和必要输出标记',
    'Preserve concrete shopping intent despite a product typo.': '即使商品词有拼写错误，也要保留明确的购物意图。',
    'Keep exploratory language broad and ask before filtering.': '保持探索性语言的宽泛含义，在筛选前先追问。',
    'Replace the earlier category direction instead of appending a conflict.': '替换之前的品类方向，而不是追加冲突条件。',
    'Route promotion intent without polluting shopping constraints.': '正确路由促销意图，不污染购物约束。',
    'Development experiment · separate from the official deterministic score path': '研发实验 · 与官方确定性计分路径分离',
    'Qwen3-8B · localhost-only · zero fine-tuning': 'Qwen3-8B · 仅本地主机 · 零微调',
    'Inspect source & rounds': '查看源码与轮次',
    'Inspect source & rounds ↗': '查看源码与轮次 ↗',
    'Replay': '回放',
    'See the numbers': '查看评测数据',
    '← Replay': '← 回放',
    'See the numbers →': '查看评测数据 →',

    // Step 4
    'Evaluation Evidence': '评测证据',
    'Official public-set evaluator result · Not hidden-set evidence': '官方公开集评测结果 · 不代表隐藏集证据',
    'Efficiency': '效率',
    'VERSION COMPARISON': '版本对比',
    'Version': '版本',
    'Official Weak BM25 Baseline': '官方弱 BM25 基线',
    'Rules V1.3 (submitted)': 'Rules V1.3（已提交）',
    'PER-SCENARIO BREAKDOWN (V1.3)': '分场景表现（V1.3）',
    'Scenario': '场景',
    'Intent Override': '意图改写',
    'Reproduce & artifact provenance': '复现与产物溯源',
    'Command · report hash · agent commit': '命令 · 报告哈希 · Agent 提交',
    'Report:': '报告：',
    'Agent commit:': 'Agent 提交：',
    'Generated:': '生成时间：',
    'official public sessions. Not hidden-set evidence.': '个官方公开会话，不代表隐藏集证据。',
    'Mechanism': '机制',
    'Beyond the benchmark': '超越基准',
    '← Mechanism': '← 机制',
    'Beyond the benchmark →': '超越基准 →',

    // Step 5
    'Beyond the Benchmark — Transparent Ads': '超越基准 — 透明广告',
    'Demo-only commercial extension': '仅用于演示的商业扩展',
    'Demo Only': '仅演示',
    'Demo-only commercial extension.': '仅用于演示的商业扩展。',
    'Never called by the official evaluator. Does not alter organic Top-10 ranking.': '官方评测器不会调用此模块，也不会改变自然 Top-10 排序。',
    'PRESET EXPERIMENT': '预设实验',
    'Campaign A': '广告活动 A',
    'Campaign B': '广告活动 B',
    'Bid': '出价',
    'Relevance': '相关性',
    'Run Auction': '运行竞价',
    'AUCTION RESULT': '竞价结果',
    'eCPM = bid × relevance': 'eCPM = 出价 × 相关性',
    'Winner: Campaign': '胜出：广告活动',
    'ORGANIC TOP-10: BEFORE vs AFTER': '自然 Top-10：前后对比',
    'BEFORE — ORGANIC': '之前 — 自然结果',
    'AFTER — SPONSORED + ORGANIC': '之后 — 赞助结果 + 自然结果',
    'Sponsored': '赞助',
    'Sponsored slot unavailable': '赞助广告位不可用',
    'Evaluation': '评测',
    'Wrap up': '查看总结',
    '← Evaluation': '← 评测',
    'Wrap up →': '查看总结 →',
    'This chapter proves: transparent ad auction · relevance-aware monetization · budget accounting · official/demo path isolation · impact potential.': '本章展示：透明广告竞价 · 相关性感知变现 · 预算核算 · 官方/演示路径隔离 · 影响潜力。',
    'Current scope:': '当前范围：',
    'impression auction and budget accounting': '曝光竞价与预算核算',
    'No click/conversion path, CTR, or GMV.': '不包含点击/转化路径、CTR 或 GMV。',
    '. No click/conversion path, CTR, or GMV.': '。不包含点击/转化路径、CTR 或 GMV。',

    // Step 6
    'Deliverables & Limitations': '交付物与局限',
    'Public Repository': '公开仓库',
    'Technical Report': '技术报告',
    'Reproduction Instructions': '复现说明',
    'Demo Video': '演示视频',
    'V3 Demo Video': 'V3 演示视频',
    '🎥 V3 Demo Video': '🎥 V3 演示视频',
    '📂 Public Repository': '📂 公开仓库',
    '📄 Technical Report': '📄 技术报告',
    '🔁 Reproduction Instructions': '🔁 复现说明',
    '🎥 Demo Video': '🎥 演示视频',
    '(placeholder)': '（占位）',
    'Limitations': '局限性',
    '5 explicit claim boundaries': '5 条明确声明边界',
    'Public-set gains fix generic error classes but do not substitute for the hidden 800-session validation.': '公开集提升解决的是通用错误类型，不能替代对 800 个隐藏会话的验证。',
    'Popularity tiebreaker band (5.0) is tuned on public 200; a conservative band=3 (+0.03) is available if hidden set regresses.': '人气平局裁决区间（5.0）基于 200 个公开会话调节；若隐藏集退化，可使用更保守的 band=3（+0.03）。',
    'The optional Qwen layer improves vague-intent classification but is not required for reported scores.': '可选 Qwen 层可改善模糊意图分类，但报告分数不依赖它。',
    'No dense/vector recall — proven unnecessary since recall is 100% saturated (200/200).': '不使用稠密/向量召回 — 召回已达到 100% 饱和（200/200），因此没有必要。',
    'Ad engine is demo-only with simulated inventory and budgets.': '广告引擎仅用于演示，库存与预算均为模拟数据。',
    'What we ship: a deterministic, offline, reproducible scored Agent.': '我们交付：一个确定性、离线、可复现的计分 Agent。',
    'What we demonstrate beyond the score: transparent commercial extensions.': '我们在分数之外展示：透明的商业扩展。',
    'What remains unknown: organizer-private 800-session performance.': '仍然未知：主办方私有 800 个会话的表现。',
    'Team Contributions': '团队贡献',
    'Retrieval, state machine, rule rerank, official-contract adapter, unit tests, evaluation harness.': '检索、状态机、规则重排、官方合同适配器、单元测试与评测框架。',
    'Cross-encoder experiment, path portability, offline reproduction, technical report.': 'Cross-encoder 实验、路径可移植性、离线复现与技术报告。',
    'Local Qwen3-8B deployment, prompt self-evolution, sponsored-ads engine, demo frontend.': '本地 Qwen3-8B 部署、提示词自迭代、赞助广告引擎与演示前端。',
    'Ads': '广告',
    'Tour Complete': '导览完成',
    'Explore all evidence': '浏览全部证据',
    '← Ads': '← 广告',
    'Explore all evidence →': '浏览全部证据 →',

    // Error and accessibility copy
    'Evidence artifacts not found': '未找到证据产物',
    'Run:': '请运行：',
    'Result hook': '结果总览',
    'Data contract': '数据合同',
    'Scenario replay': '场景回放',
    'Mechanism inspection': '机制检查',
    'Transparent ads': '透明广告',
    'Closeout': '总结',
    'Site navigation': '站点导航',
    'Tour progress': '导览进度',
    'Scenario type': '场景类型',
    'Canonical case selector': '典型案例选择器',
    'Turn timeline': '轮次时间线',
    'Replay controls': '回放控制',
    'Previous turn': '上一轮',
    'Next turn': '下一轮',
    'Auto play': '自动播放',
    'Restart case': '重新开始案例',
    'Mechanism lab mode': '机制实验室模式',
    'Mechanism pipeline': '机制流水线',
    'Mechanism visualization': '机制可视化',
    'Rule ranking score anatomy': '规则排序分数构成',
    'Prompt evolution train and test scores by round': '各轮提示词演化训练与测试分数',
    'Prompt evolution round selector': '提示词演化轮次选择器',
    'Prompt sensitivity comparison': '提示词敏感性对比',
    'Verified public evaluation score': '已验证的公开集评测分数',
    'Offline verified evidence': '离线已验证证据',
    'Start 3-minute evidence tour': '开始三分钟证据导览',
    'Inspect verified results': '查看已验证结果',
    'System properties': '系统属性',
    'Previous step': '上一步',
    'Next step': '下一步'
  }));

  const exactPrefixPatterns = [
    [/^(\d[\d,]*) frozen products$/, '$1 件冻结商品'],
    [/^(\d[\d,]*) \(labeled\)$/, '$1 个（有标签）'],
    [/^(\d[\d,]*) \(unknown\)$/, '$1 个（未知）'],
    [/^(\d[\d,]*) reviews$/, '$1 条评价'],
    [/^Case (\d+)$/, '案例 $1'],
    [/^(\d+) · Mechanism$/, '$1 · 机制'],
    [/^Turn (\d+)$/, '第 $1 轮'],
    [/^Turn (\d+) · ✓ Hit$/, '第 $1 轮 · ✓ 命中'],
    [/^Turn (\d+) \/ (\d+)$/, '第 $1 / $2 轮'],
    [/^(.+) · Turn (\d+) \/ (\d+)$/, '$1 · 第 $2 / $3 轮'],
    [/^Step (\d+) of 6$/, '第 $1 / 6 步'],
    [/^Step 6 of 6 — Tour Complete$/, '第 6 / 6 步 — 导览完成'],
    [/^Rank #(\d+)$/, '第 $1 名'],
    [/^Preview #(\d+)$/, '预览第 $1 名'],
    [/^Initial list · Outside Top-10$/, '初始列表 · Top-10 之外'],
    [/^Initial list · Rank #(\d+)$/, '初始列表 · 第 $1 名'],
    [/^Initial list · Preview #(\d+)$/, '初始列表 · 预览第 $1 名'],
    [/^(\d+) new · (\d+) moved$/, '新增 $1 · 位移 $2'],
    [/^(\d+) new · (\d+) retained · (\d+) reordered · (.+)$/, '新增 $1 · 保留 $2 · 重排 $3 · $4'],
    [/^Recommendation impact · (.+)$/, '推荐影响 · $1'],
    [/^User signal T(\d+):$/, '用户信号 T$1：'],
    [/^Public-label preview at rank #(\d+)$/, '公开标签预览：第 $1 名'],
    [/^✓ Target hit at rank #(\d+)$/, '✓ 目标在第 $1 名命中'],
    [/^Round (\d+)$/, '第 $1 轮'],
    [/^Round (\d+) inspection$/, '第 $1 轮检查'],
    [/^(\d+) rounds$/, '$1 轮'],
    [/^(\d+) dev sessions \/ (\d+) turns$/, '$1 个开发集会话 / $2 个轮次'],
    [/^(\d+) validation · opaque gate$/, '$1 个验证集会话 · 不透明门禁'],
    [/^Held-out not run$/, '保留集未运行'],
    [/^\+([0-9.]+)% relative$/, '+$1% 相对提升'],
    [/^Artifact-backed walkthrough · source branch (.+)$/, '产物支撑的流程演示 · 来源分支 $1'],
    [/^Best observed (.+)$/, '最佳观测值 $1'],
    [/^(\d+) train \/ (\d+) test$/, '$1 个训练 / $2 个测试'],
    [/^(\d+) chars$/, '$1 个字符'],
    [/^(\d+) values$/, '$1 个值'],
    [/^\+(\d+) added$/, '+$1 新增'],
    [/^−(\d+) removed$/, '−$1 移除'],
    [/^=(\d+) retained$/, '=$1 保留'],
    [/^Contract target remains (.+)$/, '合同目标保持为 $1'],
    [/^Winner: Campaign ([AB])$/, '胜出：广告活动 $1'],
    [/^✓ Verified: all (\d+) organic parent_asin values remain in identical order\.$/, '✓ 已验证：全部 $1 个自然 parent_asin 保持完全相同的顺序。'],
    [/^✓ DemoState\._inject_sponsored is covered by a non-placeholder unit test\.$/, '✓ DemoState._inject_sponsored 已由非占位单元测试覆盖。'],
    [/^N = (\d+) official public sessions\. Not hidden-set evidence\.$/, 'N = $1 个官方公开会话，不代表隐藏集证据。'],
    [/^Generated: (.+)$/, '生成时间：$1'],
    [/^Report: (.+)$/, '报告：$1'],
    [/^Agent commit: (.+)$/, 'Agent 提交：$1']
  ];

  function translateCore(source) {
    if (zh.has(source)) return zh.get(source);
    let translated = source;
    for (const [pattern, replacement] of exactPrefixPatterns) {
      if (pattern.test(translated)) {
        translated = translated.replace(pattern, replacement);
        break;
      }
    }
    translated = translated
      .replace(/\bBuying\b/g, '购买')
      .replace(/\bBrowsing\b/g, '浏览')
      .replace(/\bIntent Override\b/g, '意图改写')
      .replace(/\bOverride\b/g, '意图改写')
      .replace(/\bBoundary\b/g, '边界')
      .replace(/\bbuying\b/g, '购买')
      .replace(/\bbrowsing\b/g, '浏览')
      .replace(/\bintent override\b/g, '意图改写')
      .replace(/\bboundary\b/g, '边界')
      .replace(/\bScored target\b/g, '计分目标')
      .replace(/\bPublic preview\b/g, '公开预览')
      .replace(/\bno preference\b/g, '无偏好')
      .replace(/^Campaign A:/, '广告活动 A：')
      .replace(/^Campaign B:/, '广告活动 B：')
      .replace(/\(below relevance floor ([^)]+)\)/g, '（低于相关性门槛 $1）')
      .replace(/\bimpression \+1\b/g, '曝光 +1')
      .replace(/\bbudget −/g, '预算 −');
    translated = translated
      .replace(/\bReport:/g, '报告：')
      .replace(/\bGenerated:/g, '生成时间：')
      .replace(/\bAgent commit:/g, 'Agent 提交：');
    return translated;
  }

  function translateText(source) {
    if (!source || !source.trim()) return source;
    const leading = source.match(/^\s*/)[0];
    const trailing = source.match(/\s*$/)[0];
    const core = source.slice(leading.length, source.length - trailing.length);
    return leading + translateCore(core) + trailing;
  }

  function ignoredTextNode(node) {
    const parent = node.parentElement;
    return !parent || Boolean(parent.closest(
      'script, style, code, pre, [data-i18n-ignore], .user-msg, .agent-msg, ' +
      '.catalog-sample .title, .result-item .asin-title, .rank-journey-target > strong'
    ));
  }

  function localizeTextNode(node) {
    if (ignoredTextNode(node)) return;
    if (!textSource.has(node)) textSource.set(node, node.nodeValue);
    const source = textSource.get(node);
    node.nodeValue = currentLanguage === 'zh' ? translateText(source) : source;
  }

  const translatedAttributes = ['aria-label', 'title', 'placeholder'];

  function localizeAttributes(element) {
    if (!(element instanceof Element) || element.closest('[data-i18n-ignore]')) return;
    if (!attributeSource.has(element)) attributeSource.set(element, new Map());
    const sourceMap = attributeSource.get(element);
    for (const attribute of translatedAttributes) {
      if (!element.hasAttribute(attribute)) continue;
      if (!sourceMap.has(attribute)) sourceMap.set(attribute, element.getAttribute(attribute));
      const source = sourceMap.get(attribute);
      element.setAttribute(attribute, currentLanguage === 'zh' ? translateText(source) : source);
    }
  }

  function localizeTree(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      localizeTextNode(root);
      return;
    }
    if (!(root instanceof Element) && root !== document.body) return;
    if (root instanceof Element) localizeAttributes(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) localizeTextNode(node);
      else localizeAttributes(node);
      node = walker.nextNode();
    }
  }

  function observe() {
    if (!observer || !document.body) return;
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: translatedAttributes
    });
  }

  function withoutObserving(action) {
    if (observer) observer.disconnect();
    action();
    observe();
  }

  function refreshToggle() {
    const toggle = document.getElementById('languageToggle');
    if (!toggle) return;
    toggle.querySelectorAll('[data-language]').forEach(option => {
      option.classList.toggle('active', option.dataset.language === currentLanguage);
    });
    toggle.setAttribute('aria-label', currentLanguage === 'zh' ? 'Switch to English' : '切换到中文');
    toggle.setAttribute('title', currentLanguage === 'zh' ? 'Switch to English' : '切换到中文');
    toggle.setAttribute('aria-pressed', currentLanguage === 'zh' ? 'true' : 'false');
  }

  function updateUrl(language) {
    const url = new URL(window.location.href);
    const activeStep = document.querySelector('.tour-step.active');
    if (activeStep && activeStep.dataset.step) url.searchParams.set('step', activeStep.dataset.step);
    url.searchParams.set('lang', language);
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }

  function applyLanguage(language, options = {}) {
    currentLanguage = supported.has(language) ? language : 'en';
    document.documentElement.lang = currentLanguage === 'zh' ? 'zh-CN' : 'en';
    document.title = currentLanguage === 'zh'
      ? 'Shopping Copilot — 证据导览'
      : 'Shopping Copilot — Evidence Tour';
    withoutObserving(() => {
      localizeTree(document.body);
      refreshToggle();
    });
    if (options.persist !== false) {
      window.localStorage.setItem(STORAGE_KEY, currentLanguage);
      updateUrl(currentLanguage);
    }
    document.dispatchEvent(new CustomEvent('shoppingcopilot:languagechange', {
      detail: { language: currentLanguage }
    }));
  }

  function detectLanguage() {
    const query = new URLSearchParams(window.location.search).get('lang');
    if (supported.has(query)) return query;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (supported.has(saved)) return saved;
    return String(window.navigator.language || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
  }

  function boot() {
    observer = new MutationObserver(records => {
      withoutObserving(() => {
        for (const record of records) {
          if (record.type === 'childList') {
            record.addedNodes.forEach(node => localizeTree(node));
          } else if (record.type === 'characterData') {
            if (!ignoredTextNode(record.target)) {
              textSource.set(record.target, record.target.nodeValue);
              localizeTextNode(record.target);
            }
          } else if (record.type === 'attributes') {
            const sourceMap = attributeSource.get(record.target) || new Map();
            sourceMap.set(record.attributeName, record.target.getAttribute(record.attributeName));
            attributeSource.set(record.target, sourceMap);
            localizeAttributes(record.target);
          }
        }
      });
    });

    const toggle = document.getElementById('languageToggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        applyLanguage(currentLanguage === 'zh' ? 'en' : 'zh');
      });
    }
    applyLanguage(detectLanguage(), { persist: false });
    observe();
  }

  window.ShoppingCopilotI18n = {
    applyLanguage,
    getLanguage: () => currentLanguage,
    setLanguage: applyLanguage,
    translateText
  };

  document.addEventListener('DOMContentLoaded', boot);
}());
