from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------- input
class CaseInput(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    case_text: str = Field(..., min_length=200, max_length=60000)
    court: Optional[str] = None
    case_type: Optional[str] = None
    party_represented: Optional[str] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------- agent 1: issue spotter
class KeyDateSchema(BaseModel):
    date: str
    event: str


class IssueSchema(BaseModel):
    issue: str
    why_it_matters: str


class IssueAnalysisSchema(BaseModel):
    summary: str
    issues: List[IssueSchema]
    key_facts: List[str]
    key_dates: List[KeyDateSchema]
    provisions_invoked: List[str]


# ---------------------------------------------------------------- agents 2 & 3: the two advocates
class ArgumentSchema(BaseModel):
    claim: str
    support: str
    # "strong" | "moderate" | "weak" — kept as free text because the model is
    # more reliable emitting a word than conforming to an enum.
    strength: str


class AdvocacySchema(BaseModel):
    position: str
    arguments: List[ArgumentSchema]
    strongest_point: str
    weakest_point: str


# ---------------------------------------------------------------- agent 4: evidence auditor
class EvidenceItemSchema(BaseModel):
    claim: str
    # "supported" | "partial" | "unsupported"
    evidence_status: str
    note: str


class EvidenceAuditSchema(BaseModel):
    items: List[EvidenceItemSchema]
    summary: str


# ---------------------------------------------------------------- agent 5: contradiction finder
class ContradictionSchema(BaseModel):
    topic: str
    appellant_position: str
    respondent_position: str
    # "factual" | "interpretive" | "procedural"
    nature: str


class ContradictionAnalysisSchema(BaseModel):
    contradictions: List[ContradictionSchema]
    summary: str


# ---------------------------------------------------------------- ML: similar cases
class MatchBreakdownSchema(BaseModel):
    """Why a case matched. Rendered directly in the UI — the spec makes the
    explanation an acceptance criterion, not a debug field."""

    final_score: float
    semantic: float
    doc_similarity: float
    issue_similarity: float
    statute_overlap: float
    shared_statutes: List[str] = []
    # "both" | "semantic" | "statutes"
    matched_on: str = "semantic"


class SimilarCaseSchema(BaseModel):
    case_id: str
    title: Optional[str] = None
    court: Optional[str] = None
    jurisdiction: Optional[str] = None
    case_number: Optional[str] = None
    judgment_date: Optional[str] = None
    year: Optional[int] = None
    bench: List[str] = []
    excerpt: Optional[str] = None
    source_url: Optional[str] = None
    breakdown: MatchBreakdownSchema
    is_weak: bool = False


class SimilarCasesSchema(BaseModel):
    cases: List[SimilarCaseSchema] = []
    weak_only: bool = False
    # Populated only when `cases` is empty — carries the empty/error state text.
    reason: Optional[str] = None
    elapsed_ms: float = 0.0
    query_statutes: List[str] = []


# ---------------------------------------------------------------- agent 6: judge
class CaseScoresSchema(BaseModel):
    appellant_strength: int
    respondent_strength: int
    evidence_quality: int
    complexity: int
    overall_clarity: int


class JudgmentSchema(BaseModel):
    scores: CaseScoresSchema
    leaning: str
    reasoning: str
    key_considerations: List[str]


# ---------------------------------------------------------------- degraded runs
class StageFailure(BaseModel):
    """One agent that could not run, in terms a user can act on."""

    stage: str          # machine name, e.g. "appellant"
    label: str          # display name, e.g. "Appellant's Advocate"
    # "rate_limit" | "auth" | "network" | "invalid_output" | "unknown"
    category: str
    message: str        # user-facing explanation
    recovery: str       # what the user should do about it


class DegradedInfo(BaseModel):
    """Present only when at least one stage failed."""

    failed_stages: List[StageFailure]
    completed: int
    total: int
    # True when every stage failed the same way — lets the UI say "the model is
    # unreachable" rather than listing six identical failures.
    uniform_cause: Optional[str] = None


# ---------------------------------------------------------------- response
class FullCaseAnalysisResponse(BaseModel):
    # "complete" — every stage ran
    # "partial"  — some stages ran; `degraded` lists what did not
    # "failed"   — no stage ran (the API returns 503 in this case)
    status: str
    case: CaseInput

    # Every agent field is optional. A stage that could not run is `None`, never
    # placeholder text — the UI marks it "could not run" instead of rendering
    # invented analysis in the same styling as real output.
    issues: Optional[IssueAnalysisSchema] = None
    appellant_case: Optional[AdvocacySchema] = None
    respondent_case: Optional[AdvocacySchema] = None
    evidence_audit: Optional[EvidenceAuditSchema] = None
    contradictions: Optional[ContradictionAnalysisSchema] = None
    judgment: Optional[JudgmentSchema] = None

    # Retrieval is local and does not depend on the model, so it commonly
    # succeeds while the LLM stages fail. Optional for the separate case where
    # the corpus itself is unavailable.
    similar_cases: Optional[SimilarCasesSchema] = None

    degraded: Optional[DegradedInfo] = None
