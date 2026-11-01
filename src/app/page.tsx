import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { EntryForm } from "@/components/landing/entry-form";

export default function Home() {
  return <main className="entry-surface landing-surface min-h-svh px-6 py-7 sm:px-10 lg:px-16">
    <header className="brand-header"><span className="brand-mark">REDLINE<span aria-hidden="true">_</span></span><span className="eyebrow hidden sm:block">NOVUS CITY / 2042</span><span className="header-label"><ShieldCheck size={13} aria-hidden="true"/>SECURE OPERATOR ACCESS</span></header>
    <div className="landing-grid"><div className="landing-grid-signal" aria-hidden="true"><span>ORACLE / NOVUS GRID</span><i/><i/><i/><i/><span>06:00:00 / MONITORING S7</span></div><section className="hero-copy"><p className="eyebrow text-technical">ORACLE EMERGENCY NETWORK / NOVUS CITY</p>
      <h1 className="hero-title">REDLINE</h1>
      <h2 className="hero-tagline">NOBODY HAS<br/>THE WHOLE TRUTH.</h2>
      <p className="eyebrow mt-6 text-technical">A MULTIPLAYER AI CRISIS SIMULATION</p><p className="mt-6 max-w-md text-base leading-7 text-muted">One city is failing. Four operators hold different information. Everyone has to make the decision.</p>
      <div className="hero-facts"><div><strong>4</strong><span>OPERATORS</span></div><div><strong>1</strong><span>CITY</span></div><div><strong>12</strong><span>MINUTES</span></div></div>
    </section><EntryForm/></div>
    <footer className="entry-footer"><span>BLACKOUT — NOVUS CITY, 2042</span><span className="flex items-center gap-2">EVERY DECISION IS SHARED<ArrowUpRight size={12} aria-hidden="true"/></span></footer>
  </main>;
}
