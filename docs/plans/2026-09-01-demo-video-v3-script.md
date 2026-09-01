# Shopping Copilot 3 分钟视频 V3.5 脚本（内容冻结）

画幅：1920×1080 · 30 fps · 180 秒
旁白：494 个英文词，约 165 WPM；每 10 秒 25–30 词
字幕：每 5 秒一页，中英双语烧录并提供 SRT / WebVTT
视觉：亮色 Editorial Social Commerce；衬线主标题；真实商品、电商手机、目录、面料与履约场景；不做逐页 PPT。

## 核心判断

> Shopping Copilot 新增的是 rules-first、本地 Qwen 兜底的意图理解层，而不是用大模型替换推荐引擎。大模型负责理解含糊、口语化、会反悔的表达；版本化状态、SQLite FTS5 召回、透明规则重排和澄清策略仍是核心。离线提示词循环用于修复反复出现的意图错误；v002 的公开表述只限于 90-turn dev 指标与一次 opaque validation 接受。广告是评测合同之外的独立产品扩展，不改变 organic Top-10。

## 10 秒旁白单元与 5 秒视觉拍点

| 时间 | 中文审稿旁白 | English VO | Words | 视觉重点 |
| --- | --- | --- | ---: | --- |
| 0:00–0:10 | 真实购物很少是一次干净的搜索。用户会补充条件、否定旧选择，也会含糊地说：就像刚才视频里那件，但轻一点、别太正式。 | Real shopping is rarely one clean search. People add constraints, reject earlier choices, and describe products vaguely—like the one from that video, only lighter and less formal. | 28 | 电商商品页与吊带背心；ADD / REJECT / OVERRIDE 依次出现。 |
| 0:10–0:20 | 所以我们做了 Shopping Copilot：让模型负责理解，让系统负责记忆、检索、排序和解释，贯穿一段完整的真实购物旅程。 | That is why we built Shopping Copilot: a conversational product that lets the model handle understanding while the system handles memory, retrieval, ranking, and explanation across the complete shopping journey. | 30 | 正式亮出产品名；MODEL / SYSTEM 权限分工。 |
| 0:20–0:30 | 当规则置信度不足，本地 Qwen 会判断用户意图和对话动作。但它不会生成商品、分数，也不会决定最终排名。 | When rule confidence is low, our local Qwen model interprets the user's intent and dialogue action. It does not generate products, scores, or ranking decisions. | 25 | LOW CONFIDENCE → LOCAL QWEN → NOT MODEL-GENERATED RANKING。 |
| 0:30–0:40 | 一句“想要长一点、适合打底、肩带可调的上衣”，被转成结构化意图：商品请求、吊带类别和一项软偏好。 | A vague request for a longer layering top with adjustable straps becomes structured intent: an item request, a Tanks and Camis category, and one soft preference. | 26 | ITEM / TANKS & CAMIS / ADJUSTABLE 写入结构化意图。 |
| 0:40–0:50 | 自由文本到这里为止。版本化状态记录类别和偏好，随后 SQLite FTS5 在本地从五万个冻结商品中召回候选。 | Free text stops at the boundary. A versioned state records the category and preference, then SQLite FTS5 recalls candidates from fifty thousand frozen catalog products locally. | 26 | 50,000 → 800 recall → Top-10，进入真实目录摄影。 |
| 0:50–1:00 | 透明规则重新排序。当重要属性仍有歧义，问题策略只追问最有区分度的一项，同时保留当前状态和不确定性。 | Transparent rules rerank those candidates. When important attributes remain ambiguous, the question policy asks only the most discriminative follow-up, while keeping current state and uncertainty visible. | 26 | MATERIAL / SIZE / FIT 区分度收敛到一个澄清问题。 |
| 1:00–1:10 | 接着用户改变主意：不要可调肩带，改成聚酯纤维，但保留长版。模型识别的是删除、增加和保留三种动作，而不是三个孤立关键词。 | Then the shopper changes direction: forget adjustable straps, use polyester, but keep the longer silhouette. The model identifies three actions—remove, add, and retain—not three unrelated keywords. | 28 | 面料微距；REMOVE / ADD / RETAIN。 |
| 1:10–1:20 | 状态版本二把“可调节”标为已失效，加入“聚酯纤维”，并保留有效类别。这是有历史的有限改写，不是追加冲突，也不是清空重来。 | Version two marks adjustable as superseded, adds polyester, and preserves the valid category. This is a bounded rewrite with history, not an append-only conflict or destructive reset. | 27 | V1→V2；adjustable 划除；polyester 加入；类别保留。 |
| 1:20–1:30 | 更新后的状态再次驱动同一套检索和排序。不符合新条件的商品退出，更好的匹配进入，整个榜单连续重组。 | The updated state drives the same retrieval and ranking engine again. Products that violate the new request leave, better matches enter, and the list reorganizes continuously. | 26 | 商品连续移动、退出和补位，不瞬间换页。 |
| 1:30–1:40 | 冻结回放让目标商品升到第一名：类别和材质现在匹配，旧偏好也已移除。变化来自状态，而不是模型临时发挥。 | The verified replay places the target at rank one because category and material now match and the old preference is gone. The change comes from state, not improvisation. | 28 | Emmalise 商品升至 Rank #1；展示三条匹配证据。 |
| 1:40–1:50 | 回看整条路径，大模型只在入口把复杂语言翻译成结构化动作。真正维持多轮一致性的，是能增加、删除、保留和追溯的显式状态。 | Looking back, the large model sits only at the entrance, translating difficult language into structured actions. Multi-turn consistency comes from inspectable state that can add, remove, retain, and trace. | 29 | LANGUAGE → STATE → PRODUCT，强调 state enduring。 |
| 1:50–2:00 | 离线提示词循环继续修复反复出现的意图错误。在九十轮 dev 集上，v002 的全部已报告指标均提升，并通过一次不透明 validation gate。 | An offline prompt loop then fixes repeated intent errors. On the ninety-turn dev set, v002 improved every reported metric and passed one opaque validation gate. | 25 | 失败样例变成显式规则；v001→v002 指标同步上升；标注 held-out not run。 |
| 2:00–2:10 | 为了模拟真实商业场景，我们加入独立广告轨道。广告主在其中配置关键词、出价和预算；这些数据不会进入用户状态、自然排名或官方评测。 | To model real commerce, we added a separate advertising track. Advertisers configure keywords, bids, and budgets there; those values never enter user state, organic ranking, or official evaluation. | 28 | Ads Manager 参数沿独立轨道进入竞价；明确 demo-only。 |
| 2:10–2:20 | 相关性门槛先拒绝无关商品，即使它出价更高。通过门槛的候选再按出价乘相关性竞价，每次展示和预算扣减都有记录。 | A relevance floor rejects off-topic inventory, even with a higher bid. Eligible products then compete by bid times relevance, with every impression and budget deduction recorded. | 26 | $1 relevant PASS；$5 off-topic BLOCKED；relevance floor 0.15。 |
| 2:20–2:30 | 胜出商品进入明确标注的赞助位，而每一件自然商品仍保持完全相同的顺序。这样商业机制可见，却不会污染推荐任务。 | The winner enters a clearly labeled sponsored position. Every organic product remains in exactly the same order, which makes the business mechanism visible without corrupting the recommendation task. | 28 | 一个 Sponsored 位；十个 organic 结果顺序前后完全一致。 |
| 2:30–2:40 | 在两百条官方公开会话上，技术分达到 0.8665；私有表现仍然未知。大模型与广告属于该评测合同之外的产品扩展，因此不计入这一指标。 | Across two hundred official public sessions, Technical Score reaches zero point eight six six five; private performance remains unknown. The model and ads are product extensions outside this evaluation contract. | 30 | 结果只占 10 秒；快速展示 0.8665 与 claim boundary。 |
| 2:40–2:50 | 用户体验到的不是指标面板。他们可以继续对话、修改偏好、检查刚才发生了什么，理解排名为什么变化，也知道下一步会问什么。 | What users experience is not a metric dashboard. They can keep talking, revise a preference, inspect what changed, understand why ranking moved, and see which question comes next. | 28 | WHY THIS CHANGED / WHY THIS RANKED / WHAT COMES NEXT。 |
| 2:50–3:00 | 同一个本地模型可以润色回答，但不能改变事实、状态和自然排名。从模糊意图到可解释推荐与透明广告，这就是 Shopping Copilot。 | The same local model may polish the final reply, but cannot alter facts, state, or organic ranking. From vague intent to explainable recommendations and transparent ads, this is Shopping Copilot. | 30 | 返回电商商品页与品牌；Cloudflare 和 GitHub 入口收尾。 |

## 证据与发布边界

1. Hybrid Product Demo 与 official public rules-path 证据分轨。
2. Rank #1、广告相关性门槛与 organic order 必须来自冻结 replay / 已实现机制。
3. 公开指标只来自 official public 200；private 800 unknown。
4. V3 成片使用英文配音、中英双语烧录字幕和项目原创背景音乐。
5. v002 只声明 synthetic Gold-candidate dev 的已报告指标提升与 opaque validation accepted；不声明 validation 逐项分数、held-out 提升或官方分数变化。
