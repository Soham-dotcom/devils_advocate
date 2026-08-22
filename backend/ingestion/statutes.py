"""Extract and normalise statutory references from judgment text.

This is the deterministic half of the hybrid score. Unlike the embedding signal
it is fully auditable: when the dashboard says two cases matched, it can name
`S.125 CrPC` as the reason, which is what makes the match explanation real rather
than a bare cosine number.

Two granularities are emitted per document:

- act tokens      `CrPC`          — coarse; any two criminal-procedure cases share these
- section tokens  `CrPC:125`      — precise; only cases on the same provision share these

Both go into one set, so Jaccard overlap degrades gracefully: same-provision cases
score high, same-statute-different-provision cases score low but non-zero.
"""
from __future__ import annotations

import re

# Canonical act name -> alias patterns. Order matters: longer, more specific
# aliases are tried first so "Code of Criminal Procedure" is not caught by "Code".
ACT_ALIASES: list[tuple[str, str]] = [
    ("CrPC", r"Cr\.?\s?P\.?\s?C\.?|Code\s+of\s+Criminal\s+Procedure|Criminal\s+Procedure\s+Code"),
    ("CPC", r"C\.?\s?P\.?\s?C\.?|Code\s+of\s+Civil\s+Procedure|Civil\s+Procedure\s+Code"),
    ("IPC", r"I\.?\s?P\.?\s?C\.?|Indian\s+Penal\s+Code|Penal\s+Code"),
    ("Constitution", r"Constitution(?:\s+of\s+India)?"),
    ("PMLA", r"P\.?M\.?L\.?A\.?|Prevention\s+of\s+Money[\s-]?Laundering\s+Act"),
    ("PC Act", r"Prevention\s+of\s+Corruption\s+Act|P\.?C\.?\s+Act"),
    ("Evidence Act", r"(?:Indian\s+)?Evidence\s+Act"),
    ("NDPS", r"N\.?D\.?P\.?S\.?(?:\s+Act)?|Narcotic\s+Drugs"),
    ("IBC", r"I\.?B\.?C\.?|Insolvency\s+and\s+Bankruptcy\s+Code"),
    ("NI Act", r"N\.?I\.?\s+Act|Negotiable\s+Instruments\s+Act"),
    ("MV Act", r"M\.?V\.?\s+Act|Motor\s+Vehicles?\s+Act"),
    ("Arbitration Act", r"Arbitration\s+(?:and|&)\s+Conciliation\s+Act|A&C\s+Act"),
    ("Companies Act", r"Companies\s+Act"),
    ("Income Tax Act", r"Income[\s-]?Tax\s+Act|I\.?T\.?\s+Act"),
    ("HMA", r"Hindu\s+Marriage\s+Act"),
    ("HAMA", r"Hindu\s+Adoptions?\s+(?:and|&)\s+Maintenance\s+Act"),
    ("HSA", r"Hindu\s+Succession\s+Act"),
    ("UAPA", r"U\.?A\.?P\.?A\.?|Unlawful\s+Activities"),
    ("POCSO", r"P\.?O\.?C\.?S\.?O\.?|Protection\s+of\s+Children\s+from\s+Sexual\s+Offences"),
    ("SC/ST Act", r"SC\s*/?\s*ST\s+Act|Scheduled\s+Castes?\s+and\s+Scheduled\s+Tribes"),
    ("PWDVA", r"P\.?W\.?D\.?V\.?A\.?|Protection\s+of\s+Women\s+from\s+Domestic\s+Violence"),
    ("Dowry Prohibition Act", r"Dowry\s+Prohibition\s+Act"),
    ("SARFAESI", r"SARFAESI|Securitisation\s+and\s+Reconstruction"),
    ("Consumer Protection Act", r"Consumer\s+Protection\s+Act"),
    ("Specific Relief Act", r"Specific\s+Relief\s+Act"),
    ("TP Act", r"Transfer\s+of\s+Property\s+Act|T\.?P\.?\s+Act"),
    ("Limitation Act", r"Limitation\s+Act"),
    ("Contract Act", r"(?:Indian\s+)?Contract\s+Act"),
    ("Land Acquisition Act", r"Land\s+Acquisition\s+Act|RFCTLARR"),
    ("Customs Act", r"Customs\s+Act"),
    ("GST Act", r"C?GST\s+Act|Goods\s+and\s+Services\s+Tax\s+Act"),
    ("Electricity Act", r"Electricity\s+Act"),
    ("Competition Act", r"Competition\s+Act"),
    ("RTI Act", r"R\.?T\.?I\.?\s+Act|Right\s+to\s+Information\s+Act"),
    ("JJ Act", r"J\.?J\.?\s+Act|Juvenile\s+Justice\s+Act"),
    ("Industrial Disputes Act", r"Industrial\s+Disputes\s+Act|I\.?D\.?\s+Act"),
    ("FERA/FEMA", r"F\.?E\.?[MR]\.?A\.?|Foreign\s+Exchange\s+(?:Management|Regulation)\s+Act"),
    ("BNS", r"B\.?N\.?S\.?(?:\s+2023)?|Bharatiya\s+Nyaya\s+Sanhita"),
    ("BNSS", r"B\.?N\.?S\.?S\.?|Bharatiya\s+Nagarik\s+Suraksha\s+Sanhita"),
    ("BSA", r"Bharatiya\s+Sakshya\s+Adhiniyam"),
]

