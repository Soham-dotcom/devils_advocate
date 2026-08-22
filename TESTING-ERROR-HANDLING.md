# Testing the error handling

How to verify each failure path yourself. Every test below has a **normal case**
and a **failure case**, so you can see the difference rather than take it on faith.

Two servers must be running unless a test says otherwise:

```bash
cd backend; $env:PYTHONPATH="."; python -m uvicorn main:app --port 8000
```

```bash
cd frontend; npm run dev
```

---

## The fastest check: the visual harness

Most failure states are hard to trigger on purpose — you cannot make Gemini
rate-limit you on cue. So all nine render on demand here:

```bash
start http://localhost:3000/preview-errors
```

Click through the buttons at the top. What you should see:

| Button | Expected |
|---|---|
| Backend unreachable | "Cannot reach the analysis server" + the exact command to start it |
| Invalid input (422) | Per-field messages, not `[object Object]` + "Back to the form" |
| All stages failed (503) | Quota message + "use a different API key or enable billing" |
| Partial — 4 of 6 ran | Amber banner "This analysis is incomplete — 4 of 6 stages ran" |
| Partial — daily quota | Says it resets at midnight Pacific, **not** "wait a minute" |
| Single stage unavailable | Dashed placeholder: "This stage could not run" — no invented content |
| Corpus unavailable | "Similar case search is unavailable. The rest of this analysis is unaffected." |
| No comparable cases | Empty state explaining the input was too short |
| All matches weak | Amber warning: treat as leads, not comparable precedent |

**The point to look for:** no state shows a bare technical string, and every one
names a next step.

---

## Test 1 — Automated backend suite (no network, no quota)

Covers the normal case and both failure cases deterministically. The model is
stubbed, so *which* stages fail is chosen rather than hoped for.

```bash
cd backend; $env:PYTHONPATH="."; python -m tests.test_degraded
```

**Expect:** `ALL PASS`, covering

- **Normal:** 6/6 stages run → `status: "complete"`, `degraded` absent
- **Failure (partial):** stages 4 and 5 forced to fail → `status: "partial"`,
  exactly 2 failures listed, `completed: 4`, and critically **failed stages are
  `None`, not placeholder text**
- **Failure (total):** all 6 fail → `status: "failed"`, classified `auth`
- **Classification:** 6 error shapes routed correctly; per-minute and daily
  quotas asserted to give *different* advice

---

## Test 2 — Invalid input

### Normal case
Go to http://localhost:3000/submit, paste a real case (use `test-cases.md`),
submit. It runs.

### Failure case
Bypass the form's own validation and hit the API directly:

```bash
curl.exe -s -X POST http://127.0.0.1:8000/api/analyze -H "Content-Type: application/json" -d "{\"title\":\"Valid title here\",\"case_text\":\"too short\"}"
```

**Expect:** HTTP 422 with a `detail` array.

**What changed:** the frontend used to pass that array straight to
`new Error()`, so the user saw literally `Analysis failed: [object Object]`.
It now reads:

> **Case text** needs at least 200 characters — you entered 9

Verify in the UI at `/preview-errors` → "Invalid input (422)".

---

## Test 3 — Backend unreachable

### Normal case
With the backend running, http://localhost:3000/submit shows a green dot and
"2,399 Supreme Court judgments indexed".

### Failure case
Stop the backend (Ctrl+C in its terminal, or):

```bash
powershell -Command "Get-NetTCPConnection -LocalPort 8000 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"
```

Reload `/submit` and submit a case.

**Expect:** "Cannot reach the analysis server", the reason, and a copyable
command block to start it. The retry button **re-issues the request** — it no
longer reloads the page, which previously just failed identically forever.

Restart the backend and click retry: it should proceed without you re-typing
the case.

---

## Test 4 — Similar-case corpus unavailable (containment)

This is the important one: a retrieval failure must **not** take down the
analysis.

### Normal case
```bash
curl.exe -s http://127.0.0.1:8000/api/corpus
```
Expect `{"available":true,"judgments":2399}`.

### Failure case
Stop the backend, rename the artifacts folder, restart:

```bash
cd backend; Rename-Item artifacts artifacts_hidden
```

Then `curl.exe -s http://127.0.0.1:8000/api/corpus` → `{"available":false,...}`.

