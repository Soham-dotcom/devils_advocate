"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CaseForm } from "@/components/form/CaseForm";
import { CaseInput } from "@/types";
import { getCorpusStatus } from "@/utils/api";

export default function SubmitPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [draft, setDraft] = useState<CaseInput | undefined>();
  const [ready, setReady] = useState(false);
  const [corpus, setCorpus] = useState<{
    available: boolean;
    judgments: number;
  } | null>(null);

  // Restore a draft when arriving from "Edit & Re-analyze".
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("case-draft");
      if (stored) setDraft(JSON.parse(stored));
    } catch {
      /* ignore an unreadable draft */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    getCorpusStatus().then(setCorpus);
  }, []);

  const handleSubmit = (data: CaseInput) => {
    setIsLoading(true);
    const analysisId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    sessionStorage.setItem(
      `analysis-${analysisId}`,
      JSON.stringify({
        input: data,
        status: "submitting",
        createdAt: new Date().toISOString(),
      })
    );
    sessionStorage.removeItem("case-draft");
    router.push(`/analyze/${analysisId}`);
  };

  return (
    <div className="bg-ink min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-parchment mb-2">
            Analyze a case
          </h1>
          <p className="text-parchment-dim">
            Six agents read the case, argue both sides, audit the evidence, and
            surface similar past judgments.
          </p>

          {corpus && (
            <p className="mt-3 text-xs text-parchment-faint">
              {corpus.available ? (
                <>
                  <span className="text-supported">●</span>{" "}
                  {corpus.judgments.toLocaleString()} Supreme Court judgments
                  indexed for similar-case search
                </>
              ) : (
                <>
                  <span className="text-saffron">●</span> Similar-case search
                  unavailable — the rest of the analysis will still run
                </>
              )}
            </p>
          )}
        </div>

        <div className="bg-ink border border-rule rounded-xl p-6">
          {ready && (
            <CaseForm
              initialData={draft}
              onSubmit={handleSubmit}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
