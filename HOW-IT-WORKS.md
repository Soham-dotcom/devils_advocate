# How this project works

Plain-language explanation of what was built and how a case gets analysed.
No prior knowledge assumed.

---

## What the project does

A lawyer pastes a case — a judgment, a petition, or a summary of the facts. The
system reads it and returns six things:

1. What legal questions the case is actually about
2. The strongest argument for the appellant's side
3. The strongest argument for the respondent's side
4. Which claims the case text actually backs up, and which it does not
5. Where the two sides directly contradict each other
6. Five similar past Supreme Court judgments, with the reason each one matched

It does **not** decide the case. It lays out the case's shape so a person can
decide better and faster.

---

## The two halves

The project has two independent halves that do very different work.

### Half 1 — the AI agents (six of them)

These use Google's Gemini AI model. Think of them as six different specialists
reading the same case one after another, each doing one job:

| # | Agent | What it does |
|---|---|---|
| 1 | **Issue Spotter** | Reads the case and pulls out the legal questions, key facts, important dates, and which laws are involved |
| 2 | **Appellant's Advocate** | Argues the case as strongly as possible for one side |
| 3 | **Respondent's Advocate** | Argues for the other side — and specifically *rebuts* what agent 2 said |
| 4 | **Evidence Auditor** | Checks each claim both sides made. Is it actually supported by the case text, or just asserted? |
| 5 | **Contradiction Finder** | Finds points where the two sides say genuinely incompatible things |
| 6 | **Judge** | Reads everything above and gives a balanced summary with scores |

**Why they run one after another, not all at once:** agent 3 gets to see agent
2's arguments, so it can argue *against* them. That makes it a real debate rather
than two separate essays that happen to be about the same case. Agent 4 can only
audit claims after both sides have made them, and so on.

Each agent is also told: *only say things the case text supports; if the text
does not contain something, say so rather than inventing it.* This matters in a
legal tool, where a confident invention is worse than an admitted gap.

### Half 2 — the similar-case search (this is the machine-learning part)

This half does **not** use Gemini at all. It runs entirely on your own computer,
with no internet, which is why it keeps working even when the AI model is down or
rate-limited.

---

## How the similar-case search works

This is the part worth understanding properly, because it's the piece that does
something a person could not do by hand.

### Step 1 — reading 2,400 real judgments (done once, ahead of time)

The `dataset/` folder holds **2,400 real Indian Supreme Court judgments** from
2020 to 2025, as PDFs. Before the app can be used, a one-time build reads all of
them. This took **37.6 minutes** and succeeded on 2,399 of 2,400.

For each judgment it:

- Pulls out the text
- Reads the header to get the case title, the judges, the date, the case number
- Finds every law mentioned (e.g. "Section 125 CrPC") and writes it in one
  standard form, so `Cr.P.C.`, `CrPC` and `Code of Criminal Procedure` all become
  the same thing
- Turns the judgment's meaning into a list of numbers (explained below)

### Step 2 — turning meaning into numbers

This is the core idea, and it's simpler than it sounds.

A small AI model called **MiniLM** reads a piece of text and produces a list of
384 numbers. You can think of that list as the text's "position" on a giant map
of meaning. Two texts about the same thing land close together on that map, even
if they use completely different words.

So:

- "unmarried daughter seeking maintenance from her father"
- "major unmarried girl claiming support from her parent"

...land in nearly the same place, because they *mean* nearly the same thing —
even though they share almost no words. Keyword search would completely miss the
connection. This is why it's called **semantic** search: searching by meaning
rather than by matching words.

Every one of the 2,399 judgments has its own list of 384 numbers, stored in a
file. That file is only about 3.5 MB — small enough to load instantly.

### Step 3 — searching, when someone submits a case

When a lawyer submits a case:

1. The same MiniLM model turns their case into its own list of 384 numbers
2. The system compares that against all 2,399 stored judgments and measures how
   close each one is on the meaning-map
3. It also checks which specific laws overlap (e.g. both cases involve
   `Section 482 CrPC`)
4. It combines the two into one score and returns the best five

The whole comparison takes **about 230 milliseconds** — roughly a quarter of a
second — because comparing lists of numbers is something computers do extremely
fast.

### Why two signals instead of one

