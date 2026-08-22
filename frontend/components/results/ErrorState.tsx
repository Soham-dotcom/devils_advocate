"use client";

import Link from "next/link";
import { ApiError } from "@/utils/api";

interface ErrorStateProps {
  /** An ApiError carries a kind and a recovery path; a plain string does not. */
  error: ApiError | string;
  onRetry?: () => void;
  isRetrying?: boolean;
  /** Where "correct the input" should send the user. */
  backToFormHref?: string;
}

const PRESENTATION: Record<
  string,
  { icon: string; heading: string; retryLabel: string }
> = {
  offline: {
    icon: "🔌",
    heading: "Cannot reach the analysis server",
    retryLabel: "Try connecting again",
  },
  validation: {
    icon: "✏️",
    heading: "The case could not be submitted",
    retryLabel: "Try again",
  },
  analysis_failed: {
    icon: "⏳",
    heading: "The analysis could not run",
    retryLabel: "Retry analysis",
  },
  server: {
    icon: "⚠️",
    heading: "The server hit an error",
    retryLabel: "Retry",
  },
  unknown: { icon: "❌", heading: "Something went wrong", retryLabel: "Retry" },
};

export function ErrorState({
  error,
  onRetry,
  isRetrying,
  backToFormHref = "/submit",
}: ErrorStateProps) {
  const isApi = error instanceof ApiError;
  const kind = isApi ? error.kind : "unknown";
  const view = PRESENTATION[kind] ?? PRESENTATION.unknown;
  const message = isApi ? error.message : error;
  const recovery = isApi ? error.recovery : undefined;
  const fieldErrors = isApi ? error.fieldErrors : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-file to-ink px-4 py-12 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <div className="bg-file border border-rule rounded-lg p-8">
          <div className="text-4xl mb-4" aria-hidden>
            {view.icon}
          </div>
          <h1 className="text-2xl font-bold text-parchment mb-2">{view.heading}</h1>
          <p className="text-parchment-dim mb-4">{message}</p>

          {/* Validation: name the field and what is wrong with it. */}
          {fieldErrors.length > 0 && (
            <ul className="mb-4 space-y-1.5 rounded-lg bg-ink border border-rule p-3">
              {fieldErrors.map((f, i) => (
                <li key={i} className="text-sm text-parchment-dim">
                  <span className="font-medium text-parchment">{f.field}</span>{" "}
                  {f.message}
                </li>
              ))}
            </ul>
          )}

          {recovery && (
            <div className="mb-6 rounded-lg bg-saffron/10 border border-saffron/30 p-3">
              <p className="text-sm text-saffron">
                <span className="font-medium">What to do: </span>
                {recovery}
              </p>
            </div>
          )}

          {/* The one case where the fix is a command the user can run. */}
          {kind === "offline" && (
            <pre className="mb-6 overflow-x-auto rounded-lg bg-ink border border-rule p-3 text-xs text-parchment-dim font-mono">
{`cd backend
$env:PYTHONPATH="."
python -m uvicorn main:app --port 8000`}
            </pre>
          )}

          <div className="space-y-3">
            {onRetry && (
              <button
                onClick={onRetry}
                disabled={isRetrying}
                className="w-full px-4 py-2.5 bg-saffron-dim hover:bg-saffron/80 disabled:bg-file-raised disabled:cursor-not-allowed text-parchment rounded-lg transition-colors font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
              >
                {isRetrying ? "Retrying…" : view.retryLabel}
              </button>
            )}

            {kind === "validation" && (
              <Link
                href={backToFormHref}
                className="block w-full px-4 py-2.5 bg-file-raised hover:bg-rule-bright text-parchment rounded-lg transition-colors font-medium text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
              >
                Back to the form
              </Link>
            )}

            <Link
              href="/"
              className="block w-full px-4 py-2.5 bg-transparent border border-rule hover:border-parchment-faint text-parchment-dim hover:text-parchment rounded-lg transition-colors font-medium text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
            >
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
