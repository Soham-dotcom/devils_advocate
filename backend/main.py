import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware

import google.generativeai as genai

from agents.engine import run_analysis_pipeline
from models.schemas import CaseInput, FullCaseAnalysisResponse

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger(__name__)

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY is missing from the environment configuration.")

genai.configure(api_key=api_key)

app = FastAPI(
    title="Legal Case Analysis API",
    description="Multi-agent AI analysis of legal cases with similar-judgment retrieval.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def warm_up() -> None:
    """Load the encoder and corpus before the first request.

    Costs ~8s once. Without it the first user to submit a case pays that, which
    on a live demo is the one request that must not look slow.
    """
    try:
        from retrieval.store import get_store

        store = get_store()
        from ingestion.embed import get_model

        get_model()
        log.info("Similar-case corpus ready: %d judgments indexed.", len(store))
    except Exception as exc:
        # Not fatal — the pipeline degrades to the empty state per the spec.
        log.warning("Similar-case corpus unavailable at startup: %s", exc)


@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "ok"}


@app.get("/api/corpus", tags=["System"])
async def corpus_status():
    """Whether similar-case retrieval is available, and over how many judgments."""
    try:
        from retrieval.store import get_store

        store = get_store()
        return {"available": True, "judgments": len(store)}
    except Exception as exc:
        return {"available": False, "judgments": 0, "reason": str(exc)}


@app.post("/api/analyze", response_model=FullCaseAnalysisResponse, tags=["Analysis"])
async def analyze_case(case: CaseInput, response: Response):
    try:
        result = run_analysis_pipeline(case)
    except Exception as exc:
        log.exception("Pipeline error")
        raise HTTPException(status_code=500, detail=f"Analysis runtime error: {exc}")

    if result["status"] == "failed":
        # No stage produced anything. Answering 200 here is what previously let a
        # dashboard of placeholder text be presented as a completed analysis.
        degraded = result.get("degraded") or {}
        raise HTTPException(
            status_code=503,
            detail={
                "error": "analysis_failed",
                "message": degraded.get("uniform_cause")
                or "No stage of the analysis could run.",
                "recovery": (degraded.get("failed_stages") or [{}])[0].get(
                    "recovery", "Retry in a moment."
                ),
                "failed_stages": degraded.get("failed_stages", []),
            },
        )

    if result["status"] == "partial":
        # Signal degradation in the protocol too, not only the body — a caller
        # that ignores the body still learns the result is incomplete.
        response.headers["X-Analysis-Status"] = "partial"

    return result


@app.post("/api/similar-cases", tags=["Analysis"])
async def similar_cases(case: CaseInput):
    """Retrieval only, without the agent pipeline. Useful for tuning and demos."""
    from retrieval.similarity import find_similar

    result = find_similar(case.case_text)
    return {
        "cases": [
            {
                "case_id": c.record.case_id,
                "title": c.record.title,
                "court": c.record.court,
                "judgment_date": c.record.judgment_date,
                "bench": c.record.bench,
                "source_url": c.record.source_url,
                "excerpt": (c.record.excerpt or "")[:400],
                "score": c.breakdown.final_score,
                "semantic": c.breakdown.semantic,
                "statute_overlap": c.breakdown.statute_overlap,
                "shared_statutes": c.breakdown.shared_statutes,
                "matched_on": c.breakdown.matched_on,
                "is_weak": c.is_weak,
            }
            for c in result.cases
        ],
        "weak_only": result.weak_only,
        "reason": result.reason,
        "elapsed_ms": result.elapsed_ms,
        "query_statutes": result.query_statutes,
    }
