"""Failure-handling tests for the analysis pipeline.

    python -m tests.test_degraded

Run from `backend/`. Makes no network calls — the model is stubbed, so which
stages fail is chosen rather than hoped for.

Covers the three outcomes the API can produce:

    complete  every stage ran
    partial   some stages ran; `degraded` names the rest
    failed    nothing ran; the endpoint answers 503, not 200

The last two matter because an earlier version substituted placeholder text for
failed stages and reported the run as "complete" — presenting a dashboard of
invented analysis beside genuinely retrieved case law.
"""
from __future__ import annotations

import json
import sys
from types import SimpleNamespace
from unittest import mock

from models.schemas import CaseInput, FullCaseAnalysisResponse

CASE = CaseInput(
    title="Maintenance claim by an unmarried major daughter",
    case_text=(
        "The petitioner seeks maintenance under Section 125 of the Code of Criminal "
        "Procedure from her father. She contends she is unmarried and unable to "
        "maintain herself. The respondent contends that clause (c) confines relief "
        "to a major child suffering physical or mental abnormality. "
    ) * 4,
)

# Valid payloads per stage, in pipeline order.
CANNED = [
    {"summary": "A maintenance claim under S.125 CrPC.",
     "issues": [{"issue": "Is a major unmarried daughter entitled to maintenance?",
                 "why_it_matters": "Determines whether S.125 relief is available."}],
     "key_facts": ["The petitioner is 24 and unmarried."],
     "key_dates": [{"date": "12.03.2013", "event": "Magistrate's order"}],
     "provisions_invoked": ["Section 125 CrPC"]},
    {"position": "The daughter is entitled to maintenance.",
     "arguments": [{"claim": "S.20(3) HAMA imposes the obligation.",
                    "support": "The text of the provision.", "strength": "strong"}],
     "strongest_point": "S.20(3) HAMA is unqualified.",
     "weakest_point": "S.125(1)(c) is explicit."},
    {"position": "The claim is not maintainable.",
     "arguments": [{"claim": "Clause (c) requires abnormality.",
                    "support": "Statutory wording.", "strength": "strong"}],
     "strongest_point": "The plain text of clause (c).",
     "weakest_point": "HAMA operates independently."},
    {"items": [{"claim": "The petitioner is unemployed.",
                "evidence_status": "supported", "note": "Stated in the petition."}],
     "summary": "Core claims are supported."},
    {"contradictions": [{"topic": "Scope of S.125(1)(c)",
                         "appellant_position": "Not exhaustive.",
                         "respondent_position": "Exhaustive.",
                         "nature": "interpretive"}],
     "summary": "The dispute is interpretive."},
    {"scores": {"appellant_strength": 6, "respondent_strength": 7,
                "evidence_quality": 7, "complexity": 6, "overall_clarity": 7},
     "leaning": "The respondent is better positioned on the statutory text.",
     "reasoning": "Clause (c) is explicit, though HAMA offers a separate route.",
     "key_considerations": ["Whether HAMA can be invoked in S.125 proceedings."]},
]

RATE_LIMIT = "429 Resource has been exhausted (e.g. check quota). retry_delay { seconds: 22 }"
BAD_KEY = "400 API key not valid. Please pass a valid API key. [reason: API_KEY_INVALID]"

# The real error this project hits: a *daily* free-tier cap, which needs the
# opposite advice from a per-minute limit. Captured verbatim from the live API.
DAILY_QUOTA = (
    "429 You exceeded your current quota. Quota exceeded for metric: "
    "generativelanguage.googleapis.com/generate_content_free_tier_requests, "
    "limit: 20, model: gemini-2.5-flash. quota_id: "
    '"GenerateRequestsPerDayPerProjectPerModel-FreeTier" '
    "retry_delay { seconds: 40 }"
)


class StubModel:
    """Returns canned output, raising on the call indices given (1-based)."""

    def __init__(self, fail_on: set[int], error: str = RATE_LIMIT) -> None:
        self.calls = 0
        self.fail_on = fail_on
        self.error = error

    def generate_content(self, prompt: str):
        self.calls += 1
        if self.calls in self.fail_on:
            raise RuntimeError(self.error)
        return SimpleNamespace(text=json.dumps(CANNED[self.calls - 1]))


failures: list[str] = []


def check(label: str, condition: bool, detail: str = "") -> None:
    print(f"  {'PASS' if condition else 'FAIL'}  {label}{f'  [{detail}]' if detail else ''}")
    if not condition:
        failures.append(f"{label} {detail}".strip())


