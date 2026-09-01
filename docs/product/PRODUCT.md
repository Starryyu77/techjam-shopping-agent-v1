# 产品功能说明书 — Shopping Copilot Judge Tour

[English README](../../README.md) | [中文 README](../../README.zh-CN.md)

面向 TikTok TechJam 2026 Problem Statement 4 的交付与展示说明。

## 0. 一句话定位

一个证据优先的对话式购物 Agent：正式路径在冻结的 5 万商品目录中，用最多 10 轮找到并尽早排高目标 `parent_asin`；公网网站通过真实 public sessions 回放技术能力，而不是要求评委自由输入。

在线 Tour：https://shopping-copilot-techjam.pages.dev/

## 1. 三条物理隔离的路径

| 路径 | 入口 | 用途 | 是否参与打分 |
| --- | --- | --- | --- |
| 正式打分 | `submission/agent.py` | 意图、状态机、FTS5、规则重排、Top-10 | 是 |
| 评委证据 Tour | `demo/static/tour.*` + `demo/evidence/` | 回放冻结的官方公开集 trace | 否 |
| 可选聊天 Sandbox | `demo/server.py` + `/sandbox` | 本地自由输入和演示层实验 | 否 |

正式打分路径只使用 Python 标准库，离线、CPU-only、0 tokens，不依赖广告或 LLM。

## 2. 已验证结果

未修改的官方 public evaluator，N=200：

| 系统 | HitRate@10 | MRR | MTTC | TechnicalScore |
| --- | ---: | ---: | ---: | ---: |
| 官方弱 BM25 starter | 0.125 | 0.068034 | 9.810 | 0.10671 |
| **Rules V1.3** | **0.995** | **0.644355** | **2.215** | **0.866507** |

这些是公开集证据，不代表 organizer-private 800 sessions。

## 3. 正式路径的核心能力

### 3.1 Buying / Browsing 分流

- Buying：明确需求早锁硬约束，优先精确满足。
- Browsing：避免过早过滤，先问最有区分度的问题。

### 3.2 显式多轮状态

- 硬约束、软偏好、负向约束、拒绝商品和原始检索证据逐轮维护。
- Intent Override 会删除被替换的旧偏好并写入新值，不做 append-only 叠加。
- NO_PREFERENCE 不会污染其他仍然有效的状态。

### 3.3 检索、排序与追问

- SQLite FTS5 从 5 万商品中召回候选。
- 规则重排显式处理 hard / soft / negative 与评分先验。
- 分带人气 tiebreaker 只调整近似同分候选。
- 候选覆盖度 × 信息熵决定下一条追问。

## 4. Judge Tour

默认首页是 7 步、约 3 分钟的 Guided Evidence Tour：

1. Results：公开集指标和 private-800 边界。
2. Data Contract：数据集、目录规模、场景比例和只读合同。
3. Replay：Buying、Browsing、Override、Boundary 四类真实案例。
4. Mechanism：从消息到 Top-10 的技术链路和未采用的实验。
5. Evaluation：官方 starter、V1.1–V1.3、分场景指标和 artifact hash。
6. Ads：与正式路径隔离的透明竞价实验。
7. Closeout：仓库、报告、复现说明、限制和团队贡献。

Canonical public cases 由 `demo/canonical_cases.json` 冻结；页面指标和 trace 由 `scripts/build_demo_evidence.py` 验证生成。

Mechanism 页面可在正式 rules pipeline 与 Prompt Evolution Lab 之间切换。Prompt Lab
展示方案 B v001 → v002 的 9 项受保护指标、严格 dev 门禁、opaque validation、
9 组行为合同差异和 held-out 未运行边界；它不改变正式比赛分数。

## 5. 方案 B 提示词演化

- Codex 只读取清洗后的 dev 失败模式并编写候选提示词。
- Qwen3-8B 只作为 target，不负责优化或自我评分。
- 候选必须提高 composite，且任何受保护指标都不能退化。
- 只有通过 dev 才读取一次 validation；validation 只暴露接受/拒绝并立即终止。
- v002 composite 从 0.6137 提升到 0.7191；JSON compliance 保持 1.0。
- held-out 标签未打包、未运行；原 Qwen 服务不在复核主机，因此网站声明为 artifact-recomputed。

## 6. Demo-only 广告扩展

- eCPM = bid × BM25 relevance。
- 相关性低于门槛时不展示。
- 每次曝光扣减模拟预算。
- Sponsored slot 额外插入，organic `parent_asin` 顺序保持不变。
- 页面明确写明没有 click、conversion、CTR 或 GMV 闭环。

广告出价、库存和预算均为模拟数据，官方 evaluator 不会调用这条路径。

## 7. 自由输入的边界

`/sandbox` 仅用于本地探索，不是公网主入口，不是官方 score evidence，也不进入主视频。

可选 localhost Qwen3-8B 只用于意图或导购话术实验；失败时回退规则模板。正式提交路径完全不加载它。

## 8. 真实、模拟与未知

- **真实且已验证：**正式 Agent、官方 public-set 指标、200 个 public traces、catalog-valid Top-10。
- **真实工程机制但仅用于 Demo：**BM25 广告相关性与 sponsored injection invariant。
- **模拟：**广告主、出价、预算和广告库存。
- **未知：**主办方 private 800-session 结果。

## 9. 产品验收标准

- 首次进入不要求输入，一次点击开始 Tour。
- Competition Evidence 与 Demo Only 视觉分层。
- 指标只能从 evidence JSON 读取。
- 所有 ASIN 必须来自冻结 catalog。
- 公开网站不依赖本地模型、API Key 或 Python API。
- `python -m unittest discover -s tests -v` 当前应通过 98 项测试。
