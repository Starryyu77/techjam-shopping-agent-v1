# 真实世界购物 Agent V1

V1 已把两个方案接成一条可运行链路：

```text
用户消息
  ↓
方案 B：意图、对话动作、约束变化
  ↓
多轮购物状态（保留、补充、否定、改口、重置）
  ↓
方案 A：官方 50,000 商品目录检索与重排
  ↓
追问一个最有区分度的问题，或返回 Top 5 推荐
```

当前是本地 V1，不修改 D 盘官方仓库。只读取官方商品目录：

`D:\TikTok-TechJam\track4\techjam-conversational-search\data\catalog.jsonl`

## 这次加入了什么

原先的规则基线之外，新增了方案 B 的可选本地 Qwen 层：

- `prompts/system_prompt_v001.md`：意图识别的第一版提示词和严格 JSON 契约。
- `model` 模式：每一轮都让 Qwen 判断意图、动作和状态增量。
- `hybrid` 模式：明确输入走规则，规则置信度不足时才调用 Qwen。
- `prompt_lab.py`：用 90 轮开发集找 bad case，用 30 轮验证集决定新版提示词是否升级。
- `prompts/current.txt`：只指向验证分数更好的提示词版本。
- 保留测试集不会进入自动优化；只有显式执行最终测试时才读取。

这里的“调优”是**固定模型权重的提示词迭代**，不是 LoRA/SFT 权重微调。这样先把数据、指标和失败样本跑通；只有提示词达到瓶颈并且有足够人工 Gold 数据后，才值得增加权重微调。

## 直接运行

项目仅使用 Python 标准库，Python 3.11 已可运行：

```powershell
Set-Location 'C:\Users\25401\OneDrive\文档\ChatGPT\TikTok-Hackthon\真实世界购物AgentV1'
pwsh -NoProfile -File .\scripts\start_local_qwen.ps1
python .\chat.py
```

启动时会在内存中为 50,000 商品建立 SQLite FTS5 索引。之后可连续输入：

```text
我想买一双跑鞋，必须透气
不要棉的，预算 80 美元
刚才说错了，改成步行鞋
选第1个
```

默认使用验证效果最好的 `hybrid`：规则保护确定状态，规则置信度不足时调用本地千问。聊天命令：`/state` 查看内部状态，`/reset` 清空，`/exit` 退出。

完全不使用模型时仍可运行：

```powershell
python .\chat.py --intent-backend rules
```

## 本地 Qwen 安装

已按本机 RTX 4060 Laptop 8GB 显存安装并校验：

- llama.cpp `b10621` CUDA 12.4：`D:\TikTok-TechJam\local-ai\llama.cpp\b10621`
- 官方 Qwen3-8B Q4_K_M：`D:\TikTok-TechJam\local-ai\models\Qwen3-8B-Q4_K_M.gguf`
- 模型 SHA-256：`d98cdcbd03e17ce47681435b5150e34c1417f50b5c0019dd560e4882c5745785`
- 服务地址：`http://127.0.0.1:8080/v1`
- 实测模型加载后显存约 5.8GB，生成速度约 38–42 tokens/s。

重新安装或校验已有文件：

```powershell
pwsh -NoProfile -File .\scripts\install_local_qwen.ps1
```

启动与停止：

```powershell
pwsh -NoProfile -File .\scripts\start_local_qwen.ps1
pwsh -NoProfile -File .\scripts\stop_local_qwen.ps1
```

强制每一轮都使用千问进行研究对照：

```powershell
python .\chat.py --intent-backend model
```

客户端只接受 `localhost` / `127.0.0.1` / `::1` 的 HTTP 地址，不读取 API Key，不跟随重定向，并会再次校验模型 JSON；模型输出不能直接改状态，置信度低于 `0.75` 时也不会改状态。

## 方案 B 的实验闭环

先记录规则弱基线：

```powershell
python .\prompt_lab.py evaluate --split dev --backend rules
python .\prompt_lab.py evaluate --split validation --backend rules
```

Qwen 启动后，测第一版提示词：

```powershell
python .\prompt_lab.py evaluate --split dev --backend model --endpoint http://127.0.0.1:8080/v1
python .\prompt_lab.py evaluate --split validation --backend model --endpoint http://127.0.0.1:8080/v1
```

让本地模型根据开发集 bad case 提议一版新提示词：

```powershell
python .\prompt_lab.py optimize --endpoint http://127.0.0.1:8080/v1 --rounds 1
```

升级条件同时满足：

1. 验证集综合分必须提高。
2. JSON 合法率不能明显下降。
3. 跑题/优惠问题的“不污染状态”能力不能明显下降。