def run(fail_on: set[int], error: str = RATE_LIMIT) -> dict:
    from agents import engine

    stub = StubModel(fail_on, error)
    with mock.patch.object(engine, "get_model", return_value=stub):
        return engine.run_analysis_pipeline(CASE)


# ---------------------------------------------------------------- 1. success
print("\n=== SCENARIO 1: every stage succeeds ===")
r = run(fail_on=set())
check("status is 'complete'", r["status"] == "complete", r["status"])
check("degraded is absent", r["degraded"] is None)
check("all six stages populated", all(
    r[k] for k in ("issues", "appellant_case", "respondent_case",
                   "evidence_audit", "contradictions", "judgment")))
check("validates against the response model", bool(FullCaseAnalysisResponse(**r)))
print(f"        leaning: {r['judgment']['leaning'][:70]}")

# ---------------------------------------------------------------- 2. partial
print("\n=== SCENARIO 2: 2 of 6 stages fail (rate limit) ===")
# Fail the Evidence Auditor (4th) and Contradiction Finder (5th).
r = run(fail_on={4, 5})
check("status is 'partial'", r["status"] == "partial", r["status"])
check("degraded lists exactly 2 failures",
      len(r["degraded"]["failed_stages"]) == 2,
      str(len(r["degraded"]["failed_stages"])))
check("completed count is 4", r["degraded"]["completed"] == 4, str(r["degraded"]["completed"]))
check("failures classified as rate_limit",
      all(f["category"] == "rate_limit" for f in r["degraded"]["failed_stages"]))
check("failed stages are None, NOT placeholder text",
      r["evidence_audit"] is None and r["contradictions"] is None)
check("succeeded stages hold real output",
      bool(r["issues"]) and bool(r["appellant_case"]) and bool(r["judgment"]))
check("uniform cause surfaced", bool(r["degraded"]["uniform_cause"]),
      r["degraded"]["uniform_cause"] or "")
check("validates against the response model", bool(FullCaseAnalysisResponse(**r)))
for f in r["degraded"]["failed_stages"]:
    print(f"        {f['label']}: {f['message']} -> {f['recovery']}")

# ---------------------------------------------------------------- 3. total failure
print("\n=== SCENARIO 3: every stage fails (invalid API key) ===")
r = run(fail_on=set(range(1, 7)), error=BAD_KEY)
check("status is 'failed'", r["status"] == "failed", r["status"])
check("no stage returned content", not any(
    r[k] for k in ("issues", "appellant_case", "respondent_case",
                   "evidence_audit", "contradictions", "judgment")))
check("classified as auth, not unknown",
      all(f["category"] == "auth" for f in r["degraded"]["failed_stages"]),
      r["degraded"]["failed_stages"][0]["category"])
check("recovery names the actual fix",
      "GEMINI_API_KEY" in r["degraded"]["failed_stages"][0]["recovery"])
print(f"        message : {r['degraded']['failed_stages'][0]['message']}")
print(f"        recovery: {r['degraded']['failed_stages'][0]['recovery']}")

# ---------------------------------------------------------------- 4. classifier
print("\n=== SCENARIO 4: failure classification ===")
from agents.engine import classify_failure

for exc, expected in [
    (RuntimeError(RATE_LIMIT), "rate_limit"),
    (RuntimeError(DAILY_QUOTA), "rate_limit"),
    (RuntimeError(BAD_KEY), "auth"),
    (ValueError("Failed to parse LLM output into JSON"), "invalid_output"),
    (RuntimeError("Connection timeout after 30s"), "network"),
    (RuntimeError("something entirely unexpected"), "unknown"),
]:
    category, message, recovery = classify_failure(exc)
    check(f"{type(exc).__name__} -> {expected}", category == expected, category)
    if not recovery.strip():
        failures.append(f"{expected} has no recovery advice")

# Per-minute and per-day quotas must not give the same advice.
_, per_min_msg, per_min_rec = classify_failure(RuntimeError(RATE_LIMIT))
_, daily_msg, daily_rec = classify_failure(RuntimeError(DAILY_QUOTA))
check("per-minute limit quotes the real retry delay", "22 seconds" in per_min_rec, per_min_rec)
check("daily cap is distinguished from per-minute", daily_rec != per_min_rec)
check("daily cap does not say 'wait a minute'", "wait about a minute" not in daily_rec.lower())
check("daily cap names the limit", "20" in daily_msg, daily_msg)
print(f"        per-minute: {per_min_rec}")
print(f"        daily     : {daily_rec}")

print("\n" + ("ALL PASS" if not failures else "FAILURES:\n  " + "\n  ".join(failures)))
sys.exit(0 if not failures else 1)
