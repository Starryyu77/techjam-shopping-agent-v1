"""Generate a self-contained offline evaluation dashboard (single HTML file).

Reads official-evaluator report JSONs from reports/ and renders metrics, the
per-scenario breakdown, the best-rank distribution, and the methodology
narrative. No network, no build step, no third-party deps — pure stdlib. The
output is a portable artifact judges can open directly.

Run:
    python demo/build_dashboard.py --out demo/static/dashboard.html
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

_REPO_ROOT = Path(__file__).resolve().parent.parent
_REPORTS = _REPO_ROOT / "reports"

# Ordered configurations to display (label, filename). Missing files are skipped.
_CONFIGS = [
    ("Rules V1.3 (submitted, popularity tiebreak)", "official_public_rules_v1_3.json"),
    ("Rules V1.2 (constraint-only)", "official_public_rules_v1_2.json"),
    ("Rules + cross-encoder (all)", "official_public_rules_ce_p2a.json"),
]

_BASELINE = {"label": "Official weak BM25 baseline", "hit_rate_at_10": 0.125, "mrr": 0.068, "mttc": 9.81, "recommended_technical_score": 0.139}


def _load(name: str) -> dict[str, Any] | None:
    path = _REPORTS / name
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _rank_histogram(report: dict[str, Any]) -> list[int]:
    # buckets: rank1, 2, 3-5, 6-10, miss
    buckets = [0, 0, 0, 0, 0]
    for s in report.get("sessions", []):
        if not s.get("hit"):
            buckets[4] += 1
            continue
        r = s.get("best_rank", 99)
        if r == 1:
            buckets[0] += 1
        elif r == 2:
            buckets[1] += 1
        elif r <= 5:
            buckets[2] += 1
        else:
            buckets[3] += 1
    return buckets


def build(out: Path) -> Path:
    configs = []
    for label, fname in _CONFIGS:
        rep = _load(fname)
        if rep:
            configs.append((label, rep))
    if not configs:
        raise SystemExit("no reports found in reports/")

    submitted_label, submitted = configs[0]
    hist = _rank_histogram(submitted)
    hist_total = max(sum(hist), 1)
    hist_labels = ["rank 1", "rank 2", "rank 3-5", "rank 6-10", "miss"]

    def fmt(x: float, d: int = 3) -> str:
        return f"{x:.{d}f}"

    rows = []
    for label, rep in configs:
        rows.append(
            f"<tr><td>{label}</td>"
            f"<td>{fmt(rep['hit_rate_at_10'])}</td>"
            f"<td>{fmt(rep['mrr'])}</td>"
            f"<td>{fmt(rep['mttc'])}</td>"
            f"<td class='ts'>{fmt(rep['recommended_technical_score'])}</td></tr>"
        )
    b = _BASELINE
    rows.append(
        f"<tr class='base'><td>{b['label']}</td><td>{fmt(b['hit_rate_at_10'])}</td>"
        f"<td>{fmt(b['mrr'])}</td><td>{fmt(b['mttc'])}</td>"
        f"<td class='ts'>{fmt(b['recommended_technical_score'])}</td></tr>"
    )
    table_rows = "\n".join(rows)

    scen = submitted.get("scenario_metrics", {})
    scen_cards = []
    for name in ("buying", "browsing", "intent_override", "boundary"):
        m = scen.get(name)
        if not m:
            continue
        scen_cards.append(
            f"<div class='scard'><h4>{name.replace('_',' ')}</h4>"
            f"<div class='big'>{fmt(m['hit_rate_at_10'],3)}</div><div class='lbl'>Hit Rate@10</div>"
            f"<div class='mini'>MRR {fmt(m['mrr'])} · MTTC {fmt(m['mttc'],2)} · n={m['sample_count']}</div></div>"
        )
    scen_html = "\n".join(scen_cards)

    bars = []
    palette = ["#4dd4ac", "#6ea8fe", "#b18cff", "#f0a35e", "#ff6b6b"]
    for i, (lab, val) in enumerate(zip(hist_labels, hist)):
        pct = 100 * val / hist_total
        bars.append(
            f"<div class='bar'><div class='barlabel'>{lab}</div>"
            f"<div class='track'><div class='fill' style='width:{pct:.1f}%;background:{palette[i]}'></div></div>"
            f"<div class='barval'>{val}</div></div>"
        )
    bars_html = "\n".join(bars)

    ts = submitted["recommended_technical_score"]
    hr = submitted["hit_rate_at_10"]
    mrr = submitted["mrr"]
    mttc = submitted["mttc"]
    eff = submitted.get("efficiency", max(0.0, min(1.0, (11 - mttc) / 10)))

    html = f"""<!DOCTYPE html><html lang=en><head><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>Evaluation Dashboard — Shopping Copilot</title>
