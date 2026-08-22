"use client";

import Link from "next/link";
import { 
  Search, 
  ShieldAlert, 
  Target, 
  BarChart3, 
  Users, 
  FileText, 
  Lightbulb, 
  BrainCircuit, 
  ClipboardCheck, 
  RefreshCcw, 
  Shield, 
  Zap, 
  FileCheck 
} from "lucide-react";
import Silk from "@/components/shared/Silk";
import ScrollStack, { ScrollStackItem } from "@/components/shared/ScrollStack";
import BorderGlow from "@/components/shared/BorderGlow";
import { Reveal, StaggerText, Magnetic, TiltCard } from "@/components/shared/Motion";

export default function Home() {
  const sharedGlowSettings = {
    edgeSensitivity: 25,
    borderRadius: 32,
    glowRadius: 45,
    coneSpread: 24,
    fillOpacity: 0.18,
    className: "h-full"
  };

  return (
    <div className="relative w-full bg-ink text-parchment flex flex-col items-center">
      
      {/* Cinematic Hero Section */}
      <section id="hero" className="relative w-full h-screen min-h-[650px] flex flex-col justify-center items-center px-6 lg:px-12 overflow-hidden py-24">
        {/* Background Silk Canvas */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-20 mix-blend-screen">
          <Silk speed={1.2} scale={0.7} color="#4A2F14" noiseIntensity={0.6} rotation={0.4} />
        </div>

        {/* Centered Hero Content */}
        <div className="max-w-4xl w-full flex flex-col items-center text-center z-10 mt-8 select-none">
          <Reveal y={12}>
            <span className="block text-[10px] sm:text-xs font-semibold tracking-[0.35em] text-parchment-faint uppercase mb-5 leading-none font-mono">
              Pressure Test Your Case
            </span>
          </Reveal>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-parchment tracking-tight leading-[1.05] max-w-[850px] mb-6 font-heading">
            <StaggerText text="Before opposing counsel finds the hole," delay={120} />
            <br />
            <span className="text-saffron">
              <StaggerText text="let AI argue against you first." delay={420} />
            </span>
          </h1>

          <p className="text-base sm:text-lg text-parchment-dim max-w-[580px] leading-relaxed mb-10 font-sans mx-auto">
            Six agents read your case, argue both sides, audit which claims the
            record actually supports, and surface similar Supreme Court judgments.
            The judgment stays yours.
          </p>

          <Reveal delay={900} className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto justify-center">
            <Magnetic className="w-full sm:w-auto">
            <Link
              href="/submit"
              className="block w-full sm:w-auto px-8 py-4 bg-saffron hover:bg-saffron/85 text-parchment font-semibold rounded-full shadow-lg shadow-saffron/10 hover:shadow-saffron/25 transition-all duration-300 text-center scale-100 hover:scale-[1.02] active:scale-[0.98] text-sm uppercase tracking-wider"
            >
              Start Analysis
            </Link>
            </Magnetic>
            <a
              href="#process"
              className="w-full sm:w-auto px-8 py-4 bg-transparent border border-rule-bright hover:border-parchment-faint text-parchment-dim hover:text-parchment font-semibold rounded-full transition-all duration-300 text-center hover:bg-white/5 active:scale-[0.98] text-sm uppercase tracking-wider"
            >
              Watch How It Works
            </a>
          </Reveal>
        </div>
      </section>

      {/* Analysis Scroll Stack Section */}
      <section id="analysis" className="w-full bg-ink py-24 px-4 flex flex-col items-center scroll-mt-section">
        <div className="max-w-4xl w-full">
          <Reveal className="text-center mb-16">
            <span className="text-[10px] sm:text-xs font-semibold tracking-[0.35em] text-saffron uppercase mb-4 block leading-none font-mono">
              Adversarial Dialogue
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-parchment tracking-tight leading-tight mb-4 font-heading">
              Your case survives six rounds of scrutiny.
            </h2>
            <p className="text-parchment-dim text-sm sm:text-base max-w-xl mx-auto">
              Each agent examines the record from a different angle.
            </p>
          </Reveal>

          <ScrollStack 
            useWindowScroll={true} 
            itemDistance={120} 
            itemStackDistance={35} 
            baseScale={0.9}
            rotationAmount={-1}
            blurAmount={2}
          >
            {/* Card 1: Market Diagnostics */}
            <ScrollStackItem>
              <BorderGlow
                {...sharedGlowSettings}
                glowColor="220 90 70"
                colors={["#E0A33C", "#E0A33C", "#EBBE72"]}
                animated={true}
              >
                <div className="p-8 md:p-12 h-full flex flex-col md:flex-row items-stretch gap-8">
                  <div className="flex flex-col justify-between flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <Search className="text-saffron" size={24} strokeWidth={1.5} />
                      <h3 className="text-xl font-bold text-parchment tracking-tight font-heading">
                        Issue Spotting
                      </h3>
                    </div>
                    <p className="text-parchment-dim leading-relaxed text-sm">
                      Extract the legal questions actually being decided, the facts material to the outcome, the provisions invoked, and a reconciled timeline of events — from unstructured judgment text.
                    </p>
                  </div>
                  <div className="flex-1 flex flex-col justify-end">
                    {/* Extracted provisions visual */}
                    <div className="w-full h-28 bg-ink/60 border border-white/5 rounded-xl p-4 flex flex-col justify-center gap-2 select-none">
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-saffron/15 text-saffron border border-saffron/30">S.482 CrPC</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-saffron/15 text-saffron border border-saffron/30">S.420 IPC</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-saffron/15 text-saffron border border-saffron/30">Art.226</span>
                      </div>
                      <div className="text-[9px] font-mono text-parchment-faint uppercase tracking-widest">3 issues · 7 key dates extracted</div>
                    </div>
                  </div>
                </div>
              </BorderGlow>
            </ScrollStackItem>

            {/* Card 2: Opposing Counsel (Strongest Card) */}
            <ScrollStackItem>
              <BorderGlow
                {...sharedGlowSettings}
                glowColor="0 90 65"
                colors={["#C96A72", "#D4828A", "#DE9AA1"]}
                animated={true}
                glowIntensity={1.4}
                innerBg="rgba(24, 15, 15, 0.95)"
              >
                <div className="p-8 md:p-12 h-full flex flex-col md:flex-row items-stretch gap-8 glow-red">
                  <div className="flex flex-col justify-between flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <ShieldAlert className="text-rose" size={24} strokeWidth={1.5} />
                      <h3 className="text-xl font-bold text-parchment tracking-tight font-heading">
                        Opposing Counsel
                      </h3>
                    </div>
                    <p className="text-parchment-dim leading-relaxed text-sm">
                      Two agents argue the case at its strongest from each side — the respondent rebutting the appellant point by point. Then an auditor checks which claims the record actually supports.
                    </p>
                  </div>
                  <div className="flex-1 flex flex-col justify-end">
                    {/* Evidence audit visual */}
                    <div className="w-full h-28 bg-rose/10 border border-rose/20 rounded-xl p-4 flex flex-col justify-center gap-2.5 select-none">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose animate-pulse" />
                        <span className="text-[10px] font-mono text-rose uppercase tracking-widest">2 claims unsupported by record</span>
                      </div>
                      <div className="flex gap-1.5">
                        <div className="flex-1 h-1.5 rounded-full bg-teal/70" />
                        <div className="flex-1 h-1.5 rounded-full bg-teal/70" />
                        <div className="flex-1 h-1.5 rounded-full bg-saffron/70" />
                        <div className="flex-1 h-1.5 rounded-full bg-rose/80" />
                        <div className="flex-1 h-1.5 rounded-full bg-rose/80" />
                      </div>
                      <div className="text-[9px] font-mono text-rose/60 uppercase">Asserting a fact is not evidence of it</div>
                    </div>
                  </div>
                </div>
              </BorderGlow>
            </ScrollStackItem>

            {/* Card 3: Contradiction Finder */}
            <ScrollStackItem>
              <BorderGlow
                {...sharedGlowSettings}
                glowColor="220 80 70"
                colors={["#E0A33C", "#8A6526", "#EBBE72"]}
              >
                <div className="p-8 md:p-12 h-full flex flex-col md:flex-row items-stretch gap-8">
                  <div className="flex flex-col justify-between flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <Target className="text-saffron" size={24} strokeWidth={1.5} />
                      <h3 className="text-xl font-bold text-parchment tracking-tight font-heading">
                        Contradiction Finder
                      </h3>
                    </div>
                    <p className="text-parchment-dim leading-relaxed text-sm">
                      Surface the points where the two sides take genuinely incompatible positions on the same question — not merely where they differ in emphasis.
                    </p>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    {/* Target circles visual */}
                    <div className="w-full h-28 bg-ink/60 border border-white/5 rounded-xl flex items-center justify-center select-none">
                      <div className="relative w-16 h-16 rounded-full border border-rule flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full border border-rule-bright flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full border border-saffron/30 flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-saffron" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </BorderGlow>
            </ScrollStackItem>

            {/* Card 4: Similar Judgments */}
            <ScrollStackItem>
              <BorderGlow
                {...sharedGlowSettings}
                glowColor="200 70 75"
                colors={["#8FC0C6", "#6FA8B0", "#E0A33C"]}
              >
                <div className="p-8 md:p-12 h-full flex flex-col md:flex-row items-stretch gap-8">
                  <div className="flex flex-col justify-between flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <BarChart3 className="text-saffron" size={24} strokeWidth={1.5} />
                      <h3 className="text-xl font-bold text-parchment tracking-tight font-heading">
                        Similar Judgments
                      </h3>
                    </div>
                    <p className="text-parchment-dim leading-relaxed text-sm">
                      Search 2,400 real Supreme Court judgments (2020–2025) by meaning and by shared statutory provisions — with the reason for every match shown, not just a score.
                  </p>
                  </div>
                  <div className="flex-1 flex flex-col justify-end">
                    {/* Similar-judgment match visual */}
                    <div className="w-full h-28 bg-ink/60 border border-white/5 rounded-xl p-3 flex flex-col justify-center gap-1.5 text-[9px] font-mono select-none">
                      {[
                        { pct: "94", tag: "S.482 CrPC" },
                        { pct: "81", tag: "S.420 IPC" },
                        { pct: "76", tag: "Art.226" },
                      ].map((row) => (
                        <div key={row.tag} className="flex items-center gap-2">
                          <span className="text-parchment w-7 tabular-nums">{row.pct}%</span>
                          <div className="flex-1 h-1 rounded-full bg-file-raised overflow-hidden">
                            <div className="h-full bg-saffron" style={{ width: `${row.pct}%` }} />
                          </div>
                          <span className="px-1 py-0.5 rounded bg-saffron/15 text-saffron border border-saffron/30">
                            {row.tag}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </BorderGlow>
            </ScrollStackItem>

            {/* Card 5: Evidence Audit */}
            <ScrollStackItem>
              <BorderGlow
                {...sharedGlowSettings}
                glowColor="260 80 75"
                colors={["#BC8358", "#CE9B76", "#DDB694"]}
              >
                <div className="p-8 md:p-12 h-full flex flex-col md:flex-row items-stretch gap-8">
                  <div className="flex flex-col justify-between flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <Users className="text-saffron" size={24} strokeWidth={1.5} />
                      <h3 className="text-xl font-bold text-parchment tracking-tight font-heading">
                        Evidence Audit
                      </h3>
                    </div>
                    <p className="text-parchment-dim leading-relaxed text-sm">
                      Check every claim both sides make against the record. Claims the text does not support are marked unsupported, however plausible they sound — an advocate asserting something is not evidence of it.
                    </p>
                  </div>
                  <div className="flex-1 flex flex-col justify-end">
                    {/* Persona cards visual */}
                    <div className="w-full h-28 bg-ink/60 border border-white/5 rounded-xl p-4 flex gap-3 items-center select-none">
                      <div className="flex-1 bg-file/60 border border-white/5 p-3 rounded-lg flex flex-col gap-1.5">
                        <div className="w-8 h-1.5 bg-rule-bright rounded-full" />
                        <div className="w-full h-1 bg-file-raised rounded-full" />
                        <div className="w-[80%] h-1 bg-file-raised rounded-full" />
                      </div>
                      <div className="flex-1 bg-file/60 border border-white/5 p-3 rounded-lg flex flex-col gap-1.5 transform -translate-y-1">
                        <div className="w-8 h-1.5 bg-saffron/50 rounded-full" />
                        <div className="w-full h-1 bg-file-raised rounded-full" />
                        <div className="w-[60%] h-1 bg-file-raised rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </BorderGlow>
            </ScrollStackItem>

            {/* Card 6: The Assessment */}
            <ScrollStackItem>
              <BorderGlow
                {...sharedGlowSettings}
                glowColor="190 70 80"
                colors={["#6FA8B0", "#8FC0C6", "#A9D2D6"]}
              >
                <div className="p-8 md:p-12 h-full flex flex-col md:flex-row items-stretch gap-8">
                  <div className="flex flex-col justify-between flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <FileText className="text-saffron" size={24} strokeWidth={1.5} />
                      <h3 className="text-xl font-bold text-parchment tracking-tight font-heading">
                        The Assessment
                      </h3>
                    </div>
                    <p className="text-parchment-dim leading-relaxed text-sm">
                      A synthesis of the issues, both cases, the evidence gaps and the retrieved precedent — with what the outcome turns on. It reads the case; it never decides it.
                    </p>
                  </div>
                  <div className="flex-1 flex flex-col justify-end">
                    {/* Decision report visual */}
                    <div className="w-full h-28 bg-ink/60 border border-white/5 rounded-xl p-4 flex flex-col justify-between select-none">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-[8px] font-mono text-parchment-faint">PDF INTERROGATION EXPORT</span>
                        <span className="text-[8px] font-mono text-saffron">DOWNLOAD</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <div className="h-1 bg-file-raised rounded" />
                        <div className="h-1 bg-file-raised rounded w-[90%]" />
                        <div className="h-1 bg-file-raised rounded w-[45%]" />
                      </div>
                    </div>
                  </div>
                </div>
              </BorderGlow>
            </ScrollStackItem>
          </ScrollStack>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="process" className="w-full bg-ink py-24 px-4 flex flex-col items-center border-t border-rule scroll-mt-section">
        <div className="max-w-4xl w-full">
          <Reveal className="text-center mb-20">
            <span className="text-[10px] sm:text-xs font-semibold tracking-[0.35em] text-saffron uppercase mb-4 block leading-none font-mono">
              The Protocol
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold text-parchment tracking-tight leading-tight mb-4 font-heading">
              How the analysis works.
            </h2>
            <p className="text-parchment-dim text-sm sm:text-base max-w-md mx-auto">
              How a case moves through the pipeline, step by step.
            </p>
          </Reveal>

          {/* Centered vertical timeline layout */}
          <div className="relative flex flex-col items-center max-w-2xl mx-auto">
            {/* Vertical connector line */}
            <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-file-raised -translate-x-1/2 z-0" />

            {/* Step 1 */}
            <Reveal delay={0} className="relative w-full z-10"><div className="relative w-full flex flex-col items-center mb-16 z-10 text-center">
              <div className="w-12 h-12 rounded-full bg-ink border border-rule flex items-center justify-center text-parchment-dim mb-4 shadow-xl">
                <Lightbulb size={20} strokeWidth={1.5} />
              </div>
              <div className="text-[10px] font-mono text-saffron mb-2 uppercase tracking-widest">Step 01</div>
              <h3 className="text-xl font-bold text-parchment mb-2 font-heading">Submit the Case</h3>
              <p className="text-sm text-parchment-dim max-w-sm leading-relaxed">
                Paste the judgment, petition, or case summary.
              </p>
            </div>
            </Reveal>

            {/* Step 2 */}
            <Reveal delay={110} className="relative w-full z-10"><div className="relative w-full flex flex-col items-center mb-16 z-10 text-center">
              <div className="w-12 h-12 rounded-full bg-ink border border-rule flex items-center justify-center text-parchment-dim mb-4 shadow-xl">
                <BrainCircuit size={20} strokeWidth={1.5} />
              </div>
              <div className="text-[10px] font-mono text-saffron mb-2 uppercase tracking-widest">Step 02</div>
              <h3 className="text-xl font-bold text-parchment mb-2 font-heading">The Agents Argue</h3>
              <p className="text-sm text-parchment-dim max-w-sm leading-relaxed">
                Both sides are argued at their strongest, then cross-checked.
              </p>
            </div>
            </Reveal>

            {/* Step 3 */}
            <Reveal delay={220} className="relative w-full z-10"><div className="relative w-full flex flex-col items-center mb-16 z-10 text-center">
              <div className="w-12 h-12 rounded-full bg-ink border border-rule flex items-center justify-center text-parchment-dim mb-4 shadow-xl">
                <ClipboardCheck size={20} strokeWidth={1.5} />
              </div>
              <div className="text-[10px] font-mono text-saffron mb-2 uppercase tracking-widest">Step 03</div>
              <h3 className="text-xl font-bold text-parchment mb-2 font-heading">Review the Findings</h3>
              <p className="text-sm text-parchment-dim max-w-sm leading-relaxed">
                Issues, arguments, evidence gaps, contradictions, and precedent.
              </p>
            </div>
            </Reveal>

            {/* Step 4 */}
            <Reveal delay={330} className="relative w-full z-10"><div className="relative w-full flex flex-col items-center z-10 text-center">
              <div className="w-12 h-12 rounded-full bg-ink border border-rule flex items-center justify-center text-parchment-dim mb-4 shadow-xl">
                <RefreshCcw size={20} strokeWidth={1.5} />
              </div>
              <div className="text-[10px] font-mono text-saffron mb-2 uppercase tracking-widest">Step 04</div>
              <h3 className="text-xl font-bold text-parchment mb-2 font-heading">Decide for Yourself</h3>
              <p className="text-sm text-parchment-dim max-w-sm leading-relaxed">
                The analysis informs the judgment. It never makes it.
              </p>
            </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Dramatic Final CTA Section */}
      <section id="cta" className="relative w-full py-32 px-6 flex flex-col items-center text-center overflow-hidden cta-spotlight border-t border-rule scroll-mt-section">
        <div className="max-w-3xl z-10 flex flex-col items-center">
          <span className="text-[10px] sm:text-xs font-semibold tracking-[0.35em] text-parchment-faint uppercase mb-5 leading-none font-mono">
            Secure Deployment
          </span>
          
          <h2 className="text-3xl sm:text-5xl font-extrabold text-parchment tracking-tight leading-tight mb-6 font-heading">
            Better to lose an argument with AI
            <br />
            than lose a company to reality.
          </h2>
          
          <p className="text-base sm:text-lg text-parchment-dim max-w-lg mx-auto mb-10 font-sans">
            Test your assumptions before the market does.
          </p>

          <Link
            href="/submit"
            className="px-8 py-4 bg-saffron hover:bg-saffron/85 text-parchment font-semibold rounded-full shadow-lg shadow-saffron/10 hover:shadow-saffron/25 transition-all duration-300 scale-100 hover:scale-[1.02] active:scale-[0.98] text-sm uppercase tracking-wider font-mono flex items-center gap-2 border border-saffron/20"
          >
            Start Your First Analysis
          </Link>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="w-full bg-[#14110F] border-t border-rule py-16 px-6 flex flex-col items-center">
        <div className="max-w-7xl w-full grid grid-cols-1 md:grid-cols-3 gap-10 items-start justify-between">
          
          {/* Left Block */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 bg-saffron rounded flex items-center justify-center shadow-lg shadow-saffron/20">
                <span className="text-parchment font-bold text-[10px] font-mono">DA</span>
              </div>
              <span className="text-sm font-bold tracking-[0.2em] text-parchment uppercase font-heading">
                Devil's Advocate
              </span>
            </div>
            <p className="text-xs text-parchment-faint mt-1">
              Pressure test a case before opposing counsel does.
            </p>
          </div>

          {/* Center Links Block */}
          <div className="flex items-center justify-center gap-8 text-xs text-parchment-dim font-mono">
            <Link href="/#hero" className="hover:text-parchment transition-colors">
              HOME
            </Link>
            <Link href="/#analysis" className="hover:text-parchment transition-colors">
              ANALYSIS
            </Link>
            <Link href="/#process" className="hover:text-parchment transition-colors">
              PROCESS
            </Link>
            <Link href="/#cta" className="hover:text-parchment transition-colors">
              START
            </Link>
          </div>

          {/* Right Trust Indicators Block */}
          <div className="flex flex-col items-center md:items-end gap-3 text-xs text-parchment-faint font-mono">
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-saffron/60" strokeWidth={1.5} />
              <span>PRIVATE & SECURE</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-saffron/60" strokeWidth={1.5} />
              <span>FAST GENERATION</span>
            </div>
            <div className="flex items-center gap-2">
              <FileCheck size={14} className="text-saffron/60" strokeWidth={1.5} />
              <span>ACTIONABLE INSIGHTS</span>
            </div>
          </div>
        </div>

        {/* Divider and copyright */}
        <div className="mt-12 pt-8 border-t border-rule/60 w-full max-w-7xl flex justify-center">
          <p className="text-[9px] text-parchment-faint tracking-widest uppercase font-mono">
            &copy; {new Date().getFullYear()} Devil's Advocate. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
