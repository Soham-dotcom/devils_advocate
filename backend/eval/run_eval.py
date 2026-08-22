"""Retrieval quality evaluation and blend-weight tuning.

    python -m eval.run_eval              # evaluate + sweep weights
    python -m eval.run_eval --dump       # also write eval_set.json

Run from `backend/`.

## What this measures, and what it does not

There is no human-labelled set of "cases that ought to be retrieved" for this
corpus, so quality cannot be measured directly. This uses a proxy: **shared cited
precedents**. Two judgments that cite the same prior authorities are treating the
same line of law, so one is a plausible result for the other.

The proxy is chosen because it is *independent of what is being scored*. Citations
feed neither the embeddings nor the statute overlap, so grading against them does
not reward the system for agreeing with itself. Grading against statute overlap
would be circular — statutes are 40% of the score.

It remains a proxy. Two cases can share citations and be legally unrelated, and
genuinely similar cases can share none. Treat the numbers as a guard against
regression and a basis for choosing between weightings, not as evidence that
retrieval is good.
"""
from __future__ import annotations

import argparse
import json
import sqlite3
from collections import defaultdict
from pathlib import Path

import numpy as np

from ingestion.config import (
    ARTIFACTS_DIR,
    CORPUS_DB,
    W_DOC,
    W_ISSUE,
    W_SEMANTIC,
    W_STATUTE,
)
from retrieval.store import get_store

# A pair must share at least this many cited precedents to count as relevant.
# One shared citation is weak — procedural boilerplate like a standard SLP
# authority appears across unrelated cases.
MIN_SHARED_CITATIONS = 2
TOP_K = 5


def load_citations(db_path: Path) -> dict[str, set[str]]:
    conn = sqlite3.connect(db_path)
    out: dict[str, set[str]] = {}
    for case_id, raw in conn.execute(
        "SELECT case_id, citations FROM cases WHERE vector_row IS NOT NULL"
    ):
        try:
            out[case_id] = set(json.loads(raw) or [])
        except (TypeError, json.JSONDecodeError):
            out[case_id] = set()
    conn.close()
    return out


def build_ground_truth(citations: dict[str, set[str]]) -> dict[str, set[str]]:
    """Query case -> the set of cases sharing >= MIN_SHARED_CITATIONS with it."""
    # Invert to citation -> cases, so only genuinely co-citing pairs are compared
    # rather than all ~2,400^2 of them.
    by_citation: dict[str, list[str]] = defaultdict(list)
    for case_id, cites in citations.items():
        for c in cites:
            by_citation[c].append(case_id)

    shared: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for cases in by_citation.values():
        # A citation appearing in almost every judgment carries no signal.
        if len(cases) > 40:
            continue
        for i, a in enumerate(cases):
            for b in cases[i + 1:]:
                shared[a][b] += 1
                shared[b][a] += 1

    return {
        case_id: {other for other, n in others.items() if n >= MIN_SHARED_CITATIONS}
        for case_id, others in shared.items()
        if any(n >= MIN_SHARED_CITATIONS for n in others.values())
    }


def jaccard_matrix(
    query_statutes: set[str],
    corpus: list[set[str]],
    idf: dict[str, float] | None = None,
) -> np.ndarray:
    """Statute overlap of the query against every row.

    With `idf`, tokens are weighted by inverse document frequency. Plain Jaccard
    treats `CrPC` — which appears in most criminal judgments — as worth the same
    as `CrPC:125`, so ubiquitous tokens dominate and manufacture overlap between
    unrelated cases.
    """
    out = np.zeros(len(corpus), dtype=np.float32)
    if not query_statutes:
        return out

    if idf is None:
        for i, s in enumerate(corpus):
            if s:
                inter = len(query_statutes & s)
                if inter:
                    out[i] = inter / len(query_statutes | s)
        return out

    q_weight = sum(idf.get(t, 0.0) for t in query_statutes)
    for i, s in enumerate(corpus):
        if not s:
            continue
        shared = query_statutes & s
        if not shared:
            continue
        num = sum(idf.get(t, 0.0) for t in shared)
        denom = q_weight + sum(idf.get(t, 0.0) for t in s) - num
        if denom > 0:
            out[i] = num / denom
    return out


def build_idf(corpus: list[set[str]]) -> dict[str, float]:
    df: dict[str, int] = defaultdict(int)
    for s in corpus:
        for t in s:
            df[t] += 1
    n = max(1, len(corpus))
    return {t: float(np.log(n / (1 + c))) for t, c in df.items()}


def section_only(statutes: list[set[str]]) -> list[set[str]]:
    """Drop bare act tokens, keeping only `ACT:SECTION` references."""
    return [{t for t in s if ":" in t} for s in statutes]


