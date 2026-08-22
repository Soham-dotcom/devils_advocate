# Devil's Advocate

AI legal case analysis for Indian Supreme Court practice. Six agents argue a case
from both sides, audit the evidence, and surface similar past judgments from a
locally-indexed corpus of 2,400 real Supreme Court decisions.

It never decides the case. It shows the case's shape — where it is strong, where
it is exposed, and what governs it.

---

## What it does

Paste a case (a judgment, a petition, or a summary of the facts). Seven stages
run in sequence:

| # | Stage | Does |
|---|---|---|
| 1 | Issue Spotter | Extracts the legal questions, material facts, dates, provisions |
| 2 | Appellant's Advocate | Argues the strongest case for one side |
| 3 | Respondent's Advocate | Rebuts it point by point |
| 4 | Evidence Auditor | Marks which claims the record actually supports |
| 5 | Contradiction Finder | Locates genuinely incompatible positions |
| 6 | **Similar Judgments** | Retrieves 5 comparable cases — **runs locally, no API** |
| 7 | The Judge | Synthesises an assessment with scores |

The advocates run **sequentially, not in parallel**, so the respondent sees the
appellant's arguments and answers them. That is what makes it a debate rather
than two independent essays.

## The retrieval layer

Stage 6 is the part that isn't an API call.

2,400 judgment PDFs (2020–2025) are processed once: text extraction, header
parsing, statute normalisation (`Cr.P.C.` / `CrPC` / `Code of Criminal
Procedure` all collapse to one token), token-aware chunking, then mean-pooled
`all-MiniLM-L6-v2` embeddings into a 384-dimension vector per judgment.

At query time it is a dense matmul over ~2,399 rows — about **230 ms**, entirely
offline. Scoring blends semantic similarity with statutory overlap, so every
match can show *why* it matched rather than only a score.

**Measured:** recall@5 of **0.396** over 1,420 evaluation queries, graded against
an independent signal (whether two judgments cite the same earlier authorities).
That is a proxy metric, not human relevance judgment — see
[`specs/case-similarity/tasks.md`](specs/case-similarity/tasks.md) for the full
record, including the weight sweep that showed one of our own hand-built signals
was making results *worse*.

---

## Running it

### Prerequisites

- Python 3.11+, Node 20+
- A Gemini API key — https://aistudio.google.com/apikey
  (free tier is **20 requests/day**; one analysis uses 6)

### Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env      # then paste your key into it
```

```bash
cd frontend
npm install
```

### Build the search index

The judgment corpus (682 MB of PDFs) is **not** in this repository, and neither
are the artifacts derived from it. To build the index you need `dataset/`
laid out as `dataset/<year>/<case>.PDF`, then:

```bash
cd backend
python -m ingestion.build_index
```

Takes about 38 minutes and writes `backend/artifacts/`. Use
`--limit 50` for a quick mini-index while developing; the build is resumable, so
interrupting and re-running picks up where it stopped.

**Without this step everything else still works** — the six agents run normally
and the Similar Judgments panel shows its unavailable state. That containment is
deliberate and tested.

### Run

```bash
cd backend
$env:PYTHONPATH="."
python -m uvicorn main:app --port 8000
```

```bash
cd frontend
npm run dev
```

Open http://localhost:3000

---

## Layout

```
backend/
  ingestion/    PDF -> text -> metadata -> statutes -> chunks -> vectors
  retrieval/    query preprocessing, hybrid scoring, artifact loading
  agents/       the seven-stage LangGraph pipeline
  prompts/      per-agent prompt templates
  eval/         retrieval quality measurement and weight tuning
  tests/        failure-handling tests (no network required)
frontend/
  app/          routes: landing, submit, analyze, results
  components/   results panels, form, shared visual components
specs/          design record: spec, plan, tasks, and every decision made
deck/           pitch deck generator (node deck/build_deck.js)
```

## Docs

- [HOW-IT-WORKS.md](HOW-IT-WORKS.md) — plain-language explanation, no jargon
- [TESTING-ERROR-HANDLING.md](TESTING-ERROR-HANDLING.md) — how to verify each failure path
- [test-cases.md](test-cases.md) — sample cases to paste in
- [specs/case-similarity/](specs/case-similarity/) — full design and decision log

## Design position

In a legal tool, a confident invention is worse than an admitted gap.

- A stage that cannot run renders **empty and labelled** — never filled with
  plausible placeholder text
- Weak matches are badged weak rather than presented as comparable precedent
- Claims the record does not support are marked unsupported, however persuasive
- When the model is unreachable the analysis **degrades rather than lying**, and
  says which stages did not run and what to do about it

Routes `/preview`, `/preview-loading` and `/preview-errors` render the results
page, the analysing screen, and all nine failure states against fixture data —
no API calls, useful for development and demos.

## Limitations

- Supreme Court judgments only, 2020–2025
- 1 of 2,400 source PDFs fails to parse (non-standard filename, no date)
- The retrieval quality metric is a proxy, as described above
- The free-tier API cap (20 requests/day) allows roughly 3 analyses per day
