from __future__ import annotations

import json
import math
import re
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


def sigmoid(value: float) -> float:
    if value >= 0:
        return 1.0 / (1.0 + math.exp(-value))
    exp_v = math.exp(value)
    return exp_v / (1.0 + exp_v)


DOMAIN_INTENTS = {"ITEM", "VAGUE", "BENEFIT", "IRRELEVANT"}
DIALOGUE_ACTS = {
    "NEW",
    "ANSWER",
    "ADD",
    "NEGATE",
    "OVERRIDE",
    "NO_PREFERENCE",
    "SELECT",
    "REJECT",
    "STOP",
    "RESET",
    "NOOP",
}
ATTRIBUTES = {
    "category",
    "material",
    "color",
    "size",
    "style",
    "brand",
    "budget",
    "feature",
    "use_case",
    "other",
}
QUESTION_ATTRIBUTES = (
    "material",
    "feature",
    "use_case",
    "style",
    "size",
    "color",
    "budget",
    "brand",
)

TOKEN_RE = re.compile(r"[a-z0-9]+", re.IGNORECASE)
CJK_RE = re.compile(r"[\u3400-\u9fff]")
STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "but",
    "by",
    "for",
    "from",
    "i",
    "in",
    "is",
    "it",
    "me",
    "my",
    "of",
    "on",
    "or",
    "please",
    "some",
    "that",
    "the",
    "this",
    "to",
    "want",
    "with",
    "would",
    "you",
    "looking",
}

CATEGORY_TERMS = (
    ("running shoes", ("running shoes", "running shoe", "跑鞋")),
    ("walking shoes", ("walking shoes", "walking shoe", "步行鞋", "健走鞋")),
    ("sandals", ("sandals", "sandal", "凉鞋")),
    ("slippers", ("slippers", "slipper", "拖鞋")),
    ("boots", ("boots", "boot", "靴子", "短靴")),
    ("shoes", ("shoes", "shoe", "sneakers", "鞋子", "鞋", "运动鞋")),
    ("earrings", ("earrings", "earring", "耳环", "耳饰")),
    ("necklace", ("necklace", "项链")),
    ("rings", ("rings", "ring", "戒指")),
    ("bracelet", ("bracelet", "手链", "手镯")),
    ("jewelry", ("jewelry", "jewellery", "首饰", "珠宝")),
    ("t-shirts", ("t-shirts", "t-shirt", "tshirt", "T恤", "短袖")),
    ("shirts", ("shirts", "shirt", "衬衫")),
    ("dresses", ("dresses", "dress", "连衣裙", "裙子")),
    ("pants", ("pants", "trousers", "裤子", "长裤")),
    ("jackets", ("jackets", "jacket", "外套", "夹克")),
    ("clothing", ("clothing", "clothes", "衣服", "服装")),
)

VALUE_TERMS: dict[str, dict[str, tuple[str, ...]]] = {
    "material": {
        "stainless steel": ("stainless steel", "不锈钢"),
        "sterling silver": ("sterling silver", "925 silver", "925银", "纯银"),
        "faux leather": ("faux leather", "人造皮革"),
        "polyester": ("polyester", "聚酯纤维"),
        "spandex": ("spandex", "氨纶"),
        "cotton": ("cotton", "棉"),
        "leather": ("leather", "皮革", "真皮"),
        "rubber": ("rubber", "橡胶"),
        "nylon": ("nylon", "尼龙"),
        "satin": ("satin", "缎面"),
        "fabric": ("fabric", "布艺", "面料"),
        "mesh": ("mesh", "网面"),
        "wool": ("wool", "羊毛"),
    },
    "color": {
        "multicolor": ("multicolor", "multi-color", "多色"),
        "silver": ("silver", "银色"),
        "black": ("black", "黑色", "黑的"),
        "white": ("white", "白色", "白的"),
        "blue": ("blue", "蓝色"),
        "pink": ("pink", "粉色"),
        "green": ("green", "绿色"),
        "brown": ("brown", "棕色"),
        "beige": ("beige", "米色"),
        "purple": ("purple", "紫色"),
        "yellow": ("yellow", "黄色"),
        "gold": ("gold", "金色"),
        "red": ("red", "红色"),
        "gray": ("gray", "grey", "灰色"),
    },
    "feature": {
        "moisture-wicking": ("moisture-wicking", "moisture wicking", "吸湿排汗"),
        "machine washable": ("machine washable", "machine wash", "可以机洗", "可机洗"),
        "hypoallergenic": ("hypoallergenic", "低敏", "防过敏"),
        "waterproof": ("waterproof", "防水"),
        "lightweight": ("lightweight", "轻便", "轻量"),
        "comfortable": ("comfortable", "comfort", "舒适"),
        "breathable": ("breathable", "透气"),
        "adjustable": ("adjustable", "可调节", "可以调节"),
        "durable": ("durable", "耐用"),
        "non-slip": ("non-slip", "antiskid", "防滑"),
        "quick-drying": ("quick-drying", "quick dry", "速干"),
        "stretch": ("stretch", "弹性"),
        "soft": ("soft", "柔软"),
    },
    "style": {
        "vintage": ("vintage", "复古"),
        "casual": ("casual", "休闲"),
        "classic": ("classic", "经典"),
        "modern": ("modern", "现代"),
        "formal": ("formal", "正式"),
        "sporty": ("sporty", "运动风"),
        "minimalist": ("minimalist", "minimal", "简约"),
        "statement": ("statement", "夸张醒目"),
    },
    "use_case": {
        "gift": ("gift", "present", "送礼", "礼物"),
        "running": ("running", "跑步"),
        "walking": ("walking", "步行", "走路"),
        "hiking": ("hiking", "徒步"),
        "wedding": ("wedding", "婚礼"),
        "everyday": ("everyday", "daily", "日常"),
        "travel": ("travel", "旅行"),
        "party": ("party", "聚会"),
        "beach": ("beach", "海边"),
        "work": ("work", "office", "上班", "通勤"),
        "sports": ("sports", "运动"),
    },
}

ATTRIBUTE_NAMES = {
    "category": ("category", "product type", "品类", "类别", "商品"),
    "material": ("material", "材质", "面料"),
    "color": ("color", "colour", "颜色"),
    "size": ("size", "尺寸", "尺码"),
    "style": ("style", "风格", "版型"),
    "brand": ("brand", "品牌"),
    "budget": ("budget", "price", "预算", "价格"),
    "feature": ("feature", "功能", "特点"),
    "use_case": ("use case", "purpose", "用途", "场景"),
    "other": ("other", "其他"),
}