def evaluate(
    store,
    ground_truth,
    weights,
    statutes: list[set[str]] | None = None,
    idf: dict[str, float] | None = None,
) -> tuple[float, float, int]:
    """Return (recall@5, mrr, n_queries) for one weighting."""
    w_sem, w_stat, w_doc, w_issue = weights
    statutes = statutes if statutes is not None else store.statutes
    id_to_row = {cid: i for i, cid in enumerate(store.case_ids)}

    recalls: list[float] = []
    rr: list[float] = []

    for query_id, relevant in ground_truth.items():
        row = id_to_row.get(query_id)
        if row is None:
            continue
        relevant_rows = {id_to_row[r] for r in relevant if r in id_to_row}
        if not relevant_rows:
            continue

        q = store.doc_vectors[row]
        semantic = w_doc * (store.doc_vectors @ q) + w_issue * (store.issue_vectors @ q)
        statute = jaccard_matrix(statutes[row], statutes, idf)
        final = w_sem * semantic + w_stat * statute
        final[row] = -np.inf  # never retrieve the query itself

        top = np.argpartition(-final, TOP_K)[:TOP_K]
        top = top[np.argsort(-final[top])]

        hits = [i for i, r in enumerate(top, 1) if int(r) in relevant_rows]
        recalls.append(len(hits) / min(TOP_K, len(relevant_rows)))
        rr.append(1 / hits[0] if hits else 0.0)

    if not recalls:
        return 0.0, 0.0, 0
    return float(np.mean(recalls)), float(np.mean(rr)), len(recalls)


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluate retrieval quality.")
    parser.add_argument("--artifacts", type=Path, default=ARTIFACTS_DIR)
    parser.add_argument("--dump", action="store_true", help="write eval_set.json")
    args = parser.parse_args()

    store = get_store(args.artifacts)
    citations = load_citations(args.artifacts / CORPUS_DB.name)
    ground_truth = build_ground_truth(citations)

    with_cites = sum(1 for c in citations.values() if c)
    print(f"corpus            {len(store)} judgments")
    print(f"with citations    {with_cites} ({with_cites / max(1, len(citations)):.0%})")
    print(f"eval queries      {len(ground_truth)} "
          f"(cases sharing >={MIN_SHARED_CITATIONS} cited precedents with another)")

    if not ground_truth:
        print("\nNo evaluable pairs — corpus too small or citations too sparse.")
        return 1

    sizes = [len(v) for v in ground_truth.values()]
    print(f"relevant per query  median {int(np.median(sizes))}, max {max(sizes)}")

    # (w_semantic, w_statute, w_doc, w_issue)
    candidates = {
        "current (0.60/0.40, doc 0.65/issue 0.35)": (W_SEMANTIC, W_STATUTE, W_DOC, W_ISSUE),
        "semantic only (1.00/0.00)": (1.0, 0.0, W_DOC, W_ISSUE),
        "statutes only (0.00/1.00)": (0.0, 1.0, W_DOC, W_ISSUE),
        "statute-heavy (0.40/0.60)": (0.4, 0.6, W_DOC, W_ISSUE),
    }
    # Grid over the two levers that matter: how much weight the statute signal
    # gets, and how much of the semantic half the issue vector takes. The first
    # sweep showed issue weight is actively harmful, so it is swept down to zero.
    for w_issue in (0.35, 0.15, 0.0):
        for w_stat in (0.0, 0.2, 0.3, 0.4, 0.5):
            label = f"issue {w_issue:.2f} / statute {w_stat:.2f}"
            candidates[label] = (1 - w_stat, w_stat, 1 - w_issue, w_issue)

    print(f"\n{'weighting':<42} {'recall@5':>9} {'MRR':>7}")
    print("-" * 60)
    results = {}
    for label, weights in candidates.items():
        recall, mrr, n = evaluate(store, ground_truth, weights)
        results[label] = recall
        print(f"{label:<42} {recall:>9.3f} {mrr:>7.3f}")

    # Is the statute signal wrong in principle, or just drowned in common tokens
    # like `CrPC` that appear in most judgments? Test both repairs before
    # concluding the signal has no value.
    print(f"\n{'statute variants (issue 0.00)':<42} {'recall@5':>9} {'MRR':>7}")
    print("-" * 60)
    sec = section_only(store.statutes)
    idf_all = build_idf(store.statutes)
    idf_sec = build_idf(sec)

    for w_stat in (0.15, 0.25, 0.4):
        for label, sts, idf in (
            ("section-only", sec, None),
            ("idf-weighted", store.statutes, idf_all),
            ("section+idf", sec, idf_sec),
        ):
            recall, mrr, _ = evaluate(
                store, ground_truth, (1 - w_stat, w_stat, 1.0, 0.0), sts, idf
            )
            name = f"{label} / statute {w_stat:.2f}"
            results[name] = recall
            print(f"{name:<42} {recall:>9.3f} {mrr:>7.3f}")

    best = max(results, key=results.get)
    print("-" * 60)
    print(f"best: {best}  (recall@5 {results[best]:.3f})")
    print("\nProxy metric — shared cited precedents, not human relevance judgments.")
    print("Use it to choose between weightings and catch regressions, not as")
    print("evidence that retrieval is good.")

    if args.dump:
        path = Path(__file__).parent / "eval_set.json"
        path.write_text(
            json.dumps(
                {
                    "method": "shared cited precedents",
                    "min_shared_citations": MIN_SHARED_CITATIONS,
                    "top_k": TOP_K,
                    "n_queries": len(ground_truth),
                    "results": results,
                    "ground_truth": {k: sorted(v) for k, v in
                                     list(ground_truth.items())[:200]},
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        print(f"\nwrote {path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
