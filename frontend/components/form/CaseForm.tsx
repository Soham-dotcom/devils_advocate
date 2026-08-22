"use client";

import { useState } from "react";
import type { CaseInput } from "@/types";

const MIN_TITLE = 5;
const MIN_TEXT = 200;
const MAX_TEXT = 60000;

interface CaseFormProps {
  initialData?: CaseInput;
  onSubmit: (data: CaseInput) => void;
  isLoading?: boolean;
}

type Touched = Partial<Record<keyof CaseInput, boolean>>;

export function CaseForm({ initialData, onSubmit, isLoading }: CaseFormProps) {
  const [form, setForm] = useState<CaseInput>(
    initialData ?? {
      title: "",
      case_text: "",
      court: "",
      case_type: "",
      party_represented: "",
      notes: "",
    }
  );
  const [touched, setTouched] = useState<Touched>({});

  const titleError =
    form.title.trim().length < MIN_TITLE
      ? `Needs at least ${MIN_TITLE} characters`
      : null;

  const textLength = form.case_text.trim().length;
  const textError =
    textLength < MIN_TEXT
      ? `Needs at least ${MIN_TEXT} characters — currently ${textLength}`
      : textLength > MAX_TEXT
      ? `Too long by ${textLength - MAX_TEXT} characters`
      : null;

  const isValid = !titleError && !textError;

  const set = (key: keyof CaseInput) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const markTouched = (key: keyof CaseInput) => () =>
    setTouched((t) => ({ ...t, [key]: true }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ title: true, case_text: true });
    if (isValid && !isLoading) onSubmit(form);
  };

  const inputClass =
    "w-full px-3 py-2 rounded-lg bg-ink border border-rule text-parchment " +
    "placeholder:text-parchment-faint focus:outline-none focus:ring-2 focus:ring-saffron " +
    "focus:border-transparent transition-shadow";

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-parchment mb-1"
        >
          Case title <span className="text-rose">*</span>
        </label>
        <input
          id="title"
          value={form.title}
          onChange={(e) => set("title")(e.target.value)}
          onBlur={markTouched("title")}
          placeholder="e.g. Sharma vs State of Maharashtra"
          className={inputClass}
          aria-invalid={touched.title && !!titleError}
          aria-describedby={titleError ? "title-error" : undefined}
        />
        {touched.title && titleError && (
          <p id="title-error" className="mt-1 text-xs text-rose">
            {titleError}
          </p>
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1">
          <label
            htmlFor="case_text"
            className="block text-sm font-medium text-parchment"
          >
            Case text <span className="text-rose">*</span>
          </label>
          <span
            className={`text-xs tabular-nums ${
              textLength > MAX_TEXT ? "text-rose" : "text-parchment-faint"
            }`}
          >
            {textLength.toLocaleString()} / {MAX_TEXT.toLocaleString()}
          </span>
        </div>
        <textarea
          id="case_text"
          value={form.case_text}
          onChange={(e) => set("case_text")(e.target.value)}
          onBlur={markTouched("case_text")}
          rows={14}
          placeholder="Paste the full text of the judgment, petition, or case summary here. The more complete the text, the better the analysis and the similar-case matching."
          className={`${inputClass} font-mono text-sm leading-relaxed resize-y`}
          aria-invalid={touched.case_text && !!textError}
          aria-describedby={textError ? "text-error" : "text-hint"}
        />
        {touched.case_text && textError ? (
          <p id="text-error" className="mt-1 text-xs text-rose">
            {textError}
          </p>
        ) : (
          <p id="text-hint" className="mt-1 text-xs text-parchment-faint">
            Longer text gives the agents more to work with and improves
            similar-case retrieval.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label
            htmlFor="court"
            className="block text-sm font-medium text-parchment mb-1"
          >
            Court
          </label>
          <input
            id="court"
            value={form.court ?? ""}
            onChange={(e) => set("court")(e.target.value)}
            placeholder="Supreme Court of India"
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor="case_type"
            className="block text-sm font-medium text-parchment mb-1"
          >
            Case type
          </label>
          <select
            id="case_type"
            value={form.case_type ?? ""}
            onChange={(e) => set("case_type")(e.target.value)}
            className={inputClass}
          >
            <option value="">Select…</option>
            <option value="Criminal">Criminal</option>
            <option value="Civil">Civil</option>
            <option value="Constitutional">Constitutional</option>
            <option value="Family">Family</option>
            <option value="Commercial">Commercial</option>
            <option value="Tax">Tax</option>
            <option value="Service">Service</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="party_represented"
            className="block text-sm font-medium text-parchment mb-1"
          >
            You represent
          </label>
          <select
            id="party_represented"
            value={form.party_represented ?? ""}
            onChange={(e) => set("party_represented")(e.target.value)}
            className={inputClass}
          >
            <option value="">Neither / researching</option>
            <option value="Appellant">Appellant / Petitioner</option>
            <option value="Respondent">Respondent / Defendant</option>
          </select>
        </div>
      </div>

      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-parchment mb-1"
        >
          Notes <span className="text-parchment-faint font-normal">(optional)</span>
        </label>
        <textarea
          id="notes"
          value={form.notes ?? ""}
          onChange={(e) => set("notes")(e.target.value)}
          rows={2}
          placeholder="Anything specific you want the analysis to focus on"
          className={`${inputClass} resize-y`}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 rounded-lg bg-saffron-dim hover:bg-saffron/80 disabled:bg-file-raised disabled:cursor-not-allowed text-parchment font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
      >
        {isLoading ? "Starting analysis…" : "Analyze this case"}
      </button>

      {!isValid && (touched.title || touched.case_text) && (
        <p className="text-xs text-parchment-faint text-center">
          Fill in the required fields above to continue.
        </p>
      )}
    </form>
  );
}
