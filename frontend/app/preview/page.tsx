"use client";

/**
 * TEMPORARY design-review harness.
 *
 * Renders the results components against fixture data so the page can be seen
 * without running a live analysis (which costs 6 of 20 daily API requests).
 * Delete this route once the design is settled.
 */
import { CaseHeader, SectionRail } from "@/components/results/CaseHeader";
import { CaseOverview } from "@/components/results/CaseOverview";
import { AdvocacyPanel } from "@/components/results/AdvocacyPanel";
import { EvidenceAudit } from "@/components/results/EvidenceAudit";
import { Contradictions } from "@/components/results/Contradictions";
import { SimilarCases } from "@/components/results/SimilarCases";
import { JudgmentPanel } from "@/components/results/JudgmentPanel";
import type { CaseInput } from "@/types";

const input: CaseInput = {
  title: "Unmarried major daughter's claim for maintenance",
  case_text: "",
  court: "Supreme Court of India",
  case_type: "Family",
  party_represented: "Appellant",
};

const issues = {
  summary:
    "A 24-year-old unmarried daughter seeks maintenance from her father under Section 125 CrPC, arguing she cannot maintain herself and relying on Section 20(3) of the Hindu Adoptions and Maintenance Act, 1956.",
  issues: [
    {
      issue:
        "Whether an unmarried major daughter, not suffering any physical or mental abnormality, may claim maintenance under Section 125 CrPC",
      why_it_matters:
        "Clause (c) of Section 125(1) appears to confine relief for a major child to cases of abnormality, which would defeat the claim outright.",
    },
    {
      issue:
        "Whether Section 20(3) HAMA can be invoked within summary proceedings under the Code",
      why_it_matters:
        "If the two provisions operate in different fields, the remedy may lie only in a civil suit.",
    },
  ],
  key_facts: [
    "The petitioner is 24, unmarried and unemployed.",
    "She discontinued her education for want of funds.",
    "The respondent is a retired government employee on a limited pension.",
    "Maintenance was granted earlier but only until she attained majority.",
  ],
  key_dates: [
    { date: "12.03.2013", event: "Magistrate partly allows the mother's application" },
    { date: "08.07.2019", event: "Petitioner attains majority; maintenance ceases" },
    { date: "19.09.2021", event: "Revisional Court dismisses the revision" },
    { date: "04.02.2022", event: "High Court declines to interfere under S.482" },
  ],
  provisions_invoked: [
    "Section 125 CrPC",
    "Section 20(3) HAMA 1956",
    "Section 482 CrPC",
  ],
};

const appellant = {
  position:
    "The daughter is entitled to maintenance from her father until she is married.",
  arguments: [
    {
      claim: "Section 20(3) HAMA imposes an unqualified obligation on a father.",
      support:
        "The provision speaks of an unmarried daughter unable to maintain herself, without reference to age or disability.",
      strength: "strong",
    },
    {
      claim:
        "The two provisions operate in different fields and do not exclude one another.",
      support:
        "Section 125 CrPC is a summary remedy against vagrancy; HAMA codifies a personal-law duty.",
      strength: "moderate",
    },
    {
      claim:
        "Denying relief would leave a genuinely destitute daughter without remedy.",
      support:
        "She discontinued education for want of funds and has no independent income on the record.",
      strength: "moderate",
    },
  ],
  strongest_point: "Section 20(3) HAMA is unqualified as to age.",
  weakest_point: "Section 125(1)(c) is explicit in confining relief to abnormality.",
};

const respondent = {
  position: "The claim is not maintainable in proceedings under Section 125 CrPC.",
  arguments: [
    {
      claim:
        "Clause (c) confines maintenance for a major child to physical or mental abnormality.",
      support:
        "The statutory text admits of no other reading; the petitioner concedes no disability.",
      strength: "strong",
    },
    {
      claim:
        "A civil suit under HAMA is the appropriate remedy, not a summary proceeding.",
      support:
        "Section 125 is designed for speedy relief against destitution, not for adjudicating personal-law obligations.",
      strength: "strong",
    },
    {
      claim: "The respondent has already discharged his obligations.",
      support:
        "He is retired with limited pension income, and maintenance was paid until majority.",
      strength: "weak",
    },
  ],
  strongest_point: "The plain text of clause (c) is decisive.",
  weakest_point: "HAMA plainly creates an independent and unqualified duty.",
};

