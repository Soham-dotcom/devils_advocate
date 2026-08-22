# Presentation script — 3 speakers

**Total: ~6 minutes of talking + ~3 minutes live demo.**

Split by *role in the story*, not by slide count:

| Speaker | Owns | Slides | Time |
|---|---|---|---|
| **A — The Why** | problem, product | 1–2 | ~2 min |
| **B — The How** | pipeline, the ML | 3–4 | ~2 min |
| **C — The Proof** | results, honesty, demo | 5–6 + demo | ~2 min + demo |

Speak in your own words. The lines below are the *shape* of what to say, not
a script to recite. Bold text is the sentence worth landing exactly.

---

## SPEAKER A — The Why (~2 min)

### Slide 1 — The problem

> Every case is argued by two sides. But it's prepared by one.
>
> A lawyer sits alone the night before a hearing, trying to imagine what the
> other side will say. And the weakness that actually loses the case is almost
> always the one nobody thought to look for.
>
> There's a second problem underneath it. To find the judgment that governs your
> case, you search a database by keyword — which means **you have to guess the
> exact words a judge happened to use twenty years ago.** If they wrote
> "maintenance" and you searched "support", you get nothing.

> **The gap isn't knowledge. It's perspective.**

*(If short on time, cut the second paragraph — the "prepared by one" line is the hook.)*

### Slide 2 — What we built

> So we built Devil's Advocate.
>
> You paste a case. Six AI agents take it apart. One builds the strongest
> possible argument for your side. A second one reads that argument and
> **rebuts it, point by point.** A third checks every claim both sides made
> against what the case text actually says — and marks the ones the record
> doesn't support, no matter how convincing they sound.
>
> And alongside all of that, it searches 2,399 real Supreme Court judgments and
> brings back the five most similar, with the shared legal provisions shown so
> you can check the match yourself.

> **It never decides the case. It shows you the case's shape — and the judgment
> stays with the lawyer.**

**Hand off:** "…and the way it does that is the interesting part. [B] will take you through it."

---

## SPEAKER B — The How (~2 min)

### Slide 3 — Seven stages

> Seven stages, and the order matters.
>
> The two advocates run **one after the other, not in parallel.** That's
> deliberate. The respondent's agent receives the appellant's actual arguments
> and answers them. If we ran them at the same time, we'd get two essays about
> the same case. Running them in sequence gets you a debate.
>
> Then the Evidence Auditor can only do its job *after* both sides have made
> their claims. Contradiction Finder needs both positions. And the Judge reads
> everything, including the retrieved precedent, before it says anything.

> One thing to flag: **stage 6, the precedent search, needs no internet at all.**
> It runs on this laptop. That matters in a minute.

### Slide 4 — The hard part

> This is the part we're proud of.
>
> We took 2,400 real Supreme Court judgments — PDFs, 2020 to 2025 — and
> processed every one of them locally. Extracted the text, parsed the headers,
> normalised every statute reference so that "Cr.P.C.", "CrPC" and "Code of
> Criminal Procedure" all become the same thing.
>
> Then each judgment gets converted into a list of **384 numbers** — think of it
> as its position on a map of meaning. Cases about the same thing land close
> together on that map **even when they share no words at all.**

*(point at the two phrases on the slide)*

> "Unmarried daughter seeking maintenance from her father." "Major unmarried girl
> claiming support from her parent." Almost no words in common. Nearly identical
> meaning. Keyword search finds nothing here. **We find the match.**
>
> 2,399 of 2,400 indexed. Search takes **230 milliseconds**, with zero network
> calls.

**Hand off:** "So — does it actually work? [C]."

---

## SPEAKER C — The Proof (~2 min, then demo)

### Slide 5 — Does it work

> We tested it the honest way. We wrote out a case **in our own words** — a
> paraphrase, nothing copied — about an unmarried adult daughter claiming
> maintenance from her father.
>
> The top result was **Abhilasha vs Parkash, 2020.** That is the actual
> controlling Supreme Court authority on precisely that question. It also
> returned *Rajnesh vs Neha* — the leading Indian judgment on maintenance.
> It found the right law from a description.

*(point at the chart)*

> We also measured it properly. 1,420 test queries, graded against an
> independent signal — whether two judgments cite the same earlier cases.
>
> And the measurement **told us we were wrong.** One of the scoring signals we'd
> hand-built was actively making results worse. So we cut it, and quality went
> up 47%. That's the number on the right: 0.268 to 0.396.

