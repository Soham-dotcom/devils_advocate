"""Load and hold the corpus artifacts for the lifetime of the process.

Loaded once at import: the vector matrices and every document's statute set live
in memory (a few MB), because scoring touches all ~2,400 rows on every query.
Display metadata is *not* preloaded — only the top 5 rows are ever shown, so
those are fetched from SQLite on demand.

Every failure mode here surfaces as `ArtifactError`. The pipeline node in
`agents/engine.py` catches exactly that and degrades to the empty state, which is
what keeps a missing artifacts directory from taking down the whole analysis.
"""
from __future__ import annotations

import json
import sqlite3
import threading
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from ingestion.config import (
    ARTIFACTS_DIR,
    CORPUS_DB,
    DOC_VECTORS,
    EMBEDDING_DIM,
    INDEX_MAP,
    ISSUE_VECTORS,
)


class ArtifactError(RuntimeError):
    """Corpus artifacts are missing, unreadable, or internally inconsistent."""


@dataclass
class CaseRecord:
    case_id: str
    title: str | None = None
    appellant: str | None = None
    respondent: str | None = None
    court: str | None = None
    jurisdiction: str | None = None
    case_number: str | None = None
    judgment_date: str | None = None
    year: int | None = None
    bench: list[str] = field(default_factory=list)
    author_judge: str | None = None
    excerpt: str | None = None
    source_path: str | None = None
    has_issue_block: bool = False

    @property
    def source_url(self) -> str:
        """Indian Kanoon permalink — `case_id` is that site's document id."""
        return f"https://indiankanoon.org/doc/{self.case_id}/"


class CorpusStore:
    """In-memory view of the corpus index."""

    def __init__(self, artifacts_dir: Path = ARTIFACTS_DIR) -> None:
        self.dir = Path(artifacts_dir)
        self._db_path = self.dir / CORPUS_DB.name
        self._lock = threading.Lock()

        self.case_ids: list[str] = []
        self.doc_vectors: np.ndarray = np.zeros((0, EMBEDDING_DIM), dtype=np.float32)
        self.issue_vectors: np.ndarray = np.zeros((0, EMBEDDING_DIM), dtype=np.float32)
        self.statutes: list[set[str]] = []

        self._load()

    def _load(self) -> None:
        missing = [
            p.name
            for p in (self._db_path, self.dir / DOC_VECTORS.name,
                      self.dir / ISSUE_VECTORS.name, self.dir / INDEX_MAP.name)
            if not p.exists()
        ]
        if missing:
            raise ArtifactError(
                f"corpus artifacts missing from {self.dir}: {', '.join(missing)}. "
                "Run `python -m ingestion.build_index` to generate them."
            )

        try:
            index_map = json.loads((self.dir / INDEX_MAP.name).read_text(encoding="utf-8"))
            self.case_ids = list(index_map["case_ids"])
            self.doc_vectors = np.load(self.dir / DOC_VECTORS.name)
            self.issue_vectors = np.load(self.dir / ISSUE_VECTORS.name)
        except Exception as exc:
            raise ArtifactError(f"corpus artifacts unreadable: {exc}") from exc

        n = len(self.case_ids)
        if not n:
            raise ArtifactError("corpus index is empty")
        # A row-count mismatch means the matrices and the map came from different
        # builds; scoring would silently return the wrong cases.
        for name, mat in (("doc", self.doc_vectors), ("issue", self.issue_vectors)):
            if mat.shape != (n, EMBEDDING_DIM):
                raise ArtifactError(
                    f"{name} vectors have shape {mat.shape}, expected {(n, EMBEDDING_DIM)} "
                    "— artifacts are from mismatched builds; rebuild the index"
                )

        self.doc_vectors = np.ascontiguousarray(self.doc_vectors, dtype=np.float32)
        self.issue_vectors = np.ascontiguousarray(self.issue_vectors, dtype=np.float32)
        self._load_statutes()

    def _load_statutes(self) -> None:
        """Statute sets for every row, ordered to match the vector matrices."""
        try:
            with self._connect() as conn:
                rows = conn.execute(
                    "SELECT vector_row, statutes FROM cases WHERE vector_row IS NOT NULL"
                ).fetchall()
        except sqlite3.Error as exc:
            raise ArtifactError(f"cannot read corpus database: {exc}") from exc

        self.statutes = [set() for _ in self.case_ids]
        for row_idx, raw in rows:
            if row_idx is None or not (0 <= row_idx < len(self.statutes)):
                continue
            try:
                self.statutes[row_idx] = set(json.loads(raw) or [])
            except (TypeError, json.JSONDecodeError):
                self.statutes[row_idx] = set()

    def _connect(self) -> sqlite3.Connection:
        # check_same_thread=False: FastAPI serves requests from a thread pool, and
        # reads are serialised by `self._lock`.
        return sqlite3.connect(self._db_path, check_same_thread=False)

    def record(self, row: int) -> CaseRecord | None:
        """Display metadata for one row, fetched on demand."""
        if not (0 <= row < len(self.case_ids)):
            return None
        case_id = self.case_ids[row]

        with self._lock, self._connect() as conn:
            conn.row_factory = sqlite3.Row
            hit = conn.execute(
                "SELECT case_id, title, appellant, respondent, court, jurisdiction, "
                "case_number, judgment_date, year, bench, author_judge, excerpt, "
                "source_path, has_issue_block FROM cases WHERE case_id = ?",
                (case_id,),
            ).fetchone()

        if hit is None:
            return CaseRecord(case_id=case_id)

        try:
            bench = json.loads(hit["bench"] or "[]")
        except json.JSONDecodeError:
            bench = []

        return CaseRecord(
            case_id=hit["case_id"],
            title=hit["title"],
            appellant=hit["appellant"],
            respondent=hit["respondent"],
            court=hit["court"],
            jurisdiction=hit["jurisdiction"],
            case_number=hit["case_number"],
            judgment_date=hit["judgment_date"],
            year=hit["year"],
            bench=bench,
            author_judge=hit["author_judge"],
            excerpt=hit["excerpt"],
            source_path=hit["source_path"],
            has_issue_block=bool(hit["has_issue_block"]),
        )

    def __len__(self) -> int:
        return len(self.case_ids)


_store: CorpusStore | None = None
_store_lock = threading.Lock()


def get_store(artifacts_dir: Path = ARTIFACTS_DIR) -> CorpusStore:
    """Process-wide store. Raises `ArtifactError` if the corpus cannot be loaded."""
    global _store
    with _store_lock:
        if _store is None or _store.dir != Path(artifacts_dir):
            _store = CorpusStore(artifacts_dir)
        return _store


def reset_store() -> None:
    """Drop the cached store. For tests and for the error-state check in T16."""
    global _store
    with _store_lock:
        _store = None
