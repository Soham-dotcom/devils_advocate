"""Build the corpus artifacts from the judgment PDFs.

    python -m ingestion.build_index --limit 50     # mini-index, unblocks Track B
    python -m ingestion.build_index                # full corpus

Run from `backend/`.

Vectors are staged as BLOBs in SQLite rather than accumulated in memory, which is
what makes the run resumable: a crash at document 2,000 costs the last document,
not the last two hours. The `.npy` matrices the retrieval layer actually loads are
exported from those BLOBs at the end, so the export is cheap to redo and the row
ordering is deterministic.
"""
from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
import time
from pathlib import Path

import numpy as np

from ingestion.chunk import chunk_text
from ingestion.config import (
    ARTIFACTS_DIR,
    CORPUS_DB,
    DATASET_DIR,
    DOC_VECTORS,
    EMBEDDING_DIM,
    INDEX_MAP,
    ISSUE_VECTORS,
    MAX_DOC_CHUNKS,
)
from ingestion.embed import embed_document
from ingestion.extract import extract_text
from ingestion.parse_header import parse_header
from ingestion.segment import body_text_of, find_issue_block, split_paragraphs
from ingestion.statutes import extract_statutes

SCHEMA = """
CREATE TABLE IF NOT EXISTS cases (
    case_id          TEXT PRIMARY KEY,
    title            TEXT,
    appellant        TEXT,
    respondent       TEXT,
    court            TEXT,
    jurisdiction     TEXT,
    case_number      TEXT,
    judgment_date    TEXT,
    year             INTEGER,
    bench            TEXT,
    author_judge     TEXT,
    statutes         TEXT,
    citations        TEXT,
    excerpt          TEXT,
    source_path      TEXT,
    has_issue_block  INTEGER NOT NULL DEFAULT 0,
    n_chunks         INTEGER NOT NULL DEFAULT 0,
    doc_vector       BLOB,
    issue_vector     BLOB,
    vector_row       INTEGER
);
CREATE INDEX IF NOT EXISTS idx_cases_year ON cases(year);
CREATE INDEX IF NOT EXISTS idx_cases_court ON cases(court);
CREATE INDEX IF NOT EXISTS idx_cases_vector_row ON cases(vector_row);

CREATE TABLE IF NOT EXISTS build_failures (
    source_path TEXT PRIMARY KEY,
    reason      TEXT
);
"""

# `(2002) 5 SCC 422`, `AIR 2020 SUPREME COURT 4355`, `2024 INSC 668`,
# `(2022) SCC OnLine SC 929`. Stored unused for now — these are the raw material
# for the v2 citation-graph fine-tuning described in the spec.
CITATION_RE = re.compile(
    r"(?:\(\d{4}\)\s*\d+\s*SCC\s*(?:OnLine\s*SC\s*)?\d+"
    r"|AIR\s*\d{4}\s*(?:SC|SUPREME\s+COURT)\s*\d+"
    r"|\d{4}\s*INSC\s*\d+)",
    re.IGNORECASE,
)

EXCERPT_CHARS = 1500


def init_db(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA)
    conn.commit()
    return conn


def iter_pdfs(dataset_dir: Path) -> list[Path]:
    return sorted(dataset_dir.rglob("*.[pP][dD][fF]"))


def process_one(pdf: Path) -> tuple[dict | None, str | None]:
    """Turn one PDF into a row dict, or return (None, reason)."""
    doc = extract_text(pdf)
    if not doc.is_usable:
        return None, "unreadable or too short"

    header = parse_header(doc.raw_first_page, pdf, doc.case_id)
    if not header.is_indexable:
        return None, f"missing required fields ({', '.join(header.warnings)})"

    full_text = doc.full_text
    paragraphs = split_paragraphs(full_text)
    body = body_text_of(paragraphs) or full_text

    chunks = chunk_text(body, max_chunks=MAX_DOC_CHUNKS)
    if not chunks:
        return None, "no chunks produced"
    doc_vector = embed_document(chunks)

    issue_block = find_issue_block(paragraphs)
    if issue_block:
        issue_chunks = chunk_text(body_text_of(issue_block))
        # Fall back rather than store a zero vector, so scoring never has to
        # special-case an all-zero row.
        issue_vector = embed_document(issue_chunks) if issue_chunks else doc_vector
    else:
        issue_vector = doc_vector

    return {
        "case_id": header.case_id,
        "title": header.title,
        "appellant": header.appellant,
        "respondent": header.respondent,
        "court": header.court,
        "jurisdiction": header.jurisdiction,
        "case_number": header.case_number,
        "judgment_date": header.judgment_date,
        "year": header.year,
        "bench": json.dumps(header.bench),
        "author_judge": header.author_judge,
        "statutes": json.dumps(sorted(extract_statutes(full_text))),
        "citations": json.dumps(sorted(set(CITATION_RE.findall(full_text)))),
        "excerpt": body[:EXCERPT_CHARS],
        "source_path": str(pdf.relative_to(pdf.parents[2]) if len(pdf.parents) > 2 else pdf),
        "has_issue_block": 1 if issue_block else 0,
        "n_chunks": len(chunks),
        "doc_vector": doc_vector.tobytes(),
        "issue_vector": issue_vector.tobytes(),
    }, None


