/**
 * Judge-facing pitch deck for Devil's Advocate.
 *
 *   node deck/build_deck.js
 *
 * The palette is lifted straight from the product's own design tokens, so the
 * deck and the demo read as one thing. Dark throughout for a premium feel.
 *
 * Repeating motif: the statutory citation chip (a mono label in a saffron
 * hairline box, e.g. "S.482 CrPC"). It is the product's own visual signature —
 * it appears on every results card in the app — and it carries meaning rather
 * than decorating.
 */
const pptxgen = require("pptxgenjs");

const INK = "14110F";
const FILE = "1E1A17";
const RAISED = "262019";
const RULE = "37302A";
const PARCH = "EDE6DA";
const DIM = "A29889";
const FAINT = "6E655B";
const SAFFRON = "E0A33C";
const TEAL = "6FA8B0";
const CLAY = "BC8358";
const ROSE = "C96A72";

const HEAD = "Cambria";
const BODY = "Calibri";
const MONO = "Courier New";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.3 x 7.5 — must be set before any slide
pres.author = "Devil's Advocate";
pres.title = "Devil's Advocate — AI Legal Case Analysis";

const W = 13.3;
const M = 0.7; // page margin

/** Dark slide with the standard ground. */
function newSlide() {
  const s = pres.addSlide();
  s.background = { color: INK };
  return s;
}

/** The repeating motif: a statutory citation chip. */
function cite(slide, text, x, y, color = SAFFRON) {
  slide.addText(text, {
    x, y, w: 1.55, h: 0.3,
    fontSize: 10, fontFace: MONO, color,
    align: "center", valign: "middle", margin: 0,
    line: { color, width: 0.75 },
    fill: { color: FILE },
  });
}

/** Small step/eyebrow label above a title. */
function eyebrow(slide, text, color = FAINT) {
  slide.addText(text.toUpperCase(), {
    x: M, y: 0.42, w: 8, h: 0.28,
    fontSize: 11, fontFace: MONO, color, charSpacing: 3, margin: 0,
  });
}

function title(slide, text, opts = {}) {
  slide.addText(text, {
    x: M, y: 0.78, w: opts.w || 11.4, h: opts.h || 0.95,
    fontSize: opts.fontSize || 38, fontFace: HEAD, bold: true,
    color: opts.color || PARCH, margin: 0, valign: "top",
  });
}

/** Card surface. */
function card(slide, x, y, w, h, fill = FILE) {
  slide.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.09,
    fill: { color: fill }, line: { color: RULE, width: 1 },
  });
}

// ───────────────────────────────────────────────────────── 1. The problem
{
  const s = newSlide();
  eyebrow(s, "01 · the problem");
  title(s, "A lawyer cannot argue against\ntheir own case.", { h: 1.5 });

  s.addText(
    "Preparation is adversarial, but preparation is done alone. The weakness that decides a case is usually the one counsel never thought to look for — and finding the precedent that governs it means guessing the exact words a judge happened to use.",
    { x: M, y: 2.42, w: 6.2, h: 1.5, fontSize: 15, fontFace: BODY, color: DIM, lineSpacing: 22, margin: 0 }
  );

  // Three stat callouts, right column.
  const stats = [
    ["Keyword", "search misses cases that mean the same thing in different words", TEAL],
    ["Alone", "no opposing view until it is too late to prepare for it", CLAY],
    ["Unchecked", "claims that sound persuasive but the record never supported", ROSE],
  ];
  stats.forEach(([big, small, col], i) => {
    const y = 2.3 + i * 1.35;
    card(s, 7.4, y, 5.2, 1.15);
    s.addText(big, {
      x: 7.7, y: y + 0.14, w: 2.0, h: 0.42,
      fontSize: 19, fontFace: HEAD, bold: true, color: col, margin: 0,
    });
    s.addText(small, {
      x: 7.7, y: y + 0.56, w: 4.6, h: 0.5,
      fontSize: 11.5, fontFace: BODY, color: DIM, margin: 0, lineSpacing: 14,
    });
  });

  s.addText("The gap is not knowledge. It is perspective.", {
    x: M, y: 4.25, w: 6.2, h: 0.5, fontSize: 17, fontFace: HEAD,
    italic: true, color: SAFFRON, margin: 0,
  });

  cite(s, "S.125 CrPC", M, 6.55);
  cite(s, "S.482 CrPC", M + 1.75, 6.55);
  cite(s, "Art.226", M + 3.5, 6.55);
  s.addText("the language a case is actually argued in", {
    x: M + 5.4, y: 6.58, w: 5, h: 0.26, fontSize: 10.5, fontFace: BODY, color: FAINT, margin: 0,
  });

  s.addNotes(
    "Open on the human problem, not the tech. A lawyer preparing a case has no opponent in the room. " +
    "The weakness that loses the case is the one nobody thought to look for. And precedent search today is keyword matching — you have to guess the judge's exact wording."
  );
}

