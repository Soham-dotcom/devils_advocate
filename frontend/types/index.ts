// Input types
export interface CaseInput {
  title: string;
  case_text: string;
  court?: string;
  case_type?: string;
  party_represented?: string;
  notes?: string;
}

// Agent 1 — Issue Spotter
export interface KeyDateSchema {
  date: string;
  event: string;
}

export interface IssueSchema {
  issue: string;
  why_it_matters: string;
}

export interface IssueAnalysisSchema {
  summary: string;
  issues: IssueSchema[];
  key_facts: string[];
  key_dates: KeyDateSchema[];
  provisions_invoked: string[];
}

// Agents 2 & 3 — the two advocates
export interface ArgumentSchema {
  claim: string;
  support: string;
  strength: string;
}

export interface AdvocacySchema {
  position: string;
  arguments: ArgumentSchema[];
  strongest_point: string;
  weakest_point: string;
}

// Agent 4 — Evidence Auditor
export interface EvidenceItemSchema {
  claim: string;
  evidence_status: "supported" | "partial" | "unsupported" | string;
  note: string;
}

export interface EvidenceAuditSchema {
  items: EvidenceItemSchema[];
  summary: string;
}

// Agent 5 — Contradiction Finder
export interface ContradictionSchema {
  topic: string;
  appellant_position: string;
  respondent_position: string;
  nature: string;
}

export interface ContradictionAnalysisSchema {
  contradictions: ContradictionSchema[];
  summary: string;
}

// ML — similar case retrieval
export interface MatchBreakdown {
  final_score: number;
  semantic: number;
  doc_similarity: number;
  issue_similarity: number;
  statute_overlap: number;
  shared_statutes: string[];
  matched_on: "both" | "semantic" | "statutes" | string;
}

export interface SimilarCase {
  case_id: string;
  title?: string | null;
  court?: string | null;
  jurisdiction?: string | null;
  case_number?: string | null;
  judgment_date?: string | null;
  year?: number | null;
  bench: string[];
  excerpt?: string | null;
  source_url?: string | null;
  breakdown: MatchBreakdown;
  is_weak: boolean;
}

export interface SimilarCasesSchema {
  cases: SimilarCase[];
  weak_only: boolean;
  /** Populated only when `cases` is empty — carries the empty/error message. */
  reason?: string | null;
  elapsed_ms: number;
  query_statutes: string[];
}

// Agent 6 — Judge
export interface CaseScoresSchema {
  appellant_strength: number;
  respondent_strength: number;
  evidence_quality: number;
  complexity: number;
  overall_clarity: number;
}

export interface JudgmentSchema {
  scores: CaseScoresSchema;
  leaning: string;
  reasoning: string;
  key_considerations: string[];
}

// Degraded runs
export interface StageFailure {
  stage: string;
  label: string;
  category: "rate_limit" | "auth" | "network" | "invalid_output" | "unknown" | string;
  message: string;
  recovery: string;
}

export interface DegradedInfo {
  failed_stages: StageFailure[];
  completed: number;
  total: number;
  /** Set when every failure shares one cause, so the UI can say it once. */
  uniform_cause?: string | null;
}

// Full response
export interface FullCaseAnalysisResponse {
  /** "complete" — every stage ran. "partial" — see `degraded`. */
  status: "complete" | "partial";
  case: CaseInput;

  /** Null when that stage could not run. Never placeholder content. */
  issues?: IssueAnalysisSchema | null;
  appellant_case?: AdvocacySchema | null;
  respondent_case?: AdvocacySchema | null;
  evidence_audit?: EvidenceAuditSchema | null;
  contradictions?: ContradictionAnalysisSchema | null;
  judgment?: JudgmentSchema | null;

  /** Retrieval is local, so this often survives when the LLM stages fail. */
  similar_cases?: SimilarCasesSchema | null;

  /** Present only on a partial run. */
  degraded?: DegradedInfo | null;
}

// Analysis state
export type AnalysisState =
  | "idle"
  | "submitting"
  | "analyzing"
  | "complete"
  | "error";

export interface StoredAnalysis {
  id: string;
  input: CaseInput;
  response: FullCaseAnalysisResponse;
  createdAt: Date;
}