def upsert(conn: sqlite3.Connection, row: dict) -> None:
    cols = ", ".join(row)
    placeholders = ", ".join(f":{c}" for c in row)
    conn.execute(f"INSERT OR REPLACE INTO cases ({cols}) VALUES ({placeholders})", row)


def export_matrices(conn: sqlite3.Connection, out_dir: Path) -> int:
    """Write the .npy matrices and index map from the staged BLOBs."""
    rows = conn.execute(
        "SELECT case_id, doc_vector, issue_vector FROM cases "
        "WHERE doc_vector IS NOT NULL ORDER BY case_id"
    ).fetchall()
    if not rows:
        return 0

    doc_mat = np.zeros((len(rows), EMBEDDING_DIM), dtype=np.float32)
    issue_mat = np.zeros((len(rows), EMBEDDING_DIM), dtype=np.float32)
    case_ids: list[str] = []

    for i, (case_id, doc_blob, issue_blob) in enumerate(rows):
        doc_mat[i] = np.frombuffer(doc_blob, dtype=np.float32)
        issue_mat[i] = np.frombuffer(issue_blob, dtype=np.float32)
        case_ids.append(case_id)
        conn.execute("UPDATE cases SET vector_row = ? WHERE case_id = ?", (i, case_id))

    out_dir.mkdir(parents=True, exist_ok=True)
    np.save(out_dir / DOC_VECTORS.name, doc_mat)
    np.save(out_dir / ISSUE_VECTORS.name, issue_mat)
    (out_dir / INDEX_MAP.name).write_text(
        json.dumps({"case_ids": case_ids, "dim": EMBEDDING_DIM, "count": len(case_ids)}, indent=2),
        encoding="utf-8",
    )
    conn.commit()
    return len(case_ids)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build the case-similarity corpus index.")
    parser.add_argument("--dataset", type=Path, default=DATASET_DIR)
    parser.add_argument("--out-dir", type=Path, default=ARTIFACTS_DIR)
    parser.add_argument("--limit", type=int, default=None, help="process at most N new documents")
    parser.add_argument("--rebuild", action="store_true", help="ignore existing rows and redo all")
    parser.add_argument("--export-only", action="store_true", help="re-export matrices, no processing")
    args = parser.parse_args()

    db_path = args.out_dir / CORPUS_DB.name
    conn = init_db(db_path)

    if args.export_only:
        n = export_matrices(conn, args.out_dir)
        print(f"Exported {n} vectors to {args.out_dir}")
        return 0

    if args.rebuild:
        conn.executescript("DELETE FROM cases; DELETE FROM build_failures;")
        conn.commit()

    pdfs = iter_pdfs(args.dataset)
    if not pdfs:
        print(f"No PDFs found under {args.dataset}", file=sys.stderr)
        return 1

    done = {r[0] for r in conn.execute("SELECT source_path FROM cases")}
    failed = {r[0] for r in conn.execute("SELECT source_path FROM build_failures")}
    seen = done | failed

    def rel(p: Path) -> str:
        return str(p.relative_to(p.parents[2]) if len(p.parents) > 2 else p)

    pending = [p for p in pdfs if rel(p) not in seen]
    if args.limit:
        pending = pending[: args.limit]

    print(f"corpus {len(pdfs)} | already done {len(done)} | failed {len(failed)} | "
          f"processing {len(pending)}")
    if not pending:
        print("Nothing to do. Exporting matrices.")
        n = export_matrices(conn, args.out_dir)
        print(f"Exported {n} vectors.")
        return 0

    start = time.time()
    ok = 0
    for i, pdf in enumerate(pending, 1):
        try:
            row, reason = process_one(pdf)
        except Exception as exc:  # one bad PDF must not end the run
            row, reason = None, f"{type(exc).__name__}: {exc}"

        if row is None:
            conn.execute(
                "INSERT OR REPLACE INTO build_failures (source_path, reason) VALUES (?, ?)",
                (rel(pdf), reason),
            )
        else:
            upsert(conn, row)
            ok += 1

        # Commit steadily so a kill loses at most this window.
        if i % 25 == 0 or i == len(pending):
            conn.commit()
            elapsed = time.time() - start
            rate = i / elapsed
            eta = (len(pending) - i) / rate if rate else 0
            print(f"  {i}/{len(pending)}  ok={ok}  {rate:.1f} doc/s  eta {eta / 60:.1f}m",
                  flush=True)

    conn.commit()

    failures = conn.execute(
        "SELECT source_path, reason FROM build_failures ORDER BY source_path"
    ).fetchall()
    if failures:
        print(f"\nFAILURES ({len(failures)}):")
        for path, reason in failures[:20]:
            print(f"  {Path(path).name}: {reason}")
        if len(failures) > 20:
            print(f"  ... and {len(failures) - 20} more")

    n = export_matrices(conn, args.out_dir)
    total = conn.execute("SELECT COUNT(*) FROM cases").fetchone()[0]
    with_issue = conn.execute("SELECT COUNT(*) FROM cases WHERE has_issue_block = 1").fetchone()[0]

    print(f"\nDONE in {(time.time() - start) / 60:.1f}m")
    print(f"  rows in db     {total}")
    print(f"  vectors        {n}  (must equal rows)")
    print(f"  issue blocks   {with_issue}  ({with_issue / total:.1%})" if total else "")
    print(f"  artifacts      {args.out_dir}")
    return 0 if n == total else 2


if __name__ == "__main__":
    raise SystemExit(main())