OFFICIAL_BUYING_RE = re.compile(
    r"^I'm looking for (?P<category>.+?)\. A key requirement is:\s*(?P<requirement>.+?)\.?$",
    re.IGNORECASE,
)
OFFICIAL_BROWSING_RE = re.compile(
    r"^I'm looking for (?P<category>.+?), but I'm still exploring\.?$",
    re.IGNORECASE,
)
OFFICIAL_ANSWER_RE = re.compile(
    r"^For that, what matters is:\s*(?P<requirements>.+?)\.?$",
    re.IGNORECASE,
)
OFFICIAL_OVERRIDE_RE = re.compile(
    r"^Actually, ignore my earlier preference\. What I need is:\s*(?P<requirement>.+?)\.?$",
    re.IGNORECASE,
)
OFFICIAL_INITIAL_PREFERENCE_RE = re.compile(
    r"^I'm looking for (?P<category>.+?)\.\s+(?P<preference>.+?)\.?$",
    re.IGNORECASE,
)


def _text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, dict):
        return " ".join(f"{key} {item}" for key, item in value.items())
    if isinstance(value, list):
        return " ".join(str(item) for item in value)
    return str(value)


def _number(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _terms(text: str) -> list[str]:
    return [
        token.casefold()
        for token in TOKEN_RE.findall(text)
        if len(token) > 1 and token.casefold() not in STOPWORDS
    ]


def _phrase_position(folded: str, phrase: str) -> int:
    candidate = phrase.casefold()
    if CJK_RE.search(candidate):
        return folded.find(candidate)
    match = re.search(
        rf"(?<![a-z0-9]){re.escape(candidate)}(?![a-z0-9])",
        folded,
    )
    return match.start() if match else -1


def detect_language(text: str) -> str:
    has_cjk = bool(CJK_RE.search(text))
    latin_words = len(re.findall(r"[A-Za-z]{2,}", text))
    if has_cjk and latin_words >= 2:
        return "mixed"
    if has_cjk:
        return "zh-CN"
    return "en-US"


@dataclass(frozen=True)
class Constraint:
    attribute: str
    value: str
    operation: str = "set"
    hardness: str = "hard"

    def to_dict(self) -> dict[str, str]:
        return {
            "attribute": self.attribute,
            "value": self.value,
            "operation": self.operation,
            "hardness": self.hardness,
        }


@dataclass
class IntentResult:
    domain_intent: str
    dialogue_act: str
    clarity_level: str
    confidence: float
    summary: str
    constraints: list[Constraint] = field(default_factory=list)
    selected_rank: int | None = None
    selected_title: str | None = None
    source: str = "rules"
    usage: dict[str, int] = field(
        default_factory=lambda: {"prompt_tokens": 0, "completion_tokens": 0}
    )
    retrieval_evidence: list[tuple[str, str]] = field(default_factory=list)

    @classmethod
    def from_model_dict(
        cls,
        value: dict[str, Any],
        usage: dict[str, int] | None = None,
    ) -> "IntentResult":
        required = {
            "domain_intent",
            "dialogue_act",
            "clarity_level",
            "confidence",
            "summary",
            "constraints",
            "selected_rank",
            "selected_title",
        }
        if set(value) != required:
            raise ValueError("model output has unexpected fields")
        if value["domain_intent"] not in DOMAIN_INTENTS:
            raise ValueError("invalid domain_intent")
        if value["dialogue_act"] not in DIALOGUE_ACTS:
            raise ValueError("invalid dialogue_act")
        if value["clarity_level"] not in {"L1", "L2", "L3", "L4"}:
            raise ValueError("invalid clarity_level")
        confidence = float(value["confidence"])
        if not 0 <= confidence <= 1:
            raise ValueError("confidence must be between 0 and 1")
        if not isinstance(value["summary"], str):
            raise ValueError("summary must be a string")
        selected_rank = value["selected_rank"]
        if selected_rank is not None and (
            not isinstance(selected_rank, int) or not 1 <= selected_rank <= 5
        ):
            raise ValueError("selected_rank must be null or 1..5")
        selected_title = value["selected_title"]
        if selected_title is not None and (
            not isinstance(selected_title, str) or not selected_title.strip()
        ):
            raise ValueError("selected_title must be null or a non-empty string")
        constraints: list[Constraint] = []
        if not isinstance(value["constraints"], list):
            raise ValueError("constraints must be a list")
        for item in value["constraints"]:
            if not isinstance(item, dict) or set(item) != {
                "attribute",
                "value",
                "operation",
                "hardness",
            }:
                raise ValueError("invalid constraint shape")
            if item["attribute"] not in ATTRIBUTES:
                raise ValueError("invalid constraint attribute")
            if item["operation"] not in {"set", "remove", "negative", "no_preference"}:
                raise ValueError("invalid constraint operation")
            if item["hardness"] not in {"hard", "soft"}:
                raise ValueError("invalid constraint hardness")
            if not isinstance(item["value"], str):
                raise ValueError("constraint value must be a string")
            if item["operation"] != "no_preference" and not item["value"].strip():
                raise ValueError("constraint value is empty")
            constraints.append(
                Constraint(
                    attribute=item["attribute"],
                    value=item["value"].strip(),
                    operation=item["operation"],
                    hardness=item["hardness"],
                )
            )
        normalized_usage = usage or {"prompt_tokens": 0, "completion_tokens": 0}
        return cls(
            domain_intent=value["domain_intent"],
            dialogue_act=value["dialogue_act"],
            clarity_level=value["clarity_level"],
            confidence=confidence,
            summary=value["summary"],
            constraints=constraints,
            selected_rank=selected_rank,
            selected_title=selected_title.strip() if selected_title else None,
            source="model",
            usage={
                "prompt_tokens": int(normalized_usage.get("prompt_tokens", 0)),
                "completion_tokens": int(normalized_usage.get("completion_tokens", 0)),
            },
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "domain_intent": self.domain_intent,
            "dialogue_act": self.dialogue_act,
            "clarity_level": self.clarity_level,
            "confidence": self.confidence,
            "summary": self.summary,
            "constraints": [item.to_dict() for item in self.constraints],
            "selected_rank": self.selected_rank,
            "selected_title": self.selected_title,
            "source": self.source,
        }


@dataclass
class ShoppingState:
    category: str | None = None
    hard_constraints: dict[str, list[str]] = field(default_factory=dict)
    soft_preferences: dict[str, list[str]] = field(default_factory=dict)
    negative_constraints: dict[str, list[str]] = field(default_factory=dict)
    no_preference: set[str] = field(default_factory=set)
    asked_attributes: set[str] = field(default_factory=set)
    rejected_asins: set[str] = field(default_factory=set)
    selected_asin: str | None = None
    language: str = "zh-CN"
    status: str = "active"
    last_question: str | None = None
    last_recommendations: list[str] = field(default_factory=list)
    retrieval_evidence: list[tuple[str, str]] = field(default_factory=list)

    @classmethod
    def from_gold_state(cls, value: dict[str, Any], language: str = "zh-CN") -> "ShoppingState":
        return cls(
            category=value.get("category"),
            hard_constraints={key: list(items) for key, items in value.get("hard_constraints", {}).items()},
            soft_preferences={key: list(items) for key, items in value.get("soft_preferences", {}).items()},
            negative_constraints={key: list(items) for key, items in value.get("negative_constraints", {}).items()},
            no_preference=set(value.get("no_preference", [])),
            selected_asin=value.get("selected_parent_asin"),
            language=language,
            status=value.get("status", "active"),
        )

    def reset(self) -> None:
        language = self.language
        self.__dict__.update(ShoppingState(language=language).__dict__)

    def _remove(self, mapping: dict[str, list[str]], attribute: str, value: str) -> None:
        values = mapping.get(attribute, [])
        mapping[attribute] = [item for item in values if item.casefold() != value.casefold()]
        if not mapping[attribute]:
            mapping.pop(attribute, None)

    def _add(self, mapping: dict[str, list[str]], attribute: str, value: str) -> None:
        values = mapping.setdefault(attribute, [])
        if value.casefold() not in {item.casefold() for item in values}:
            values.append(value)

    def apply(self, intent: IntentResult) -> None:
        if intent.dialogue_act == "RESET":
            self.reset()
            return
        if intent.dialogue_act == "STOP":
            self.status = "stopped"
            return
        if intent.dialogue_act == "REJECT":
            self.rejected_asins.update(self.last_recommendations)
        if intent.dialogue_act == "SELECT":
            if intent.selected_rank is not None and intent.selected_rank <= len(self.last_recommendations):
                self.selected_asin = self.last_recommendations[intent.selected_rank - 1]
                self.status = "selected"
            return

        if intent.dialogue_act == "OVERRIDE":
            self.soft_preferences.clear()
            self.retrieval_evidence = [
                item for item in self.retrieval_evidence if item[1] == "hard"
            ]

        for constraint in intent.constraints:
            attribute = constraint.attribute
            value = constraint.value
            if constraint.operation == "no_preference":
                self.hard_constraints.pop(attribute, None)
                self.soft_preferences.pop(attribute, None)
                self.negative_constraints.pop(attribute, None)
                self.no_preference.add(attribute)
                continue
            if constraint.operation == "remove":
                for mapping in (
                    self.hard_constraints,
                    self.soft_preferences,
                    self.negative_constraints,
                ):
                    self._remove(mapping, attribute, value)
                continue
            if attribute == "category":
                if intent.dialogue_act == "OVERRIDE" and self.category != value:
                    self.hard_constraints.clear()
                    self.soft_preferences.clear()
                    self.negative_constraints.clear()
                    self.no_preference.clear()
                    self.asked_attributes.clear()
                    self.retrieval_evidence.clear()
                self.category = value
                continue
            self.no_preference.discard(attribute)
            if intent.dialogue_act == "OVERRIDE" and constraint.operation == "set":
                self.hard_constraints.pop(attribute, None)
                self.soft_preferences.pop(attribute, None)
                self.negative_constraints.pop(attribute, None)
            if constraint.operation == "negative":
                self._add(self.negative_constraints, attribute, value)
            elif constraint.hardness == "soft":
                self._add(self.soft_preferences, attribute, value)
            else:
                self._add(self.hard_constraints, attribute, value)
        known_evidence = {value.casefold() for value, _hardness in self.retrieval_evidence}
        for value, hardness in intent.retrieval_evidence:
            if value.casefold() not in known_evidence:
                self.retrieval_evidence.append((value, hardness))
                known_evidence.add(value.casefold())
        if intent.constraints or intent.retrieval_evidence:
            self.asked_attributes.discard("other")
        self.status = "active"

    def to_dict(self) -> dict[str, Any]:
        return {
            "category": self.category,
            "hard_constraints": self.hard_constraints,
            "soft_preferences": self.soft_preferences,
            "negative_constraints": self.negative_constraints,
            "no_preference": sorted(self.no_preference),
            "asked_attributes": sorted(self.asked_attributes),
            "rejected_asins": sorted(self.rejected_asins),
            "selected_asin": self.selected_asin,
            "language": self.language,
            "status": self.status,
            "last_question": self.last_question,
            "last_recommendations": self.last_recommendations,
        }

    def prompt_view(self) -> dict[str, Any]:
        return {
            "category": self.category,
            "hard_constraints": self.hard_constraints,
            "soft_preferences": self.soft_preferences,
            "negative_constraints": self.negative_constraints,
            "no_preference": sorted(self.no_preference),
            "last_question": self.last_question,
            "status": self.status,
        }


class RuleIntentParser:
    def _attribute_from_message(self, text: str, state: ShoppingState) -> str | None:
        folded = text.casefold()
        for attribute, names in ATTRIBUTE_NAMES.items():
            if any(_phrase_position(folded, name) >= 0 for name in names):
                return attribute
        return state.last_question

    def _category(self, text: str) -> str | None:
        folded = text.casefold()
        for canonical, phrases in CATEGORY_TERMS:
            if any(_phrase_position(folded, phrase) >= 0 for phrase in phrases):
                return canonical
        return None

    def _matched_values(self, text: str) -> list[tuple[int, str, str]]:
        folded = text.casefold()
        matches: list[tuple[int, str, str]] = []
        for attribute, values in VALUE_TERMS.items():
            for canonical, phrases in values.items():
                positions = [_phrase_position(folded, phrase) for phrase in phrases]
                positions = [position for position in positions if position >= 0]
                if positions:
                    matches.append((min(positions), attribute, canonical))
        matches.sort()
        return matches

    def _near_negative(self, text: str, position: int) -> bool:
        window = text.casefold()[max(0, position - 28) : position]
        return any(
            marker in window
            for marker in ("不要", "不想", "排除", "别要", "avoid", "exclude", "without", "not ")
        )

    def parse(self, message: str, state: ShoppingState) -> IntentResult:
        text = re.sub(r"\s+", " ", message).strip()
        folded = text.casefold()
        if not text:
            return IntentResult("VAGUE", "NOOP", "L4", 1.0, "Empty message")

        if re.search(r"^(?:/reset|reset|重新开始|重来|全部清空|清空.*条件)", folded):
            return IntentResult("ITEM", "RESET", "L1", 1.0, "Reset the shopping session")
        if re.search(r"^(?:/exit|/quit|退出)$", folded) or re.search(
            r"(?:不用了|结束吧|先到这里|不要继续推荐|let's stop|stop here|no more recommendations)",
            folded,
        ):
            return IntentResult("ITEM", "STOP", "L1", 0.99, "Stop shopping")

        rank_match = re.search(
            r"(?:选|要|take|choose|pick)\s*(?:第\s*)?(?P<rank>[1-5一二三四五])(?:\s*(?:个|款|件|双|one|item))?",
            folded,
        )
        if rank_match:
            rank_map = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5}
            raw_rank = rank_match.group("rank")
            rank = rank_map.get(raw_rank, int(raw_rank) if raw_rank.isdigit() else 1)
            return IntentResult("ITEM", "SELECT", "L1", 0.99, f"Select recommendation {rank}", selected_rank=rank)
        title_match = re.search(r"标题以\s*[“\"](?P<title>.+?)[”\"]\s*开头", text)
        if title_match is None:
            title_match = re.search(
                r"title starts with\s*[“\"](?P<title>.+?)[”\"]",
                text,
                re.IGNORECASE,
            )
        if title_match:
            return IntentResult(
                "ITEM",
                "SELECT",
                "L1",
                0.95,
                "Select a recommendation by title",
                selected_title=title_match.group("title").strip(),
            )
        if "don't have an additional preference" in folded:
            return IntentResult(
                "VAGUE",
                "NOOP",
                "L3",
                0.99,
                "No additional information; keep constraints unchanged",
            )

        if any(
            marker in folded
            for marker in (
                "都不喜欢",
                "都不合适",
                "这批不合适",
                "those suggestions don't work",
                "reject these",
                "show me different ones",
            )
        ):
            return IntentResult("ITEM", "REJECT", "L1", 0.98, "Reject the current recommendations")

        off_topic = any(
            marker in folded
            for marker in (
                "会下雨吗",
                "天气怎么样",
                "讲个笑话",
                "写作业",
                "will it rain",
                "weather tomorrow",
                "tell me a joke",
                "do my homework",
            )
        )
        if off_topic and self._category(text) is None:
            return IntentResult("IRRELEVANT", "NOOP", "L4", 0.99, "Off-topic request; keep shopping state")
        if any(
            marker in folded
            for marker in ("优惠券", "红包", "满减", "折扣", "coupon", "discount", "promotion")
        ):
            return IntentResult("BENEFIT", "NOOP", "L1", 0.98, "Asks about promotions or benefits")

        if any(
            marker in folded
            for marker in (
                "没偏好",
                "没有偏好",
                "都可以",
                "随便",
                "no preference",
                "don't have a preference",
                "any is fine",
            )
        ):
            attribute = self._attribute_from_message(text, state)
            if attribute:
                return IntentResult(
                    "VAGUE",
                    "NO_PREFERENCE",
                    "L2",
                    0.97,
                    f"No preference for {attribute}",
                    [Constraint(attribute, "", "no_preference", "soft")],
                )

        if folded.startswith("those options are not quite right yet"):
            return IntentResult(
                "VAGUE",
                "NOOP",
                "L3",
                0.99,
                "Current recommendations were not accepted; keep constraints unchanged",
            )

        official = OFFICIAL_BUYING_RE.match(text)
        official_browsing = OFFICIAL_BROWSING_RE.match(text)
        official_answer = OFFICIAL_ANSWER_RE.match(text)
        official_override = OFFICIAL_OVERRIDE_RE.match(text)
        official_initial_preference = OFFICIAL_INITIAL_PREFERENCE_RE.match(text)
        raw_category = None
        raw_requirement = None
        forced_act = None
        if official:
            raw_category = official.group("category")
            raw_requirement = official.group("requirement")
            forced_act = "NEW"
        elif official_browsing:
            raw_category = official_browsing.group("category")
            forced_act = "NEW"
        elif official_answer:
            raw_requirement = official_answer.group("requirements")
            forced_act = "ANSWER"
        elif official_override:
            raw_requirement = official_override.group("requirement")
            forced_act = "OVERRIDE"
        elif official_initial_preference:
            raw_category = official_initial_preference.group("category")
            raw_requirement = official_initial_preference.group("preference")
            forced_act = "NEW"

        is_override = forced_act == "OVERRIDE" or any(
            marker in folded
            for marker in ("改成", "换成", "改主意", "instead", "actually", "changed my mind")
        )
        category = self._category(text) or (raw_category.strip() if raw_category else None)
        matched = self._matched_values(text)
        constraints: list[Constraint] = []
        if category:
            constraints.append(Constraint("category", category, "set", "hard"))

        if is_override:
            latest: dict[str, tuple[int, str]] = {}
            for position, attribute, value in matched:
                latest[attribute] = (position, value)
            matched = [(position, attribute, value) for attribute, (position, value) in latest.items()]
            matched.sort()

        hard = bool(re.search(r"(?:必须|硬要求|一定要|must|firm requirement|key requirement)", folded))
        for position, attribute, value in matched:
            operation = "negative" if not is_override and self._near_negative(text, position) else "set"
            constraints.append(
                Constraint(attribute, value, operation, "hard" if hard or operation == "negative" else "soft")
            )

        budget_match = re.search(
            r"(?:(?:预算|budget)(?:是|在|around|under|below|最多|不超过)?\s*)?(?P<amount>\d+(?:\.\d+)?)\s*(?P<unit>usd|美元|dollars?|元|块)",
            folded,
        )
        if budget_match:
            amount = budget_match.group("amount")
            unit = budget_match.group("unit")
            canonical_unit = "USD" if unit in {"usd", "美元", "dollar", "dollars"} else "CNY"
            constraints.append(Constraint("budget", f"{amount} {canonical_unit}", "set", "hard"))

        size_match = re.search(
            r"(?:size|尺码|尺寸)\s*(?:是|要|of)?\s*(?P<size>\d+(?:\.\d+)?|xxl|xl|large|medium|small|[sml])\b",
            folded,
            re.IGNORECASE,
        )
        if size_match:
            constraints.append(Constraint("size", size_match.group("size").upper(), "set", "hard"))

        retrieval_evidence: list[tuple[str, str]] = []
        if raw_category:
            detailed_category = raw_category.strip()
            if category and detailed_category.casefold() != category.casefold():
                retrieval_evidence.append((detailed_category, "hard"))
        if raw_requirement:
            existing = {item.value.casefold() for item in constraints}
            existing.update(value.casefold() for value, _hardness in retrieval_evidence)
            hardness = "soft" if official_initial_preference else "hard"
            for clause in re.split(r"[;；]", raw_requirement):
                value = clause.strip(" .")
                if value and value.casefold() not in existing:
                    retrieval_evidence.append((value, hardness))
                    existing.add(value.casefold())

        has_requirements = bool(constraints or retrieval_evidence)
        if is_override:
            act = "OVERRIDE"
        elif forced_act:
            act = forced_act
        elif state.last_question and has_requirements:
            act = "ANSWER"
        elif category and state.category is None:
            act = "NEW"
        elif has_requirements:
            has_negative = any(item.operation == "negative" for item in constraints)
            act = "NEGATE" if has_negative else "ADD"
        else:
            act = "NOOP"

        vague = any(
            marker in folded
            for marker in ("随便看看", "没想好", "还没决定", "still exploring", "browsing", "not sure")
        )
        if vague:
            return IntentResult(
                "VAGUE",
                "NEW" if category else "NOOP",
                "L3",
                0.96,
                "Exploratory shopping request",
                constraints,
                retrieval_evidence=retrieval_evidence,
            )
        if has_requirements:
            return IntentResult(
                "ITEM",
                act,
                "L1",
                0.9,
                "Structured shopping requirements detected",
                constraints,
                retrieval_evidence=retrieval_evidence,
            )
        return IntentResult(
            "VAGUE",
            "NOOP",
            "L3",
            0.45,
            "The rule parser could not determine a safe state update",
        )