const evidence = {
  items: [
    {
      claim: "The petitioner is unemployed and unable to maintain herself.",
      evidence_status: "supported",
      note: "Stated in the petition and not disputed on the record.",
    },
    {
      claim: "She discontinued education for want of funds.",
      evidence_status: "partial",
      note: "Asserted, but no supporting material is referred to in the text.",
    },
    {
      claim: "The respondent has limited means.",
      evidence_status: "unsupported",
      note: "No pension figure, statement of means, or document is referenced anywhere.",
    },
    {
      claim: "Maintenance ceased on attaining majority.",
      evidence_status: "supported",
      note: "Follows from the Magistrate's order dated 12.03.2013.",
    },
  ],
  summary:
    "The core factual claims are supported, but the respondent's plea of limited means rests on assertion alone.",
};

const contradictions = {
  contradictions: [
    {
      topic: "Scope of Section 125(1)(c)",
      appellant_position: "Clause (c) is not exhaustive of a major child's entitlement.",
      respondent_position:
        "Clause (c) exhaustively confines relief to cases of abnormality.",
      nature: "interpretive",
    },
    {
      topic: "Availability of the summary remedy",
      appellant_position:
        "HAMA rights may be enforced within Section 125 proceedings.",
      respondent_position: "HAMA rights lie only in a civil suit.",
      nature: "procedural",
    },
  ],
  summary:
    "The dispute is interpretive rather than factual: both sides accept the facts and differ on the reach of the provision.",
};

