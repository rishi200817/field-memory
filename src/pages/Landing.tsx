import { Link } from "react-router";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/common";

function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const box = size === "lg" ? "size-11" : "size-9";
  return (
    <span className="flex items-center gap-3">
      <span className={`fm-glow-signal flex ${box} items-center justify-center rounded-md border border-signal/30 bg-signal/10`}>
        <svg viewBox="0 0 24 24" className="size-5 text-signal" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 7c2.5 0 2.5 3 5 3s2.5-3 5-3 2.5 3 5 3" strokeLinecap="round" />
          <path d="M4 14c2.5 0 2.5 3 5 3s2.5-3 5-3 2.5 3 5 3" strokeLinecap="round" opacity="0.55" />
        </svg>
      </span>
      <span className="font-display text-lg font-bold tracking-[0.16em]">FIELDMEMORY</span>
    </span>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

export default function Landing() {
  return (
    <div className="fm-grid-bg min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#problem" className="text-sm text-muted-foreground hover:text-foreground">The problem</a>
            <a href="#memory" className="text-sm text-muted-foreground hover:text-foreground">How memory works</a>
            <a href="#before-after" className="text-sm text-muted-foreground hover:text-foreground">Before / after</a>
            <a href="#architecture" className="text-sm text-muted-foreground hover:text-foreground">Architecture</a>
          </nav>
          <Button asChild className="bg-signal text-signal-foreground hover:bg-signal/90">
            <Link to="/overview">ENTER COMMAND CENTER</Link>
          </Button>
        </div>
      </header>

      {/* 1 — Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-signal">
              Maintenance intelligence · Hyderabad Plant
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              The maintenance agent that remembers what worked.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Turn every repair into experience. FieldMemory recalls previous failures, successful
              fixes, and technician knowledge before making the next decision.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-signal text-signal-foreground hover:bg-signal/90">
                <Link to="/overview">ENTER COMMAND CENTER</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/simulation">RUN 3-MINUTE DEMO</Link>
              </Button>
            </div>
            <p className="mt-4 font-mono text-xs text-muted-foreground">
              Decision support for technicians — a working prototype, not a certified system.
            </p>
          </motion.div>

          {/* Live incident panel motif */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="relative"
          >
            <div className="rounded-lg border border-border bg-card/70 p-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Live incident
                </span>
                <span className="rounded border border-red-400/30 bg-red-400/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-red-400">
                  CRITICAL
                </span>
              </div>
              <p className="mt-3 font-display text-lg font-bold">Compressor C-17</p>
              <p className="font-mono text-xs text-muted-foreground">E204 · high vibration · high temperature</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { l: "TEMP", v: "94°C", c: "text-red-400" },
                  { l: "VIB", v: "8.4 mm/s", c: "text-red-400" },
                  { l: "PRESS", v: "6.1 bar", c: "text-foreground" },
                ].map((t) => (
                  <div key={t.l} className="rounded-md border border-border bg-background/50 p-2.5 text-center">
                    <p className="font-mono text-[9px] tracking-widest text-muted-foreground">{t.l}</p>
                    <p className={`mt-0.5 font-mono text-sm font-semibold ${t.c}`}>{t.v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-md border border-signal/30 bg-signal/5 p-3">
                <p className="font-mono text-[10px] uppercase tracking-widest text-signal">Memory recall</p>
                <div className="mt-2 space-y-1.5 font-mono text-[11px] text-muted-foreground">
                  <p><span className="font-semibold text-red-400">FAILED</span> · 19 Sep 2026 · bearing replacement</p>
                  <p><span className="font-semibold text-emerald-400">RESOLVED</span> · 03 Aug 2026 · alignment correction</p>
                  <p><span className="font-semibold text-emerald-400">RESOLVED</span> · 14 Jun 2026 · lube filter replacement</p>
                </div>
              </div>
              <div className="mt-3 rounded-md border border-border bg-background/50 p-3">
                <p className="text-xs leading-relaxed">
                  “Check alignment before repeating the failed bearing replacement.”
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2 — Problem */}
      <section id="problem" className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <motion.div {...fadeUp}>
            <SectionLabel>The problem</SectionLabel>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight">
              A machine that failed before will fail again — and the plant forgets.
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                {
                  t: "History lives in notebooks",
                  d: "Past repairs sit in paper logs, spreadsheets, and one technician's memory. When the shift changes, the knowledge leaves with them.",
                },
                {
                  t: "Failed repairs get repeated",
                  d: "A bearing replacement that didn't fix E204 in September gets attempted again in November — because nothing connects the two events.",
                },
                {
                  t: "Diagnoses start from zero",
                  d: "Every fault is treated as the first fault. The agent sees the telemetry but none of the plant's hard-won experience.",
                },
              ].map((c) => (
                <div key={c.t} className="rounded-lg border border-border bg-card/60 p-5">
                  <h3 className="font-display text-base font-bold">{c.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.d}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3 — How memory changes decisions */}
      <section id="memory" className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <motion.div {...fadeUp}>
            <SectionLabel>How memory changes decisions</SectionLabel>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight">
              Current problem → recalled experience → better recommendation.
            </h2>
          </motion.div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {[
              { n: "01", t: "Fault detected", d: "Telemetry crosses limits. E204 on C-17." },
              { n: "02", t: "Recall", d: "Hindsight searches retained experiences for this machine and fault." },
              { n: "03", t: "Analyze", d: "Prior failures and successes are weighed against current signals." },
              { n: "04", t: "Recommend", d: "The next check respects what already failed." },
              { n: "05", t: "Repair", d: "The technician acts and records the real outcome." },
              { n: "06", t: "Retain", d: "The new experience is stored — future incidents benefit." },
            ].map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="rounded-lg border border-border bg-card/60 p-4"
              >
                <p className="font-mono text-[10px] text-signal">{s.n}</p>
                <p className="mt-1.5 font-display text-sm font-bold">{s.t}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 — Before vs after */}
      <section id="before-after" className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <motion.div {...fadeUp}>
            <SectionLabel>Before vs after</SectionLabel>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight">
              Same fault. Two very different answers.
            </h2>
          </motion.div>
          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            <motion.div {...fadeUp} className="rounded-lg border border-border bg-card/60 p-6">
              <span className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-muted-foreground">
                MEMORY OFF
              </span>
              <p className="mt-4 text-sm leading-relaxed text-foreground">
                “Possible causes include bearing wear, lubrication problems, or shaft misalignment.
                Inspect the bearing, lubrication system, and shaft alignment.”
              </p>
              <p className="mt-4 font-mono text-[11px] text-muted-foreground">
                General diagnosis — current telemetry only. The failed bearing replacement from
                three weeks ago is invisible.
              </p>
            </motion.div>
            <motion.div {...fadeUp} className="rounded-lg border border-signal/40 bg-signal/5 p-6">
              <span className="rounded bg-signal px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-signal-foreground">
                MEMORY ON
              </span>
              <p className="mt-4 text-sm leading-relaxed text-foreground">
                “I found previous incidents involving Compressor C-17. A bearing replacement was
                previously attempted for E204 and did not resolve the issue. Alignment correction
                succeeded in a later incident. Check alignment before repeating the failed bearing
                replacement.”
              </p>
              <p className="mt-4 font-mono text-[11px] text-signal">
                Experience-aware diagnosis — 3 relevant incidents recalled, ranked by machine,
                fault code and recency.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 5 — Product preview */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <motion.div {...fadeUp}>
            <SectionLabel>Product preview</SectionLabel>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight">
              A command center built for the floor, not the boardroom.
            </h2>
          </motion.div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: "Diagnostics", d: "Three-panel workspace: incident, AI diagnosis, recalled experiences — with the memory switch one click away.", to: "/diagnostics" },
              { t: "Machines", d: "Live telemetry, incident counts and per-machine history across the plant.", to: "/machines" },
              { t: "Memory explorer", d: "Every retained experience: action, outcome, technician notes, what was learned.", to: "/memory" },
              { t: "Learning timeline", d: "Watch the loop operate — every retain and recall recorded as it happens.", to: "/learning" },
            ].map((c) => (
              <motion.div
                key={c.t}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="group h-full"
              >
                <Link
                  to={c.to}
                  className="block h-full rounded-lg border border-border bg-card/60 p-5 transition-colors hover:border-signal/40"
                >
                  <p className="font-display text-base font-bold">{c.t}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{c.d}</p>
                  <p className="mt-3 font-mono text-[10px] text-signal opacity-0 transition-opacity group-hover:opacity-100">
                    OPEN →
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 — Architecture */}
      <section id="architecture" className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <motion.div {...fadeUp}>
            <SectionLabel>How Hindsight fits into the architecture</SectionLabel>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight">
              One interface. Two implementations. Zero keys in the browser.
            </h2>
          </motion.div>
          <div className="mt-10 overflow-hidden rounded-lg border border-border bg-card/60">
            <div className="grid divide-y divide-border md:grid-cols-4 md:divide-x md:divide-y-0">
              {[
                { t: "FieldMemory app", d: "React command center. Incident intake, diagnosis UI, repair recording.", tag: "CLIENT" },
                { t: "Diagnosis engine", d: "Server action. Builds prompts from current incident + recalled evidence, with rules-based fallback.", tag: "SERVER" },
                { t: "Hindsight memory layer", d: "retain() / recall() / getMemory(). Persistent experience store for machines, faults and outcomes.", tag: "MEMORY" },
                { t: "Plant records", d: "Machines, incidents, telemetry, technicians — the operational source of truth.", tag: "DATA" },
              ].map((b) => (
                <div key={b.t} className="p-5">
                  <p className="font-mono text-[9px] tracking-[0.2em] text-signal">{b.tag}</p>
                  <p className="mt-2 font-display text-sm font-bold">{b.t}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{b.d}</p>
                </div>
              ))}
            </div>
            <div className="border-t border-border/60 bg-background/40 px-5 py-3">
              <p className="font-mono text-[11px] text-muted-foreground">
                When Hindsight credentials are absent, a local adapter serves the identical
                interface — the demo runs end-to-end, and the production path is a config change,
                not a rewrite.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7 — Final CTA */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-24">
          <motion.div {...fadeUp}>
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
              The next fault is already in your history.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              Run the C-17 scenario and watch the recommendation change the moment memory turns on.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="bg-signal text-signal-foreground hover:bg-signal/90">
                <Link to="/overview">ENTER COMMAND CENTER</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/simulation">RUN 3-MINUTE DEMO</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row sm:px-6">
          <Logo />
          <p className="font-mono text-[11px] text-muted-foreground">
            Prototype maintenance assistant — decision support, not certified for deployment.
          </p>
        </div>
      </footer>
    </div>
  );
}
