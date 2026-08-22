"""Six-agent legal case analysis pipeline, plus similar-case retrieval.

    issues -> appellant -> respondent -> evidence -> contradictions
           -> similar_cases -> judgment

The two advocates run in sequence rather than parallel on purpose: the respondent
sees the appellant's arguments and rebuts them, which is what makes the output a
debate instead of two independent summaries.

Two failure policies, deliberately different:

- LLM nodes fall back to canned domain output when the API errors or rate-limits,
  so a live demo degrades instead of dying.
- The similarity node returns an empty result on any failure. It is the only node
  that depends on on-disk artifacts, and the spec requires that a missing corpus
  cannot abort the surrounding analysis.
"""
import json
import logging
import re
from typing import TypedDict

import google.generativeai as genai
from langgraph.graph import END, START, StateGraph

from models.schemas import CaseInput
from prompts.templates import (
    get_appellant_prompt,
    get_contradiction_prompt,
    get_evidence_prompt,
    get_issue_prompt,
    get_judgment_prompt,
    get_respondent_prompt,
)

log = logging.getLogger(__name__)

# Bound what goes into a prompt. Judgments run to 60k characters; past ~25k the
# marginal signal is small next to the latency and token cost.
MAX_PROMPT_CHARS = 25000


class CaseState(TypedDict):
    case: CaseInput
    issues: dict | None
    appellant: dict | None
    respondent: dict | None
    evidence: dict | None
    contradictions: dict | None
    similar_cases: dict
    judgment: dict | None
    # Accumulated across nodes; empty on a fully successful run.
    failures: list[dict]


# ---------------------------------------------------------------- LLM plumbing
def get_model():
    return genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        generation_config={"temperature": 0.4, "response_mime_type": "application/json"},
    )


