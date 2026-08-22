"use client";

import { useState } from "react";
import type { SimilarCase, SimilarCasesSchema } from "@/types";

interface SimilarCasesProps {
  data?: SimilarCasesSchema | null;
  /** True while the analysis is still running. */
  isLoading?: boolean;
  onRetry?: () => void;
}

/** Badge text for how a case matched. Never colour alone — a11y requirement. */
const MATCH_LABEL: Record<string, string> = {
  both: "Statutes + semantic",
  statutes: "Statutes only",
  semantic: "Semantic only",
};

function formatDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SkeletonRow() {
  return (
    <div className="p-4 rounded-lg bg-file border border-rule animate-pulse">
      <div className="h-4 w-2/3 bg-file-raised rounded" />
      <div className="mt-2 h-3 w-1/3 bg-file-raised/40 rounded" />
      <div className="mt-3 h-3 w-full bg-file-raised rounded" />
    </div>
  );
}

function CaseRow({ item, rank }: { item: SimilarCase; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const { breakdown } = item;
  const pct = Math.round(breakdown.final_score * 100);
  const date = formatDate(item.judgment_date);

  return (
    <li className="rounded-lg bg-file border border-rule overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-parchment-faint">#{rank}</span>
              {item.is_weak && (
                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-saffron/15 text-saffron border border-saffron/30">
                  Weak match
                </span>
              )}
            </div>
            <h4 className="mt-1 font-medium text-parchment leading-snug break-words">
              {item.title ?? `Judgment ${item.case_id}`}
            </h4>
            <p className="mt-1 text-xs text-parchment-dim">
              {[item.court, item.jurisdiction, date].filter(Boolean).join(" · ")}
            </p>
            {item.case_number && (
              <p className="text-xs text-parchment-faint">{item.case_number}</p>
            )}
          </div>

          <div className="shrink-0 text-right">
            <div className="text-lg font-medium text-parchment tabular-nums">
              {pct}%
            </div>
            <div className="text-[10px] uppercase tracking-wide text-parchment-faint">
              match
            </div>
          </div>
        </div>

        {/* Why it matched — an acceptance criterion, not a debug detail. */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-file-raised text-parchment-dim border border-rule-bright">
            {MATCH_LABEL[breakdown.matched_on] ?? breakdown.matched_on}
          </span>
          {breakdown.shared_statutes.map((s) => (
            <span
              key={s}
              className="text-[11px] px-1.5 py-0.5 rounded bg-saffron/12 text-saffron border border-saffron/30 font-mono"
            >
              {s}
            </span>
          ))}
          {breakdown.shared_statutes.length === 0 && (
            <span className="text-[11px] text-parchment-faint">
              No shared provisions — matched on wording alone
            </span>
          )}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="mt-3 text-xs text-parchment-dim hover:text-parchment transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded"
        >
          {expanded ? "Hide details ▲" : "Show details ▼"}
        </button>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-rule space-y-3">
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {[
                ["Semantic", breakdown.semantic],
                ["Document", breakdown.doc_similarity],
                ["Issue", breakdown.issue_similarity],
                ["Statutes", breakdown.statute_overlap],
              ].map(([label, value]) => (
                <div key={label as string} className="bg-ink rounded p-2">
                  <dt className="text-parchment-faint">{label}</dt>
                  <dd className="text-parchment font-mono tabular-nums">
                    {(value as number).toFixed(3)}
                  </dd>
                </div>
              ))}
            </dl>

            {item.bench.length > 0 && (
              <p className="text-xs text-parchment-dim">
                <span className="text-parchment-faint">Bench: </span>
                {item.bench.join(", ")}
              </p>
            )}

            {item.excerpt && (
              <p className="text-xs text-parchment-dim leading-relaxed line-clamp-6">
                {item.excerpt}
              </p>
            )}

            {item.source_url && (
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs text-saffron hover:text-saffron underline focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron rounded"
              >
                Read full judgment on Indian Kanoon →
              </a>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export function SimilarCases({ data, isLoading, onRetry }: SimilarCasesProps) {
  const header = (
    <div className="mb-3">
      <p className="eyebrow">The precedent</p>
      <h3 className="mt-3 font-display text-4xl text-parchment sm:text-5xl">Judgments that came before</h3>
      <p className="text-xs text-parchment-dim mt-0.5">
        Matched against Supreme Court judgments, 2020–2025
      </p>
    </div>
  );

  // Loading — skeletons, not a spinner (spec: >300ms loads use skeletons)
  if (isLoading) {
    return (
      <section id="precedent" className="scroll-mt-24 py-16">
        {header}
        <div className="space-y-2" aria-busy="true" aria-live="polite">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </section>
    );
  }

  // Error — corpus unavailable. Contained: the rest of the analysis is unaffected.
  const isError =
    !data || (data.cases.length === 0 && /unavailable/i.test(data.reason ?? ""));

  if (isError) {
    return (
      <section id="precedent" className="scroll-mt-24 py-16">
        {header}
        <div className="p-4 rounded-lg bg-file border border-rule">
          <p className="text-sm text-parchment-dim">
            Similar case search is unavailable.
          </p>
          <p className="text-xs text-parchment-faint mt-1">
            {data?.reason ?? "The judgment corpus could not be loaded."} The rest
            of this analysis is unaffected.
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-xs px-3 py-1.5 rounded bg-file-raised hover:bg-file-raised text-parchment transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
            >
              Retry search
            </button>
          )}
        </div>
      </section>
    );
  }

  // Empty — nothing comparable found.
  if (data.cases.length === 0) {
    return (
      <section id="precedent" className="scroll-mt-24 py-16">
        {header}
        <div className="p-4 rounded-lg bg-file border border-rule">
          <p className="text-sm text-parchment-dim">
            No strongly similar cases found in the 2020–2025 corpus.
          </p>
          <p className="text-xs text-parchment-faint mt-1">
            {data.reason ??
              "Try pasting more of the judgment text — short inputs carry too little signal to match on."}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="precedent" className="scroll-mt-24 py-16">
      {header}

      {/* Partial — everything returned is below the confidence threshold. */}
      {data.weak_only && (
        <div className="mb-3 p-3 rounded-lg bg-saffron/10 border border-saffron/30">
          <p className="text-xs text-saffron">
            All matches below are weak. Treat them as leads to check, not as
            comparable precedent.
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {data.cases.map((item, i) => (
          <CaseRow key={item.case_id} item={item} rank={i + 1} />
        ))}
      </ul>

      <p className="mt-2 text-[11px] text-parchment-faint">
        Retrieved in {data.elapsed_ms.toFixed(0)}ms
        {data.query_statutes.length > 0 &&
          ` · detected in your case: ${data.query_statutes
            .filter((s) => s.includes(":"))
            .slice(0, 5)
            .map((s) => {
              const [act, num] = s.split(":");
              return `S.${num} ${act}`;
            })
            .join(", ")}`}
      </p>
    </section>
  );
}
