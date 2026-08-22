# Plan: Similar Case Retrieval

> Spec: [spec.md](./spec.md)

## Approach

Two pipelines, split by when they run.

**Offline (once, before the demo):** walk `dataset/2020..2025/*.PDF`, extract
text, parse the Indian Kanoon header block into structured metadata, extract
statute references by regex, chunk the body, embed the chunks with a local
sentence-transformer, mean-pool into per-document vectors, and write three
artifacts: a SQLite metadata DB, a `.npy` vector matrix, and a row-index map.
Nothing about this runs at request time.

**Online (per request):** the submitted case text goes through the *same*
preprocessing (chunk → embed → extract statutes), producing a query vector and a
query statute set. Scoring is a brute-force cosine against the 2,400-row matrix
blended with Jaccard overlap on statute sets. Top-5 returned. This is a pure
numpy step inserted into the existing LangGraph as a non-LLM node — it makes no
network calls and cannot rate-limit.

Data flow at request time:

```
case text
  ├─▶ chunk → embed → mean-pool ──▶ query_vec ──┐
  └─▶ statute regex ──────────────▶ query_stat ─┤
                                                 ▼
              0.6 · semantic_cosine + 0.4 · statute_jaccard
                                                 ▼
                                    top-5 + per-result breakdown
```

## Stack

- **New dependencies:**
  - `pymupdf` — PDF text extraction. ~10x faster than pdfplumber on this corpus
    (~2 min vs ~15 min for 2,400 files) and these PDFs are text-native, so the
    layout fidelity pdfplumber buys is not needed. *Note: AGPL — fine for a
    hackathon, revisit if this is ever distributed commercially.*
  - `sentence-transformers` — already installed (5.4.1); pin it in requirements.
  - `numpy` — already present transitively; pin it explicitly.
- **Model:** `sentence-transformers/all-MiniLM-L6-v2` (384-dim, 256-token window,
  ~80MB). Downloaded once to the HF cache, then works fully offline.
- **No new infra.** No vector database, no separate service, no migration system.
  Artifacts are files on disk loaded at process start.
- **CPU only.** `torch` is installed as `2.11.0+cpu`; the RTX 3050 is unusable
  without a ~2.5GB CUDA reinstall. Not worth it — MiniLM embeds the full corpus
  on 12 cores in ~5 minutes.

## File-level breakdown

### New files

**Ingestion (offline, run once):**
- `backend/ingestion/extract.py` — PDF → raw text + per-page offsets
- `backend/ingestion/parse_header.py` — regex parse of the Indian Kanoon header
  block into metadata; also pulls `case_id` from the footer URL
- `backend/ingestion/statutes.py` — statute/article reference extraction and
  normalisation to canonical form
- `backend/ingestion/segment.py` — body → numbered paragraphs; heuristic
  detection of the issue-framing block
- `backend/ingestion/chunk.py` — token-aware chunking (200 tokens, 40 overlap)
- `backend/ingestion/embed.py` — sentence-transformer load + batch encode
- `backend/ingestion/build_index.py` — CLI orchestrator; resumable

**Retrieval (online):**
- `backend/retrieval/store.py` — loads SQLite + vectors once at import
- `backend/retrieval/similarity.py` — hybrid scoring, top-k, result breakdown

**Evaluation:**
- `backend/eval/eval_set.json` — ~10 hand-judged query cases
- `backend/eval/run_eval.py` — recall@5 against the hand-judged set; used to tune
  the blend weights

**Generated artifacts** (committed so the demo never depends on ingestion):
- `backend/artifacts/corpus.db`
- `backend/artifacts/doc_vectors.npy` — (N, 384) float32, ~3.7MB
- `backend/artifacts/issue_vectors.npy` — (N, 384) float32
- `backend/artifacts/index_map.json` — matrix row ↔ `case_id`

### Changed files

- `backend/requirements.txt` — add `pymupdf`, pin `sentence-transformers`, `numpy`
- `backend/agents/engine.py` — add `similar_cases_node`; rewire the graph so it
  runs after the contradiction node and before the moderator, and feed its output
  into the moderator prompt
- `backend/models/schemas.py` — add `SimilarCaseSchema`, `MatchBreakdownSchema`;
  add `similar_cases` to the analysis response
- `backend/main.py` — warm the model at startup so the first request isn't slow
- `frontend/components/results/SimilarCases.tsx` — new results card
- `frontend/types/` — matching TypeScript types
- `.gitignore` — ensure `dataset/` stays out of git (682MB), artifacts stay in

### Data model

SQLite table `cases`:

| column | type | note |
|---|---|---|
| `case_id` | TEXT PK | Indian Kanoon doc id from the footer URL |
| `title` | TEXT | |
| `appellant`, `respondent` | TEXT | |
| `court`, `jurisdiction` | TEXT | e.g. "Criminal Appellate" |
| `case_number` | TEXT | |
| `judgment_date` | TEXT | ISO 8601, parsed from filename, cross-checked |
| `year` | INTEGER | indexed |
| `bench` | TEXT | JSON array |
| `author_judge` | TEXT | |
| `statutes` | TEXT | JSON array of normalised refs |
| `citations` | TEXT | JSON array of cited precedents (stored for v2) |
| `excerpt` | TEXT | first ~1500 chars of the facts section, for display |
| `source_path` | TEXT | relative path to the PDF |
| `has_issue_block` | INTEGER | 0/1 — whether issue detection succeeded |
| `vector_row` | INTEGER | row index into the `.npy` matrices |

