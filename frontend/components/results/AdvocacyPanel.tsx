"use client";

import type { AdvocacySchema, ArgumentSchema } from "@/types";

/**
 * The versus axis — this page's signature.
 *
 * Every Indian case is titled "X vs Y", and this product's whole idea is two
 * sides arguing. So the dispute is drawn as a literal vertical spine with
 * arguments hanging off it alternately, appellant left and respondent right.
 * The axis is the structure, not an ornament: reading down it is reading the
 * exchange in order.
 *
 * On narrow screens the spine moves to the left edge and both sides stack
 * against it, keeping the thread while dropping the mirroring.
 */

const STRENGTH_RANK: Record<string, number> = { strong: 3, moderate: 2, weak: 1 };

function StrengthMark({ strength, side }: { strength: string; side: Side }) {
  const rank = STRENGTH_RANK[strength?.toLowerCase()] ?? 1;
  const color = side === "appellant" ? "bg-appellant" : "bg-respondent";
  return (
    <span
      className="inline-flex items-center gap-[3px] align-middle"
      title={`${strength} argument`}
    >
      <span className="sr-only">{strength} argument</span>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          aria-hidden
          className={`h-[3px] w-2.5 rounded-full ${
            i <= rank ? color : "bg-rule-bright"
          }`}
        />
      ))}
    </span>
  );
}

type Side = "appellant" | "respondent";

function Argument({
  arg,
  side,
  index,
  delay,
}: {
  arg: ArgumentSchema;
  side: Side;
  index: number;
  delay: number;
}) {
  const isAppellant = side === "appellant";
  const accent = isAppellant ? "text-appellant" : "text-respondent";
  const edge = isAppellant
    ? "sm:border-r-2 sm:pr-5 sm:text-right sm:items-end"
    : "sm:border-l-2 sm:pl-5 sm:text-left sm:items-start";
  const edgeColor = isAppellant
    ? "sm:border-r-appellant/40"
    : "sm:border-l-respondent/40";

  return (
    <li
      className={`relative flex ${
        isAppellant ? "sm:col-start-1 sm:justify-end" : "sm:col-start-2"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={`${
          isAppellant ? "argue-left" : "argue-right"
        } flex w-full flex-col gap-1.5 border-l-2 border-rule pl-4 ${edge} ${edgeColor} sm:border-l-0`}
        style={{ animationDelay: `${delay}ms` }}
      >
        <div
          className={`flex items-center gap-2 ${
            isAppellant ? "sm:flex-row-reverse" : ""
          }`}
        >
          <span className={`font-data text-[10px] ${accent} opacity-70`}>
            {isAppellant ? "A" : "R"}
            {index + 1}
          </span>
          <StrengthMark strength={arg.strength} side={side} />
        </div>

        <p className="text-parchment text-[0.9375rem] leading-snug">
          {arg.claim}
        </p>
        <p className="text-parchment-dim text-[0.8125rem] leading-relaxed">
          {arg.support}
        </p>
      </div>
    </li>
  );
}

function SideHeader({ data, side }: { data: AdvocacySchema; side: Side }) {
  const isAppellant = side === "appellant";
  return (
    <div className={isAppellant ? "sm:text-right" : "sm:text-left"}>
      <p
        className={`eyebrow ${
          isAppellant ? "text-appellant" : "text-respondent"
        } opacity-80`}
      >
        {isAppellant ? "For the appellant" : "For the respondent"}
      </p>
      <p className="mt-2 font-display text-lg leading-tight text-parchment">
        {data.position}
      </p>
    </div>
  );
}

function EndNote({ data, side }: { data: AdvocacySchema; side: Side }) {
  const isAppellant = side === "appellant";
  return (
    <div
      className={`space-y-3 border-l-2 border-rule pl-4 sm:border-l-0 sm:pl-0 ${
        isAppellant ? "sm:border-r-2 sm:border-r-rule sm:pr-4 sm:text-right" : "sm:border-l-2 sm:border-l-rule sm:pl-4"
      }`}
    >
      <div>
        <p className="eyebrow">Strongest</p>
        <p className="mt-1 text-[0.8125rem] leading-snug text-parchment">
          {data.strongest_point}
        </p>
      </div>
      <div>
        <p className="eyebrow">Weakest</p>
        <p className="mt-1 text-[0.8125rem] leading-snug text-parchment-dim">
          {data.weakest_point}
        </p>
      </div>
    </div>
  );
}

export function AdvocacyPanel({
  appellant,
  respondent,
}: {
  appellant: AdvocacySchema;
  respondent: AdvocacySchema;
}) {
  // Interleave the two sides so reading down the axis reads as an exchange:
  // appellant, respondent, appellant, respondent.
  const rounds = Math.max(
    appellant.arguments?.length ?? 0,
    respondent.arguments?.length ?? 0
  );
  const exchange: { arg: ArgumentSchema; side: Side; index: number }[] = [];
  for (let i = 0; i < rounds; i++) {
    if (appellant.arguments?.[i])
      exchange.push({ arg: appellant.arguments[i], side: "appellant", index: i });
    if (respondent.arguments?.[i])
      exchange.push({ arg: respondent.arguments[i], side: "respondent", index: i });
  }

  return (
    <section id="arguments" className="scroll-mt-24 py-16">
      <header className="mb-12 text-center">
        <p className="eyebrow">The exchange</p>
        <h2 className="mt-3 font-display text-4xl text-parchment sm:text-5xl">
          Both sides, argued at their strongest
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-parchment-dim">
          Each advocate names its own weakest point, because the other side will
          find it anyway.
        </p>
      </header>

      <div className="relative">
        {/* The spine. Left-aligned on mobile, centred from sm up. */}
        <div
          aria-hidden
          className="axis-line absolute bottom-0 left-0 top-0 w-px bg-gradient-to-b from-transparent via-rule-bright to-transparent sm:left-1/2 sm:-translate-x-1/2"
        />

        <div className="grid gap-y-8 sm:grid-cols-2 sm:gap-x-12">
          <SideHeader data={appellant} side="appellant" />
          <SideHeader data={respondent} side="respondent" />
        </div>

        {/* The versus mark sits on the axis, between the positions and the
            arguments — the point the whole page turns on. */}
        <div className="relative my-10 flex justify-start sm:justify-center">
          <span className="rise-in -ml-[9px] rounded-full border border-rule-bright bg-ink px-3 py-1 font-display text-sm italic text-saffron sm:ml-0">
            versus
          </span>
        </div>

        <ol className="grid gap-y-8 sm:grid-cols-2 sm:gap-x-12">
          {exchange.map((e, i) => (
            <Argument
              key={`${e.side}-${e.index}`}
              arg={e.arg}
              side={e.side}
              index={e.index}
              delay={200 + i * 130}
            />
          ))}
        </ol>

        <div className="mt-12 grid gap-y-8 sm:grid-cols-2 sm:gap-x-12">
          <EndNote data={appellant} side="appellant" />
          <EndNote data={respondent} side="respondent" />
        </div>
      </div>
    </section>
  );
}
