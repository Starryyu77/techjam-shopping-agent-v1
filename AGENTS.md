# 项目规则

- 不修改 D 盘官方仓库、商品目录、公开集或评测器；它们只读。
- 不把目标 `parent_asin`、验证集原文或保留测试标签写入提示词。
- `optimize` 只能使用 `dev` bad case；validation 只决定接受/拒绝，test 只在最终冻结后显式运行。
- 模型端点必须是本机地址；不记录 API Key、用户凭据或完整模型响应。
- 修改意图、状态或评测逻辑后，运行 `python -m unittest discover -s tests -v`，再重跑 dev 和 validation。
- 先修 bad case 的共同原因，不为单句添加目标答案式规则。
- 新提示词只有验证集 `composite` 提高且安全指标不退步时才能更新 `prompts/current.txt`。
