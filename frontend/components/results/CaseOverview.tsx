"use client";

import type { IssueAnalysisSchema } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

/**
 * Three views of the same record, tabbed rather than stacked. Stacking made the
 * reader scroll past two panels to reach the third; tabs put them a click apart
 * and keep the section a fixed height, which is also what stops this colliding
 * with the axis section below it.
 */
export function CaseOverview({ data }: { data: IssueAnalysisSchema }) {
  const counts = {
    issues: data.issues?.length ?? 0,
    facts: data.key_facts?.length ?? 0,
    dates: data.key_dates?.length ?? 0,
  };

  return (
    <section id="overview" className="scroll-mt-24 py-16">
      <p className="eyebrow">The record</p>
      <h2 className="mt-3 font-display text-4xl text-parchment sm:text-5xl">
        What this case is about
      </h2>

      <Card className="mt-8 min-w-0 border-rule bg-file">
        <CardContent className="pt-6">
          <p className="leading-relaxed text-parchment">{data.summary}</p>

          {data.provisions_invoked?.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {data.provisions_invoked.map((p) => (
                <span key={p} className="cite">
                  {p}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="issues" className="mt-6 w-full min-w-0">
        <TabsList className="bg-file-raised">
          <TabsTrigger value="issues" className="font-data text-xs uppercase tracking-[0.12em]">
            Issues
            <Badge variant="secondary" className="ml-2 bg-rule text-parchment-dim">
              {counts.issues}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="facts" className="font-data text-xs uppercase tracking-[0.12em]">
            Facts
            <Badge variant="secondary" className="ml-2 bg-rule text-parchment-dim">
              {counts.facts}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="font-data text-xs uppercase tracking-[0.12em]">
            Timeline
            <Badge variant="secondary" className="ml-2 bg-rule text-parchment-dim">
              {counts.dates}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="issues" className="min-w-0">
          <Card className="min-w-0 border-rule bg-file">
            <CardContent className="pt-6">
              {counts.issues ? (
                <ol className="space-y-5">
                  {data.issues.map((item, i) => (
                    <li key={i} className="border-l-2 border-saffron/40 pl-4">
                      <p className="font-display text-lg leading-snug text-parchment break-words">
                        {item.issue}
                      </p>
                      <p className="mt-1 text-sm text-parchment-dim">
                        {item.why_it_matters}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-parchment-faint">No issues identified.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="facts" className="min-w-0">
          <Card className="min-w-0 border-rule bg-file">
            <CardContent className="pt-6">
              {counts.facts ? (
                <ul className="space-y-2.5">
                  {data.key_facts.map((f, i) => (
                    <li key={i} className="flex gap-3 text-sm text-parchment">
                      <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-saffron" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-parchment-faint">No facts extracted.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="min-w-0">
          <Card className="min-w-0 border-rule bg-file">
            <CardContent className="pt-6">
              {counts.dates ? (
                <ol className="relative ml-2 space-y-5 border-l border-rule">
                  {data.key_dates.map((d, i) => (
                    <li key={i} className="ml-5">
                      <span
                        aria-hidden
                        className="absolute -left-[5px] mt-[6px] h-2.5 w-2.5 rounded-full border-2 border-ink bg-saffron"
                      />
                      <p className="font-data text-xs text-saffron">{d.date}</p>
                      <p className="mt-0.5 text-sm text-parchment">{d.event}</p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-parchment-faint">No dates extracted.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  );
}
