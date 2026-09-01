# Command-Line Tools

Run these commands from the repository root; no package installation is needed.

| Tool | Purpose | Typical command |
| --- | --- | --- |
| `evaluate_official.py` | Run the development Agent through the unmodified official evaluator | `python tools/evaluate_official.py --official-root ../techjam-conversational-search --intent-backend rules` |
| `chat.py` | Explore a multi-turn conversation locally | `python tools/chat.py --intent-backend rules` |
| `prompt_lab.py` | Evaluate or iterate the optional Scheme B prompt layer | `python tools/prompt_lab.py --help` |

The rules-only evaluator is the reported competition path. Chat, model/hybrid,
prompt evolution, and optional reranking are development surfaces and do not
change the submitted score unless explicitly selected.

For build, evidence, diagnostics, and release commands, see
[`../scripts/README.md`](../scripts/README.md).
