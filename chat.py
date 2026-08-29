from __future__ import annotations

import argparse
import json
from pathlib import Path

from shopping_agent import ModelUnavailable, RealWorldShoppingAgent


DEFAULT_CATALOG = Path(
    r"D:\TikTok-TechJam\track4\techjam-conversational-search\data\catalog.jsonl"
)
DEFAULT_MODEL_ENDPOINT = "http://127.0.0.1:8080/v1"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="真实世界购物 Agent V1 本地多轮聊天")
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument(
        "--intent-backend",
        choices=("rules", "hybrid", "model"),
        default="hybrid",
        help="rules 不需要模型；hybrid 只把规则不确定项交给模型；model 每轮都用模型",
    )
    parser.add_argument("--model-endpoint", default=DEFAULT_MODEL_ENDPOINT)
    parser.add_argument("--model", default="qwen3-8b")
    parser.add_argument("--model-timeout", type=float, default=30.0)
    parser.add_argument("--debug", action="store_true", help="每轮显示意图与状态 JSON")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    if args.intent_backend == "model" and not args.model_endpoint:
        raise SystemExit("--intent-backend model 必须同时提供 --model-endpoint")
    agent = RealWorldShoppingAgent(
        args.catalog,
        model_endpoint=args.model_endpoint,
        model_name=args.model,
        model_timeout=args.model_timeout,
        intent_backend=args.intent_backend,
    )
    session_id = "local-demo"
    agent.reset(session_id)
    print(f"已启动：intent={args.intent_backend}，每轮最多显示 5 个候选。")
    print("命令：/state 查看状态，/reset 清空，/help 帮助，/exit 退出。")
    try:
        while True:
            try:
                message = input("\n你> ").strip()
            except (EOFError, KeyboardInterrupt):
                print("\n已退出。")
                break
            if message in {"/exit", "/quit"}:
                print("已退出。")
                break
            if message == "/help":
                print("直接输入购物需求；可继续补条件、改口、拒绝或说“选第1个”。")
                continue
            if message == "/state":
                print(json.dumps(agent.sessions[session_id].to_dict(), ensure_ascii=False, indent=2))
                continue
            if not message:
                continue
            try:
                response = agent.respond(session_id, message)
            except ModelUnavailable as exc:
                print(f"模型暂时不可用：{exc}")
                continue
            print(f"助手> {response['message']}")
            for rank, item in enumerate(response["recommendations"], start=1):
                price = "?" if item["price"] is None else f"{item['price']:.2f}"
                print(f"  {rank}. {item['title']}  [{item['parent_asin']}]  ${price}")
                print(f"     {'；'.join(item['reasons'])}")
            if args.debug:
                print(json.dumps({"intent": response["intent"], "state": response["state"]}, ensure_ascii=False, indent=2))
    finally:
        agent.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
