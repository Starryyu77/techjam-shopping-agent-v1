# Shopping Copilot Python Package

| Module | Responsibility |
| --- | --- |
| `shopping_agent.py` | Intent parsing, versioned dialogue state, SQLite FTS5 recall, rule reranking, question policy, and response generation |
| `official_agent.py` | Strict adapter for the official `reset` / `respond` contract |
| `reranker.py` | Optional local cross-encoder experiment; disabled on the submitted path |

`submission/agent.py` remains the official evaluator entry point and imports the
adapter from this package. The package uses only the Python standard library on
the default rules-only path.
