"use client";

import { useEffect, useState } from "react";
import type { CaseInput, IssueAnalysisSchema } from "@/types";

/**
 * The hero opens on the most characteristic artifact in this subject's world:
 * the cause title. Not a metric, not a score — the case's own name, set in the
 * display face at the size a file cover would give it.
 */
export function CaseHeader({
  input,
  issues,
}: {
  input: CaseInput;
  issues?: IssueAnalysisSchema | null;
}) {
  const provisions = issues?.provisions_invoked ?? [];
  const meta = [input.court, input.case_type].filter(Boolean).join(" · ");

  return (
    <header className="border-b border-rule pb-12 pt-16">
      <p className="eyebrow rise-in">{meta || "Case analysis"}</p>

      <h1
        className="rise-in mt-5 max-w-4xl font-display text-4xl leading-[1.08] text-parchment sm:text-6xl"
        style={{ animationDelay: "80ms" }}
      >
        {input.title}
      </h1>

      {issues?.summary && (
        <p
          className="rise-in mt-6 max-w-2xl text-[0.9375rem] leading-relaxed text-parchment-dim"
          style={{ animationDelay: "160ms" }}
        >
          {issues.summary}
        </p>
      )}

      {provisions.length > 0 && (
        <div
          className="rise-in mt-7 flex flex-wrap gap-2"
          style={{ animationDelay: "240ms" }}
        >
          {provisions.map((p) => (
            <span key={p} className="cite">
              {p}
            </span>
          ))}
        </div>
      )}

      {input.party_represented && (
        <p
          className="rise-in mt-6 text-xs text-parchment-faint"
          style={{ animationDelay: "300ms" }}
        >
          Prepared for the{" "}
          <span className="text-parchment-dim">{input.party_represented}</span>
        </p>
      )}
    </header>
  );
}

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "arguments", label: "The exchange" },
  { id: "evidence", label: "Evidence" },
  { id: "conflict", label: "Conflict" },
  { id: "precedent", label: "Precedent" },
  { id: "assessment", label: "Assessment" },
];

/**
 * Section rail. The results run long; without this a reader scrolls blind.
 * Marks the section currently in view rather than merely linking to it.
 */
export function SectionRail() {
  const [active, setActive] = useState("overview");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Sections"
      className="sticky top-0 z-30 -mx-4 mb-2 border-b border-rule bg-ink/85 px-4 backdrop-blur-md"
    >
      <ul className="flex gap-1 overflow-x-auto py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SECTIONS.map((s) => {
          const isActive = active === s.id;
          return (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                aria-current={isActive ? "true" : undefined}
                className={`block rounded-full px-3 py-1 font-data text-[11px] uppercase tracking-[0.14em] transition-colors ${
                  isActive
                    ? "bg-saffron/12 text-saffron"
                    : "text-parchment-faint hover:text-parchment-dim"
                }`}
              >
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
