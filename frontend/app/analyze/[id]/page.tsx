"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { LoadingScreen } from "@/components/results/LoadingScreen";
import { ErrorState } from "@/components/results/ErrorState";
import { CaseInput, FullCaseAnalysisResponse } from "@/types";
import { ApiError, submitAnalysis } from "@/utils/api";

export default function AnalyzePage() {
  const router = useRouter();
  const params = useParams();
  const analysisId = params.id as string;

  const [error, setError] = useState<ApiError | string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  // Guards against React 18 StrictMode double-invoking the effect and firing
  // two analyses (six Gemini calls each) for one submission.
  const started = useRef(false);

  const runAnalysis = useCallback(async () => {
    setError(null);
    try {
      const storedData = sessionStorage.getItem(`analysis-${analysisId}`);
      if (!storedData) {
        // Reloading cannot restore sessionStorage, so offering "try again" here
        // would be a recovery path that provably cannot work. Send them back to
        // the form instead.
        setError(
          new ApiError(
            "validation",
            "This analysis is no longer available.",
            "Analyses are kept only for the current browser tab. Submit the case again to run a fresh analysis."
          )
        );
        return;
      }

      const { input } = JSON.parse(storedData);
      const caseInput: CaseInput = input;

      const result: FullCaseAnalysisResponse = await submitAnalysis(caseInput);

      sessionStorage.setItem(
        `analysis-${analysisId}`,
        JSON.stringify({
          input: caseInput,
          result,
          status: result.status,
          createdAt: new Date().toISOString(),
        })
      );

      router.push(`/results/${analysisId}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err
          : err instanceof Error
          ? err.message
          : "Unknown error"
      );
    }
  }, [analysisId, router]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    runAnalysis();
  }, [runAnalysis]);

  const handleRetry = async () => {
    setIsRetrying(true);
    // Re-issue the request rather than reloading the page — a reload re-runs the
    // same failing path with no new information.
    await runAnalysis();
    setIsRetrying(false);
  };

  if (error) {
    return (
      <ErrorState error={error} onRetry={handleRetry} isRetrying={isRetrying} />
    );
  }

  return <LoadingScreen />;
}
