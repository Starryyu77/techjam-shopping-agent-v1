# V1 状态

- [x] 规则意图弱基线
- [x] 多轮购物状态
- [x] 官方目录 FTS5 召回与重排
- [x] 候选驱动追问与 Top 5 聊天入口
- [x] 本地 Qwen 严格 JSON 接口
- [x] 方案 B 提示词 v001
- [x] dev / validation bad-case 评测与防泄漏升级门槛
- [x] 最小测试与规则弱基线报告
- [x] 安装并启动本地 Qwen3-8B Q4_K_M / llama.cpp CUDA
- [x] 实测 v001 的 model 与 hybrid 开发/验证结果
- [x] 根据验证结果将 hybrid 设为 V1 默认
- [x] V1.1 修复英文词边界、无损检索证据、`details` 重排和 `other` 追问循环
- [x] 用未修改官方公开评测器复测 Rules V1.1（Hit Rate@10 0.950）
- [x] V1.2 保留官方完整细品类作为检索证据（Hit Rate@10 0.970）
- [ ] 提示词训练或自动迭代（按用户要求暂不执行）
- [ ] 冻结后运行一次 held-out test
