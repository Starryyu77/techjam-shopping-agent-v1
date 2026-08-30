# Judge-Facing Demo Website Design — Shopping Copilot

状态：Implemented and deployed，P0 已验收
日期：2026-08-30
目标读者：实现 Agent、前端开发者、Demo 视频录制者、项目 owner

## 0. 结论先行

把当前“自由聊天首页”改为一个 **3 分钟、证据驱动、无需输入的 Guided Evidence Tour**。评委点击 `Start evidence tour` 后，网站用真实 competition public data 依次证明：

1. 我们理解官方数据与评分合同；
2. Agent 能区分 Buying / Browsing；
3. 状态机能处理信息累积与 Intent Override；
4. 方案在官方 public evaluator 上显著超过 baseline；
5. 架构轻量、离线、可复现；
6. 广告推荐是评分路径之外的商业扩展，透明且不改变 organic ranking。

自由输入不删除，但降级为 tour 结束后的 `Live Sandbox (experimental)`。它不能成为首屏，也不能被当作官方成绩证据。

---

## 1. 官方依据与设计含义

官方 Track 4 信息页：`https://bit.ly/TikTokTechJam2026Info`

### 已核验的要求

- UI/UX Development 明确属于 out of scope；评分通过 automated backend APIs / headless pipelines。
- 后端/NLP 赛道如果不需要前端，Demo Video 可以展示 API usage、inference examples 或 result analysis。
- 数据是 Amazon Reviews 2023 `Clothing_Shoes_and_Jewelry` 的 frozen 50,000-product catalog。
- 有 200 个 public development sessions，另有 800 个 organizer-private sessions；二者用户与目标商品分离。
- Max Turns = 10；catalog read-only；不得注入 mock ASIN。
- 必交付：Devpost written description、public repository、public YouTube demo video。
- 视频需 end-to-end 展示方案；不得使用未经许可的第三方商标或版权内容。
- Judging：Technical Execution 35%、Innovation & Problem Insight 20%、Impact & Relevance 20%、Feasibility & Practicality 15%、Presentation & Communication 10%。

### 对网站的直接约束

- 网站不是“比赛要求本身”，而是用于生成高质量 Demo Video、帮助评委快速理解工程证据。
- 首屏不能像消费产品 landing page，也不能要求评委先猜一句 query。
- 必须先展示 official dataset / protocol / score，再展示广告等延伸能力。
- 不仿制 TikTok Shop 品牌界面，不使用 TikTok logo、Amazon 商品图片或其他未经授权素材。产品名使用 `Shopping Copilot`，副标题使用 `Built for TikTok TechJam 2026 · Track 4`。
- 所有 metric、session、商品和排名必须由真实 artifact 生成，禁止手写演示数字。

---

## 2. 三种方案比较

### A. Guided Evidence Tour（推荐）

类似可交互的技术答辩：固定 6 个章节，每章 1–2 次点击，所有内容来自真实 public evaluator trace。

- 优点：视频稳定、不会跑偏、每屏都能映射评分项、最适合 3 分钟讲清楚。
- 缺点：自由探索感较弱。

### B. Benchmark Dashboard

首屏是数据与指标 Dashboard，评委从 scenario、session、版本对比中自由钻取。

- 优点：技术证据密度高，适合深挖。
- 缺点：缺少故事线，视频容易像“读报表”。

### C. Interactive Lab

保留聊天输入，用 presets、trace panel 和广告后台辅助展示。

- 优点：更像完整产品，互动性强。
- 缺点：存在自然语言长尾、状态竞态和现场失败风险；容易让评委把注意力放在 UI bug，而非 benchmark。

### 最终组合

采用 **A 为主、B 为证据深挖、C 为末尾可选 sandbox**。页面默认路径永远是 A。

---

## 3. 信息架构

