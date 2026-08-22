"""PDF -> text for Indian Kanoon judgment PDFs.

These PDFs are text-native (no OCR needed) and carry two pieces of boilerplate on
every page: a running title header and an `Indian Kanoon - <url>` footer. Both are
stripped, for two different reasons:

- the footer URL contains the stable document id, which is the corpus primary key
- the running title repeats on all ~15-50 pages, so leaving it in would inject the
  same sentence into every chunk and pull unrelated documents toward each other in
  embedding space
"""
from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

try:  # PyMuPDF >= 1.24 exposes `pymupdf`; `fitz` is the legacy alias.
    import pymupdf
except ImportError:  # pragma: no cover - depends on installed version
    import fitz as pymupdf

# `Indian Kanoon - http://indiankanoon.org/doc/150712885/` optionally followed by
# a page number. The doc id is the corpus primary key.
FOOTER_RE = re.compile(
    r"Indian\s+Kanoon\s*-\s*https?://indiankanoon\.org/doc/(\d+)/?\s*\d*\s*$",
    re.IGNORECASE,
)

# A page number alone on its own line, left behind once the footer text is gone.
BARE_PAGE_NUM_RE = re.compile(r"^\d{1,4}$")


@dataclass
class ExtractedDoc:
    """Text of one judgment, boilerplate removed."""

    path: Path
    case_id: str | None
    pages: list[str]
    raw_first_page: str
    n_pages: int

    @property
    def full_text(self) -> str:
        return "\n\n".join(self.pages)

    @property
    def is_usable(self) -> bool:
        """Enough text to be worth indexing. Guards against image-only PDFs."""
        return self.case_id is not None and len(self.full_text.strip()) > 500


def _normalise(line: str) -> str:
    return re.sub(r"\s+", " ", line).strip().lower()


def _find_running_header(page_lines: list[list[str]]) -> str | None:
    """The repeated title line, if one appears at the top of most pages.

    Judgments put the case title at the top of every page. Detected by frequency
    rather than by matching the title, because the header wording does not always
    match the H1 exactly.
    """
    if len(page_lines) < 3:
        return None

    first_lines = [_normalise(lines[0]) for lines in page_lines if lines]
    if not first_lines:
        return None

    candidate, count = Counter(first_lines).most_common(1)[0]
    # Needs to appear on most pages, and be title-like rather than body prose.
    if count >= max(3, int(0.6 * len(first_lines))) and 10 < len(candidate) < 200:
        return candidate
    return None


def _clean_page(lines: list[str], running_header: str | None) -> tuple[list[str], str | None]:
    """Strip the running header and the Indian Kanoon footer from one page."""
    case_id = None
    out = list(lines)

    if running_header and out and _normalise(out[0]) == running_header:
        out.pop(0)

    # Footer sits in the last few lines; page numbers can land either side of it.
    for idx in range(len(out) - 1, max(-1, len(out) - 5), -1):
        match = FOOTER_RE.search(out[idx].strip())
        if match:
            case_id = match.group(1)
            del out[idx:]
            break

    while out and (not out[-1].strip() or BARE_PAGE_NUM_RE.match(out[-1].strip())):
        out.pop()

    return out, case_id


def extract_text(pdf_path: Path | str) -> ExtractedDoc:
    """Extract cleaned per-page text from a judgment PDF.

    Never raises on a malformed PDF — returns a doc with `is_usable` False so the
    caller can record the failure and continue over the rest of the corpus.
    """
    pdf_path = Path(pdf_path)

    try:
        with pymupdf.open(pdf_path) as doc:
            raw_pages = [page.get_text("text") for page in doc]
    except Exception:
        return ExtractedDoc(path=pdf_path, case_id=None, pages=[], raw_first_page="", n_pages=0)

    if not raw_pages:
        return ExtractedDoc(path=pdf_path, case_id=None, pages=[], raw_first_page="", n_pages=0)

    raw_first_page = raw_pages[0]
    page_lines = [[ln for ln in page.splitlines()] for page in raw_pages]
    running_header = _find_running_header(page_lines)

    cleaned: list[str] = []
    case_id: str | None = None
    for lines in page_lines:
        page_out, found_id = _clean_page(lines, running_header)
        case_id = case_id or found_id
        text = "\n".join(page_out).strip()
        if text:
            cleaned.append(text)

    return ExtractedDoc(
        path=pdf_path,
        case_id=case_id,
        pages=cleaned,
        raw_first_page=raw_first_page,
        n_pages=len(raw_pages),
    )
