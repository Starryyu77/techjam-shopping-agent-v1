# 方案 B 提示词演化合同

方案 B 只优化可选的本地意图解析 prompt，不修改官方数据、评测器、检索、规则排序
或 `submission/` 计分路径。`prompts/current.txt` 是当前提示词指针。

```text
dev bad cases / confusion / metrics
              ↓ 清洗 ID、商品答案和验证信息
       Codex 编写完整候选提示词
              ↓ 静态防泄漏与合同检查
       Qwen target 跑 dev 评测
              ↓ composite 必须提高，所有受保护指标不得退化
       一次 opaque validation
              ↓ 只返回 accepted / rejected，并立即结束
       accepted 才升级 current prompt
```

## 角色隔离

- **Optimizer：**Codex，根据清洗后的 dev 证据编写候选。
- **Target：**localhost Qwen3-8B，只执行待评测提示词。
- **Validation：**只返回不透明接受/拒绝，不提供原文、bad cases、逐指标差异或理由。
- **Held-out：**标签不打包；最终冻结前不得读取或运行。

## 严格门禁

候选必须提高 composite，并保证以下指标全部不退化：

- domain accuracy
- dialogue-act accuracy
- clarity accuracy
- slot F1
- rollout-state exactness
- JSON compliance
- no-mutation preservation
- selection accuracy

静态检查还会拒绝复制 dev 原句、商品 ID、缺失合同标记或超过 15% 的提示词长度漂移。

## 当前已接受版本

方案 B v002 在 18 个合成 dev 会话 / 90 个标注轮次上将 composite 从 0.6137
提高到 0.7191，并通过一次 6 会话 / 30 轮的 opaque validation。Held-out 未运行。
复核主机没有原始 localhost Qwen 服务，因此当前公开结论是 artifact-recomputed，
不是重新执行模型推理。

可审计快照：`reports/scheme_b_prompt_evolution_verified.json`。

失败诊断顺序：JSON 合同 → domain → dialogue act → clarity / slot → 连续状态 →
selection。不得用总分掩盖任何受保护指标退化。
