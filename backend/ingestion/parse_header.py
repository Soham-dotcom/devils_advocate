"""Parse the Indian Kanoon header block into structured metadata.

Every judgment opens with a semi-consistent block:

    Abhilasha vs Parkash on 15 September, 2020
    Equivalent citations: AIR 2020 SUPREME COURT 4355
    Author: Ashok Bhushan
    Bench: M.R. Shah, R. Subhash Reddy, Ashok Bhushan
              IN THE SUPREME COURT OF INDIA
              CRIMINAL APPELLATE JURISDICTION
           CRIMINAL APPEAL NO. 615 of 2020
      ABHILASHA                            ...APPELLANT(S)
                     VERSUS
      PARKASH & ORS.                       ...RESPONDENT(S)

"Semi" because field order, presence, and spacing vary across the corpus. Every
field is therefore optional and independently extracted; a miss is recorded as a
warning rather than failing the document. Only `case_id` and `judgment_date` are
treated as required, and both have a filename fallback.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

MONTHS = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11,
    "december": 12,
}

# `Abhilasha_vs_Parkash_on_15_September_2020_1.PDF`
FILENAME_RE = re.compile(
    r"^(?P<title>.+?)_on_(?P<day>\d{1,2})_(?P<month>[A-Za-z]+)_(?P<year>\d{4})",
    re.IGNORECASE,
)

# `... on 15 September, 2020` at the end of the title line.
TITLE_DATE_RE = re.compile(
    r"\bon\s+(?P<day>\d{1,2})\s+(?P<month>[A-Za-z]+),?\s+(?P<year>\d{4})", re.IGNORECASE
)

AUTHOR_RE = re.compile(r"^\s*Author\s*:\s*(?P<v>.+?)\s*$", re.IGNORECASE | re.MULTILINE)
BENCH_RE = re.compile(r"^\s*Bench\s*:\s*(?P<v>.+?)\s*$", re.IGNORECASE | re.MULTILINE)
CITATIONS_RE = re.compile(
    r"^\s*Equivalent\s+citations?\s*:\s*(?P<v>.+?)\s*$", re.IGNORECASE | re.MULTILINE
)

COURT_RE = re.compile(r"^\s*IN\s+THE\s+(?P<v>[A-Z][A-Z\s,\.'&-]*COURT[A-Z\s,\.'&-]*)$", re.MULTILINE)
JURISDICTION_RE = re.compile(r"^\s*(?P<v>[A-Z][A-Z\s/&-]*JURISDICTION)\s*$", re.MULTILINE)

# `CRIMINAL APPEAL NO. 615 of 2020`, `CIVIL APPEAL No(s). 2221-2222 OF 2023`,
# `WRIT PETITION (CIVIL) NO. 494 OF 2012`, `SPECIAL LEAVE PETITION ...`
CASE_NUMBER_RE = re.compile(
    r"^\s*(?P<v>(?:CRIMINAL|CIVIL|WRIT|SPECIAL\s+LEAVE|TRANSFER|REVIEW|CONTEMPT|ARBITRATION)"
    r"[A-Z\s\(\)\.]*?(?:APPEAL|PETITION|CASE)[A-Z\s\(\)\.]*"
    r"N[Oo][\(\)sS\.]*\s*[\d\-/,\s]+(?:OF|of)\s*\d{4})",
    re.MULTILINE,
)

# `ABHILASHA                       ...APPELLANT(S)` — the trailing label can be
# truncated by the PDF's column width, so the suffix is matched loosely.
APPELLANT_RE = re.compile(
    r"^\s*(?P<v>.+?)\s*\.\.\.\s*(?:APPELLANT|PETITIONER|APPLICANT)", re.IGNORECASE | re.MULTILINE
)
RESPONDENT_RE = re.compile(
    r"^\s*(?P<v>.+?)\s*\.\.\.\s*(?:RESPONDENT|DEFENDANT)", re.IGNORECASE | re.MULTILINE
)
# Fallback when the `...APPELLANT(S)` markers are absent: split on `VERSUS`/`Vs.`
VERSUS_SPLIT_RE = re.compile(r"\n\s*(?:VERSUS|V/S|Vs\.?)\s*\n", re.IGNORECASE)


@dataclass
class CaseHeader:
    case_id: str | None = None
    title: str | None = None
    appellant: str | None = None
    respondent: str | None = None
    court: str | None = None
    jurisdiction: str | None = None
    case_number: str | None = None
    judgment_date: str | None = None  # ISO 8601
    year: int | None = None
    bench: list[str] = field(default_factory=list)
    author_judge: str | None = None
    equivalent_citations: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    @property
    def is_indexable(self) -> bool:
        """The two fields the corpus cannot function without."""
        return bool(self.case_id and self.judgment_date)


def _iso_date(day: str, month: str, year: str) -> str | None:
    m = MONTHS.get(month.strip().lower())
    if not m:
        return None
    try:
        d, y = int(day), int(year)
    except ValueError:
        return None
    if not (1 <= d <= 31 and 1900 <= y <= 2100):
        return None
    return f"{y:04d}-{m:02d}-{d:02d}"


def _clean(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip(" \t.,:;-")


def _first(pattern: re.Pattern[str], text: str) -> str | None:
    match = pattern.search(text)
    return _clean(match.group("v")) if match else None


def _parse_filename(path: Path) -> tuple[str | None, str | None]:
    """Title and ISO date from the filename. The most reliable date source."""
    match = FILENAME_RE.match(path.stem)
    if not match:
        return None, None
    title = match.group("title").replace("_", " ").strip()
    iso = _iso_date(match.group("day"), match.group("month"), match.group("year"))
    return title or None, iso


def parse_header(raw_first_page: str, path: Path, case_id: str | None = None) -> CaseHeader:
    """Extract metadata from the first page of a judgment.

    `raw_first_page` must be the *uncleaned* page text — the running-header strip
    in `extract` removes the title line this depends on.
    """
    header = CaseHeader(case_id=case_id)
    # Only the header block is scanned. Body prose contains lines that look like
    # party markers and case numbers, and would otherwise win the match.
    block = "\n".join(raw_first_page.splitlines()[:60])

    file_title, file_date = _parse_filename(path)

    title_line = next((ln.strip() for ln in raw_first_page.splitlines() if ln.strip()), "")
    header.title = title_line if len(title_line) > 5 else file_title
    if not header.title:
        header.warnings.append("no title")

    date_match = TITLE_DATE_RE.search(title_line)
    body_date = (
        _iso_date(date_match.group("day"), date_match.group("month"), date_match.group("year"))
        if date_match
        else None
    )
    header.judgment_date = file_date or body_date
    if file_date and body_date and file_date != body_date:
        header.warnings.append(f"date mismatch: filename={file_date} title={body_date}")
    if not header.judgment_date:
        header.warnings.append("no date")
    else:
        header.year = int(header.judgment_date[:4])

    header.author_judge = _first(AUTHOR_RE, block)

    bench_raw = _first(BENCH_RE, block)
    if bench_raw:
        header.bench = [j for j in (_clean(p) for p in bench_raw.split(",")) if j]
    else:
        header.warnings.append("no bench")

    citations_raw = _first(CITATIONS_RE, block)
    if citations_raw:
        header.equivalent_citations = [c for c in (_clean(p) for p in citations_raw.split(",")) if c]

    court = _first(COURT_RE, block)
    header.court = _clean(f"In the {court}") if court else None
    if not header.court:
        header.warnings.append("no court")

    header.jurisdiction = _first(JURISDICTION_RE, block)
    header.case_number = _first(CASE_NUMBER_RE, block)
    if not header.case_number:
        header.warnings.append("no case number")

    header.appellant = _first(APPELLANT_RE, block)
    header.respondent = _first(RESPONDENT_RE, block)

    if not (header.appellant and header.respondent):
        # Fall back to the title, which is `<appellant> vs <respondent> on <date>`.
        source = header.title or ""
        source = TITLE_DATE_RE.sub("", source).strip(" ,")
        parts = re.split(r"\s+vs\.?\s+", source, maxsplit=1, flags=re.IGNORECASE)
        if len(parts) == 2:
            header.appellant = header.appellant or _clean(parts[0])
            header.respondent = header.respondent or _clean(parts[1])
        else:
            header.warnings.append("no parties")

    if not header.case_id:
        header.warnings.append("no case_id")

    return header
