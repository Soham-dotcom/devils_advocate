"""Sentence-transformer loading and document vector construction.

One document becomes one vector: encode its chunks, mean-pool, re-normalise.
Mean pooling is what lets a 60-page judgment and a 4-page one be compared on
equal footing, and re-normalising after the mean is required — the mean of unit
vectors is not itself a unit vector, so skipping it makes cosine similarity
quietly wrong.

The model is a module-level singleton: loading MiniLM costs ~3-5s, which is fine
once at startup and unacceptable per request.
"""
from __future__ import annotations

import os
from functools import lru_cache

import numpy as np

from ingestion.config import EMBEDDING_DIM, MODEL_NAME  # noqa: F401  (config sets KMP_DUPLICATE_LIB_OK)

# Larger batches help on CPU up to a point; past ~64 the gain flattens while
# memory grows.
DEFAULT_BATCH_SIZE = 64


@lru_cache(maxsize=1)
def get_model():
    """Load the encoder once per process."""
    import torch
    from sentence_transformers import SentenceTransformer

    # torch defaults to 8 threads on this 12-core box; using all of them buys
    # ~10% on the corpus build for free.
    if (cores := os.cpu_count()):
        torch.set_num_threads(cores)

    model = SentenceTransformer(MODEL_NAME, device="cpu")
    model.max_seq_length = 256
    return model


def encode_chunks(chunks: list[str], batch_size: int = DEFAULT_BATCH_SIZE) -> np.ndarray:
    """Encode chunks to L2-normalised vectors, shape (len(chunks), EMBEDDING_DIM)."""
    if not chunks:
        return np.zeros((0, EMBEDDING_DIM), dtype=np.float32)

    vectors = get_model().encode(
        chunks,
        batch_size=batch_size,
        convert_to_numpy=True,
        normalize_embeddings=True,
        show_progress_bar=False,
    )
    return np.asarray(vectors, dtype=np.float32)


def pool(vectors: np.ndarray) -> np.ndarray:
    """Mean-pool chunk vectors into one unit vector.

    Returns a zero vector for empty input — callers treat all-zero as "no vector",
    which scores 0.0 against everything rather than raising.
    """
    if vectors.size == 0:
        return np.zeros(EMBEDDING_DIM, dtype=np.float32)

    mean = vectors.mean(axis=0)
    norm = float(np.linalg.norm(mean))
    if norm < 1e-9:
        return np.zeros(EMBEDDING_DIM, dtype=np.float32)
    return (mean / norm).astype(np.float32)


def embed_document(chunks: list[str], batch_size: int = DEFAULT_BATCH_SIZE) -> np.ndarray:
    """Chunks -> single pooled unit vector."""
    return pool(encode_chunks(chunks, batch_size=batch_size))


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity of two unit vectors (a plain dot product)."""
    if a.size == 0 or b.size == 0:
        return 0.0
    return float(np.dot(a, b))