*(if asked about the metric, see Q&A below — be upfront that it's a proxy)*

### Slide 6 — What makes it different

> Last thing, and it's the design decision we care most about.
>
> In a legal tool, **a confident invention is worse than an admitted gap.**
>
> So: if a stage can't run, that section stays empty and says so — we don't fill
> it with something plausible. If a match is weak, every result gets badged weak
> rather than dressed up as precedent. If a claim isn't supported by the record,
> we say so.
>
> And because the precedent search runs locally, when the AI model goes down,
> **the analysis degrades — it doesn't lie.** You still get the case law, and a
> banner telling you exactly what didn't run and what to do about it.

> Let me show you.

---

## THE DEMO (~3 min) — Speaker C drives

**Order matters. Do the failure case first — it costs no API quota.**

**1. The failure case** — go to `/submit`

- Title: `Property dispute`
- Text: `Client wants to challenge the partition decree passed last year. Need a quick analysis before the next hearing.`
- Click out of the box, press **Analyze this case**

> "It doesn't just say 'error'. It tells you which field, how short it is —
> 111 of the 200 characters needed — and what to do. Nothing was even sent to
> the server."

**2. The normal case** — paste the maintenance case from `test-cases.md`

> "Six agents, about 90 seconds."

*(while it runs, let the 3D analysing screen play — don't talk over it for a beat)*

**3. The results** — scroll to **Similar Past Judgments**

> "And there it is. Abhilasha vs Parkash — top match, found from our
> paraphrase. And it tells you *why*: shared provisions, Section 125 CrPC,
> Section 20 of the Hindu Adoptions and Maintenance Act."

**Backup if the demo fails:** `/preview` shows the full results page and
`/preview-errors` shows every failure state — both with zero API calls. Have
them open in tabs already.

---

## Numbers cheat sheet

Know these cold.

| | |
|---|---|
| Judgments indexed | **2,399** of 2,400 |
| Years | 2020–2025, Supreme Court of India |
| One-time index build | 37.6 minutes |
| Similar-case search | **230 ms**, fully offline |
| Full analysis | 60–90 seconds |
| Vector size | 384 dimensions (MiniLM) |
| Retrieval quality | recall@5 **0.396**, up from 0.268 |
| Eval set | 1,420 queries |
| Statute extraction | 94.1% of judgments |
| Case ID + date parsing | 100% |

---

## Q&A — likely judge questions

**"Is this just a ChatGPT wrapper?"**
> The agent layer uses Gemini, yes. But the retrieval half is ours end to end —
> we built the corpus, the extraction, the statute normalisation, the embedding
> index, and the scoring, and we tuned it against a 1,420-query eval set. That
> half runs entirely offline with no API at all.

**"How do you know the similar cases are actually good?"**
> Two ways. Quantitatively, recall@5 of 0.396 on 1,420 held-out queries. But
> I'd be honest that the metric is a **proxy** — we grade against whether two
> judgments cite the same earlier authorities, not against a lawyer's judgment.
> The stronger evidence is qualitative: it found the controlling authority for
> a case we described in our own words.

**"What stops it hallucinating law?"**
> Three things. Every agent is instructed to ground claims in the supplied text
> and say so when it can't. The Evidence Auditor exists specifically to flag
> unsupported claims. And the retrieved cases are real documents from a fixed
> corpus — we're not generating citations, we're retrieving them, and each one
> links to the judgment on Indian Kanoon.

**"What happens when the API fails?"**
> That's slide 6 — happy to show you. It degrades rather than fabricating.
> Failed stages render empty and labelled, with the actual cause and a recovery
> step. Precedent search is unaffected because it's local.

**"What's next?"**
> Fine-tuning the retrieval model on our own citation graph — the training pairs
> are free, they come from the corpus itself. And ranking precedent by
> influence: how often each judgment is cited by the others, so landmark cases
> surface above obscure ones.

**"Why only the Supreme Court?"**
> It's the corpus we could build and verify properly in the time. The pipeline
> is court-agnostic — High Court judgments are the same PDF format and the same
> ingestion path.

---

## If something goes wrong

- **Quota exhausted mid-demo** (20 requests/day, 6 per analysis): switch to
  `/preview`. Say plainly: "we're on the free tier, that's our daily cap —
  here's a completed run." Don't apologise at length; move on.
- **Backend down**: this is actually a demo-able feature. Show the error screen,
  point at the command it gives you, start it, hit retry.
- **A question you don't know**: "I don't know — I'd have to check." Judges
  respect it far more than a guess, and it's consistent with the whole point of
  slide 6.

---

## The three sentences that matter most

If everything else falls out of your head, land these:

1. **"Every case is argued by two sides, but it's prepared by one."** *(A)*
2. **"It finds cases that mean the same thing, even with no words in common."* *(B)*
3. **"A confident invention is worse than an admitted gap."** *(C)*
