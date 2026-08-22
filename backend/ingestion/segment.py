"""Split a judgment body into numbered paragraphs and locate the issue block.

Judgments are written as numbered paragraphs (`1.`, `2.`, `3.1`) after a
`JUDGMENT` heading. Somewhere in the first third, most of them state the legal
questions being decided:

    7. From the submissions of the learned counsel for the parties, following two
       questions arise for consideration in this appeal:-
         (i) Whether the appellant, who although had attained majority ...
         (ii) Whether the orders passed by learned Judicial Magistrate ...

That block is the single most useful passage for "find cases about the same legal
question", so it gets its own embedding. Detection is heuristic and frequently
fails; callers must fall back to the whole-document vector when it does.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

# `1.`, `12.`, `3.1` at the start of a line.
PARA_START_RE = re.compile(r"^[ \t]*(?P<num>\d{1,3}(?:\.\d{1,2})*)[\.\)]\s+(?=\S)", re.MULTILINE)

# The `J U D G M E N T` / `ORDER` heading that separates preamble from body.
BODY_START_RE = re.compile(
    r"^\s*(?:J\s*U\s*D\s*G\s*M\s*E\s*N\s*T|O\s*R\s*D\s*E\s*R)\s*$", re.MULTILINE | re.IGNORECASE
)

# Cues that a paragraph is framing the questions to be decided.
#
# Derived from phrasings actually observed in the corpus, not guessed. Judgments
# are highly varied here: "the core issue that needs to be answered", "the only
# point which arises for our consideration", "the main questions falling for
# consideration". Each pattern is deliberately specific, because the same cue
# words appear constantly in ordinary prose — "the vehicle in question", "issue
# notice", "empowered to issue a notification", "not in dispute" — and a loose
# pattern tags most of the corpus.
_CUE = r"(?:questions?|issues?|points?|controvers(?:y|ies))"

ISSUE_CUES = (
    # "... arises/falls for (our) consideration/determination"
    re.compile(rf"\b{_CUE}\b[^.]{{0,90}}?\b(?:arise|arises|arising|fall|falls|falling)\b"
               rf"[^.]{{0,40}}?\bfor\b[^.]{{0,30}}?\b(?:consideration|determination)\b", re.I),
    # "... for our consideration is, whether"
    re.compile(rf"\b{_CUE}\b[^.]{{0,60}}?\bfor\s+(?:our\s+|its\s+|their\s+)?"
               rf"(?:consideration|determination)\b", re.I),
    # "... needs to be answered / to be considered / requires to be decided"
    re.compile(rf"\b{_CUE}\b[^.]{{0,70}}?\b(?:to\s+be|needs?\s+to\s+be|requires?\s+to\s+be)\s+"
               rf"(?:considered|answered|decided|determined|examined|adjudicated)\b", re.I),
    # "The main / core / short / only / substantial question(s) ..."
    re.compile(rf"\b(?:main|core|principal|short|only|first|next|substantial|following|real|"
               rf"precise|narrow|moot|seminal)\s+{_CUE}\b", re.I),
    # "... question is / are (as to) whether"
    re.compile(rf"\b{_CUE}\b[^.]{{0,50}}?\b(?:is|are|was|were)\s+(?:as\s+to\s+)?whether\b", re.I),
    # "framed the following issues", "questions of law framed"
    re.compile(rf"\b(?:framed?|formulated?)\s+(?:the\s+)?(?:following\s+)?{_CUE}\b", re.I),
    re.compile(rf"\b{_CUE}\s+of\s+law\b[^.]{{0,40}}?\b(?:arise|fall|framed|raised|involved)\b", re.I),
)

# Vetoes. These fire on paragraphs that match a cue only incidentally; checked
# only when the cue matched, so they cost nothing on the common path.
ISSUE_ANTI_CUES = (
    re.compile(r"\bin\s+question\b", re.I),          # "the vehicle in question"
    re.compile(r"\bissue\s+(?:a\s+|the\s+)?(?:notice|notification|summons|direction|writ|process)\b", re.I),
    re.compile(r"\bissued?\s+(?:a\s+|the\s+)?(?:notification|notice|circular)\b", re.I),
)

# Sub-items of an issue block: `(i)`, `(a)`, `(1)`.
SUBITEM_RE = re.compile(r"^\s*\(\s*(?:[ivxlc]+|[a-z]|\d{1,2})\s*\)\s+", re.IGNORECASE)

# An issue block near the very end is usually a summary of conclusions, not the
# questions being framed. Only the first this fraction of the body is searched.
ISSUE_SEARCH_FRACTION = 0.6


@dataclass
class Paragraph:
    number: str | None
    text: str


def _strip_preamble(text: str) -> str:
    """Drop everything before the JUDGMENT/ORDER heading.

    The preamble is the party block and case number, already captured as
    structured metadata; leaving it in would put court boilerplate into the
    document vector, where every judgment looks alike.
    """
    matches = list(BODY_START_RE.finditer(text))
    if not matches:
        return text
    # Last occurrence: the heading also appears in the running title on page 1.
    return text[matches[-1].end():]


def split_paragraphs(body_text: str) -> list[Paragraph]:
    """Split judgment text into numbered paragraphs.

    Falls back to blank-line-delimited blocks when a document does not use
    numbering, so every document yields something chunkable.
    """
    text = _strip_preamble(body_text)
    starts = list(PARA_START_RE.finditer(text))

    if len(starts) < 3:
        blocks = [b.strip() for b in re.split(r"\n\s*\n", text) if b.strip()]
        return [Paragraph(number=None, text=b) for b in blocks if len(b) > 40]

    paragraphs: list[Paragraph] = []
    lead = text[: starts[0].start()].strip()
    if len(lead) > 40:
        paragraphs.append(Paragraph(number=None, text=lead))

    for i, match in enumerate(starts):
        end = starts[i + 1].start() if i + 1 < len(starts) else len(text)
        chunk = text[match.end(): end].strip()
        if chunk:
            paragraphs.append(Paragraph(number=match.group("num"), text=chunk))

    return paragraphs


def find_issue_block(paragraphs: list[Paragraph]) -> list[Paragraph]:
    """Return the paragraphs framing the legal questions, or [] if not found.

    Returns the cue paragraph plus any immediately following sub-item paragraphs,
    since the questions are usually enumerated in the paragraphs after the cue.
    """
    if not paragraphs:
        return []

    horizon = max(1, int(len(paragraphs) * ISSUE_SEARCH_FRACTION))

    for idx, para in enumerate(paragraphs[:horizon]):
        # Cues appear near the top of the paragraph, not deep in prose.
        opening = para.text[:600]
        if not any(cue.search(opening) for cue in ISSUE_CUES):
            continue
        # A cue matched only incidentally ("the vehicle in question") is not an
        # issue-framing paragraph.
        if any(anti.search(opening) for anti in ISSUE_ANTI_CUES):
            continue

        block = [para]
        for follower in paragraphs[idx + 1: idx + 4]:
            if SUBITEM_RE.match(follower.text) or follower.number is None:
                block.append(follower)
            else:
                break
        return block

    return []


def body_text_of(paragraphs: list[Paragraph]) -> str:
    return "\n\n".join(p.text for p in paragraphs)