```text
/
└── Guided Evidence Tour
    ├── 0. Hero / Result hook
    ├── 1. Competition data contract
    ├── 2. Scenario replay
    ├── 3. Mechanism inspection
    ├── 4. Evaluation evidence
    ├── 5. Beyond the benchmark: transparent ads
    └── 6. Reproducibility / limitations / links

/evidence
└── Evidence Explorer
    ├── Version comparison
    ├── Scenario metrics
    ├── Public session browser
    └── Artifact / command / checksum drawer

/sandbox
└── Live Sandbox (experimental)
    ├── Guided prompt chips
    ├── Optional free text
    ├── State + Top-10 trace
    └── Reset / return to tour
```

`/ads` 和 `/dashboard` 不再是顶部主导航。广告能力在主 tour 的第 5 章以预设实验展示；高级控制台可从该章的 `Open ad lab` 次级入口进入。

---

## 4. Guided Tour 详细设计

### Step 0 — Hero：20 秒内建立可信度

页面文案：

```text
Shopping Copilot
Find the purchased product earlier and rank it higher —
over 50,000 catalog items, in at most 10 turns.

TechnicalScore 0.8665
HitRate@10 0.995 · MRR 0.644 · MTTC 2.215

[Start 3-minute evidence tour]  [Inspect verified results]

Official public evaluator · 200 sessions
Offline CPU · Python standard library · No API keys
Private 800-session performance remains unknown.
```

要求：

- 主 CTA 唯一高亮。
- 不出现聊天输入框。
- `0.8665` 必须由 evidence manifest 读取，不能写死在 HTML。
- “public 200 / private 800 unknown”与分数同时出现，防止 claim 升格。

### Step 1 — Competition Data Contract

目的：明确我们用的是比赛数据，不是自造购物 Demo。

布局：左侧数据合同，右侧真实 catalog sample。

必须展示：

- `Amazon Reviews 2023`
- `Clothing_Shoes_and_Jewelry`
- `50,000 frozen products`
- `200 public sessions / 800 private sessions`
- `10 turns maximum`
- `parent_asin is the scored identifier`
- `catalog read-only`
- 场景比例：Buying 40%、Browsing 40%、Intent Override 15%、Boundary 5%（从 official config 读取）

右侧展示 2–3 个真实 catalog rows，仅使用比赛可见字段：

- title
- categories
- price（如有）
- features / details 摘要
- average_rating / rating_number
- store
- parent_asin

禁止使用外部商品图片。可以用纯文本 metadata card，强调这是 text-only catalog。

CTA：`See how one session evolves →`

### Step 2 — Scenario Replay

这是整个网站的核心组件。

顶部四张场景卡：

1. Buying — hard constraint disclosed early
2. Browsing — vague intent, proactive clarification
3. Intent Override — old preference erased and rewritten
4. Boundary — user has no preference for requested attribute

默认自动选择 Buying。Intent Override 是视频中的第二个重点案例。Boundary 必须使用官方定义的“no preference”场景，不再用优惠券/天气代替比赛 Boundary。

主舞台三栏：

```text
Turn timeline          State diff / decision          Ranked result
user message           Buying vs Browsing             target rank
agent question         + hard / soft / negative       Top-10 parent_asin
next customer reply    erased / retained slots        hit / miss
```

控制：

- `Next turn`（主操作）
- `Auto play`
- `Pause`
- `Restart case`
- `Compare with BM25 baseline`

每次 Next turn 只做一件事，并高亮变化：

- 新增 slot 用绿色；
- 被 override 删除的 slot 用删除线后淡出；
- 保留 slot 不闪烁；
- target rank 改善用一条短动画表示；
- candidate pool 变化如有真实数据则显示，无真实 artifact 时不编造。

Case header 必须显示：

```text
Source: official public development session
sample_id: public_xxxx
scenario: intent_override
Target labels are visible because this is the labeled public split.
```

### Step 3 — Mechanism Inspection

不要做静态架构图。使用刚才选择的 session trace，把一次请求沿真实 pipeline 展开：