# Both guards are load-bearing. Without the lookbehind, `I.D. Act` matches inside
# "sa(id Act)" — boilerplate in nearly every judgment — and manufactures overlap
# between unrelated cases. Without the lookahead, `Constitution` matches
# "constitutional". Measured on a 102-doc sample, the guards cut Industrial
# Disputes Act from 29% to ~2% of documents.
_ACT_PATTERNS = [
    (canon, re.compile(rf"(?<![A-Za-z])(?:{pat})(?![A-Za-z])", re.IGNORECASE))
    for canon, pat in ACT_ALIASES
]

# `Section 125`, `Sections 120B and 409`, `S. 13(2)`, `Article 21`.
_REF_RE = re.compile(
    r"\b(?P<kind>Sections?|Secs?\.|S\.|Articles?|Arts?\.)\s*"
    r"(?P<num>\d{1,4}[A-Z]{0,2})(?P<sub>(?:\s*\([^)\n]{1,12}\))*)",
    re.IGNORECASE,
)

# How far after a section reference to look for the act it belongs to. Covers
# "Section 13(2) r/w 13(1)(a) of the Prevention of Corruption Act, 1988".
_ACT_LOOKAHEAD = 90


def _canonical_act(fragment: str) -> str | None:
    """First act alias matching anywhere in the fragment."""
    for canon, pattern in _ACT_PATTERNS:
        if pattern.search(fragment):
            return canon
    return None


def extract_statutes(text: str) -> set[str]:
    """Return normalised statute tokens found in the text.

    Emits both `ACT` and `ACT:SECTION` tokens. Section references whose act
    cannot be resolved nearby are dropped — a bare "Section 11" is too ambiguous
    to match on and would create false overlap between unrelated judgments.
    """
    tokens: set[str] = set()

    for canon, pattern in _ACT_PATTERNS:
        if pattern.search(text):
            tokens.add(canon)

    for match in _REF_RE.finditer(text):
        window = text[match.end(): match.end() + _ACT_LOOKAHEAD]
        act = _canonical_act(window)

        if act is None and match.group("kind").lower().startswith(("article", "art")):
            # Bare "Article 21" is effectively always the Constitution.
            act = "Constitution"

        if act is None:
            continue

        number = match.group("num").upper()
        tokens.add(act)
        tokens.add(f"{act}:{number}")

    return tokens


def jaccard(a: set[str], b: set[str]) -> float:
    """Overlap of two statute-token sets. 0.0 when either side is empty."""
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def shared_statutes(a: set[str], b: set[str], limit: int = 6) -> list[str]:
    """Human-readable overlap for the match explanation.

    Section-level tokens are listed first — `S.125 CrPC` explains a match far
    better than the bare act name does.
    """
    shared = a & b
    sections = sorted(t for t in shared if ":" in t)
    acts = sorted(t for t in shared if ":" not in t)

    out: list[str] = []
    for token in sections:
        act, number = token.split(":", 1)
        out.append(f"S.{number} {act}")
    # Only add coarse act tokens that no listed section already implies.
    covered = {t.split(":", 1)[0] for t in sections}
    out.extend(a for a in acts if a not in covered)

    return out[:limit]
