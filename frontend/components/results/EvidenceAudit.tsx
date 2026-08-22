"use client";

import type { EvidenceAuditSchema } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS_STYLE: Record<string, { badge: string; label: string }> = {
  supported: {
    badge: "bg-supported/15 text-supported border-supported/30",
    label: "Supported",
  },
  partial: {
    badge: "bg-saffron/15 text-saffron border-saffron/30",
    label: "Partial",
  },
  unsupported: {
    badge: "bg-unsupported/15 text-unsupported border-unsupported/30",
    label: "Unsupported",
  },
};

export function EvidenceAudit({ data }: { data: EvidenceAuditSchema }) {
  const unsupported =
    data.items?.filter((i) => i.evidence_status === "unsupported").length ?? 0;

  return (
    <section id="evidence" className="scroll-mt-24 py-16">
      <p className="eyebrow">The audit</p>
      <h2 className="mt-3 font-display text-4xl text-parchment sm:text-5xl">What the record actually supports</h2>
      <p className="text-sm text-parchment-dim mb-4">
        Which claims the case text actually backs — an advocate asserting
        something is not evidence for it.
      </p>

      <Card className="border-rule bg-file"><CardContent className="pt-6">
        <p className="text-sm text-parchment">{data.summary}</p>
        {unsupported > 0 && (
          <p className="mt-2 text-xs text-unsupported">
            {unsupported} claim{unsupported === 1 ? "" : "s"} found without
            support in the text.
          </p>
        )}

        <ul className="mt-4 space-y-2">
          {data.items?.map((item, i) => {
            const style =
              STATUS_STYLE[item.evidence_status?.toLowerCase()] ??
              STATUS_STYLE.partial;
            return (
              <li
                key={i}
                className="p-3 rounded bg-ink border border-rule"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`shrink-0 text-[10px] uppercase px-1.5 py-0.5 rounded border ${style.badge}`}
                  >
                    {style.label}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-parchment">{item.claim}</p>
                    <p className="text-xs text-parchment-dim mt-0.5">{item.note}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent></Card>
    </section>
  );
}