const similar = {
  cases: [
    {
      case_id: "1",
      title: "Abhilasha vs Parkash on 15 September, 2020",
      court: "Supreme Court of India",
      jurisdiction: "India",
      case_number: "Crl.A. No. 615 of 2020",
      judgment_date: "2020-09-15",
      year: 2020,
      bench: ["Ashok Bhushan", "R. Subhash Reddy", "M.R. Shah"],
      excerpt:
        "The question which arises for consideration is as to whether the appellant, who is unmarried and has attained majority, is entitled to claim maintenance from her father in proceedings under Section 125 of the Code.",
      source_url: "https://indiankanoon.org/doc/1/",
      breakdown: {
        final_score: 0.757,
        semantic: 0.812,
        doc_similarity: 0.812,
        issue_similarity: 0.64,
        statute_overlap: 0.444,
        shared_statutes: ["S.125 CrPC", "S.482 CrPC", "S.20 HAMA"],
        matched_on: "both",
      },
      is_weak: false,
    },
    {
      case_id: "2",
      title: "Rajnesh vs Neha on 4 November, 2020",
      court: "Supreme Court of India",
      jurisdiction: "India",
      case_number: "Crl.A. No. 730 of 2020",
      judgment_date: "2020-11-04",
      year: 2020,
      bench: ["Indu Malhotra", "R. Subhash Reddy"],
      excerpt:
        "Issues concerning the payment of maintenance have led to conflicting orders and considerable hardship to the parties.",
      source_url: "https://indiankanoon.org/doc/2/",
      breakdown: {
        final_score: 0.667,
        semantic: 0.731,
        doc_similarity: 0.731,
        issue_similarity: 0.59,
        statute_overlap: 0.312,
        shared_statutes: ["S.125 CrPC", "HAMA"],
        matched_on: "both",
      },
      is_weak: false,
    },
    {
      case_id: "3",
      title: "Anju Garg vs Deepak Kumar Garg on 28 September, 2022",
      court: "Supreme Court of India",
      jurisdiction: "India",
      case_number: "Crl.A. No. 1693 of 2022",
      judgment_date: "2022-09-28",
      year: 2022,
      bench: ["Bela M. Trivedi"],
      excerpt: "The husband is duty-bound to maintain his wife and children.",
      source_url: "https://indiankanoon.org/doc/3/",
      breakdown: {
        final_score: 0.641,
        semantic: 0.704,
        doc_similarity: 0.704,
        issue_similarity: 0.551,
        statute_overlap: 0.286,
        shared_statutes: ["S.125 CrPC"],
        matched_on: "both",
      },
      is_weak: false,
    },
    {
      case_id: "4",
      title: "Sukhdev Singh vs Sukhbir Kaur on 12 February, 2025",
      court: "Supreme Court of India",
      jurisdiction: "India",
      case_number: "Crl.A. No. 728 of 2025",
      judgment_date: "2025-02-12",
      year: 2025,
      bench: ["Vikram Nath", "Sandeep Mehta"],
      excerpt: "The scope of maintenance proceedings under the Code falls for consideration.",
      source_url: "https://indiankanoon.org/doc/4/",
      breakdown: {
        final_score: 0.612,
        semantic: 0.688,
        doc_similarity: 0.688,
        issue_similarity: 0.52,
        statute_overlap: 0.222,
        shared_statutes: ["S.125 CrPC"],
        matched_on: "both",
      },
      is_weak: false,
    },
    {
      case_id: "5",
      title: "Mohd Abdul Samad vs The State Of Telangana on 10 July, 2024",
      court: "Supreme Court of India",
      jurisdiction: "India",
      case_number: "Crl.A. No. 2842 of 2024",
      judgment_date: "2024-07-10",
      year: 2024,
      bench: ["B.V. Nagarathna", "Augustine George Masih"],
      excerpt:
        "Whether a Muslim woman may seek recourse to Section 125 of the Code notwithstanding the 1986 Act.",
      source_url: "https://indiankanoon.org/doc/5/",
      breakdown: {
        final_score: 0.588,
        semantic: 0.671,
        doc_similarity: 0.671,
        issue_similarity: 0.498,
        statute_overlap: 0.167,
        shared_statutes: ["S.125 CrPC"],
        matched_on: "both",
      },
      is_weak: false,
    },
  ],
  weak_only: false,
  reason: null,
  elapsed_ms: 234.6,
  query_statutes: ["CrPC:125", "CrPC:482", "HAMA:20"],
};

const judgment = {
  scores: {
    appellant_strength: 7,
    respondent_strength: 8,
    evidence_quality: 6,
    complexity: 7,
    overall_clarity: 8,
  },
  leaning:
    "The respondent is better positioned on the statutory text, though the appellant's HAMA argument is the stronger point of principle.",
  reasoning:
    "Clause (c) of Section 125(1) is explicit, and the petitioner concedes no disability, which makes the summary remedy difficult to sustain on its face. Against that, Section 20(3) HAMA creates an unqualified obligation, and the contention that the two provisions occupy different fields is not answered by the text alone. The evidence audit weakens the respondent's plea of limited means, which rests on assertion. The dispute is therefore interpretive, and turns on whether the Court reads clause (c) as exhaustive.",
  key_considerations: [
    "Whether clause (c) is exhaustive of a major child's entitlement",
    "Whether HAMA rights may be enforced in summary proceedings",
    "The absence of any material supporting the respondent's plea of limited means",
  ],
};

export default function PreviewPage() {
  return (
    <div className="min-h-screen bg-ink">
      <div className="mx-auto max-w-5xl px-5">
        <CaseHeader input={input} issues={issues} />
        <SectionRail />
        <CaseOverview data={issues} />
        <AdvocacyPanel appellant={appellant} respondent={respondent} />
        <EvidenceAudit data={evidence} />
        <Contradictions data={contradictions} />
        <SimilarCases data={similar} />
        <JudgmentPanel data={judgment} />
      </div>
    </div>
  );
}