```text
Message
  → Intent router (Buying / Browsing)
  → Versioned constraint state
  → SQLite FTS5 candidate retrieval
  → Rule reranking + hard/soft/negative constraints
  → Candidate-driven clarification policy
  → Top-10 parent_asin
```

四个可点击 mechanism card：

- `Dual-track routing`
- `Erase-and-rewrite state machine`
- `Question value / clarification`
- `Banded popularity tiebreaker`

点击后只展开：输入、关键决策、输出、它解决的 failure class、对应的真实 metric delta。不要展示大段源码；提供 `View source` 链接跳到 GitHub 对应文件/行。

“Self-evolution / Qwen / cross-encoder”放进 `Experiments we did not ship` 抽屉：

- 解释尝试过什么；
- 为什么规则更好；
- 不把 negative result 包装成线上能力。

### Step 4 — Evaluation Evidence

首屏指标：

- HitRate@10 0.995
- MRR 0.644355
- MTTC 2.215
- Efficiency 0.8785
- TechnicalScore 0.866507

图表：

1. Baseline → V1.1 → V1.2 → V1.3 的版本比较；
2. Buying / Browsing / Override / Boundary 的分场景指标；
3. optional：first-hit turn 或 best-rank 分布。

每张图都必须显示：

- `Official public evaluator`
- `N=200`
- report artifact 名称
- evaluator command
- generated_at / git commit
- `Not hidden-set evidence`

提供 `Reproduce` drawer：

```bash
python evaluate_official.py \
  --official-root ../techjam-conversational-search \
  --intent-backend rules
```

不要使用“official score”单独描述；统一用 “official public-set evaluator result”。

### Step 5 — Beyond the Benchmark：Transparent Ads

这一章必须视觉上与前四章分隔，标题下固定标注：

```text
Demo-only commercial extension
Never called by the official evaluator.
Does not alter organic Top-10 ranking.
```

预设实验，不要求评委填写广告表单：

- Campaign A：低 bid、高 query relevance；
- Campaign B：高 bid、低 relevance；
- 点击 `Run auction`；
- 展示 `eCPM = bid × relevance`；
- A 胜出或 B 被 relevance floor 拦截；
- impression +1，budget 扣减；
- organic Top-10 在 before/after 两栏保持完全一致。

这一章证明：

- Impact & Relevance；
- 工程模块隔离；
- 透明广告机制；
- 商业扩展不污染比赛结果。

当前实现没有真实 click/conversion 路径，因此只说 “impression auction and budget accounting”，不说完整交易闭环、CTR 或 GMV。

### Step 6 — Closeout

最终页对应交付内容：

- `Public repository`
- `Read the technical report`
- `View reproduction instructions`
- `Watch the public demo video`（上传后启用）
- `Limitations`
- `Team contributions`

收尾文案：

```text
What we ship: a deterministic, offline, reproducible scored Agent.
What we demonstrate beyond the score: transparent commercial extensions.
What remains unknown: organizer-private 800-session performance.
```

---

## 5. Evidence Explorer

它是深挖页，不是视频主线。

功能：

- 按 scenario / hit / miss / first-hit turn 筛选 public sessions；
- 打开一个 session 查看 turn trace、state diff、Top-10 与 target rank；
- 切换 baseline 与当前版本；
- 查看 artifact hash、git commit、evaluator command；
- 导出当前 session 的 JSON（public data only）。

默认不展示全部用户文本的大表；先提供摘要和筛选，避免信息过载。

---

## 6. Live Sandbox 的引导与边界

入口只出现在主 tour 完成页和页脚：`Try live sandbox (experimental)`。

进入时先显示 scope card：

```text
This sandbox searches the frozen Clothing, Shoes & Jewelry catalog.
It is not the official evaluator and does not change the reported score.
For reproducible evidence, use the guided public-session replays.
```

