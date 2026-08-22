"use client";

import type { JudgmentSchema } from "@/types";

/**
 * The bench. This is the only place saffron is spent at full strength — it is
 * the page's mark of authority, so it appears where the assessment sits and
 * essentially nowhere else.
 *
 * The two party-strength scores are drawn as a single opposed bar rather than
 * two separate meters, because what a reader wants is not two numbers but the
 * balance between them.
 */

const SECONDARY = [
  ["evidence_quality", "Evidence quality"],
  ["complexity", "Complexity"],
  ["overall_clarity", "Clarity"],
] as const;

function Balance({ appellant, respondent }: { appellant: number; respondent: number }) {
  const total = Math.max(1, appellant + respondent);
  const leftPct = (appellant / total) * 100;

  return (
    <div className="mt-8">
      <div className="flex items-baseline justify-between font-data text-[11px] uppercase tracking-[0.14em]">
        <span className="text-appellant">Appellant {appellant}/10</span>
        <span className="text-respondent">Respondent {respondent}/10</span>
      </div>

      <div
        className="mt-2 flex h-2 overflow-hidden rounded-full bg-rule"
        role="img"
        aria-label={`Appellant strength ${appellant} of 10, respondent strength ${respondent} of 10`}
      >
        <div className="bg-appellant transition-[width] duration-700" style={{ width: `${leftPct}%` }} />
        <div className="flex-1 bg-respondent" />
      </div>

    </div>
  );
}

export function JudgmentPanel({ data }: { data: JudgmentSchema }) {
  const scores = data.scores ?? ({} as JudgmentSchema["scores"]);

  return (
    <section id="assessment" className="scroll-mt-24 py-16">
      <header className="mb-10">
        <p className="eyebrow text-saffron opacity-80">The assessment</p>
        <h2 className="mt-3 font-display text-4xl text-parchment sm:text-5xl">
          Where the case stands
        </h2>
        <p className="mt-3 max-w-lg text-sm text-parchment-dim">
          A reading of the case&apos;s shape. It is not a decision — that
          remains yours.
        </p>
      </header>

      <div className="rounded-lg border border-saffron/25 bg-file p-7 sm:p-10">
        <p className="font-display text-2xl leading-snug text-parchment sm:text-3xl">
          {data.leaning}
        </p>

        <p className="mt-5 max-w-2xl text-[0.9375rem] leading-relaxed text-parchment-dim">
          {data.reasoning}
        </p>

        <Balance
          appellant={scores.appellant_strength ?? 0}
          respondent={scores.respondent_strength ?? 0}
        />

        <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-rule pt-6">
          {SECONDARY.map(([key, label]) => (
            <div key={key}>
              <dt className="eyebrow">{label}</dt>
              <dd className="mt-1 font-display text-2xl text-parchment">
                {scores[key] ?? 0}
                <span className="ml-0.5 font-data text-xs text-parchment-faint">
                  /10
                </span>
              </dd>
            </div>
          ))}
        </dl>

        {data.key_considerations?.length > 0 && (
          <div className="mt-8 border-t border-rule pt-6">
            <p className="eyebrow">What this turns on</p>
            <ul className="mt-3 space-y-2">
              {data.key_considerations.map((k, i) => (
                <li key={i} className="flex gap-3 text-[0.9375rem] text-parchment">
                  <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-saffron" />
                  <span>{k}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