The meaning-map is powerful but it's a black box. If it just said "94% similar",
a lawyer would have no way to check whether it's right.

The law-overlap check fixes that. It's simple and auditable: either both cases
cite Section 482 CrPC or they don't. So the app can show **why** each case
matched — "matched on S.482 CrPC, S.420 IPC" — and the lawyer can judge for
themselves whether that's relevant.

### An honest note on the tuning

We measured which combination of signals actually works best, using 1,420 test
queries. The results were surprising and they overturned the original design:

- An extra signal we built (a separate "legal issue" comparison) was making
  results **worse**, so it was switched off
- The law-overlap signal helps a little at low weight but hurts if relied on
  heavily

Final setting: **85% meaning-based, 15% law-overlap**. That scored best *and*
kept the ability to explain matches. The measurement is recorded in
`specs/case-similarity/tasks.md`.

---

## Does it actually work?

The clearest test: we wrote a fake case in our own words about an unmarried
daughter claiming maintenance — completely paraphrased, no copied sentences.

The top result was **Abhilasha vs Parkash (2020)** — which is the actual
controlling Supreme Court judgment on exactly that question. The other four
results were all genuine maintenance cases, including **Rajnesh vs Neha (2020)**,
the leading Indian judgment on maintenance.

It found the right precedent from a description, not from matching words.

---

## What happens when something goes wrong

A lot of care went into this, because the first version handled it badly.

**The old behaviour (a real bug we fixed):** when the AI model was unavailable,
the app filled every section with placeholder text and told the user the analysis
was **complete**. Worse, the similar-case results were genuine — so a reader saw
real Supreme Court case law sitting next to invented analysis, with nothing
saying anything had gone wrong.

**The new behaviour:**

- If a stage fails, that section stays **empty** and says "this stage could not
  run". Nothing is ever made up to fill the gap.
- A banner at the top says exactly how much ran: *"4 of 6 stages ran"*
- The message explains the real cause and what to do about it:
  - Hit a per-minute limit → *"Wait about 22 seconds and retry"*
  - Hit the daily limit → *"Resets at midnight Pacific. Use another key or enable billing."*
  - Bad API key → *"Check GEMINI_API_KEY in backend/.env"*
  - Backend not running → shows the exact command to start it
  - Text too short → *"Case text needs at least 200 characters — you entered 9"*
- If **nothing** ran, the app shows an error page instead of an empty dashboard
- Similar-case results are labelled as still trustworthy when they are, because
  that search runs locally and doesn't depend on the AI model

---

## Important limitation to know about

The Gemini free tier allows **20 requests per day**. Each analysis uses 6 of
them. So the free key supports roughly **3 full analyses per day**.

If you are demoing this, get a second API key or enable billing first. The
similar-case search is unaffected — it has no limits, because it runs locally.

---

## The numbers, in one place

| | |
|---|---|
| Judgments indexed | 2,399 of 2,400 (1 file had an unreadable name) |
| Years covered | 2020–2025 |
| One-time build | 37.6 minutes |
| Similar-case search | ~230 milliseconds |
| Full analysis | 60–90 seconds (six AI calls) |
| Search quality (recall@5) | 0.396 |
| Free-tier limit | 20 AI requests/day ≈ 3 analyses |

**On the quality number:** 0.396 means that when we asked it for 5 similar cases,
roughly 40% of the cases we *expected* to see showed up. That sounds low, but
"expected" was measured using a rough stand-in (cases citing the same earlier
judgments), not a lawyer's judgment. It is useful for comparing settings against
each other and catching things getting worse — it is not proof the search is
good. The Abhilasha result above is better evidence of that than the number is.

---

## Where things live

```
backend/
  ingestion/    reads the PDFs and builds the search index (run once)
  retrieval/    does the searching when someone submits a case
  agents/       the six AI agents and the order they run in
  prompts/      the exact instructions given to each agent
  eval/         measures how good the search is
  tests/        tests that failures are handled properly
  artifacts/    the built search index (the 3.5 MB of numbers + a database)

frontend/
  app/          the pages: home, submit, analysing, results
  components/   the panels shown on the results page

dataset/        the 2,400 judgment PDFs (not needed once the index is built)
specs/          the design documents and the full record of decisions
```