交互规则：

- 默认展示 Buying / Browsing / Override / No preference 四个 prompt chips；
- `Type your own query` 是次级入口；
- free text 上方显示 catalog scope 与 10-turn cap；
- reset 期间 composer disabled；
- 每个 request 带 session generation id，旧 response 不得回写新 session；
- request pending 时禁止重复提交；
- state 与 narration 不一致时 fail closed 到 deterministic message；
- 提供 `Return to evidence tour` 固定按钮。

Sandbox 不默认插入广告。需要广告实验时进入独立 Ad Lab。

---

## 7. 数据与证据契约

### 核心原则

Guided Tour 不调用 live Agent，也不依赖 LLM。它只回放由 official evaluator 和当前代码生成的冻结 artifact，因此视频稳定且可审计。

### 建议生成流程

新增只读生成脚本：

```text
scripts/build_demo_evidence.py
  1. 验证 catalog checksum
  2. 运行或读取指定 official public evaluator report
  3. 验证 sample_id / scenario / target / Top-10
  4. 选择 owner-approved canonical cases
  5. 生成 demo evidence JSON
  6. 写入 source hashes 和 git commit
```

建议产物：

```text
demo/evidence/manifest.json
demo/evidence/dataset.json
demo/evidence/metrics.json
demo/evidence/version_comparison.json
demo/evidence/scenarios/public_xxxx.json
demo/evidence/catalog_samples.json
```

`manifest.json` 至少包含：

```json
{
  "evidence_scope": "official_public_200",
  "catalog_sha256": "...",
  "evaluator_git_commit": "...",
  "agent_git_commit": "...",
  "report_sha256": "...",
  "generated_at": "...",
  "metrics": {},
  "canonical_cases": []
}
```

### Fail-closed 条件

以下任一发生，网站构建失败：

- metric 与 source report 不一致；
- sample_id 不属于 public split；
- parent_asin 不在 frozen catalog；
- 推荐含 duplicate / invalid ID；
- case trace 与 evaluator result 不一致；
- 页面引用 private labels；
- 没有 report hash / agent commit；
- 广告实验改变 organic ordering。

---

## 8. 视觉与交互规格

### 视觉方向

- 风格：technical evidence console + polished presentation，不做消费者商城仿站。
- 品牌：`Shopping Copilot` 自有 wordmark；可写比赛名称，但不复刻 TikTok/TikTok Shop logo。
- 主色使用现有 token 体系中的深色背景、蓝色 accent、青色 evidence、紫色 extension；不要新增散乱 hex。
- Competition evidence 使用青色；commercial extension 使用紫色；warning/unknown 使用琥珀色。

### 桌面基准

- 视频录制基准：1440 × 900。
- 主内容 max-width：1280px。
- Tour stage 应在一屏内表达一个结论；避免长页面滚动录屏。
- `<1024px` 切为上下布局；移动端保证可读即可，不作为比赛主验收面。

### 组件状态

- Tour progress：default / current / completed / unavailable。
- Replay controls：idle / playing / paused / completed / error。
- Evidence badge：verified public / demo-only / unknown private。
- CTA：default / hover / focus / active / disabled / loading。
- 所有动画 160–240ms，支持 `prefers-reduced-motion`。

### Accessibility

- 所有输入有持久 label，不能只依赖 placeholder。
- scenario cards 与 replay controls 必须键盘可操作。
- 当前 turn、target rank 与状态 diff 使用 `aria-live=polite`，避免每个动画都播报。
- 颜色不能是 slot added/removed 的唯一编码；同时使用 `+`、`removed`、删除线。
- 对比度目标 WCAG AA；录屏前进行 100% 与 200% zoom QA。

---

## 9. 视频脚本映射（建议 3 分钟）

