"""Token-aware chunking against the embedding model's own tokenizer.

MiniLM silently truncates at 256 tokens. Chunking by character count would be a
guess — legal prose is dense with citations and abbreviations that tokenize far
worse than ordinary English ("Cr.P.C." is 6 tokens, not 1) — so a
character-budgeted chunk can overflow and lose its tail without any error.
Everything here is measured with the real tokenizer instead.

Text is packed paragraph-first so chunks tend to break on natural boundaries;
oversized paragraphs are windowed internally as a fallback.
"""
from __future__ import annotations

import re
from functools import lru_cache

from ingestion.config import CHUNK_OVERLAP_TOKENS, CHUNK_TOKENS, MODEL_NAME

# A trailing fragment shorter than this is folded away rather than embedded; a
# 6-token chunk carries no usable signal and dilutes the mean-pooled vector.
MIN_CHUNK_TOKENS = 25


@lru_cache(maxsize=1)
def get_tokenizer():
    """Tokenizer only — no model weights. Shared by ingestion and query paths."""
    from transformers import AutoTokenizer

    return AutoTokenizer.from_pretrained(MODEL_NAME)


def _paragraphs(text: str) -> list[str]:
    parts = re.split(r"\n\s*\n", text)
    return [p.strip() for p in parts if p.strip()]


def _window(ids: list[int], size: int, stride: int) -> list[list[int]]:
    """Slide a fixed window over a token sequence."""
    if len(ids) <= size:
        return [ids]
    out: list[list[int]] = []
    for start in range(0, len(ids), stride):
        piece = ids[start: start + size]
        if len(piece) < MIN_CHUNK_TOKENS and out:
            break
        out.append(piece)
        if start + size >= len(ids):
            break
    return out


def select_evenly(items: list, cap: int) -> list:
    """Take `cap` items spread evenly across the list, keeping first and last.

    Preferred over truncation when capping a document's chunks. Mean-pooling over
    an even sample approximates the mean over all chunks; keeping only the first N
    would throw away the court's reasoning and holding, which sit at the end.
    """
    if cap <= 0 or len(items) <= cap:
        return items
    idx = [round(i * (len(items) - 1) / (cap - 1)) for i in range(cap)] if cap > 1 else [0]
    return [items[i] for i in sorted(set(idx))]


def chunk_text(
    text: str,
    chunk_tokens: int = CHUNK_TOKENS,
    overlap_tokens: int = CHUNK_OVERLAP_TOKENS,
    max_chunks: int | None = None,
) -> list[str]:
    """Split text into overlapping chunks that fit the model's window.

    `max_chunks` caps the result by even sampling, not truncation.
    """
    if not text or not text.strip():
        return []

    paragraphs = _paragraphs(text)
    if not paragraphs:
        return []

    tok = get_tokenizer()
    stride = max(1, chunk_tokens - overlap_tokens)

    # One batched tokenizer call, not one per paragraph. The fast tokenizer
    # parallelises internally in Rust; the per-paragraph loop this replaces cost
    # ~1.3s per judgment and was half the total corpus build time.
    batch = tok(paragraphs, add_special_tokens=False)["input_ids"]

    encoded: list[list[int]] = []
    for ids in batch:
        if not ids:
            continue
        if len(ids) > chunk_tokens:
            encoded.extend(_window(ids, chunk_tokens, stride))
        else:
            encoded.append(ids)

    if not encoded:
        return []

    # Pack paragraph token-runs into chunks, carrying `overlap_tokens` of the
    # previous chunk forward so a thought spanning a boundary survives in one.
    chunks: list[list[int]] = []
    current: list[int] = []

    for ids in encoded:
        if current and len(current) + len(ids) > chunk_tokens:
            chunks.append(current)
            current = current[-overlap_tokens:] if overlap_tokens else []
        current.extend(ids)
        while len(current) > chunk_tokens:
            chunks.append(current[:chunk_tokens])
            current = current[chunk_tokens - overlap_tokens:]

    if current and (len(current) >= MIN_CHUNK_TOKENS or not chunks):
        chunks.append(current)

    if max_chunks:
        chunks = select_evenly(chunks, max_chunks)

    return tok.batch_decode(chunks, skip_special_tokens=True)


def count_tokens(text: str) -> int:
    """Token length under the embedding model's tokenizer."""
    return len(get_tokenizer().encode(text, add_special_tokens=False))
