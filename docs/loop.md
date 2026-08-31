# 方案 B 提示词自进化循环

`prompt_lab.py` 是唯一正式入口；`exp_selfevolve/` 只是历史实验，不能用于验收或提交。循环只改意图解析 system prompt，不修改官方数据、评测器、检索或提交路径。

```text
dev bad cases → 抽象共同规则 → optimizer 生成候选提示词
                                      ↓
                     target 在 dev 上通过严格门槛？──否→拒绝并留证据
                                      │是
                                      ↓
                     validation 聚合验收通过？──否→拒绝并留证据
                                      │是
                                      ↓
                  保存新版本并原子更新 current.txt
```

## 数据边界

- optimizer 只接收脱敏后的 dev 指标、混淆模式和代表性 bad cases。
- validation 不参与改写；其原文和 bad cases 不发送给 optimizer，只用聚合指标决定接受或拒绝。
- held-out test 不进入循环。最终版本冻结后，必须同时传入 `--confirm-heldout FINAL-FROZEN` 与匹配的 `--frozen-system-sha256`；首次读取标签前写入冻结清单，此后拒绝重跑。
- 候选提示词禁止复制开发集原句、session/sample ID、ASIN 或目标答案。

## 三个模型角色

- target：执行待评测的 system prompt。
- optimizer：根据 dev 失败模式重写 system prompt。
- judge：可选的语义质量评分器；确定性 Gold 指标仍是硬门槛。

三个角色可用独立 localhost 端点。judge 与 target 使用同一端点和模型时，`decision.json` 会写入 `self_judge: true`，该结果不能冒充独立裁判证据。

## 接受门槛

候选必须让 validation 的 `composite`（启用 judge 时为 `dual_score`）提升超过 `--min-improvement`，且以下指标逐项不退步：

- `domain_accuracy`
- `dialogue_act_accuracy`
- `clarity_accuracy`
- `slot_f1`
- `rollout_state_exact`
- `json_compliance`
- `no_mutation_preservation`
- `selection_accuracy`
- 启用 judge 时的 `semantic_quality` 与 `semantic_safety`

任一关键指标下降即拒绝，不允许用总分掩盖退化。validation 拒绝后立即结束本次循环，不把这一位信号反馈给 optimizer；dev/静态门槛连续两轮拒绝时也停止，回到人工 bad-case 分析。

## 每轮证据

接受、拒绝或模型失败都会在 `reports/prompt_evolution/prompt_round_NNN/` 保存：

- `prompt_before.md`、`prompt_candidate.md`、`prompt_diff.txt`
- `dev_metrics.json`、`validation_metrics.json`
- `badcases.json`、`confusion_matrix.json`、`semantic_scores.json`
- `decision.json`

只有证据完整且门槛通过后，才写入新的 `prompts/system_prompt_vNNN.md`，再原子更新 `prompts/current.txt`。

## 完成条件

1. `python -m unittest discover -s tests -v` 通过。
2. 使用到的本地模型端点可访问，且没有外部 API 或凭据依赖。
3. dev 与 validation 报告可复现，每轮证据完整。
4. 候选通过上述严格门槛；否则保留旧提示词。
5. held-out test 未被循环读取；最终运行绑定 backend、模型、judge 配置、提示词和评测代码哈希。

失败诊断顺序：JSON 契约 → domain → dialogue act → clarity/slot → 连续状态 → selection → 语义评分。每轮只修共同原因，不机械重试。