def parse_llm_json(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    try:
        return json.loads(cleaned.strip())
    except json.JSONDecodeError as exc:
        raise ValueError(f"Failed to parse LLM output into JSON: {exc}") from exc


STAGE_LABELS = {
    "issues": "Issue Spotter",
    "appellant": "Appellant's Advocate",
    "respondent": "Respondent's Advocate",
    "evidence": "Evidence Auditor",
    "contradictions": "Contradiction Finder",
    "judgment": "Judge",
}


def classify_failure(exc: Exception) -> tuple[str, str, str]:
    """Map an exception to (category, user message, recovery advice).

    The point is to tell the user something they can act on. "429" and "invalid
    API key" need completely different responses from the person reading the
    screen, and neither is served by "an error occurred".
    """
    raw = str(exc)
    text = raw.lower()

    if "429" in text or "quota" in text or "rate limit" in text or "resource_exhausted" in text:
        # Per-minute and per-day quotas need opposite advice. Telling someone to
        # "wait a minute" when they have hit a daily cap wastes their afternoon,
        # so read which one it actually is instead of guessing.
        is_daily = "perday" in text.replace(" ", "") or "requests per day" in text
        retry_match = re.search(r"retry_delay\s*\{\s*seconds:\s*(\d+)", raw)
        wait_s = int(retry_match.group(1)) if retry_match else None

        if is_daily:
            limit_match = re.search(r"limit:\s*(\d+)", raw)
            limit = limit_match.group(1) if limit_match else None
            return (
                "rate_limit",
                f"The daily free-tier quota for the AI model has been used up"
                + (f" (limit: {limit} requests per day)." if limit else "."),
                "This resets at midnight Pacific time. To keep working now, use a "
                "different API key or enable billing on the Google AI Studio project. "
                "Each analysis uses 6 requests.",
            )

        return (
            "rate_limit",
            "The AI model is rate-limited right now.",
            (
                f"Wait about {wait_s} seconds and retry — this clears on its own."
                if wait_s
                else "Wait about a minute and retry — this usually clears on its own."
            ),
        )
    if "api_key_invalid" in text or "api key not valid" in text or "401" in text or "403" in text:
        return (
            "auth",
            "The AI model rejected the API key.",
            "Check GEMINI_API_KEY in backend/.env, then restart the backend and retry.",
        )
    if isinstance(exc, ValueError) or "json" in text or "parse" in text:
        return (
            "invalid_output",
            "The AI model returned a response this stage could not read.",
            "Retry — this is usually transient and succeeds on a second attempt.",
        )
    if any(w in text for w in ("timeout", "connection", "unreachable", "dns", "network", "deadline")):
        return (
            "network",
            "Could not reach the AI model.",
            "Check your internet connection, then retry.",
        )
    return (
        "unknown",
        "This stage failed for an unexpected reason.",
        "Retry. If it keeps failing, check the backend logs for details.",
    )


def call_llm(prompt: str, agent: str) -> tuple[dict | None, dict | None]:
    """Run one agent. Returns (result, failure) — exactly one is non-None.

    Deliberately does NOT substitute placeholder content on failure. An earlier
    version did, and the result was an analysis the API reported as "complete"
    while every panel held invented text — beside five genuine retrieved
    precedents. A stage that did not run must be visibly absent, not filled in.
    """
    try:
        response = get_model().generate_content(prompt)
        return parse_llm_json(response.text), None
    except Exception as exc:
        category, message, recovery = classify_failure(exc)
        log.warning("[%s] failed (%s): %s", agent, category, exc)
        return None, {
            "stage": agent,
            "label": STAGE_LABELS.get(agent, agent),
            "category": category,
            "message": message,
            "recovery": recovery,
        }


def _run(agent: str, prompt: str, state: CaseState) -> dict:
    """Execute one agent node and thread any failure into the graph state."""
    result, failure = call_llm(prompt, agent)
    update: dict = {agent: result}
    if failure:
        update["failures"] = state.get("failures", []) + [failure]
    return update


def _clip(text: str, limit: int = MAX_PROMPT_CHARS) -> str:
    return text if len(text) <= limit else text[:limit] + "\n[...truncated...]"


# ---------------------------------------------------------------- agent nodes
def _ctx(value) -> str:
    """Serialise an upstream stage's output for a downstream prompt.

    A failed upstream stage becomes an explicit note rather than "null", so the
    downstream agent works from the case text instead of trying to reason about
    a missing object.
    """
    return json.dumps(value) if value else "(not available — this stage did not run)"


def issue_node(state: CaseState):
    case = state["case"]
    log.info("Agent: Issue Spotter")
    prompt = get_issue_prompt(case.title, _clip(case.case_text), case.case_type or "Not specified")
    return _run("issues", prompt, state)


def appellant_node(state: CaseState):
    case = state["case"]
    log.info("Agent: Appellant's Advocate")
    prompt = get_appellant_prompt(
        case.title, _clip(case.case_text), _ctx(state.get("issues"))
    )
    return _run("appellant", prompt, state)


def respondent_node(state: CaseState):
    case = state["case"]
    log.info("Agent: Respondent's Advocate")
    prompt = get_respondent_prompt(
        case.title, _clip(case.case_text), _ctx(state.get("appellant"))
    )
    return _run("respondent", prompt, state)


def evidence_node(state: CaseState):
    case = state["case"]
    log.info("Agent: Evidence Auditor")
    prompt = get_evidence_prompt(
        case.title, _clip(case.case_text),
        _ctx(state.get("appellant")), _ctx(state.get("respondent")),
    )
    return _run("evidence", prompt, state)


def contradiction_node(state: CaseState):
    case = state["case"]
    log.info("Agent: Contradiction Finder")
    prompt = get_contradiction_prompt(
        case.title, _ctx(state.get("appellant")), _ctx(state.get("respondent"))
    )
    return _run("contradictions", prompt, state)


def similar_cases_node(state: CaseState):
    """Retrieve similar past judgments. Non-LLM, and cannot fail the graph.

    Imported lazily so that a broken retrieval layer surfaces here as an empty
    result rather than as an import error that takes down the whole module.
    """
    log.info("Retrieval: Similar Cases")
    try:
        from retrieval.similarity import find_similar

        result = find_similar(state["case"].case_text)
        return {
            "similar_cases": {
                "cases": [
                    {
                        "case_id": c.record.case_id,
                        "title": c.record.title,
                        "court": c.record.court,
                        "jurisdiction": c.record.jurisdiction,
                        "case_number": c.record.case_number,
                        "judgment_date": c.record.judgment_date,
                        "year": c.record.year,
                        "bench": c.record.bench,
                        "excerpt": c.record.excerpt,
                        "source_url": c.record.source_url,
                        "breakdown": {
                            "final_score": c.breakdown.final_score,
                            "semantic": c.breakdown.semantic,
                            "doc_similarity": c.breakdown.doc_similarity,
                            "issue_similarity": c.breakdown.issue_similarity,
                            "statute_overlap": c.breakdown.statute_overlap,
                            "shared_statutes": c.breakdown.shared_statutes,
                            "matched_on": c.breakdown.matched_on,
                        },
                        "is_weak": c.is_weak,
                    }
                    for c in result.cases
                ],
                "weak_only": result.weak_only,
                "reason": result.reason,
                "elapsed_ms": result.elapsed_ms,
                "query_statutes": result.query_statutes,
            }
        }
    except Exception as exc:
        # Containment requirement from the spec: this node must never abort the
        # analysis. Verified in T16 by renaming the artifacts directory.
        log.warning("similar-case retrieval failed, continuing without it: %s", exc)
        return {
            "similar_cases": {
                "cases": [], "weak_only": False,
                "reason": "Similar case search unavailable.",
                "elapsed_ms": 0.0, "query_statutes": [],
            }
        }


def judgment_node(state: CaseState):
    case = state["case"]
    log.info("Agent: Judge")
    similar = state.get("similar_cases") or {}
    brief = [
        {"title": c.get("title"), "year": c.get("year"),
         "shared_statutes": (c.get("breakdown") or {}).get("shared_statutes", [])}
        for c in similar.get("cases", [])
    ]
    prompt = get_judgment_prompt(
        case.title,
        _ctx(state.get("issues")),
        _ctx(state.get("appellant")),
        _ctx(state.get("respondent")),
        _ctx(state.get("evidence")),
        _ctx(state.get("contradictions")),
        json.dumps(brief),
    )
    return _run("judgment", prompt, state)


# ---------------------------------------------------------------- graph
workflow = StateGraph(CaseState)

workflow.add_node("issues", issue_node)
workflow.add_node("appellant", appellant_node)
workflow.add_node("respondent", respondent_node)
workflow.add_node("evidence", evidence_node)
workflow.add_node("contradictions", contradiction_node)
workflow.add_node("similar_cases", similar_cases_node)
workflow.add_node("judgment", judgment_node)

workflow.add_edge(START, "issues")
workflow.add_edge("issues", "appellant")
workflow.add_edge("appellant", "respondent")
workflow.add_edge("respondent", "evidence")
workflow.add_edge("evidence", "contradictions")
workflow.add_edge("contradictions", "similar_cases")
workflow.add_edge("similar_cases", "judgment")
workflow.add_edge("judgment", END)

app_graph = workflow.compile()


LLM_STAGES = ("issues", "appellant", "respondent", "evidence", "contradictions", "judgment")


def run_analysis_pipeline(case: CaseInput) -> dict:
    log.info("--- STARTING CASE ANALYSIS: %s ---", case.title)
    initial: CaseState = {
        "case": case, "issues": None, "appellant": None, "respondent": None,
        "evidence": None, "contradictions": None, "similar_cases": {},
        "judgment": None, "failures": [],
    }
    final = app_graph.invoke(initial)

    failures = final.get("failures", [])
    completed = sum(1 for s in LLM_STAGES if final.get(s))

    if not failures:
        status, degraded = "complete", None
    elif completed == 0:
        # Nothing ran. The caller turns this into a 503 rather than serving an
        # empty dashboard that looks like a finished analysis.
        status = "failed"
        degraded = _degraded_info(failures, completed)
    else:
        status = "partial"
        degraded = _degraded_info(failures, completed)

    log.info("--- ANALYSIS %s (%d/%d stages) ---", status.upper(), completed, len(LLM_STAGES))

    return {
        "status": status,
        "case": case,
        "issues": final.get("issues"),
        "appellant_case": final.get("appellant"),
        "respondent_case": final.get("respondent"),
        "evidence_audit": final.get("evidence"),
        "contradictions": final.get("contradictions"),
        "similar_cases": final.get("similar_cases"),
        "judgment": final.get("judgment"),
        "degraded": degraded,
    }


def _degraded_info(failures: list[dict], completed: int) -> dict:
    categories = {f["category"] for f in failures}
    return {
        "failed_stages": failures,
        "completed": completed,
        "total": len(LLM_STAGES),
        # One shared cause across every failure is worth saying once, plainly,
        # instead of repeating the same message six times.
        "uniform_cause": failures[0]["message"] if len(categories) == 1 else None,
    }