// ───────────────────────────────────────────────────────── 2. What we made
{
  const s = newSlide();
  eyebrow(s, "02 · what we built");
  title(s, "Devil's Advocate", { h: 0.85 });
  s.addText("Six AI agents argue your case against you — and 2,399 real Supreme Court judgments answer back.", {
    x: M, y: 1.72, w: 11.4, h: 0.5, fontSize: 16, fontFace: BODY, color: DIM, margin: 0,
  });

  const items = [
    ["Both sides argued", "One agent builds the strongest case for the appellant. A second rebuts it point by point. Each names its own weakest link.", CLAY],
    ["Evidence audited", "Every claim is checked against the record. Claims the text does not support are marked unsupported, however persuasive they sound.", TEAL],
    ["Precedent retrieved", "Five similar judgments from a 2,400-case corpus, matched on meaning — with the shared provisions shown, so the match can be checked.", SAFFRON],
  ];
  items.forEach(([h, b, col], i) => {
    const x = M + i * 4.02;
    card(s, x, 2.5, 3.75, 2.55);
    // numbered marker in a filled circle — the motif, not a stripe
    s.addShape(pres.ShapeType.ellipse, {
      x: x + 0.28, y: 2.78, w: 0.44, h: 0.44,
      fill: { color: col }, line: { color: col, width: 0 },
    });
    s.addText(String(i + 1), {
      x: x + 0.28, y: 2.78, w: 0.44, h: 0.44,
      fontSize: 14, fontFace: HEAD, bold: true, color: INK,
      align: "center", valign: "middle", margin: 0,
    });
    s.addText(h, {
      x: x + 0.28, y: 3.36, w: 3.2, h: 0.4,
      fontSize: 16, fontFace: HEAD, bold: true, color: PARCH, margin: 0,
    });
    s.addText(b, {
      x: x + 0.28, y: 3.82, w: 3.2, h: 1.1,
      fontSize: 11.5, fontFace: BODY, color: DIM, lineSpacing: 15, margin: 0,
    });
  });

  card(s, M, 5.35, 11.9, 1.15, RAISED);
  s.addText("It never decides the case.", {
    x: M + 0.35, y: 5.55, w: 4.2, h: 0.42,
    fontSize: 17, fontFace: HEAD, bold: true, italic: true, color: SAFFRON, margin: 0,
  });
  s.addText("It shows the case's shape — where it is strong, where it is exposed, and what governs it. The judgment stays with the lawyer.",
    { x: M + 4.6, y: 5.58, w: 7.0, h: 0.7, fontSize: 12.5, fontFace: BODY, color: DIM, lineSpacing: 16, margin: 0 });

  s.addNotes(
    "Name the product, then the three things it does. Land the last line hard: it never decides the case. " +
    "That is a deliberate design position for a legal tool — we surface, the lawyer decides."
  );
}