优化器只会收到开发集 bad case。验证集只负责验收，保留测试集完全不参与。比赛前最终冻结提示词后，才运行一次：

```powershell
python .\prompt_lab.py evaluate --split test --backend model --endpoint http://127.0.0.1:8080/v1
```

## 指标在评判什么

- `domain_accuracy`：有没有分清商品需求、模糊浏览、优惠问题和跑题。
- `dialogue_act_accuracy`：有没有分清新增、回答、否定、改口、选择、停止等动作。
- `slot_f1`：抽出的属性、值及 hard/soft/negative 是否正确。
- `rollout_state_exact`：模型连续跑五轮后，内部购物状态是否仍与 Gold 一致。
- `no_mutation_preservation`：跑题和优惠咨询有没有误改购物条件。
- `json_compliance`：输出是否符合机器可执行契约。
- `composite`：用于比较提示词版本的加权总分，不替代各项诊断指标。

当前非训练实测：

| 后端 / 划分 | Domain | Dialogue act | Slot F1 | State exact | Safety | Composite |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Rules / 开发集 | 0.900 | 0.711 | 0.657 | 0.422 | 1.000 | 0.730 |
| Qwen / 开发集 | 0.900 | 0.822 | 0.282 | 0.100 | 0.889 | 0.616 |
| Hybrid / 开发集 | 0.978 | 0.811 | 0.647 | 0.467 | 1.000 | **0.779** |
| Rules / 验证集 | 0.933 | 0.833 | 0.783 | 0.500 | 1.000 | 0.812 |
| Qwen / 验证集 | 0.933 | 0.767 | 0.524 | 0.000 | 0.667 | 0.656 |
| Hybrid / 验证集 | **1.000** | **0.900** | 0.783 | **0.533** | **1.000** | **0.851** |

结论：当前 v001 提示词下，Qwen 单独承担状态更新并不可靠；Hybrid 能利用 Qwen 提升模糊意图判断，同时用规则守住状态，因此成为 V1 默认。详细报告都在 `reports/`。这些是自建 Gold 候选集结果，不是官方比赛最终分数。

本轮按要求没有执行 `prompt_lab.py optimize`、没有产生 v002，也没有做 Prompt Tuning、LoRA 或 SFT。保留测试集仍未读取，避免污染未来最终验收。

## 方案 A 当前做法

- 用 SQLite FTS5 从官方目录召回最多 300 个候选。
- hard 条件权重大于 soft 偏好；negative 条件直接过滤；被拒绝商品不再出现。
- 返回 Top 5，并给出最多三条命中理由。
- 在候选集上按“覆盖率 × 信息熵”挑一个追问属性，避免每轮机械地问固定问题。

V1 还没有向量召回、交叉编码器或学习排序。先用 Gold 数据量化 FTS5 的召回瓶颈，再决定是否增加它们。

## V1.1–V1.2 无模型修正

针对官方公开集的 90 个失败会话做逐例分析后，规则链路已修正：

- 英文词按完整单词匹配，不再把 `exploring` 中的 `ring` 或 `preferred` 中的 `red` 当成需求。
- 标准属性继续进入语义状态；无法安全归一化的原始商品短语单独作为检索证据保留，不污染意图和状态标签。
- 商品重排现在读取 `details` 字段；此前该字段虽然进入 FTS5 召回，却被重排阶段遗漏。
- 用户提供新信息后可以再次追问 `other`，但用户明确没有补充信息时不会机械重复同一个问题。
- V1.2 同时保留通用品类和官方细品类，例如语义状态使用 `boots`，检索证据仍保留 `Boots Mid-Calf`，不再为归一化丢掉层级信息。

不调用 Qwen、API 或其他数据集，使用未修改的官方公开评测器实测：

| 版本 | Hit Rate@10 | MRR | MTTC | 技术分参考值 |
| --- | ---: | ---: | ---: | ---: |
| 修正前 Rules V1 | 0.550 | 0.262 | 6.740 | 0.439 |
| 修正后 Rules V1.1 | **0.950** | **0.628** | **3.495** | **0.814** |
| 细品类 Rules V1.2 | **0.970** | 0.613 | **3.155** | **0.826** |

完整结果见 `reports/official_public_rules_v1_2.json`。公开集提升只说明这些通用错误已被修正，不能代替隐藏集验证。

## 验证

```powershell
python -m py_compile .\shopping_agent.py .\chat.py .\prompt_lab.py
python -m unittest discover -s tests -v
```

目前 13 个最小测试覆盖：默认 Hybrid 配置、连续搜索、跑题不改状态、选择、模型 JSON 校验、官方句式、英文词边界、细品类与原始检索证据、`details` 重排、追问终止和契约适配。