```text
0:00–0:20  Hero + official data contract
0:20–0:55  Buying replay: intent route + hard constraints + early rank
0:55–1:30  Intent Override: erase-and-rewrite + target rank recovery
1:30–2:05  Architecture + why lightweight rules won
2:05–2:30  Official public evaluator results + reproduction evidence
2:30–2:50  Demo-only transparent ad auction
2:50–3:00  limitations + repository / report / video links
```

Browsing 与 Boundary 保留在网站中供评委点击，但不强行塞进 3 分钟主视频。

---

## 10. 实现优先级

### P0 — 比赛交付主线

- Guided shell、progress、Hero；
- Dataset Contract；
- 两个 canonical replay：Buying + Intent Override；
- Metrics / version comparison；
- evidence manifest 与生成脚本；
- reproducibility / limitation closeout。

### P1 — 完整评委体验

- Browsing + Boundary replay；
- Evidence Explorer；
- mechanism cards；
- video recording mode（隐藏非必要 controls）。

### P2 — 商业扩展

- 预设广告竞价实验；
- organic before/after invariant；
- Ad Lab 深挖入口。

### P3 — 可选自由探索

- Live Sandbox；
- 自由文本与强引导；
- error / timeout / reset recovery。

若时间不足，按 P0 完成即可提交高质量视频；不要为了 Sandbox 推迟 evidence tour。

---

## 11. 验收标准

### Product acceptance

- 首次打开无需输入，1 次点击进入 tour。
- 主 tour ≤8 次主点击、≤3 分钟可讲完。
- 任何时刻都能看出当前属于 Competition Evidence 还是 Demo-only Extension。
- 广告与自由输入不会出现在首屏。
- tour 完成后再提供 Sandbox。

### Evidence acceptance

- 页面所有 score 与 source report JSON 一致。
- 每个 replay 都是 official public session，不是手写故事。
- 所有商品来自 frozen catalog；只使用官方可见 metadata。
- 明确标注 public 200 与 private 800 的 claim boundary。
- official evaluator 可从页面给出的命令复现。
- 广告前后 organic Top-10 顺序逐项一致。

### Engineering acceptance

- Guided Tour 无网络、无模型也能完整运行。
- browser refresh 后仍可从 Step 0 重放。
- replay 不存在 timer race；同一输入产生确定输出。
- 1440×900 无溢出；1024px 可用；键盘能完成 tour。
- unit tests + evidence schema tests + one browser smoke pass。

### Submission acceptance

- Devpost、README、REPORT、网站指标口径一致。
- YouTube public URL 已替换 placeholder。
- 视频不含未经许可的第三方 logo、商品图或音乐。
- 视频展示 end-to-end inference / result evidence，而不只是 UI 动画。

---

## 12. 实现 Agent 的授权与禁止项

### 授权

- 重构 `demo/static/` 信息架构与组件；
- 新增 evidence generation script 与只读 JSON artifacts；
- 新增 tour/evidence/sandbox route；
- 复用已有 evaluator、report、catalog reader 和 ad proof 逻辑；
- 新增测试与文档。

### 禁止

- 不修改 official catalog、public sessions、evaluator 或 target labels；
- 不为 Demo 手写 parent_asin、分数、排名或 metric；
- 不读取/展示 private 800 session labels；
- 不让广告进入 official Agent path；
- 不将 public-set 结果称为 hidden-set/final score；
- 不把 smoke、页面动画或 demo campaign 称为比赛 readiness；
- 不新增外部商品图、品牌 logo、付费 API 或网络依赖；
- 不先实现 Sandbox 再补 evidence tour。

---

## 13. Resolved owner gates

1. **主视频时长：**3 分钟。
2. **广告章节：**网站保留 Demo-only 章节；视频可控制在约 15 秒。
3. **Canonical cases：**`public_0030`（Buying）、`public_0004`（Intent Override）、`public_0063`（Browsing）、`public_0050`（Boundary），由 `demo/canonical_cases.json` 固化。

公网 Tour：https://shopping-copilot-techjam.pages.dev/