Submit a case through the UI.

**Expect:** the analysis **still completes**. Five of six panels render normally;
only the Similar Cases panel shows "Similar case search is unavailable. The rest
of this analysis is unaffected."

Put it back:

```bash
cd backend; Rename-Item artifacts_hidden artifacts
```

> Note: this costs 6 API requests. If you are low on quota, verify the same
> containment for free via the automated check in Test 1 and the visual state at
> `/preview-errors` → "Corpus unavailable".

---

## Test 5 — Input too short / not legal text

### Normal case
Paste a full case. You get 5 ranked matches with shared provisions.

### Failure case A — below the minimum
```bash
curl.exe -s -X POST http://127.0.0.1:8000/api/similar-cases -H "Content-Type: application/json" -d "{\"title\":\"probe\",\"case_text\":\"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\"}"
```

**Expect:** `"cases": []` with
`"reason": "input too short to match on (needs ~30 tokens)"` — the empty state,
**not** five arbitrary judgments.

### Failure case B — non-legal prose
Paste a recipe or diary entry (repeated a few times to clear the length gate)
into `/submit`.

**Expect:** results appear but every one is badged **Weak match**, under an amber
banner: "All matches below are weak. Treat them as leads to check, not as
comparable precedent." Top score should be around 0.18 with no shared provisions.

This is the check that the system does not present confident matches for input
it has no business matching.

---

## Test 6 — Partial analysis (the headline feature)

The real trigger is a mid-run rate limit, which you cannot schedule. Two ways to
see it:

### Deterministic (recommended, free)
Test 1, Scenario 2 — forces stages 4 and 5 to fail and asserts the shape.

### Visual
`/preview-errors` → "Partial — 4 of 6 ran".

**Expect:** an amber banner at the top of the results reading "This analysis is
incomplete — 4 of 6 stages ran", the cause, what to do, a "Retry the failed
stages" button, and a "Which stages failed?" disclosure. Failed sections show a
dashed "This stage could not run" placeholder.

**The thing being tested:** the old build filled failed stages with placeholder
text and reported `status: "complete"` — so a reader could not distinguish a
finished analysis from a failed one, while genuine retrieved case law sat beside
invented analysis. Now a stage that did not run is visibly absent.

### Live (costs 6 requests)
Set a bad key in `backend/.env`, restart the backend, submit a case:

```
GEMINI_API_KEY=invalid-key-to-force-failure
```

**Expect:** HTTP 503 and the error screen — *not* a dashboard of placeholder
text. Restore your real key afterwards.

---

## Test 7 — Reduced motion

### Normal case
Landing page: hero words stagger in, sections reveal on scroll, the CTA pulls
toward the cursor.

### Failure/accessibility case
Windows: **Settings → Accessibility → Visual effects → Animation effects: Off.**
Reload http://localhost:3000.

**Expect:** everything visible immediately, no reveals, no stagger, no smooth
scroll, no 3D tilt. Content must be **fully present**, not merely faster.

---

## Quick reference

| Failure | How to trigger | Expected recovery shown |
|---|---|---|
| Per-minute rate limit | Automated Test 1 | "Wait about 22 seconds and retry" |
| Daily quota | Real (after ~3 analyses) | "Resets at midnight Pacific. Use another key or enable billing." |
| Invalid API key | Bad key in `.env` | "Check GEMINI_API_KEY in backend/.env" |
| Backend down | Stop the backend | Heading + exact start command, working retry |
| Bad input | 9-char case text | "Case text needs at least 200 characters — you entered 9" |
| Corpus missing | Rename `artifacts/` | "Similar case search is unavailable. The rest is unaffected." |
| Input too short | <30 tokens | Empty state with the reason |
| Non-legal text | Paste a recipe | All results badged weak, amber warning |

---

## What I have and have not verified

**Verified:** the automated suite (all scenarios pass), 422 parsing over real
HTTP, offline detection, and all nine visual states rendering with recovery text.

**Not verified end-to-end live:** the partial-analysis path against a genuine
mid-run rate limit, because that needs quota I have not had available. The
deterministic test covers the logic, and `/preview-errors` covers the rendering,
but the two have not been observed joined up in one live run. Worth doing once
when you have quota.
