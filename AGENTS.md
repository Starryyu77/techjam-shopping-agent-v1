# 项目规则

- 不修改 D 盘官方仓库、商品目录、公开集或评测器；它们只读。
- `prompt_lab.py` 是方案 B 提示词评测与自动迭代的唯一正式入口；`exp_selfevolve/` 仅保留为历史实验，不作为验收或提交依据。
- 不把目标 `parent_asin`、验证集原文或保留测试标签写入提示词。
- `optimize` 只能把 `dev` bad case 交给优化器；validation 只做聚合验收、不反馈给优化器；test 只在最终冻结后用固定口令和匹配的系统 SHA-256 显式运行一次。
- 模型端点必须是本机地址；不记录 API Key、用户凭据或完整模型响应。
- target、optimizer、judge 可以使用独立本机端点；judge 与 target 同端点同模型时必须在本轮 `decision.json` 标记 `self_judge: true`。
- 修改意图、状态或评测逻辑后，运行 `python -m unittest discover -s tests -v`，再重跑 dev 和 validation。
- 先修 bad case 的共同原因，不为单句添加目标答案式规则。
- 新提示词只有验证集 `composite`（启用 judge 时为 `dual_score`）提高，且 domain、dialogue act、clarity、slot、连续状态、JSON、安全和选择指标全部不退步，才能原子更新 `prompts/current.txt`。
- 每轮无论接受还是拒绝都保留完整证据；validation 拒绝后立即停止且不得反馈给 optimizer，dev/静态门槛连续两轮拒绝时也停止并回到人工 bad-case 分析。
