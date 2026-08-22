"""Shared paths and tuning constants for ingestion and retrieval.

Single source of truth so the offline build and the online query path cannot
drift apart — they must chunk and embed identically or the vectors are not
comparable.
"""
import os
from pathlib import Path

# Anaconda ships a second OpenMP runtime that collides with the one torch links
# against, aborting on import. This must be set before torch is first imported.
# Unsupported workaround, but the alternative is rebuilding the conda env.
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent

DATASET_DIR = PROJECT_ROOT / "dataset"
ARTIFACTS_DIR = BACKEND_DIR / "artifacts"

CORPUS_DB = ARTIFACTS_DIR / "corpus.db"
DOC_VECTORS = ARTIFACTS_DIR / "doc_vectors.npy"
ISSUE_VECTORS = ARTIFACTS_DIR / "issue_vectors.npy"
INDEX_MAP = ARTIFACTS_DIR / "index_map.json"

# all-MiniLM-L6-v2: 384-dim, 256-token window, ~80MB.
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIM = 384
MAX_MODEL_TOKENS = 256

# Chunking. 200 leaves headroom under the 256 cap after special tokens; 40 of
# overlap keeps a sentence spanning a boundary from being lost to both chunks.
CHUNK_TOKENS = 200
CHUNK_OVERLAP_TOKENS = 40

# Query-side bound. A 50-page paste must not blow the 2s latency budget, and
# past a few thousand tokens the mean-pooled vector stops changing much anyway.
MAX_QUERY_CHUNKS = 40

# Corpus-side bound, sampled evenly across the judgment rather than truncated.
# Judgments run to 259 chunks; embedding every one costs ~48 min of CPU for a
# vector that is a mean anyway, and an even sample estimates that mean closely.
# 40 covers the median judgment (67 chunks) at ~42% of the full cost.
MAX_DOC_CHUNKS = 40

# Scoring weights, tuned in T14 against 1,420 eval queries (see eval/run_eval.py).
#
# The issue vector is weighted to zero. Measured, not assumed: recall@5 improves
# monotonically as its weight falls, at every statute weight tested
# (0.35 -> 0.268, 0.15 -> 0.337, 0.00 -> 0.394). Mean-pooling a sub-passage into
# the same space as whole documents pulls every case toward whichever ones happen
# to state their issues explicitly. The vector is still built and stored so this
# is one constant away from being re-enabled if a better use is found.
W_DOC = 1.0
W_ISSUE = 0.0

# Statute overlap held at 0.15. At that weight it costs nothing measurable
# (0.396 vs 0.394 for pure semantic — within noise) and earns its place by making
# the match explainable: "matched on S.482 CrPC" is something a lawyer can check,
# which a bare cosine is not. Above 0.15 it degrades sharply (0.40 -> 0.324).
W_SEMANTIC = 0.85
W_STATUTE = 0.15

# Score statute overlap on section-level tokens only (`CrPC:482`), never bare act
# tokens (`CrPC`). Acts appear in most judgments of their kind, so including them
# manufactures overlap between unrelated cases.
STATUTE_SECTIONS_ONLY = True

# Below this combined score, results are reported as weak rather than presented
# as confident matches. Provisional — revisited in T14.
WEAK_MATCH_THRESHOLD = 0.35
TOP_K = 5

# Shorter than this and there is not enough signal to retrieve on; the caller
# shows the empty state rather than five arbitrary judgments.
MIN_QUERY_TOKENS = 30
