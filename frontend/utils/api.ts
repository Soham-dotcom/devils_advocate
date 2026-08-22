import { CaseInput, FullCaseAnalysisResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** What went wrong, in terms the UI can act on rather than just print. */
export type ApiErrorKind =
  | "offline" // backend unreachable
  | "validation" // 422 — the submitted case was rejected
  | "analysis_failed" // 503 — no stage of the analysis could run
  | "server" // 5xx
  | "unknown";

export class ApiError extends Error {
  kind: ApiErrorKind;
  /** One line the user can act on. */
  recovery: string;
  /** Per-field problems, for validation errors. */
  fieldErrors: { field: string; message: string }[];
  status?: number;

  constructor(
    kind: ApiErrorKind,
    message: string,
    recovery: string,
    opts: {
      fieldErrors?: { field: string; message: string }[];
      status?: number;
    } = {}
  ) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.recovery = recovery;
    this.fieldErrors = opts.fieldErrors ?? [];
    this.status = opts.status;
  }
}

const FIELD_LABELS: Record<string, string> = {
  title: "Case title",
  case_text: "Case text",
  court: "Court",
  case_type: "Case type",
};

/**
 * FastAPI returns 422 `detail` as an array of objects. Passing that straight to
 * `new Error()` produced the literal string "[object Object]" on screen, which
 * told the user nothing about which field was wrong.
 */
function parseValidationDetail(
  detail: unknown
): { field: string; message: string }[] {
  if (!Array.isArray(detail)) return [];
  return detail.map((item) => {
    const loc = Array.isArray(item?.loc) ? item.loc : [];
    const raw = String(loc[loc.length - 1] ?? "field");
    const label = FIELD_LABELS[raw] ?? raw;

    const min = item?.ctx?.min_length;
    const max = item?.ctx?.max_length;
    const actual =
      typeof item?.input === "string" ? item.input.trim().length : undefined;

    if (min !== undefined) {
      return {
        field: label,
        message:
          `needs at least ${min} characters` +
          (actual !== undefined ? ` — you entered ${actual}` : ""),
      };
    }
    if (max !== undefined) {
      return {
        field: label,
        message:
          `must be at most ${max} characters` +
          (actual !== undefined ? ` — you entered ${actual}` : ""),
      };
    }
    if (item?.type === "missing") {
      return { field: label, message: "is required" };
    }
    return { field: label, message: String(item?.msg ?? "is invalid") };
  });
}

export async function submitAnalysis(
  input: CaseInput
): Promise<FullCaseAnalysisResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    // fetch only rejects when the request never reached a server — almost always
    // the backend not running. "Failed to fetch" does not tell anyone that.
    throw new ApiError(
      "offline",
      "Cannot reach the analysis server.",
      `The backend does not appear to be running at ${API_URL}. Start it, then retry.`
    );
  }

  if (response.ok) return response.json();

  let body: { detail?: unknown } = {};
  try {
    body = await response.json();
  } catch {
    /* error response had no JSON body */
  }

  if (response.status === 422) {
    const fieldErrors = parseValidationDetail(body.detail);
    throw new ApiError(
      "validation",
      "The case could not be submitted.",
      "Go back and correct the highlighted fields.",
      { fieldErrors, status: 422 }
    );
  }

  if (response.status === 503 && typeof body.detail === "object" && body.detail) {
    const d = body.detail as { message?: string; recovery?: string };
    throw new ApiError(
      "analysis_failed",
      d.message ?? "No stage of the analysis could run.",
      d.recovery ?? "Retry in a moment.",
      { status: 503 }
    );
  }

  const detail =
    typeof body.detail === "string" ? body.detail : response.statusText;
  throw new ApiError(
    response.status >= 500 ? "server" : "unknown",
    `The server returned an error (${response.status}).`,
    detail || "Retry, and check the backend logs if it keeps happening.",
    { status: response.status }
  );
}

export async function rerunAnalysis(
  input: CaseInput
): Promise<FullCaseAnalysisResponse> {
  return submitAnalysis(input);
}

/** Whether the judgment corpus is loaded, and how many judgments it holds. */
export async function getCorpusStatus(): Promise<{
  available: boolean;
  judgments: number;
  reason?: string;
}> {
  try {
    const response = await fetch(`${API_URL}/api/corpus`);
    if (!response.ok) throw new Error(response.statusText);
    return response.json();
  } catch (error) {
    return {
      available: false,
      judgments: 0,
      reason: error instanceof Error ? error.message : "unreachable",
    };
  }
}

export function getApiUrl(): string {
  return API_URL;
}
