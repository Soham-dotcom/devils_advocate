"""Hybrid similar-case retrieval.

Two independent signals are blended:

    semantic = W_DOC * cos(query, doc_vec) + W_ISSUE * cos(query, issue_vec)
    final    = W_SEMANTIC * semantic + W_STATUTE * jaccard(statutes)

Keeping them separate is the point. The embedding half catches cases that are
about the same thing in different words; the statute half is deterministic and
can be shown to the user as the reason for a match. A single cosine number
cannot answer "why did this match", which the spec makes an acceptance criterion.

Scoring is a dense matmul over the whole corpus. At ~2,400 rows that is well
under a millisecond, so there is no index to maintain and no approximation.
"""
from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass, field

import numpy as np

from ingestion.chunk import chunk_text, count_tokens
from ingestion.config import (
    MAX_QUERY_CHUNKS,
    MIN_QUERY_TOKENS,
    STATUTE_SECTIONS_ONLY,
    TOP_K,
    W_DOC,
    W_ISSUE,
    W_SEMANTIC,
    W_STATUTE,
    WEAK_MATCH_THRESHOLD,
)
from ingestion.embed import embed_document
from ingestion.segment import body_text_of, split_paragraphs
from ingestion.statutes import extract_statutes, shared_statutes
from retrieval.store import ArtifactError, CaseRecord, CorpusStore, get_store

log = logging.getLogger(__name__)

# A result whose semantic score is below this contributed nothing meaningful, so
# the match is reported as statute-driven and badged accordingly in the UI.
SEMANTIC_FLOOR = 0.30


@dataclass
class MatchBreakdown:
    """Why this case matched. Surfaced verbatim in the UI."""

    final_score: float
    semantic: float
    doc_similarity: float
    issue_similarity: float
    statute_overlap: float
    shared_statutes: list[str] = field(default_factory=list)
    matched_on: str = "semantic"  # "both" | "semantic" | "statutes"


@dataclass
class SimilarCase:
    record: CaseRecord
    breakdown: MatchBreakdown
    is_weak: bool


@dataclass
class QueryResult:
    """Outcome of one lookup. `reason` explains any empty result."""

    cases: list[SimilarCase] = field(default_factory=list)
    weak_only: bool = False
    reason: str | None = None
    elapsed_ms: float = 0.0
    query_statutes: list[str] = field(default_factory=list)


def _normalise_title(title: str | None) -> str:
    if not title:
        return ""
    text = re.sub(r"\bon\s+\d{1,2}\s+\w+,?\s+\d{4}\b", "", title, flags=re.IGNORECASE)
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def preprocess_query(text: str) -> tuple[np.ndarray, set[str], int]:
    """Run submitted text through the same path used to build the corpus.

    The segmentation step is load-bearing, not cosmetic. `build_index` embeds the
    *segmented body* (preamble stripped, paragraphs rejoined); embedding the raw
    text here instead put the query in a different space from the corpus. Most
    documents survived that — the preamble is short, so self-similarity stayed
    ~0.99 — but documents whose segmentation diverges failed to match even
    themselves. Keep these three lines in step with `build_index.process_one`.
    """
    paragraphs = split_paragraphs(text)
    body = body_text_of(paragraphs) or text

    chunks = chunk_text(body, max_chunks=MAX_QUERY_CHUNKS)
    if not chunks:
        return np.zeros(0, dtype=np.float32), set(), 0
    # Statutes come from the full text, matching ingestion — the preamble often
    # carries the provision the case is brought under.
    return embed_document(chunks), extract_statutes(text), len(chunks)


def _sections(statutes: set[str]) -> set[str]:
    """Section-level tokens only. See STATUTE_SECTIONS_ONLY in config."""
    return {t for t in statutes if ":" in t} if STATUTE_SECTIONS_ONLY else statutes


