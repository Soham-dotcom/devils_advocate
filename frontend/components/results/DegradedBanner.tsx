"use client";

import { useState } from "react";
import type { DegradedInfo } from "@/types";

interface DegradedBannerProps {
  degraded?: DegradedInfo | null;
  /** Whether similar-case retrieval produced results despite the failures. */
  retrievalWorked?: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
}

const CATEGORY_HINT: Record<string, string> = {
  rate_limit: "Rate limited",
  auth: "API key rejected",
  network: "Network problem",
  invalid_output: "Unreadable model output",
  unknown: "Unexpected error",
};

/**
 * Shown at the top of the results page when some stages did not run.
 *
 * This exists because the earlier behaviour was to fill failed stages with
 * placeholder text and report the run as "complete" — so a reader could not tell
 * a finished analysis from a failed one.
 */
export function DegradedBanner({
  degraded,
  retrievalWorked,
  onRetry,
  isRetrying,
}: DegradedBannerProps) {
  const [expanded, setExpanded] = useState(false);
  if (!degraded || degraded.failed_stages.length === 0) return null;

  const { completed, total, failed_stages, uniform_cause } = degraded;
  const recovery = failed_stages[0]?.recovery;

  return (
    <div
      role="alert"
      className="mb-8 rounded-lg border border-saffron/40 bg-saffron/10 p-5"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl leading-none" aria-hidden>
          ⚠️
        </span>

        <div className="flex-1 min-w-0">
          <h2 className="text-parchment font-semibold">
            This analysis is incomplete — {completed} of {total} stages ran
          </h2>

          <p className="mt-1 text-sm text-parchment-dim">
            {uniform_cause ??
              `${failed_stages.length} stage${
                failed_stages.length === 1 ? "" : "s"
              } could not run.`}{" "}
            The sections below show only what actually completed. Nothing has been
            filled in or guessed.
          </p>

          {recovery && (
            <p className="mt-2 text-sm text-saffron">
              <span className="font-medium">What to do: </span>
              {recovery}
            </p>
          )}

          {retrievalWorked && (
            <p className="mt-2 text-xs text-parchment-faint">
              Similar past judgments were retrieved successfully — that search
              runs locally and does not depend on the AI model, so those results
              are unaffected.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                disabled={isRetrying}
                className="px-4 py-1.5 text-sm rounded-lg bg-saffron hover:bg-saffron disabled:bg-file-raised disabled:cursor-not-allowed text-ink font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
              >
                {isRetrying ? "Retrying…" : "Retry the failed stages"}
              </button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              className="text-sm text-saffron/80 hover:text-parchment underline focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded"
            >
              {expanded ? "Hide details" : "Which stages failed?"}
            </button>
          </div>

          {expanded && (
            <ul className="mt-3 space-y-2 border-t border-saffron/20 pt-3">
              {failed_stages.map((f) => (
                <li key={f.stage} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-parchment font-medium">{f.label}</span>
                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-saffron/15 text-saffron border border-saffron/30">
                      {CATEGORY_HINT[f.category] ?? f.category}
                    </span>
                  </div>
                  <p className="text-parchment-faint text-xs mt-0.5">{f.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/** Stands in for one stage that could not run. Never styled like real output. */
export function StageUnavailable({
  title,
  failure,
}: {
  title: string;
  failure?: { message: string; recovery: string };
}) {
  return (
    <section className="mb-8">
      <h2 className="text-2xl font-bold text-parchment-faint mb-1">{title}</h2>
      <div className="rounded-lg border border-dashed border-rule bg-ink p-6">
        <p className="text-parchment-dim text-sm font-medium">
          This stage could not run.
        </p>
        <p className="text-parchment-faint text-sm mt-1">
          {failure?.message ??
            "The AI model could not be reached for this section."}
        </p>
        {failure?.recovery && (
          <p className="text-parchment-faint text-xs mt-2">{failure.recovery}</p>
        )}
        <p className="text-parchment-faint text-xs mt-3">
          Nothing is shown here rather than showing content that was not
          generated from your case.
        </p>
      </div>
    </section>
  );
}
