# Spec: Similar Case Retrieval

## Summary

When a lawyer analyses a case on the platform, the system surfaces the five most
similar past Supreme Court judgments drawn from a corpus of ~2,400 real Indian
Supreme Court judgments (2020–2025), each with a plain explanation of *why* it
matched. Today a lawyer finds precedent through manual keyword search and
memory. After this ships, relevant prior judgments appear automatically
alongside the rest of the case analysis, with the matching reasoning visible so
the lawyer can judge relevance themselves rather than trusting an opaque score.

## User stories

- As a lawyer preparing a case, I want to see past judgments that resemble mine,
  so that I can find relevant precedent without manually searching.
- As a lawyer, I want to see *why* each case was matched, so that I can quickly
  dismiss false matches and put weight on the real ones.

## Acceptance criteria

- [ ] Submitting a case for analysis returns 5 similar past judgments as part of
      the normal analysis run
- [ ] Each result shows: case title, court, judgment date, bench, and a
      reference to the source judgment
- [ ] Each result shows a match explanation — which legal provisions overlap and
      how semantically close the case is
- [ ] Results are ordered strongest match first
- [ ] When nothing matches strongly, the system says so plainly instead of
      presenting weak matches as strong ones
- [ ] If similar-case lookup fails for any reason, the rest of the case analysis
      still completes and displays
- [ ] Lookup adds no more than 2 seconds to total analysis time

## User experience

### Happy path

1. Lawyer submits a case (pasted text) for analysis
2. The analysis runs; a "Similar Cases" panel shows a loading state
3. Panel fills with 5 past judgments, strongest match first
4. Each entry shows the case title, court, date, bench, and a match explanation
   naming the shared legal provisions and a similarity strength
5. Lawyer can expand any entry to see a short excerpt from that judgment

### States

- **Loading:** Skeleton rows in the Similar Cases panel while the corpus is
  searched. The rest of the analysis continues rendering independently.
- **Empty:** No case clears the relevance threshold → panel states "No strongly
  similar cases found in the 2020–2025 corpus" and offers the three closest
  matches explicitly labelled as weak, so the lawyer can still look.
- **Error:** Corpus unavailable or lookup fails → panel shows "Similar case
  search unavailable" with a retry action. Every other part of the analysis
  renders normally; the failure is contained to this panel.
- **Partial:** A case matched on shared legal provisions but is semantically
  distant (or vice versa) → it still appears, badged with which signal matched
  so the lawyer isn't misled about the kind of similarity.
- **Ideal:** Five results, each with a visible breakdown of provision overlap and
  semantic closeness.

### Edge cases

- **Very short input** (a one-line case description): too little signal to match
  on. Show the empty state rather than five arbitrary results.
- **Very long input** (a full 50-page judgment pasted in): must not time out or
  blow the latency budget; input is truncated to a bounded working length.
- **Input with no recognisable legal provisions:** falls back to semantic
  matching alone and says so in the match explanation.
- **Input that is not a legal document at all** (random prose): should land in
  the empty state, not confidently return five unrelated judgments.
- **Non-English / mixed-script input:** out of scope for this version; behaviour
  is undefined and acceptable to degrade to the empty state.
- **Duplicate or near-duplicate corpus entries:** results should not show the
  same judgment twice.

## Out of scope

- Training or fine-tuning any model. This version uses a pretrained encoder and
  builds a retrieval index over it. (See *Deferred* below.)
- Live PDF upload parsing at analysis time — input is pasted text for now.
- Any corpus beyond the 2020–2025 Supreme Court judgments already on disk.
- Incremental corpus updates or re-indexing while the app is running.
- Ranking by how favourably a case was decided, or by binding authority.
- Full-text display of matched judgments (short excerpt only).

### Deferred to v2 (explicit stretch goal)

Fine-tuning the encoder on positive pairs mined from the corpus's own citation
graph — judgments that cite the same precedent treated as similar, trained with
an in-batch-negatives objective. This would turn "we built retrieval" into "we
trained a domain model and measured the improvement." It is deliberately out of
the current build because it is the single highest-risk item and the retrieval
system must work without it.

## Non-functional requirements

- **Performance:** Similar-case lookup adds ≤2s to analysis. Corpus is
  pre-indexed offline; no indexing work happens during a user request.
- **Reliability:** The lookup is non-essential to the analysis. Any failure in it
  must degrade to the error state and must never abort the surrounding analysis.
- **Privacy:** The submitted case text is processed locally by the backend and
  is not sent to any third-party service for the similarity step. The corpus is
  public Supreme Court judgments.
- **Offline capability:** The similarity step must work with no network access,
  so a demo cannot be broken by connectivity or an API rate limit.
- **Observability:** Log per lookup — match count, top score, elapsed time, and
  which signals contributed — so weak results can be diagnosed.
- **Accessibility:** Panel is keyboard reachable, results are a semantic list,
  similarity strength is conveyed by text and not by colour alone.

## Open questions / risks

- **No ground truth exists for "correct" similar cases.** There is no labelled
  set to measure retrieval quality against, so quality claims cannot be
  objectively defended. Mitigation: hand-build a small evaluation set (~10 query
  cases with manually judged top-5) to sanity-check and tune the scoring
  weights. This gives a defensible, if small, quality signal.
- **Coverage of structured sections is unknown** until the corpus is processed.
  If legal-provision extraction or issue-section detection covers only a small
  fraction of judgments, the hybrid scoring degrades toward plain semantic
  similarity. Must be measured early, before the scoring depends on it.
- **Similarity is not relevance.** Two judgments can be textually close and
  legally irrelevant to each other. The match explanation is what makes this
  visible to the lawyer, which is why it is an acceptance criterion rather than
  a nice-to-have.