def _jaccard_column(query_statutes: set[str], corpus: list[set[str]]) -> np.ndarray:
    """Statute overlap of the query against every corpus row.

    Scored on section-level tokens: a bare `CrPC` is shared by most criminal
    judgments and carries no signal, while `CrPC:482` is specific enough to mean
    something.
    """
    q = _sections(query_statutes)
    out = np.zeros(len(corpus), dtype=np.float32)
    if not q:
        return out
    for i, doc_statutes in enumerate(corpus):
        d = _sections(doc_statutes)
        if not d:
            continue
        intersection = len(q & d)
        if intersection:
            out[i] = intersection / len(q | d)
    return out


def find_similar(
    text: str,
    top_k: int = TOP_K,
    store: CorpusStore | None = None,
    exclude_case_ids: set[str] | None = None,
) -> QueryResult:
    """Find the cases most similar to `text`.

    Never raises for ordinary failure: an unavailable corpus or unusable input
    comes back as an empty `QueryResult` carrying a `reason`. Only a genuinely
    unexpected error propagates, and the pipeline node catches that too.
    """
    started = time.perf_counter()

    if not text or not text.strip():
        return QueryResult(reason="no text submitted")

    if count_tokens(text) < MIN_QUERY_TOKENS:
        return QueryResult(
            reason=f"input too short to match on (needs ~{MIN_QUERY_TOKENS} tokens)"
        )

    try:
        store = store or get_store()
    except ArtifactError as exc:
        log.warning("similar-case corpus unavailable: %s", exc)
        return QueryResult(reason=f"corpus unavailable: {exc}")

    query_vec, query_statutes, n_chunks = preprocess_query(text)
    if query_vec.size == 0:
        return QueryResult(reason="input produced no embeddable content")

    doc_sims = store.doc_vectors @ query_vec
    issue_sims = store.issue_vectors @ query_vec
    semantic = W_DOC * doc_sims + W_ISSUE * issue_sims

    statute_overlap = _jaccard_column(query_statutes, store.statutes)
    final = W_SEMANTIC * semantic + W_STATUTE * statute_overlap

    # Over-fetch so dedup and exclusions still leave top_k to return.
    pool_size = min(len(final), max(top_k * 4, top_k + 10))
    candidates = np.argpartition(-final, pool_size - 1)[:pool_size]
    candidates = candidates[np.argsort(-final[candidates])]

    excluded = exclude_case_ids or set()
    seen_titles: set[str] = set()
    results: list[SimilarCase] = []

    for row in candidates:
        row = int(row)
        if store.case_ids[row] in excluded:
            continue
        record = store.record(row)
        if record is None:
            continue

        # The corpus contains re-uploads of the same judgment under different
        # ids; showing one case twice wastes a slot and looks broken.
        key = _normalise_title(record.title)
        if key and key in seen_titles:
            continue
        seen_titles.add(key)

        overlap = float(statute_overlap[row])
        sem = float(semantic[row])
        if overlap > 0 and sem >= SEMANTIC_FLOOR:
            matched_on = "both"
        elif overlap > 0:
            matched_on = "statutes"
        else:
            matched_on = "semantic"

        score = float(final[row])
        results.append(
            SimilarCase(
                record=record,
                breakdown=MatchBreakdown(
                    final_score=round(score, 4),
                    semantic=round(sem, 4),
                    doc_similarity=round(float(doc_sims[row]), 4),
                    issue_similarity=round(float(issue_sims[row]), 4),
                    statute_overlap=round(overlap, 4),
                    shared_statutes=shared_statutes(query_statutes, store.statutes[row]),
                    matched_on=matched_on,
                ),
                is_weak=score < WEAK_MATCH_THRESHOLD,
            )
        )
        if len(results) >= top_k:
            break

    elapsed_ms = (time.perf_counter() - started) * 1000
    weak_only = bool(results) and all(r.is_weak for r in results)

    log.info(
        "similar-case lookup: %d results, top=%.3f, statutes=%d, chunks=%d, %.0fms",
        len(results), results[0].breakdown.final_score if results else 0.0,
        len(query_statutes), n_chunks, elapsed_ms,
    )

    return QueryResult(
        cases=results,
        weak_only=weak_only,
        reason=None if results else "no comparable cases in the corpus",
        elapsed_ms=round(elapsed_ms, 1),
        query_statutes=sorted(query_statutes),
    )
