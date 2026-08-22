"use client";

/**
 * Error-state harness. Renders every failure state the app can produce, on
 * demand, without needing the failure to actually occur.
 *
 * This exists because most of these states are hard to trigger deliberately —
 * you cannot easily make Gemini rate-limit you on cue — and a state you cannot
 * see is a state nobody has checked. Delete the route before shipping if you
 * would rather it not be reachable.
 */
import { useState } from "react";
import { ErrorState } from "@/components/results/ErrorState";
import {
  DegradedBanner,
  StageUnavailable,
} from "@/components/results/DegradedBanner";
import { SimilarCases } from "@/components/results/SimilarCases";
import { ApiError } from "@/utils/api";
import type { DegradedInfo, SimilarCasesSchema } from "@/types";

const partial: DegradedInfo = {
  failed_stages: [
    {
      stage: "evidence",
      label: "Evidence Auditor",
      category: "rate_limit",
      message: "The AI model is rate-limited right now.",
      recovery: "Wait about 22 seconds and retry — this clears on its own.",
    },
    {
      stage: "contradictions",
      label: "Contradiction Finder",
      category: "rate_limit",
      message: "The AI model is rate-limited right now.",
      recovery: "Wait about 22 seconds and retry — this clears on its own.",
    },
  ],
  completed: 4,
  total: 6,
  uniform_cause: "The AI model is rate-limited right now.",
};

const dailyCap: DegradedInfo = {
  failed_stages: [
    {
      stage: "issues",
      label: "Issue Spotter",
      category: "rate_limit",
      message:
        "The daily free-tier quota for the AI model has been used up (limit: 20 requests per day).",
      recovery:
        "This resets at midnight Pacific time. To keep working now, use a different API key or enable billing on the Google AI Studio project. Each analysis uses 6 requests.",
    },
  ],
  completed: 5,
  total: 6,
  uniform_cause:
    "The daily free-tier quota for the AI model has been used up (limit: 20 requests per day).",
};

const weakOnly: SimilarCasesSchema = {
  cases: [
    {
      case_id: "9",
      title: "Some unrelated judgment on land acquisition",
      court: "Supreme Court of India",
      jurisdiction: "India",
      case_number: null,
      judgment_date: "2021-04-02",
      year: 2021,
      bench: ["A. Judge"],
      excerpt: "Concerning compensation under the 2013 Act.",
      source_url: "https://indiankanoon.org/doc/9/",
      breakdown: {
        final_score: 0.179,
        semantic: 0.201,
        doc_similarity: 0.201,
        issue_similarity: 0.14,
        statute_overlap: 0,
        shared_statutes: [],
        matched_on: "semantic",
      },
      is_weak: true,
    },
  ],
  weak_only: true,
  reason: null,
  elapsed_ms: 210,
  query_statutes: [],
};

const CASES = [
  { id: "offline", label: "Backend unreachable" },
  { id: "validation", label: "Invalid input (422)" },
  { id: "analysis_failed", label: "All stages failed (503)" },
  { id: "partial", label: "Partial — 4 of 6 ran" },
  { id: "daily", label: "Partial — daily quota" },
  { id: "stage", label: "Single stage unavailable" },
  { id: "corpus", label: "Corpus unavailable" },
  { id: "empty", label: "No comparable cases" },
  { id: "weak", label: "All matches weak" },
] as const;

type CaseId = (typeof CASES)[number]["id"];

export default function PreviewErrors() {
  const [active, setActive] = useState<CaseId>("partial");

  const fullScreen =
    active === "offline" || active === "validation" || active === "analysis_failed";

  return (
    <div className="min-h-screen bg-ink">
      <div className="sticky top-0 z-40 border-b border-rule bg-ink/90 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-5 py-3">
          <p className="eyebrow mb-2">Error-state harness · not a real analysis</p>
          <div className="flex flex-wrap gap-1.5">
            {CASES.map((c) => (
              <button
                key={c.id}
                onClick={() => setActive(c.id)}
                className={`rounded-full px-3 py-1 font-data text-[11px] transition-colors ${
                  active === c.id
                    ? "bg-saffron text-ink"
                    : "border border-rule text-parchment-dim hover:text-parchment"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {fullScreen ? (
        <>
          {active === "offline" && (
            <ErrorState
              error={
                new ApiError(
                  "offline",
                  "Cannot reach the analysis server.",
                  "The backend does not appear to be running at http://localhost:8000. Start it, then retry."
                )
              }
              onRetry={() => alert("retry: re-issues the request (not a page reload)")}
            />
          )}
          {active === "validation" && (
            <ErrorState
              error={
                new ApiError(
                  "validation",
                  "The case could not be submitted.",
                  "Go back and correct the highlighted fields.",
                  {
                    status: 422,
                    fieldErrors: [
                      { field: "Case text", message: "needs at least 200 characters — you entered 9" },
                      { field: "Case title", message: "needs at least 5 characters — you entered 2" },
                    ],
                  }
                )
              }
              onRetry={() => alert("retry")}
            />
          )}
          {active === "analysis_failed" && (
            <ErrorState
              error={
                new ApiError(
                  "analysis_failed",
                  "The daily free-tier quota for the AI model has been used up (limit: 20 requests per day).",
                  "This resets at midnight Pacific time. Use a different API key or enable billing. Each analysis uses 6 requests.",
                  { status: 503 }
                )
              }
              onRetry={() => alert("retry")}
            />
          )}
        </>
      ) : (
        <div className="mx-auto max-w-5xl px-5 py-10">
          {active === "partial" && (
            <DegradedBanner degraded={partial} retrievalWorked onRetry={() => alert("retry")} />
          )}
          {active === "daily" && (
            <DegradedBanner degraded={dailyCap} retrievalWorked onRetry={() => alert("retry")} />
          )}
          {active === "stage" && (
            <StageUnavailable
              title="Evidence Audit"
              failure={{
                message: "The AI model is rate-limited right now.",
                recovery: "Wait about 22 seconds and retry.",
              }}
            />
          )}
          {active === "corpus" && (
            <SimilarCases
              data={{
                cases: [],
                weak_only: false,
                reason: "corpus unavailable: artifacts missing from backend/artifacts",
                elapsed_ms: 0,
                query_statutes: [],
              }}
              onRetry={() => alert("retry search")}
            />
          )}
          {active === "empty" && (
            <SimilarCases
              data={{
                cases: [],
                weak_only: false,
                reason: "input too short to match on (needs ~30 tokens)",
                elapsed_ms: 4,
                query_statutes: [],
              }}
            />
          )}
          {active === "weak" && <SimilarCases data={weakOnly} />}
        </div>
      )}
    </div>
  );
}
