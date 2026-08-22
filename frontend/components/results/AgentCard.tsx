"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AgentCardProps {
  title: string;
  icon: string;
  content: unknown;
  rawJson?: string;
}

function renderContent(obj: unknown): React.ReactNode {
  if (Array.isArray(obj)) {
    return (
      <ul className="ml-3 space-y-1.5">
        {obj.map((item, idx) => (
          <li key={idx} className="flex gap-2 text-sm text-parchment-dim">
            <span aria-hidden className="text-parchment-faint">·</span>
            <span>{renderContent(item)}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (typeof obj === "object" && obj !== null) {
    return (
      <div className="ml-3 space-y-2">
        {Object.entries(obj).map(([key, value]) => (
          <div key={key}>
            <p className="eyebrow">{key.replace(/_/g, " ")}</p>
            <div className="mt-1">{renderContent(value)}</div>
          </div>
        ))}
      </div>
    );
  }

  return String(obj);
}

/** One agent's raw output. Collapsed by default — this is the working, not the
 *  finding, so it should never compete with the panels above it. */
export function AgentCard({ title, icon, content, rawJson }: AgentCardProps) {
  const [showRaw, setShowRaw] = useState(false);

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem
        value={title}
        className="rounded-lg border border-rule bg-file px-4"
      >
        <AccordionTrigger className="hover:no-underline">
          <span className="flex items-center gap-3">
            <span aria-hidden className="text-lg">
              {icon}
            </span>
            <span className="font-display text-base text-parchment">{title}</span>
          </span>
        </AccordionTrigger>

        <AccordionContent>
          {showRaw && rawJson ? (
            <ScrollArea className="h-72 rounded border border-rule bg-ink">
              <pre className="p-3 font-data text-[11px] leading-relaxed text-parchment-dim">
                {rawJson}
              </pre>
            </ScrollArea>
          ) : (
            <div className="text-sm text-parchment-dim">{renderContent(content)}</div>
          )}

          {rawJson && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRaw(!showRaw)}
              className="mt-3 font-data text-[10px] uppercase tracking-[0.14em] text-parchment-faint hover:text-parchment"
            >
              {showRaw ? "Show summary" : "Show JSON"}
            </Button>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
