"use client";

import type { ContradictionAnalysisSchema } from "@/types";
import { Card, CardContent } from "@/components/ui/card";

export function Contradictions({
  data,
}: {
  data: ContradictionAnalysisSchema;
}) {
  const items = data.contradictions ?? [];

  return (
    <section id="conflict" className="scroll-mt-24 py-16">
      <p className="eyebrow">The conflict</p>
      <h2 className="mt-3 font-display text-4xl text-parchment sm:text-5xl">Where they cannot both be right</h2>
      <p className="text-sm text-parchment-dim mb-4">
        Where the two sides take incompatible positions on the same point.
      </p>

      <Card className="border-rule bg-file"><CardContent className="pt-6">
        <p className="text-sm text-parchment">{data.summary}</p>

        {items.length === 0 ? (
          <p className="mt-4 text-sm text-parchment-faint">
            No direct contradictions identified. The sides differ in emphasis
            rather than in stated position.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {items.map((c, i) => (
              <li
                key={i}
                className="rounded border border-rule overflow-hidden"
              >
                <div className="px-3 py-2 bg-ink flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-parchment">{c.topic}</p>
                  <span className="shrink-0 text-[10px] uppercase px-1.5 py-0.5 rounded bg-file-raised text-parchment-dim border border-rule-bright">
                    {c.nature}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-rule">
                  <div className="p-3">
                    <p className="text-[10px] uppercase tracking-wide text-appellant">
                      Appellant
                    </p>
                    <p className="text-sm text-parchment-dim mt-1">
                      {c.appellant_position}
                    </p>
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] uppercase tracking-wide text-respondent">
                      Respondent
                    </p>
                    <p className="text-sm text-parchment-dim mt-1">
                      {c.respondent_position}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent></Card>
    </section>
  );
}