INTENT_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "object",
    "required": [
        "domain_intent",
        "dialogue_act",
        "clarity_level",
        "confidence",
        "summary",
        "constraints",
        "selected_rank",
        "selected_title",
    ],
    "properties": {
        "domain_intent": {"enum": sorted(DOMAIN_INTENTS)},
        "dialogue_act": {"enum": sorted(DIALOGUE_ACTS)},
        "clarity_level": {"enum": ["L1", "L2", "L3", "L4"]},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        "summary": {"type": "string"},
        "constraints": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["attribute", "value", "operation", "hardness"],
                "properties": {
                    "attribute": {"enum": sorted(ATTRIBUTES)},
                    "value": {"type": "string"},
                    "operation": {"enum": ["set", "remove", "negative", "no_preference"]},
                    "hardness": {"enum": ["hard", "soft"]},
                },
                "additionalProperties": False,
            },
        },
        "selected_rank": {"type": ["integer", "null"], "minimum": 1, "maximum": 5},
        "selected_title": {"type": ["string", "null"]},
    },
    "additionalProperties": False,
}


class ModelUnavailable(RuntimeError):
    pass


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ANN001
        raise urllib.error.HTTPError(req.full_url, code, "redirect refused", headers, fp)


class LocalModelClient:
    """Small localhost-only client for llama.cpp's OpenAI-compatible endpoint."""

    def __init__(
        self,
        endpoint: str,
        model: str = "qwen3-8b",
        timeout: float = 2.0,
    ) -> None:
        parsed = urllib.parse.urlparse(endpoint)
        if parsed.scheme != "http" or parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
            raise ValueError("model endpoint must be an http:// localhost address")
        if parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError("model endpoint must not contain credentials, query, or fragment")
        path = parsed.path.rstrip("/")
        if path == "/v1/chat/completions":
            final_path = path
        elif path == "/v1":
            final_path = path + "/chat/completions"
        elif path in {"", "/"}:
            final_path = "/v1/chat/completions"
        else:
            raise ValueError("endpoint path must be empty, /v1, or /v1/chat/completions")
        self.url = urllib.parse.urlunparse(parsed._replace(path=final_path, params="", query="", fragment=""))
        self.model = model
        self.timeout = timeout
        self._opener = urllib.request.build_opener(_NoRedirect)

    def chat(
        self,
        messages: list[dict[str, str]],
        *,
        response_schema: dict[str, Any] | None = None,
        max_tokens: int = 400,
    ) -> tuple[str, dict[str, int]]:
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": 0,
            "max_tokens": max_tokens,
            "stream": False,
            "chat_template_kwargs": {"enable_thinking": False},
        }
        if response_schema is not None:
            payload["response_format"] = {"type": "json_object", "schema": response_schema}
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        if len(body) > 128_000:
            raise ValueError("model request is too large")
        request = urllib.request.Request(
            self.url,
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with self._opener.open(request, timeout=self.timeout) as response:
                raw = response.read(1_000_001)
        except (OSError, TimeoutError, urllib.error.URLError, urllib.error.HTTPError) as exc:
            raise ModelUnavailable(f"local model request failed: {exc}") from exc
        if len(raw) > 1_000_000:
            raise ModelUnavailable("local model response exceeded 1 MB")
        try:
            value = json.loads(raw.decode("utf-8"))
            content = value["choices"][0]["message"]["content"]
        except (UnicodeDecodeError, json.JSONDecodeError, KeyError, IndexError, TypeError) as exc:
            raise ModelUnavailable("local model returned an invalid chat response") from exc
        if not isinstance(content, str):
            raise ModelUnavailable("local model content is not text")
        usage = value.get("usage") or {}
        return content, {
            "prompt_tokens": int(usage.get("prompt_tokens", 0)),
            "completion_tokens": int(usage.get("completion_tokens", 0)),
        }


def _json_object_from_text(text: str) -> dict[str, Any]:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start < 0 or end < start:
        raise ValueError("no JSON object in model output")
    value = json.loads(cleaned[start : end + 1])
    if not isinstance(value, dict):
        raise ValueError("model JSON must be an object")
    return value


class PromptIntentParser:
    def __init__(self, client: LocalModelClient, system_prompt: str) -> None:
        self.client = client
        self.system_prompt = system_prompt

    def parse(self, message: str, state: ShoppingState) -> IntentResult:
        user_payload = {
            "current_state": state.prompt_view(),
            "user_message": message,
        }
        last_error: Exception | None = None
        for _attempt in range(2):
            content, usage = self.client.chat(
                [
                    {"role": "system", "content": self.system_prompt + "\n/no_think"},
                    {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
                ],
                response_schema=INTENT_RESPONSE_SCHEMA,
            )
            try:
                return IntentResult.from_model_dict(_json_object_from_text(content), usage)
            except (ValueError, json.JSONDecodeError) as exc:
                last_error = exc
        raise ModelUnavailable(f"model returned invalid intent JSON twice: {last_error}")


class HybridIntentParser:
    def __init__(
        self,
        rules: RuleIntentParser | None = None,
        model: PromptIntentParser | None = None,
        rule_threshold: float = 0.75,
    ) -> None:
        self.rules = rules or RuleIntentParser()
        self.model = model
        self.rule_threshold = rule_threshold

    def parse(self, message: str, state: ShoppingState) -> IntentResult:
        rule_result = self.rules.parse(message, state)
        if rule_result.confidence >= self.rule_threshold or self.model is None:
            return rule_result
        try:
            return self.model.parse(message, state)
        except ModelUnavailable:
            rule_result.source = "rules-fallback"
            return rule_result


@dataclass
class Candidate:
    parent_asin: str
    title: str
    categories: str
    features: str
    store: str
    description: str
    price: float | None
    rating: float | None
    text: str
    score: float
    matches: list[tuple[str, str]]
    popularity: float = 0.0


class CatalogSearch:
    def __init__(
        self,
        catalog_path: str | Path,
        *,
        reranker: Any | None = None,
        recall_pool: int = 800,
        rerank_window: int = 40,
        rerank_weight: float = 6.0,
        rerank_buying_only: bool = True,
    ) -> None:
        self.catalog_path = Path(catalog_path)
        if not self.catalog_path.is_file():
            raise FileNotFoundError(self.catalog_path)
        self.reranker = reranker
        self.recall_pool = recall_pool
        self.rerank_window = rerank_window
        self.rerank_weight = rerank_weight
        self.rerank_buying_only = rerank_buying_only
        self.popularity_band = 5.0  # score-band width for popularity tiebreak (0 disables)
        self._doc_cache: dict[str, str] = {}
        self.connection = sqlite3.connect(":memory:")
        self._build_index()

    def _build_index(self) -> None:
        cursor = self.connection.cursor()
        cursor.execute(
            "CREATE VIRTUAL TABLE products USING fts5("
            "parent_asin UNINDEXED, title, categories, features, details, store, description, "
            "price UNINDEXED, rating UNINDEXED, rating_number UNINDEXED, "
            "tokenize='unicode61 remove_diacritics 2')"
        )
        batch: list[tuple[Any, ...]] = []
        with self.catalog_path.open(encoding="utf-8") as handle:
            for line in handle:
                product = json.loads(line)
                batch.append(
                    (
                        str(product["parent_asin"]),
                        _text(product.get("title")),
                        _text(product.get("categories")),
                        _text(product.get("features")),
                        _text(product.get("details")),
                        _text(product.get("store")),
                        _text(product.get("description")),
                        _number(product.get("price")),
                        _number(product.get("average_rating")),
                        _number(product.get("rating_number")),
                    )
                )
                if len(batch) >= 1000:
                    cursor.executemany("INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", batch)
                    batch.clear()
        if batch:
            cursor.executemany("INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", batch)
        self.connection.commit()

    def _query_values(self, state: ShoppingState, profile: dict[str, Any]) -> list[str]:
        values: list[str] = []
        if state.category:
            values.append(state.category)
        for mapping in (state.hard_constraints, state.soft_preferences):
            for items in mapping.values():
                values.extend(items)
        values.extend(value for value, _hardness in state.retrieval_evidence)
        if len(values) <= 1:
            values.extend(str(item) for item in profile.get("preference_tags", []))
        return values

    def search(
        self,
        state: ShoppingState,
        profile: dict[str, Any],
        top_k: int = 5,
    ) -> tuple[list[Candidate], list[Candidate]]:
        query_values = self._query_values(state, profile)
        unique_terms = list(dict.fromkeys(_terms(" ".join(query_values))))[:48]
        if not unique_terms:
            return [], []
        expression = " OR ".join(f'"{term}"' for term in unique_terms)
        rows = self.connection.execute(
            "SELECT parent_asin, title, categories, features, details, store, description, price, rating, rating_number "
            "FROM products WHERE products MATCH ? "
            "ORDER BY bm25(products, 0.0, 6.0, 4.0, 3.0, 2.0, 2.0, 1.0, 0.0, 0.0) LIMIT ?",
            (expression, self.recall_pool),
        ).fetchall()
        candidates: list[Candidate] = []
        for rank, row in enumerate(rows):
            asin, title, categories, features, details, store, description, price, rating, rating_number = row
            if str(asin) in state.rejected_asins:
                continue
            product_text = " ".join(str(value or "") for value in row[1:7]).casefold()
            violated = False
            for values in state.negative_constraints.values():
                if any(_phrase_position(product_text, value) >= 0 for value in values):
                    violated = True
                    break
            if violated:
                continue
            score = 3.0 / (rank + 1)
            matches: list[tuple[str, str]] = []
            if state.category and _phrase_position(product_text, state.category) >= 0:
                score += 3.0
                matches.append(("category", state.category))
            for attribute, values in state.hard_constraints.items():
                matched = [value for value in values if _phrase_position(product_text, value) >= 0]
                if attribute == "budget" and price is not None:
                    for value in values:
                        amount_match = re.match(r"(\d+(?:\.\d+)?)\s+USD", value)
                        if amount_match and float(price) <= float(amount_match.group(1)):
                            matched.append(value)
                if matched:
                    score += 4.0 * len(matched)
                    matches.extend((attribute, value) for value in matched)
                elif attribute in {"brand", "color", "material", "size"}:
                    score -= 3.0
            for attribute, values in state.soft_preferences.items():
                matched = [value for value in values if _phrase_position(product_text, value) >= 0]
                score += 1.5 * len(matched)
                matches.extend((attribute, value) for value in matched)
            for value, hardness in state.retrieval_evidence:
                if _phrase_position(product_text, value) >= 0:
                    score += 4.0 if hardness == "hard" else 1.5
                    matches.append(("evidence", value))
            for tag in profile.get("preference_tags", []):
                if _phrase_position(product_text, str(tag)) >= 0:
                    score += 0.25
            if rating is not None:
                score += 0.03 * float(rating)
            # Popularity is kept as a SEPARATE tiebreaker signal (see the sort below),
            # not folded into the main score, so it never displaces a candidate with a
            # clearly higher constraint match — it only orders near-ties.
            popularity = math.log1p(float(rating_number)) if rating_number else 0.0
            candidates.append(
                Candidate(
                    parent_asin=str(asin),
                    title=str(title or "Untitled product"),
                    categories=str(categories or ""),
                    features=str(features or ""),
                    store=str(store or ""),
                    description=str(description or ""),
                    price=float(price) if price is not None else None,
                    rating=float(rating) if rating is not None else None,
                    text=product_text,
                    score=score,
                    matches=matches,
                    popularity=popularity,
                )
            )
        # Banded tiebreaker sort: primary by rule score, but candidates whose scores
        # fall in the same narrow band are ordered by popularity (log review count).
        # This lifts well-reviewed items among near-ties WITHOUT displacing a candidate
        # that has a clearly higher constraint match.
        band = self.popularity_band
        candidates.sort(
            key=lambda item: (round(item.score / band) if band > 0 else item.score, item.popularity),
            reverse=True,
        )
        candidates = self._apply_reranker(state, profile, candidates)
        return candidates[:top_k], candidates[:50]

    def _rerank_query(self, state: ShoppingState, profile: dict[str, Any]) -> str:
        parts: list[str] = []
        if state.category:
            parts.append(state.category)
        for mapping in (state.hard_constraints, state.soft_preferences):
            for items in mapping.values():
                parts.extend(items)
        parts.extend(value for value, _hardness in state.retrieval_evidence)
        if len(parts) <= 1:
            parts.extend(str(item) for item in profile.get("preference_tags", []))
        return " ".join(parts).strip()

    def _rerank_document(self, candidate: Candidate) -> str:
        cached = self._doc_cache.get(candidate.parent_asin)
        if cached is not None:
            return cached
        doc = " ".join(
            [candidate.title or "", candidate.categories or "", (candidate.features or "")[:200]]
        )[:400]
        self._doc_cache[candidate.parent_asin] = doc
        return doc

    def _apply_reranker(
        self,
        state: ShoppingState,
        profile: dict[str, Any],
        candidates: list[Candidate],
    ) -> list[Candidate]:
        # Cross-encoder is an ADDITIVE semantic signal on the rule-ranked head.
        # Degrades to the pure rule ordering when the model is unavailable
        # (CPU-only / network-disabled scoring host), preserving the baseline.
        reranker = self.reranker
        if reranker is None or not getattr(reranker, "available", False):
            return candidates
        if len(candidates) < 2:
            return candidates
        # Dual-track gate: the cross-encoder reliably sharpens ranking only when
        # concrete constraints exist (Buying track). On open-ended Browsing the
        # generic query misleads it, so we defer to the rule ordering there.
        # This mirrors the problem statement's Buying-vs-Browsing routing.
        if self.rerank_buying_only and not state.hard_constraints:
            return candidates
        query = self._rerank_query(state, profile)
        if not query:
            return candidates
        window = candidates[: self.rerank_window]
        docs = [self._rerank_document(item) for item in window]
        scores = reranker.score(query, docs)
        if not scores or len(scores) != len(window):
            return candidates
        for item, raw in zip(window, scores):
            item.score += self.rerank_weight * sigmoid(raw)
        candidates.sort(key=lambda item: item.score, reverse=True)
        return candidates

    def close(self) -> None:
        self.connection.close()


class CandidateQuestionPolicy:
    def _candidate_value(self, candidate: Candidate, attribute: str) -> str | None:
        if attribute in VALUE_TERMS:
            for canonical, phrases in VALUE_TERMS[attribute].items():
                if any(_phrase_position(candidate.text, phrase) >= 0 for phrase in phrases):
                    return canonical
            return None
        if attribute == "brand":
            return candidate.store or None
        if attribute == "budget" and candidate.price is not None:
            if candidate.price < 25:
                return "under 25 USD"
            if candidate.price < 50:
                return "25-50 USD"
            if candidate.price < 100:
                return "50-100 USD"
            return "100+ USD"
        if attribute == "size":
            match = re.search(r"\b(?:size\s*)?(xxl|xl|large|medium|small|\d{1,2}(?:\.5)?)\b", candidate.text)
            return match.group(1) if match else None
        return None

    def choose(self, state: ShoppingState, candidates: list[Candidate]) -> str | None:
        if state.category is None:
            state.asked_attributes.add("category")
            state.last_question = "category"
            return "category"
        if not candidates:
            if "other" in state.asked_attributes:
                state.last_question = None
                return None
            state.asked_attributes.add("other")
            state.last_question = "other"
            return "other"
        known = set(state.no_preference)
        known.update(state.hard_constraints)
        known.update(state.soft_preferences)
        known.update(state.negative_constraints)
        best: tuple[float, int, str] | None = None
        for order, attribute in enumerate(QUESTION_ATTRIBUTES):
            if attribute in known or attribute in state.asked_attributes:
                continue
            values = [self._candidate_value(candidate, attribute) for candidate in candidates]
            observed = [value for value in values if value is not None]
            coverage = len(observed) / len(candidates)
            counts = Counter(observed)
            if coverage < 0.30 or len(counts) < 2:
                continue
            if attribute == "brand" and max(counts.values()) / len(candidates) < 0.15:
                continue
            entropy = -sum(
                (count / len(observed)) * math.log(count / len(observed))
                for count in counts.values()
            ) / math.log(len(counts))
            value = coverage * entropy
            candidate_score = (value, -order, attribute)
            if best is None or candidate_score > best:
                best = candidate_score
        if best is None or best[0] < 0.15:
            state.last_question = None
            return None
        attribute = best[2]
        state.asked_attributes.add(attribute)
        state.last_question = attribute
        return attribute


QUESTION_TEXT = {
    "zh-CN": {
        "category": "你具体想买哪一类商品？",
        "material": "你对材质有偏好吗？",
        "color": "你更喜欢什么颜色？",
        "size": "你有尺码要求吗？",
        "style": "你偏好什么风格？",
        "brand": "你有指定品牌吗？",
        "budget": "你的预算范围是多少？",
        "feature": "最重要的功能是什么？",
        "use_case": "主要准备在什么场景使用？",
        "other": "这些条件组合后没有可靠候选，你愿意放宽哪一项？",
    },
    "en-US": {
        "category": "What kind of product do you want to buy?",
        "material": "Do you have a material preference?",
        "color": "Which color do you prefer?",
        "size": "Do you have a size requirement?",
        "style": "Which style do you prefer?",
        "brand": "Do you have a preferred brand?",
        "budget": "What budget range should I use?",
        "feature": "Which feature matters most?",
        "use_case": "What will you mainly use it for?",
        "other": "These constraints leave no reliable match. Which one can we relax?",
    },
}


def load_current_prompt(project_root: Path | None = None) -> str:
    root = project_root or Path(__file__).resolve().parent
    prompt_dir = root / "prompts"
    name = (prompt_dir / "current.txt").read_text(encoding="utf-8").strip()
    if not name or Path(name).name != name:
        raise ValueError("prompts/current.txt contains an invalid filename")
    path = prompt_dir / name
    if not path.is_file():
        raise FileNotFoundError(path)
    return path.read_text(encoding="utf-8")


class RealWorldShoppingAgent:
    def __init__(
        self,
        catalog_path: str | Path,
        *,
        model_endpoint: str | None = None,
        model_name: str = "qwen3-8b",
        model_timeout: float = 30.0,
        intent_backend: str = "hybrid",
        intent_parser: Any | None = None,
        reranker: Any | None = None,
        use_reranker: bool = False,
    ) -> None:
        if intent_parser is None:
            if intent_backend not in {"rules", "model", "hybrid"}:
                raise ValueError("intent_backend must be rules, model, or hybrid")
            model_parser = None
            if model_endpoint and intent_backend != "rules":
                client = LocalModelClient(model_endpoint, model_name, model_timeout)
                model_parser = PromptIntentParser(client, load_current_prompt())
            if intent_backend == "model":
                if model_parser is None:
                    raise ValueError("model backend requires model_endpoint")
                intent_parser = model_parser
            elif intent_backend == "rules":
                intent_parser = RuleIntentParser()
            else:
                intent_parser = HybridIntentParser(model=model_parser)
        self.intent_parser = intent_parser
        if reranker is None and use_reranker:
            try:
                from reranker import CrossEncoderReranker

                reranker = CrossEncoderReranker()
            except Exception:
                reranker = None
        self.search = CatalogSearch(catalog_path, reranker=reranker)
        self.policy = CandidateQuestionPolicy()
        self.sessions: dict[str, ShoppingState] = {}
        self.profiles: dict[str, dict[str, Any]] = {}
        self.last_results: dict[str, list[Candidate]] = {}

    def reset(self, session_id: str, user_profile: dict[str, Any] | None = None) -> None:
        self.sessions[session_id] = ShoppingState()
        self.profiles[session_id] = user_profile or {}
        self.last_results[session_id] = []

    def _language_key(self, language: str) -> str:
        return "en-US" if language == "en-US" else "zh-CN"

    def _reply(
        self,
        session_id: str,
        intent: IntentResult,
        message: str,
        ask_attribute: str | None,
        results: list[Candidate],
        started: float,
    ) -> dict[str, Any]:
        state = self.sessions[session_id]
        language = self._language_key(state.language)
        recommendations = []
        for candidate in results:
            reasons = []
            for attribute, value in candidate.matches[:3]:
                if language == "en-US":
                    reasons.append(f"matches {attribute}: {value}")
                else:
                    reasons.append(f"匹配{attribute}：{value}")
            if not reasons:
                reasons.append("closest lexical match" if language == "en-US" else "与当前描述最接近")
            recommendations.append(
                {
                    "parent_asin": candidate.parent_asin,
                    "title": candidate.title,
                    "price": candidate.price,
                    "store": candidate.store,
                    "score": round(candidate.score, 4),
                    "reasons": reasons,
                }
            )
        return {
            "message": message,
            "ask_attribute": ask_attribute,
            "recommendations": recommendations,
            "intent": intent.to_dict(),
            "state": state.to_dict(),
            "usage": intent.usage,
            "latency_ms": round((time.perf_counter() - started) * 1000, 2),
        }

    def respond(self, session_id: str, user_message: str, top_k: int = 5) -> dict[str, Any]:
        started = time.perf_counter()
        if session_id not in self.sessions:
            raise RuntimeError("reset must be called before respond")
        if not 1 <= top_k <= 10:
            raise ValueError("top_k must be between 1 and 10")
        state = self.sessions[session_id]
        intent = self.intent_parser.parse(user_message, state)
        reply_language = detect_language(user_message)
        language = self._language_key(reply_language)

        if intent.confidence < 0.75:
            previous = self.last_results[session_id]
            text = (
                "I am not confident enough to change your shopping requirements. Could you rephrase or confirm it?"
                if language == "en-US"
                else "我还不能确定你的意思，所以没有修改购物条件。请换一种说法或明确确认一下。"
            )
            return self._reply(session_id, intent, text, "other", previous, started)

        if intent.domain_intent in {"IRRELEVANT", "BENEFIT"}:
            previous = self.last_results[session_id]
            if intent.domain_intent == "BENEFIT":
                text = (
                    "This catalog has no live coupon data, so I will not invent a discount. Your shopping requirements are unchanged."
                    if language == "en-US"
                    else "当前目录没有实时优惠数据，我不会编造折扣；你之前的购物条件保持不变。"
                )
            else:
                text = (
                    "That is outside this shopping assistant's reliable scope. I kept your shopping requirements unchanged."
                    if language == "en-US"
                    else "这个问题不在当前购物助手的可靠能力内；我保留了你之前的购物条件。"
                )
            return self._reply(session_id, intent, text, state.last_question, previous, started)

        if (
            intent.domain_intent == "VAGUE"
            and intent.dialogue_act == "NOOP"
            and state.category is not None
        ):
            if "other" not in state.asked_attributes:
                state.asked_attributes.add("other")
                state.last_question = "other"
                ask_attribute = "other"
                text = QUESTION_TEXT[language]["other"]
            else:
                ask_attribute = self.policy.choose(
                    state,
                    self.last_results[session_id],
                )
                if ask_attribute:
                    text = QUESTION_TEXT[language][ask_attribute]
                else:
                    text = (
                        "The candidates are unchanged. You can choose one or add a new requirement."
                        if language == "en-US"
                        else "候选没有变化。你可以选择一个，或者补充新的要求。"
                    )
            return self._reply(
                session_id,
                intent,
                text,
                ask_attribute,
                self.last_results[session_id],
                started,
            )

        state.language = reply_language
        if intent.dialogue_act == "SELECT" and intent.selected_rank is None and intent.selected_title:
            wanted = intent.selected_title.casefold()
            for rank, candidate in enumerate(self.last_results[session_id], start=1):
                if candidate.title.casefold().startswith(wanted):
                    intent.selected_rank = rank
                    break
        state.apply(intent)
        if intent.dialogue_act == "RESET":
            state.asked_attributes.add("category")
            state.last_question = "category"
            self.last_results[session_id] = []
            text = "Everything is cleared. What would you like to buy?" if language == "en-US" else "已经清空全部条件。你现在想买什么？"
            return self._reply(session_id, intent, text, "category", [], started)
        if state.status == "stopped":
            text = "Stopped. I will not make more recommendations." if language == "en-US" else "好的，已经停止，不再继续推荐。"
            return self._reply(session_id, intent, text, None, [], started)
        if intent.dialogue_act == "SELECT":
            if state.status == "selected":
                selected = next(
                    (item for item in self.last_results[session_id] if item.parent_asin == state.selected_asin),
                    None,
                )
                title = selected.title if selected else state.selected_asin
                text = f"Selected: {title}" if language == "en-US" else f"已选择：{title}"
                return self._reply(session_id, intent, text, None, [selected] if selected else [], started)
            text = (
                "Please select by rank, for example: choose 1."
                if language == "en-US"
                else "请用序号选择，例如“选第1个”。"
            )
            return self._reply(session_id, intent, text, None, self.last_results[session_id], started)

        results, policy_candidates = self.search.search(
            state,
            self.profiles[session_id],
            top_k,
        )
        self.last_results[session_id] = results
        state.last_recommendations = [item.parent_asin for item in results]
        ask_attribute = self.policy.choose(state, policy_candidates)
        if not results:
            text = QUESTION_TEXT[language][ask_attribute or "other"]
            return self._reply(session_id, intent, text, ask_attribute, [], started)
        if ask_attribute:
            question = QUESTION_TEXT[language][ask_attribute]
            text = (
                f"I found {len(results)} current candidates. {question}"
                if language == "en-US"
                else f"我先找到了 {len(results)} 个候选。{question}"
            )
        else:
            text = (
                "The candidates are now focused. You can choose a rank, reject them, or add another requirement."
                if language == "en-US"
                else "候选已经比较集中。你可以说“选第1个”“都不喜欢”，或者继续补充条件。"
            )
        return self._reply(session_id, intent, text, ask_attribute, results, started)

    def close(self) -> None:
        self.search.close()