// ───────────────────────────────────────────────────────── 3. How it works
{
  const s = newSlide();
  eyebrow(s, "03 · how it works");
  title(s, "Seven stages, run in sequence.", { h: 0.85 });
  s.addText("The advocates run in order, not in parallel — so the respondent sees the appellant's arguments and rebuts them. That is what makes it a debate rather than two essays.",
    { x: M, y: 1.68, w: 11.4, h: 0.55, fontSize: 14, fontFace: BODY, color: DIM, margin: 0 });

  const stages = [
    ["Issue Spotter", "issues, facts, dates", SAFFRON],
    ["Appellant's Advocate", "strongest case, one side", CLAY],
    ["Respondent's Advocate", "rebuts, point by point", CLAY],
    ["Evidence Auditor", "what the record supports", TEAL],
    ["Contradiction Finder", "where they truly conflict", TEAL],
    ["Similar Judgments", "runs locally · no API", SAFFRON],
    ["The Judge", "synthesis and assessment", SAFFRON],
  ];

  stages.forEach(([name, sub, col], i) => {
    const col1 = i < 4;
    const x = col1 ? M : M + 6.1;
    const y = 2.45 + (col1 ? i : i - 4) * 1.02;
    card(s, x, y, 5.75, 0.86);
    s.addShape(pres.ShapeType.ellipse, {
      x: x + 0.26, y: y + 0.22, w: 0.42, h: 0.42,
      fill: { color: col }, line: { color: col, width: 0 },
    });
    s.addText(String(i + 1), {
      x: x + 0.26, y: y + 0.22, w: 0.42, h: 0.42,
      fontSize: 13, fontFace: HEAD, bold: true, color: INK,
      align: "center", valign: "middle", margin: 0,
    });
    s.addText(name, {
      x: x + 0.85, y: y + 0.14, w: 3.3, h: 0.32,
      fontSize: 14, fontFace: HEAD, bold: true, color: PARCH, margin: 0,
    });
    s.addText(sub, {
      x: x + 0.85, y: y + 0.46, w: 4.6, h: 0.28,
      fontSize: 11, fontFace: BODY, color: FAINT, margin: 0,
    });
  });

  card(s, M + 6.1, 6.4, 5.75, 0.6, RAISED);
  s.addText("Stage 6 needs no internet. It keeps working when the model does not.", {
    x: M + 6.35, y: 6.47, w: 5.3, h: 0.45, fontSize: 11.5, fontFace: BODY,
    color: SAFFRON, margin: 0, valign: "middle",
  });

  s.addNotes(
    "Emphasise the sequencing — the respondent reads the appellant's output. " +
    "Then flag stage 6: precedent search runs entirely on the local machine, so it survives an API outage. That matters for the failure story on slide 6."
  );
}

// ───────────────────────────────────────────────────────── 4. The hard part
{
  const s = newSlide();
  eyebrow(s, "04 · the hard part");
  title(s, "Searching 2,400 judgments\nby meaning, not keywords.", { h: 1.5 });

  s.addText(
    "Every judgment is converted once into a list of 384 numbers — its position on a map of meaning. Cases about the same thing land close together even with no words in common.",
    { x: M, y: 2.45, w: 5.9, h: 1.1, fontSize: 14, fontFace: BODY, color: DIM, lineSpacing: 20, margin: 0 }
  );

  // The worked example — the core idea, shown rather than described.
  card(s, M, 3.7, 5.9, 2.35, RAISED);
  s.addText("“unmarried daughter seeking maintenance from her father”", {
    x: M + 0.3, y: 3.95, w: 5.3, h: 0.55, fontSize: 12.5, fontFace: BODY,
    italic: true, color: TEAL, margin: 0,
  });
  s.addText("“major unmarried girl claiming support from her parent”", {
    x: M + 0.3, y: 4.55, w: 5.3, h: 0.55, fontSize: 12.5, fontFace: BODY,
    italic: true, color: CLAY, margin: 0,
  });
  s.addText("Zero shared keywords. Nearly identical meaning.\nKeyword search finds nothing. This finds the match.", {
    x: M + 0.3, y: 5.2, w: 5.3, h: 0.65, fontSize: 11.5, fontFace: BODY,
    color: DIM, lineSpacing: 15, margin: 0,
  });

  const facts = [
    ["2,399", "judgments indexed, of 2,400"],
    ["230 ms", "to search all of them"],
    ["0", "network calls at query time"],
  ];
  facts.forEach(([big, small], i) => {
    const y = 2.45 + i * 1.45;
    card(s, 7.15, y, 5.45, 1.25);
    s.addText(big, {
      x: 7.45, y: y + 0.18, w: 2.1, h: 0.62,
      fontSize: 30, fontFace: HEAD, bold: true, color: SAFFRON, margin: 0,
    });
    s.addText(small, {
      x: 9.5, y: y + 0.38, w: 2.9, h: 0.5,
      fontSize: 12, fontFace: BODY, color: DIM, margin: 0, valign: "middle",
    });
  });

  s.addText("Supreme Court of India · 2020–2025 · indexed on this laptop", {
    x: 7.15, y: 6.8, w: 5.45, h: 0.3, fontSize: 10.5, fontFace: MONO, color: FAINT, margin: 0,
  });

  s.addNotes(
    "This is the technical heart. Explain the meaning-map simply, then show the two phrases — they share almost no words but mean the same thing. " +
    "Stress: the whole corpus is on the laptop, so the demo cannot be broken by wifi."
  );
}

