"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// WebGL must not run during SSR.
const AnalysisScene = dynamic(
  () => import("./AnalysisScene").then((m) => m.AnalysisScene),
  { ssr: false }
);

/**
 * The pipeline in execution order, with rough durations used only for pacing.
 * The backend returns the whole analysis in one response, so there is no live
 * per-stage status — this is labelled as the expected sequence rather than
 * presented as a real-time feed.
 */
const STAGES = [
  { name: "Issue Spotter", detail: "Extracting issues, facts and dates", secs: 14 },
  { name: "Appellant's Advocate", detail: "Building the case for one side", secs: 16 },
  { name: "Respondent's Advocate", detail: "Rebutting, point by point", secs: 16 },
  { name: "Evidence Auditor", detail: "Checking what the record supports", secs: 15 },
  { name: "Contradiction Finder", detail: "Locating direct conflicts", secs: 12 },
  { name: "Similar Judgments", detail: "Searching 2,399 Supreme Court judgments", secs: 3 },
  { name: "Judge", detail: "Synthesising the assessment", secs: 14 },
];

const TOTAL = STAGES.reduce((a, s) => a + s.secs, 0);

export function LoadingScreen() {
  const [elapsed, setElapsed] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    const timer = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => {
      clearInterval(timer);
      mq.removeEventListener("change", onChange);
    };
  }, []);

  let cumulative = 0;
  let activeIndex = STAGES.length - 1;
  for (let i = 0; i < STAGES.length; i++) {
    cumulative += STAGES[i].secs;
    if (elapsed < cumulative) {
      activeIndex = i;
      break;
    }
  }

  const progress = Math.min(1, elapsed / TOTAL);
  const stepAngle = 360 / STAGES.length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink">
      {/* Layer 1 — WebGL, behind everything, non-interactive. */}
      {!reduced && <AnalysisScene progress={progress} />}

      {/* Keeps the type legible over the scene. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/40 to-ink"
      />

      {/* Layer 2 — content. An explicit two-column grid on lg, stacked below,
          so the ring and the stage list can never collide. */}
      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-5 py-16 lg:min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-16">
        {/* --- The 3D stage ring --------------------------------------- */}
        <div className="flex items-center justify-center">
          <div
            className="relative h-[19rem] w-full max-w-md sm:h-[23rem]"
            style={{ perspective: "1100px" }}
          >
            <div
              className="absolute inset-0 transition-transform duration-700 ease-out"
              style={{
                transformStyle: "preserve-3d",
                transform: `rotateX(-14deg) rotateY(${-activeIndex * stepAngle}deg)`,
              }}
            >
              {STAGES.map((stage, i) => {
                const done = i < activeIndex;
                const active = i === activeIndex;
                return (
                  <div
                    key={stage.name}
                    className="absolute left-1/2 top-1/2 w-52 -translate-x-1/2 -translate-y-1/2"
                    style={{
                      transformStyle: "preserve-3d",
                      transform: `rotateY(${i * stepAngle}deg) translateZ(15rem)`,
                    }}
                  >
                    <div
                      className={`rounded-xl border p-4 backdrop-blur-sm transition-all duration-500 ${
                        active
                          ? "border-saffron/60 bg-file-raised/90 shadow-[0_0_40px_-8px] shadow-saffron/40"
                          : done
                            ? "border-rule bg-file/70"
                            : "border-rule/60 bg-file/40"
                      }`}
                      style={{
                        opacity: active ? 1 : done ? 0.72 : 0.38,
                        transform: active ? "scale(1.06)" : "scale(1)",
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-data text-[10px] uppercase tracking-[0.18em] text-parchment-faint">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {done && (
                          <span className="text-supported text-sm leading-none">✓</span>
                        )}
                        {active && (
                          <span className="h-2 w-2 animate-pulse rounded-full bg-saffron" />
                        )}
                      </div>
                      <p
                        className={`mt-2 font-display text-lg leading-tight ${
                          active ? "text-parchment" : "text-parchment-dim"
                        }`}
                      >
                        {stage.name}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* --- Status column -------------------------------------------- */}
        <div className="w-full">
          <Badge
            variant="outline"
            className="border-saffron/40 bg-saffron/10 font-data text-[10px] uppercase tracking-[0.18em] text-saffron"
          >
            Analysis running
          </Badge>

          <h1 className="mt-4 font-display text-4xl leading-tight text-parchment sm:text-5xl">
            {STAGES[activeIndex].name}
          </h1>
          <p className="mt-2 text-sm text-parchment-dim">
            {STAGES[activeIndex].detail}
          </p>

          <div className="mt-7">
            <div className="mb-2 flex items-baseline justify-between font-data text-[11px] uppercase tracking-[0.16em] text-parchment-faint">
              <span>
                Stage {activeIndex + 1} of {STAGES.length}
              </span>
              <span className="tabular-nums">
                {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
              </span>
            </div>
            <Progress value={progress * 100} className="h-1.5 bg-rule" />
          </div>

          <Separator className="my-7 bg-rule" />

          <ol className="space-y-2.5" aria-live="polite">
            {STAGES.map((stage, i) => {
              const done = i < activeIndex;
              const active = i === activeIndex;
              return (
                <li key={stage.name} className="flex items-center gap-3">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                      done
                        ? "border-supported/50 bg-supported/15 text-supported"
                        : active
                          ? "border-saffron bg-saffron/15 text-saffron"
                          : "border-rule text-parchment-faint"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span
                    className={`text-sm ${
                      active
                        ? "text-parchment"
                        : done
                          ? "text-parchment-dim"
                          : "text-parchment-faint"
                    }`}
                  >
                    {stage.name}
                  </span>
                </li>
              );
            })}
          </ol>

          <p className="mt-7 text-xs leading-relaxed text-parchment-faint">
            Stage highlighting follows the expected timing, not a live feed — the
            backend returns the full analysis in one response. Usually about{" "}
            {TOTAL} seconds.
          </p>
        </div>
      </div>
    </div>
  );
}