Indexes on `year` and `court`. Full text is deliberately **not** stored — it
would add ~150MB to the DB for no demo value; `source_path` covers the rare need.

## Key technical decisions

- **Brute-force cosine over FAISS/Chroma:** 2,400 × 384 is a single numpy matmul
  in <10ms; a vector DB adds a dependency and index tuning for zero measurable gain.
- **Mean-pooled document vectors, not per-chunk vectors:** 3.7MB vs ~150MB, and
  the scoring stays explainable. Per-chunk max-sim is a v2 optimisation.
- **Separate issue vector alongside the doc vector:** lets the score weight the
  legal question above general prose, while the doc vector guarantees every case
  is always matchable even when issue detection fails.
- **Two-signal hybrid, not pure embedding:** statute overlap is deterministic and
  auditable, which is what makes the "why did this match" explanation real
  instead of a bare cosine number.
- **Artifacts precomputed and committed:** the demo path never runs ingestion, so
  there is no cold-start, no partial-index state, and no dependency on the
  dataset folder being present.
- **Model loaded once as a module-level singleton:** avoids paying the ~3–5s
  model load on every request.
- **Ingestion is resumable via `case_id` upsert:** a crash at document 2,000 does
  not restart from zero.
- **The similarity node is wrapped in try/except and returns an empty result on
  failure:** it is non-essential to the analysis, matching the existing engine's
  fallback philosophy where no single node can abort the graph.

Scoring, concretely:

```
semantic = 0.65 · cos(query_vec, doc_vec) + 0.35 · cos(query_vec, issue_vec)
           # issue_vec falls back to doc_vec when has_issue_block = 0
final    = 0.60 · semantic + 0.40 · jaccard(query_statutes, doc_statutes)
```

Weights are the starting point, tuned against the hand-built eval set in T14.

## Alternatives considered

- **Gemini embeddings API:** rejected — introduces a live network dependency and
  rate-limit exposure into the one part of the demo that could otherwise be
  guaranteed to work offline.
- **InLegalBERT:** rejected for this version — pretrained on Indian legal text,
  which is appealing, but it is a raw MLM BERT whose embedding space is known to
  be poor for cosine similarity without fine-tuning. Strong candidate *if* the v2
  fine-tuning happens.
- **FAISS / Chroma / Pinecone:** rejected — over-engineered at 2,400 vectors.
- **Per-chunk vectors with max-sim retrieval:** rejected — ~40x the storage for a
  marginal gain at this corpus size.
- **Citation-graph fine-tuning:** deferred to v2. Highest-value ML story
  available, but also the highest-risk item; retrieval must stand without it.
- **pdfplumber over PyMuPDF:** rejected — ~7x slower on this corpus, and its
  layout-fidelity advantage is irrelevant for text-native PDFs.

## Rollout

- **Migration needed?** No — new tables in a new SQLite file, nothing existing is
  altered.
- **Backward compatible?** The analysis response gains a field. The frontend
  must tolerate `similar_cases` being absent or empty (error/empty states).
- **Feature flag?** Not needed; the node degrades to empty on failure, which is
  functionally the same as being off.
- **Deployment order:** artifacts must exist before the backend starts, or the
  store loader must degrade to the error state cleanly. Both are covered in T15.

## Risks

- **Risk: issue-block detection coverage is unknown.** — **Mitigation:** measure
  it on a 100-doc sample in T5 *before* the scoring depends on it; the doc-vector
  fallback means low coverage degrades quality rather than breaking anything.
- **Risk: statute regex recall is unknown.** — **Mitigation:** measure on the same
  sample in T6. If coverage is below ~60%, shift the blend weight toward semantic.
- **Risk: no ground truth means retrieval quality is unmeasurable.** —
  **Mitigation:** hand-build the ~10-query eval set (T14). Small, but it converts
  "seems fine" into a number and catches gross regressions during weight tuning.
- **Risk: MiniLM's 256-token window truncates legal prose.** — **Mitigation:**
  chunk at 200 tokens with 40 overlap; verified in T7 against the tokenizer, not
  assumed from character counts.
- **Risk: 2,400 embeddings is a one-shot ~8 min run that could fail late.** —
  **Mitigation:** resumable ingestion (T10), so a failure costs minutes not hours.
- **Unknown:** how many of the 2,400 PDFs deviate from the header format seen in
  the two sampled documents. T4 measures this and reports parse-failure count.

## Estimated effort

**M** — roughly 8–11 hours of focused work, well parallelisable across 2–3 people:
ingestion (T2–T10) is one track, retrieval + scoring (T11–T14) a second, and
API + frontend (T15–T19) a third once the schema in T15 is agreed. The critical
path is ingestion → artifacts → everything else, so start T2 first and get the
index built early.