<style>
:root{{--bg:#0b0d12;--panel:#12151d;--panel2:#171b25;--line:#232838;--ink:#e7ebf3;--muted:#8b93a7;--accent:#6ea8fe;--good:#4dd4ac}}
*{{box-sizing:border-box}}body{{margin:0;font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:radial-gradient(1200px 600px at 70% -10%,#182033,transparent),var(--bg);color:var(--ink)}}
.wrap{{max-width:1080px;margin:0 auto;padding:26px}}
h1{{font-size:22px;margin:0 0 4px}}.sub{{color:var(--muted);margin-bottom:24px}}
.kpis{{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:26px}}
.kpi{{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px}}
.kpi .v{{font-size:26px;font-weight:750}}.kpi .l{{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.4px}}
.kpi.hl{{border-color:var(--accent);box-shadow:0 0 24px rgba(110,168,254,.15)}}.kpi.hl .v{{color:var(--accent)}}
.card{{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px;margin-bottom:22px}}
.card h3{{margin:0 0 14px;font-size:14px;text-transform:uppercase;letter-spacing:.4px;color:var(--muted)}}
table{{width:100%;border-collapse:collapse;font-size:14px}}th,td{{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line)}}
th{{color:var(--muted);font-weight:600;font-size:12px;text-transform:uppercase}}td.ts{{font-weight:700;color:var(--good)}}
tr.base td{{color:var(--muted)}}tr.base td.ts{{color:var(--muted)}}
.scen{{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}}
.scard{{background:var(--panel2);border:1px solid var(--line);border-radius:12px;padding:14px}}
.scard h4{{margin:0 0 8px;font-size:12px;text-transform:capitalize;color:var(--accent)}}
.scard .big{{font-size:24px;font-weight:750}}.scard .lbl{{color:var(--muted);font-size:11px}}.scard .mini{{color:var(--muted);font-size:11px;margin-top:8px}}
.bar{{display:grid;grid-template-columns:90px 1fr 44px;align-items:center;gap:12px;margin-bottom:9px}}
.barlabel{{color:var(--muted);font-size:13px}}.track{{background:#0e1119;border:1px solid var(--line);border-radius:8px;height:20px;overflow:hidden}}
.fill{{height:100%;border-radius:8px 0 0 8px;transition:width .6s}}.barval{{text-align:right;font-variant-numeric:tabular-nums}}
.note{{color:var(--muted);font-size:13px;line-height:1.7}}.formula{{font-family:ui-monospace,Menlo,monospace;background:var(--panel2);border:1px solid var(--line);border-radius:8px;padding:8px 12px;display:inline-block;margin-top:8px;font-size:13px}}
</style></head><body><div class=wrap>
<h1>Evaluation Dashboard — Conversational Shopping Copilot</h1>
<div class=sub>TechJam 2026 · Problem Statement 4 · unmodified official public-set evaluator · {submitted.get('sample_count',200)} sessions · offline rules engine</div>

<div class=kpis>
  <div class="kpi hl"><div class=v>{fmt(ts)}</div><div class=l>Technical Score</div></div>
  <div class=kpi><div class=v>{fmt(hr)}</div><div class=l>Hit Rate@10</div></div>
  <div class=kpi><div class=v>{fmt(mrr)}</div><div class=l>MRR</div></div>
  <div class=kpi><div class=v>{fmt(mttc,2)}</div><div class=l>MTTC</div></div>
  <div class=kpi><div class=v>{fmt(eff)}</div><div class=l>Efficiency</div></div>
</div>

<div class=card><h3>Configuration comparison</h3>
<table><thead><tr><th>Configuration</th><th>Hit Rate@10</th><th>MRR</th><th>MTTC</th><th>Technical Score</th></tr></thead>
<tbody>{table_rows}</tbody></table>
<div class=note style="margin-top:12px">We evaluated a full local cross-encoder reranker (globally and gated to the Buying track) and kept it OFF by default: on this task's composite it is flat-to-slightly-negative and occasionally lowers Hit Rate. Carefully engineered lightweight rules win — the light-execution outcome the problem statement rewards.</div>
</div>

<div class=card><h3>Per-scenario (submitted config)</h3><div class=scen>{scen_html}</div></div>

<div class=card><h3>Best-rank distribution (submitted config)</h3>{bars_html}
<div class=note style="margin-top:12px">Diagnosis of every public-set miss showed a <b>ranking</b> problem, not recall: the target was always retrievable but hard to lift above look-alikes when the customer disclosed only a generic constraint. This reshaped our retrieval strategy toward constraint-aware reranking rather than deeper recall.</div>
</div>

<div class=card><h3>Scoring formula & methodology</h3>
<div class=note>
<span class=formula>TechnicalScore = 0.50·HitRate@10 + 0.30·MRR + 0.20·Efficiency</span><br>
<span class=formula>Efficiency = clip((11 − MTTC) / 10, 0, 1)</span>
<p>Prompt self-evolution is leakage-safe: the optimizer sees only development-set bad cases; validation only accepts a new prompt when composite improves and safety metrics (JSON compliance, no-mutation preservation) do not regress; the held-out test set is read once, only after a final freeze. Target ids, validation text, and test labels never enter prompts.</p>
</div></div>

<div class=sub style="text-align:center">Generated offline from reports/ · no network required</div>
</div></body></html>"""
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    return out


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--out", type=Path, default=_REPO_ROOT / "demo" / "static" / "dashboard.html")
    args = p.parse_args()
    path = build(args.out)
    print(f"dashboard written: {path}")


if __name__ == "__main__":
    main()
