"""Coverage diagnostics over a corpus sample.

T4, T5 and T6 each gate on "measure extraction coverage on a ~100-document
sample" before the scoring weights are allowed to depend on those fields. This is
the tool that produces those numbers.

    python -m ingestion.diagnose --sample 100

Run from `backend/`.
"""
from __future__ import annotations

import argparse
import random
import sys
from collections import Counter
from pathlib import Path

from ingestion.config import DATASET_DIR
from ingestion.extract import extract_text
from ingestion.parse_header import parse_header
from ingestion.segment import find_issue_block, split_paragraphs
from ingestion.statutes import extract_statutes

# Fields that must be near-universal for the corpus to work at all.
REQUIRED_FIELDS = ("case_id", "judgment_date")
REQUIRED_THRESHOLD = 0.95

REPORTED_FIELDS = (
    "title", "court", "jurisdiction", "case_number",
    "author_judge", "appellant", "respondent",
)


def sample_pdfs(dataset_dir: Path, n: int, seed: int) -> list[Path]:
    """Sample evenly across year folders so no single year dominates."""
    by_year: dict[str, list[Path]] = {}
    for pdf in sorted(dataset_dir.rglob("*.[pP][dD][fF]")):
        by_year.setdefault(pdf.parent.name, []).append(pdf)

    if not by_year:
        return []

    rng = random.Random(seed)
    per_year = max(1, n // len(by_year))
    picked: list[Path] = []
    for year in sorted(by_year):
        files = by_year[year]
        picked.extend(rng.sample(files, min(per_year, len(files))))
    return picked[:n]


def main() -> int:
    parser = argparse.ArgumentParser(description="Measure header-extraction coverage.")
    parser.add_argument("--sample", type=int, default=100)
    parser.add_argument("--seed", type=int, default=42, help="fixed so runs are comparable")
    parser.add_argument("--dataset", type=Path, default=DATASET_DIR)
    args = parser.parse_args()

    pdfs = sample_pdfs(args.dataset, args.sample, args.seed)
    if not pdfs:
        print(f"No PDFs found under {args.dataset}", file=sys.stderr)
        return 1

    print(f"Sampling {len(pdfs)} documents from {args.dataset}\n")

    present = Counter()
    warnings = Counter()
    statute_tokens = Counter()
    unreadable: list[Path] = []
    not_indexable: list[Path] = []
    page_counts: list[int] = []
    char_counts: list[int] = []
    para_counts: list[int] = []
    statute_counts: list[int] = []
    with_issue_block = 0
    with_statutes = 0
    with_section_level = 0

    for pdf in pdfs:
        doc = extract_text(pdf)
        if not doc.is_usable:
            unreadable.append(pdf)
            continue

        page_counts.append(doc.n_pages)
        char_counts.append(len(doc.full_text))

        header = parse_header(doc.raw_first_page, pdf, doc.case_id)
        if not header.is_indexable:
            not_indexable.append(pdf)

        for f in REQUIRED_FIELDS + REPORTED_FIELDS:
            if getattr(header, f):
                present[f] += 1
        if header.bench:
            present["bench"] += 1
        for w in header.warnings:
            warnings[w.split(":")[0]] += 1

        # T5 — issue-block detection coverage
        paragraphs = split_paragraphs(doc.full_text)
        para_counts.append(len(paragraphs))
        if find_issue_block(paragraphs):
            with_issue_block += 1

        # T6 — statute extraction coverage
        statutes = extract_statutes(doc.full_text)
        statute_counts.append(len(statutes))
        statute_tokens.update(statutes)
        if statutes:
            with_statutes += 1
        if any(":" in t for t in statutes):
            with_section_level += 1

    total = len(pdfs)
    readable = total - len(unreadable)

    print(f"{'READABLE':<22} {readable}/{total}  ({readable / total:.0%})")
    if unreadable:
        print(f"  unreadable: {[p.name for p in unreadable[:5]]}")
    if page_counts:
        print(f"{'pages (min/med/max)':<22} "
              f"{min(page_counts)} / {sorted(page_counts)[len(page_counts) // 2]} / {max(page_counts)}")
        print(f"{'chars (median)':<22} {sorted(char_counts)[len(char_counts) // 2]:,}")

    print("\nREQUIRED FIELDS (gate: >=95%)")
    ok = True
    for f in REQUIRED_FIELDS:
        rate = present[f] / total if total else 0.0
        flag = "PASS" if rate >= REQUIRED_THRESHOLD else "FAIL"
        ok = ok and rate >= REQUIRED_THRESHOLD
        print(f"  {f:<20} {present[f]:>4}/{total}  {rate:>6.1%}  [{flag}]")

    print("\nREPORTED FIELDS (informational)")
    for f in REPORTED_FIELDS + ("bench",):
        rate = present[f] / total if total else 0.0
        print(f"  {f:<20} {present[f]:>4}/{total}  {rate:>6.1%}")

    def _med(xs: list[int]) -> int:
        return sorted(xs)[len(xs) // 2] if xs else 0

    print("\nT5 — SEGMENTATION / ISSUE BLOCK")
    print(f"  {'paragraphs (median)':<20} {_med(para_counts):>4}")
    print(f"  {'issue block found':<20} {with_issue_block:>4}/{readable}  "
          f"{with_issue_block / readable:>6.1%}" if readable else "")
    print("    -> documents without one fall back to the doc vector")

    print("\nT6 — STATUTE EXTRACTION")
    if readable:
        print(f"  {'any statute':<20} {with_statutes:>4}/{readable}  {with_statutes / readable:>6.1%}")
        print(f"  {'section-level ref':<20} {with_section_level:>4}/{readable}  "
              f"{with_section_level / readable:>6.1%}")
    print(f"  {'tokens/doc (median)':<20} {_med(statute_counts):>4}")
    print("  most common tokens:")
    for token, count in statute_tokens.most_common(15):
        print(f"    {token:<28} {count:>4}")

    if warnings:
        print("\nWARNINGS")
        for w, c in warnings.most_common():
            print(f"  {w:<20} {c:>4}")

    if not_indexable:
        print(f"\nNOT INDEXABLE ({len(not_indexable)}):")
        for p in not_indexable[:10]:
            print(f"  {p.name}")

    print("\n" + ("GATE PASSED" if ok else "GATE FAILED — required fields below 95%"))
    return 0 if ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