// ───────────────────────────────────────────────────────── 5. Does it work
{
  const s = newSlide();
  eyebrow(s, "05 · does it work");
  title(s, "We described a case in our own\nwords. It found the authority.", { h: 1.5 });

  card(s, M, 2.55, 6.5, 3.35);
  s.addText("Top match", {
    x: M + 0.32, y: 2.75, w: 3, h: 0.3, fontSize: 11, fontFace: MONO,
    color: FAINT, charSpacing: 2, margin: 0,
  });
  s.addText("Abhilasha vs Parkash (2020)", {
    x: M + 0.32, y: 3.08, w: 5.9, h: 0.45, fontSize: 20, fontFace: HEAD,
    bold: true, color: SAFFRON, margin: 0,
  });
  s.addText("The controlling Supreme Court authority on exactly this question — found from a paraphrase, with no copied wording.", {
    x: M + 0.32, y: 3.6, w: 5.85, h: 0.75, fontSize: 12.5, fontFace: BODY,
    color: DIM, lineSpacing: 16, margin: 0,
  });
  cite(s, "S.125 CrPC", M + 0.32, 4.45);
  cite(s, "S.482 CrPC", M + 2.05, 4.45);
  cite(s, "S.20 HAMA", M + 3.78, 4.45);
  s.addText("Also returned: Rajnesh vs Neha (2020) — the leading Indian judgment on maintenance.", {
    x: M + 0.32, y: 4.95, w: 5.85, h: 0.65, fontSize: 12, fontFace: BODY,
    color: PARCH, lineSpacing: 15, margin: 0,
  });

  // Native chart: the weight-tuning result.
  s.addChart(
    pres.ChartType.bar,
    [{
      name: "recall@5",
      labels: ["As designed", "Issue weight cut", "Tuned (shipped)"],
      values: [0.268, 0.337, 0.396],
    }],
    {
      x: 7.4, y: 2.55, w: 5.2, h: 2.5,
      barDir: "col",
      chartColors: [CLAY, DIM, SAFFRON],
      varyColors: true,
      showTitle: true,
      title: "Retrieval quality, 1,420 test queries",
      titleColor: PARCH, titleFontSize: 12, titleFontFace: BODY,
      showValue: true, dataLabelPosition: "outEnd",
      dataLabelColor: PARCH, dataLabelFontSize: 11, dataLabelFormatCode: "0.000",
      showLegend: false,
      catAxisLabelColor: DIM, catAxisLabelFontSize: 10,
      valAxisLabelColor: FAINT, valAxisLabelFontSize: 9,
      valGridLine: { color: RULE, size: 1 },
      catGridLine: { style: "none" },
      valAxisMaxVal: 0.5,
      plotArea: { fill: { color: INK } },
      chartArea: { fill: { color: INK } },
    }
  );

  card(s, 7.4, 5.25, 5.2, 1.55, RAISED);
  s.addText("The measurement overturned our own design.", {
    x: 7.65, y: 5.45, w: 4.7, h: 0.35, fontSize: 13, fontFace: HEAD,
    bold: true, color: SAFFRON, margin: 0,
  });
  s.addText("A signal we hand-built was making results worse. We measured it, switched it off, and gained 47%.",
    { x: 7.65, y: 5.82, w: 4.7, h: 0.8, fontSize: 11.5, fontFace: BODY, color: DIM, lineSpacing: 15, margin: 0 });

  s.addText("Graded against shared cited precedents — a proxy, not human relevance judgment.", {
    x: M, y: 6.35, w: 6.5, h: 0.4, fontSize: 10, fontFace: BODY, italic: true, color: FAINT, margin: 0,
  });

  s.addNotes(
    "Lead with the Abhilasha result — it is the single most convincing thing we have. " +
    "Then the chart: we tuned against 1,420 queries and the data told us one of our own components was hurting. We cut it. " +
    "If asked, be upfront that the metric is a proxy — that honesty is the point of the next slide."
  );
}

