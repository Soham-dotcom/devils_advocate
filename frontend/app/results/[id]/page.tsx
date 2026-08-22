"use client";

import { useLayoutEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { FullCaseAnalysisResponse, CaseInput } from "@/types";
import { CaseOverview } from "@/components/results/CaseOverview";
import { CaseHeader, SectionRail } from "@/components/results/CaseHeader";
import { AdvocacyPanel } from "@/components/results/AdvocacyPanel";
import { EvidenceAudit } from "@/components/results/EvidenceAudit";
import { Contradictions } from "@/components/results/Contradictions";
import { SimilarCases } from "@/components/results/SimilarCases";
import { JudgmentPanel } from "@/components/results/JudgmentPanel";
import { AgentCard } from "@/components/results/AgentCard";
import {
  DegradedBanner,
  StageUnavailable,
} from "@/components/results/DegradedBanner";
import { ErrorState } from "@/components/results/ErrorState";
import { LoadingScreen } from "@/components/results/LoadingScreen";
import { submitAnalysis } from "@/utils/api";

export default function ResultsPage() {
  const router = useRouter();
  const params = useParams();
  const analysisId = params.id as string;

  const [data, setData] = useState<{
    input: CaseInput;
    result: FullCaseAnalysisResponse;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useLayoutEffect(() => {
    try {
      const storedData = sessionStorage.getItem(`analysis-${analysisId}`);
      if (!storedData) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setError("Analysis data not found. Please start a new analysis.");
        setIsLoading(false);
        return;
      }

      const parsed = JSON.parse(storedData);
      if (!parsed.result) {
        setError("Analysis results not found. Please start a new analysis.");
        setIsLoading(false);
        return;
      }

      setData({ input: parsed.input, result: parsed.result });
      setIsLoading(false);
    } catch {
      setError("Failed to load analysis results.");
      setIsLoading(false);
    }
  }, [analysisId]);

  if (isLoading) return <LoadingScreen />;
  if (error || !data) return <ErrorState error={error || "Unknown error"} />;

  const { input, result } = data;

  const handleReanalyze = () => {
    sessionStorage.setItem(`case-draft`, JSON.stringify(input));
    router.push(`/submit?edit=true`);
  };

  /** The failure record for one stage, so its panel can explain itself. */
  const failureFor = (stage: string) =>
    result.degraded?.failed_stages.find((f) => f.stage === stage);

  /** Re-run the whole analysis against the stored case, in place. */
  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const fresh = await submitAnalysis(input);
      sessionStorage.setItem(
        `analysis-${analysisId}`,
        JSON.stringify({
          input,
          result: fresh,
          status: fresh.status,
          createdAt: new Date().toISOString(),
        })
      );
      setData({ input, result: fresh });
    } catch {
      // Keep the partial results on screen — losing them would be a worse
      // outcome than a failed retry. The banner stays and can be retried again.
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink">
      <div className="mx-auto max-w-5xl px-5">
        <CaseHeader input={input} issues={result.issues} />
        <SectionRail />

        {/* Leads the page when anything failed — a reader must not have to
            infer completeness from the content. */}
        <DegradedBanner
          degraded={result.degraded}
          retrievalWorked={(result.similar_cases?.cases?.length ?? 0) > 0}
          onRetry={handleRetry}
          isRetrying={isRetrying}
        />

        {result.issues ? (
          <CaseOverview data={result.issues} />
        ) : (
          <StageUnavailable title="Case Overview" failure={failureFor("issues")} />
        )}

        {result.appellant_case && result.respondent_case ? (
          <AdvocacyPanel
            appellant={result.appellant_case}
            respondent={result.respondent_case}
          />
        ) : (
          <StageUnavailable
            title="The Two Cases"
            failure={failureFor("appellant") ?? failureFor("respondent")}
          />
        )}

        {result.evidence_audit ? (
          <EvidenceAudit data={result.evidence_audit} />
        ) : (
          <StageUnavailable title="Evidence Audit" failure={failureFor("evidence")} />
        )}

        {result.contradictions ? (
          <Contradictions data={result.contradictions} />
        ) : (
          <StageUnavailable
            title="Points of Direct Conflict"
            failure={failureFor("contradictions")}
          />
        )}

        {/* Runs locally, so it commonly survives when the LLM stages fail. */}
        <SimilarCases data={result.similar_cases} />

        {result.judgment ? (
          <JudgmentPanel data={result.judgment} />
        ) : (
          <StageUnavailable title="Assessment" failure={failureFor("judgment")} />
        )}

        {/* Appendix. Deliberately quiet — this is the working, not the finding. */}
        <div className="border-t border-rule py-12">
          <p className="eyebrow mb-4">Appendix · raw agent output</p>
          {/* Only stages that produced output get a card. A failed stage has
              nothing to show, and rendering `null` as "null" would be noise. */}
          <div className="space-y-3">
            {(
              [
                ["Issue Spotter", "🔍", result.issues],
                ["Appellant's Advocate", "⚔️", result.appellant_case],
                ["Respondent's Advocate", "🛡️", result.respondent_case],
                ["Evidence Auditor", "📋", result.evidence_audit],
                ["Contradiction Finder", "⚡", result.contradictions],
                ["Similar Case Retrieval", "⚖️", result.similar_cases],
                ["Judge", "👨‍⚖️", result.judgment],
              ] as const
            )
              .filter(([, , content]) => content != null)
              .map(([title, icon, content]) => (
                <AgentCard
                  key={title}
                  title={title}
                  icon={icon}
                  content={content}
                  rawJson={JSON.stringify(content, null, 2)}
                />
              ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-rule py-12 sm:flex-row sm:justify-center">
          <button
            onClick={handleReanalyze}
            className="rounded-full bg-saffron px-7 py-2.5 font-data text-xs uppercase tracking-[0.16em] text-ink transition-opacity hover:opacity-90"
          >
            Edit and re-analyse
          </button>
          <Link
            href="/"
            className="rounded-full border border-rule-bright px-7 py-2.5 text-center font-data text-xs uppercase tracking-[0.16em] text-parchment-dim transition-colors hover:border-parchment-faint hover:text-parchment"
          >
            Analyse another case
          </Link>
        </div>
      </div>
    </div>
  );
}