// ───────────────────────────────────────────────────────── 6. What's different
{
  const s = newSlide();
  eyebrow(s, "06 · what makes it different");
  title(s, "It tells you when it doesn't know.", { h: 0.85 });
  s.addText("In a legal tool, a confident invention is worse than an admitted gap. So the failure states are the feature.",
    { x: M, y: 1.68, w: 11.4, h: 0.45, fontSize: 15, fontFace: BODY, color: DIM, margin: 0 });

  const rows = [
    ["A stage cannot run", "The section stays empty and says so. Nothing is invented to fill it.", ROSE],
    ["A match is weak", "Every result is badged weak rather than presented as comparable precedent.", CLAY],
    ["A claim is unsupported", "Marked unsupported, however persuasive it sounds. Asserting is not evidence.", TEAL],
    ["The model is unreachable", "Precedent search runs locally and keeps working. The analysis degrades, it does not lie.", SAFFRON],
  ];
  rows.forEach(([h, b, col], i) => {
    const y = 2.3 + i * 0.98;
    card(s, M, y, 7.6, 0.82);
    s.addShape(pres.ShapeType.ellipse, {
      x: M + 0.28, y: y + 0.25, w: 0.36, h: 0.36,
      fill: { color: col }, line: { color: col, width: 0 },
    });
    s.addText(h, {
      x: M + 0.82, y: y + 0.13, w: 2.9, h: 0.32,
      fontSize: 13.5, fontFace: HEAD, bold: true, color: PARCH, margin: 0,
    });
    s.addText(b, {
      x: M + 3.75, y: y + 0.18, w: 3.65, h: 0.55,
      fontSize: 10.5, fontFace: BODY, color: DIM, lineSpacing: 13, margin: 0,
    });
  });

  card(s, 8.7, 2.3, 3.9, 3.76, RAISED);
  s.addText("Next", {
    x: 8.98, y: 2.52, w: 3.3, h: 0.32, fontSize: 11, fontFace: MONO,
    color: FAINT, charSpacing: 2, margin: 0,
  });
  s.addText(
    [
      { text: "Fine-tune retrieval on the citation graph — free training pairs from our own corpus", options: { bullet: true, breakLine: true } },
      { text: "Rank precedent by influence: how often each judgment is cited by the others", options: { bullet: true, breakLine: true } },
      { text: "Export the analysis as a working brief", options: { bullet: true, breakLine: true } },
      { text: "Extend beyond the Supreme Court to High Court judgments", options: { bullet: true } },
    ],
    { x: 8.98, y: 2.92, w: 3.35, h: 2.9, fontSize: 11.5, fontFace: BODY, color: DIM, paraSpaceAfter: 10, margin: 0 }
  );

  card(s, M, 6.42, 11.9, 0.64, RAISED);
  s.addText("Demo: paste a case, watch six agents argue it, and see the precedent that governs it.", {
    x: M + 0.35, y: 6.5, w: 11.2, h: 0.5, fontSize: 13, fontFace: HEAD,
    italic: true, color: SAFFRON, margin: 0, valign: "middle",
  });

  s.addNotes(
    "Close on the design position: we would rather show a gap than fill it convincingly. " +
    "Walk through the four honesty behaviours, mention next steps briefly, then go straight into the live demo."
  );
}

pres.writeFile({ fileName: "deck/Devils-Advocate-Pitch.pptx" }).then((f) => {
  console.log("wrote", f);
});
