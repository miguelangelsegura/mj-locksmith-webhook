"use client";

import { useEffect, useRef, useState } from "react";
import PhoneCall from "./components/PhoneCall";
import Calculator from "./components/Calculator";
import ContactTab from "./components/ContactTab";

const CONFIG = {
  book: "https://cal.com/REPLACE/dispango-demo", // Cal.com free booking link
  portal: "https://billing.stripe.com/p/login/REPLACE", // Stripe customer portal (Sign In)
  getStarted: "/get-started", // self-onboarding form (Sprint B)
  demoLine: "", // live call-in demo number — turned on after the rate-limit failsafe (Sprint C)
  sampleAudio: "", // URL to a recorded sample call; the player renders only when this is set
  email: "hello@dispango.com",
  phone: "(000) 000-0000",
  legalName: "Jam Works Inc.",
  address: "REPLACE — registered mailing address, City, ON, Canada",
};
const PRICE = 199;

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      }),
      { threshold: 0.05, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
    const failsafe = setTimeout(() => els.forEach((el) => el.classList.add("in")), 2500);
    return () => { io.disconnect(); clearTimeout(failsafe); };
  }, []);
}

/* Counts up to `to` once scrolled into view (respects reduced-motion). */
function CountUp({ to, prefix = "", className = "" }) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) { setN(to); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const dur = 900;
        const tick = (now) => {
          const p = Math.min(1, (now - start) / dur);
          setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [to]);
  return <span ref={ref} className={className}>{prefix}{n}</span>;
}

function Logo() {
  return (
    <span className="inline-flex items-center gap-2 text-ink">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5b5bf5" /><stop offset="1" stopColor="#3a34c9" /></linearGradient></defs>
        <rect width="32" height="32" rx="8" fill="url(#lg)" />
        <circle cx="11" cy="22" r="2.4" fill="#fff" />
        <path d="M11 17a5 5 0 0 1 5 5" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M11 12a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </svg>
      <span className="text-[1.35rem] font-extrabold tracking-[-0.02em]">Dispango</span>
    </span>
  );
}

function Btn({ children, href = "#book", variant = "primary", className = "" }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-transform duration-100 hover:-translate-y-0.5";
  const styles = {
    primary: "bg-brand text-white shadow-lg shadow-brand/30 hover:bg-brand-600",
    ghost: "border border-line bg-white text-ink hover:border-brand",
    light: "bg-white text-ink hover:bg-indigo-50",
  };
  return <a href={href} className={`${base} ${styles[variant]} ${className}`}>{children}</a>;
}

function Arrow() {
  return <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true"><path d="M4 10h11m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Tick({ className = "text-emerald" }) {
  return <svg viewBox="0 0 20 20" className={`h-4 w-4 ${className}`} fill="none"><path d="M5 10l3.5 3.5L15 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

/* Each USP appears exactly ONCE, on its own card — no repeated claims across the page. */
const USPS = [
  { h: "Answers Every Call at Once", p: "Unlimited calls, all at the same time. No busy signal, nobody stuck on hold.", tint: "brand" },
  { h: "It Never Sleeps", p: "Nights, weekends, holidays, mid-job — 24/7/365, every call gets picked up.", tint: "warm" },
  { h: "The Full Job, Texted in Seconds", p: "Name, number, address, problem and urgency — on your phone before you're off the ladder.", tint: "emerald" },
  { h: "Remembers Repeat Callers", p: "Greets your regulars by name and recalls what they called about last time.", tint: "amber" },
  { h: "Speaks in Your Shop's Name", p: "Trained on your business, hours and service area — never a generic script.", tint: "brand" },
  { h: "Blocks Spam & Robocalls", p: "Wrong numbers and junk never reach you. Only real jobs land on your phone.", tint: "warm" },
  { h: "Keep Your Own Number", p: "Forward your existing line — callers dial the exact number they always have.", tint: "emerald" },
  { h: "Canadian Data, PIPEDA-Safe", p: "Built in Canada. Your callers' details stay private and compliant.", tint: "amber" },
];

const TINTS = {
  brand: "bg-indigo-50 text-brand",
  warm: "bg-warm-50 text-warm",
  emerald: "bg-emerald-50 text-emerald",
  amber: "bg-warm-50 text-warm-amber",
};

const STEPS = [
  { h: "Your Number Rings", p: "Forward your existing line to Dispango. Callers dial the same number as always." },
  { h: "Dispango Answers", p: "In your shop's name, in a natural voice — around the clock, on the very first rush." },
  { h: "It Captures the Job", p: "Name, number, address, the problem and how urgent it is — every single time." },
  { h: "You Get the Lead", p: "Texted straight to your phone in seconds, ready for you to dispatch." },
];

/* Inline, original trade icons (no third-party logos → no trademark exposure). */
const IND_ICON = {
  lock: "M7 9V6.5a3 3 0 0 1 6 0V9M5.5 9h9A1.5 1.5 0 0 1 16 10.5v5A1.5 1.5 0 0 1 14.5 17h-9A1.5 1.5 0 0 1 4 15.5v-5A1.5 1.5 0 0 1 5.5 9Z",
  drop: "M10 3s5 5.5 5 9a5 5 0 0 1-10 0c0-3.5 5-9 5-9Z",
  flame: "M10 3c3 3 4 5 4 7a4 4 0 0 1-8 0c0-1 .5-2 1.5-3C7 9 8 8 8 6c1 1 2 2 2 3 0-2 0-4 0-6Z",
  bolt: "M11 3 5 11h4l-1 6 6-8h-4l1-6Z",
  hammer: "M9 8 4 13l3 3 5-5M9 8l3-3 4 4-3 3M9 8l3 3",
  garage: "M4 9l6-4 6 4v7H4V9Zm2 3h8m-8 2.5h8",
  roof: "M3 11 10 5l7 6M6 11v5h8v-5",
  more: "M5 10h.01M10 10h.01M15 10h.01",
};
const INDUSTRIES = [
  { h: "Locksmiths", p: "Lockouts logged with address and urgency, day or night.", icon: "lock", tint: "brand" },
  { h: "Plumbers", p: "Burst pipes and floods triaged the second they call.", icon: "drop", tint: "emerald" },
  { h: "HVAC", p: "No-heat and no-cool calls captured and sent to you fast.", icon: "flame", tint: "warm" },
  { h: "Electricians", p: "Every service call caught, even after hours.", icon: "bolt", tint: "amber" },
  { h: "Contractors", p: "Quote requests captured while you're on site.", icon: "hammer", tint: "brand" },
  { h: "Garage Doors", p: "Stuck-door emergencies routed to you instantly.", icon: "garage", tint: "emerald" },
  { h: "Roofers", p: "Storm-damage leads booked before the competition calls back.", icon: "roof", tint: "warm" },
  { h: "& Every Trade", p: "If your business lives on the phone, Dispango fits.", icon: "more", tint: "amber" },
];

const INTEGRATIONS = ["Jobber", "Housecall Pro", "ServiceTitan", "QuickBooks", "Google Calendar", "Zapier", "Slack", "HubSpot"];

const COMPARE = [
  ["Answers 24/7, instantly", true, "limited", false],
  ["Takes every call at once", true, false, false],
  ["Captures the full job", true, "limited", false],
  ["Texts you the lead in seconds", true, "limited", false],
  ["Keeps your own number", true, "limited", true],
  ["Monthly cost", `$${PRICE}`, "$1,500+", "$0"],
  ["Blocks spam & robocalls", true, "limited", false],
];

const FAQ = [
  { q: "Do I keep my own number?", a: "Yes. You forward your existing line to Dispango — callers dial the exact same number they always have." },
  { q: "Will it sound like a robot?", a: "No. A natural voice that greets callers with your shop's name. Most can't tell it isn't a person." },
  { q: "What does it cost?", a: `A flat $${PRICE}/month — no per-call fees, no setup fee. Start with a 14-day free trial and cancel anytime.` },
  { q: "Can it work with my software?", a: "Often, yes — we integrate with tools like Jobber, Housecall Pro and QuickBooks, and we'll build custom integrations on request." },
  { q: "What about my callers' data?", a: "It's shared only with you. We follow Canadian privacy law (PIPEDA) — see our privacy policy." },
];

function Cell({ v }) {
  if (v === true) return <Tick className="mx-auto text-emerald" />;
  if (v === false) return <span className="mx-auto block text-center text-muted">—</span>;
  if (v === "limited") return <span className="text-xs font-medium text-muted">limited</span>;
  return <span className="text-sm font-semibold text-ink">{v}</span>;
}

export default function Page() {
  useReveal();
  const book = () => CONFIG.book;

  return (
    <main id="top" className="text-body">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-line/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-medium text-ink lg:flex">
            <a href="#how" className="hover:text-brand">How It Works</a>
            <a href="#industries" className="hover:text-brand">Industries</a>
            <a href="#integrations" className="hover:text-brand">Integrations</a>
            <a href="#pricing" className="hover:text-brand">Pricing</a>
            <a href="#faq" className="hover:text-brand">FAQ</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <a href={CONFIG.portal} className="hidden text-sm font-semibold text-ink hover:text-brand sm:inline">Sign In</a>
            <Btn href={CONFIG.getStarted}>Get Started <Arrow /></Btn>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="glow-hero relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:py-24">
          <div className="reveal">
            <span className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-brand-700">
              AI Receptionist for the Canadian Trades Industry
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-ink md:text-6xl">
              The Call You Missed Just Became <span className="text-shimmer">Someone Else&apos;s Job.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-body">
              Dispango answers every call, captures the job, and texts you the lead in seconds — around the clock, even when you&apos;re on the tools.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Btn href={CONFIG.getStarted}>Get Started <Arrow /></Btn>
              <Btn href="#demo" variant="ghost">See It in Action</Btn>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-body">
              {["Keeps your number", "Live the same day", `Flat $${PRICE}/mo`].map((t) => (
                <li key={t} className="flex items-center gap-2"><Tick /> {t}</li>
              ))}
            </ul>
          </div>
          <div className="reveal"><PhoneCall /></div>
        </div>
      </section>

      {/* USPS — each fact stated once, on its own card */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Why Shops Across Canada Switch</h2>
        <p className="reveal mx-auto mt-3 max-w-xl text-center">Eight things a voicemail — or a $3,000-a-month receptionist — simply can&apos;t do.</p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {USPS.map((u, i) => (
            <div key={u.h} className={`reveal rounded-2xl border border-line bg-white p-6 transition-transform hover:-translate-y-1 ${i === 0 ? "animate-glow" : ""}`}>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${TINTS[u.tint]}`}>
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none"><path d="M5 10l3.5 3.5L15 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <h3 className="mt-4 font-bold text-ink">{u.h}</h3>
              <p className="mt-2 text-sm">{u.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="glow-soft">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">How It Works</h2>
          <p className="reveal mx-auto mt-3 max-w-lg text-center">From ring to lead in four steps. No hardware, no new number, no training.</p>
          <div className="relative mt-14 grid gap-10 md:grid-cols-4">
            {/* connector line (desktop) */}
            <div className="pointer-events-none absolute left-0 right-0 top-5 hidden h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent md:block" />
            {STEPS.map((s, i) => (
              <div key={s.h} className="reveal relative text-center">
                <div className="animate-pop mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand text-base font-extrabold text-white shadow-lg shadow-brand/30 ring-4 ring-soft">{i + 1}</div>
                <h3 className="mt-5 font-bold text-ink">{s.h}</h3>
                <p className="mt-2 text-sm">{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEE IT IN ACTION */}
      <section id="demo" className="mx-auto max-w-4xl px-5 py-20">
        <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">See It in Action</h2>
        <p className="reveal mx-auto mt-3 max-w-lg text-center">Watch a live call come in above — or hear it and try it for yourself.</p>
        <div className="reveal mt-10 grid gap-5 sm:grid-cols-2">
          {/* Call-in tile */}
          <div className="rounded-3xl border border-line bg-white p-8 text-center shadow-xl shadow-ink/5">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-brand">
              <svg viewBox="0 0 20 20" className="h-6 w-6" fill="none"><path d="M5 3h3l1.5 4-2 1.5a10 10 0 0 0 4 4l1.5-2 4 1.5v3a1 1 0 0 1-1.1 1A14 14 0 0 1 4 4.1 1 1 0 0 1 5 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
            </div>
            <h3 className="mt-4 font-bold text-ink">Call and Talk to It Yourself</h3>
            {CONFIG.demoLine ? (
              <>
                <a href={`tel:${CONFIG.demoLine.replace(/[^\d+]/g, "")}`} className="mt-2 block text-2xl font-extrabold text-brand">{CONFIG.demoLine}</a>
                <p className="mt-2 text-sm">Ring our demo line and have a real conversation with Dispango.</p>
              </>
            ) : (
              <p className="mt-3 text-sm">Our public demo line is launching shortly. Want a live walkthrough now? Book a 15-minute demo.</p>
            )}
          </div>
          {/* Sample audio tile */}
          <div className="rounded-3xl border border-line bg-white p-8 text-center shadow-xl shadow-ink/5">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-warm-50 text-warm">
              <svg viewBox="0 0 20 20" className="h-6 w-6" fill="none"><path d="M7 6l6 4-6 4V6Z" fill="currentColor" /></svg>
            </div>
            <h3 className="mt-4 font-bold text-ink">Hear a Sample Call</h3>
            {CONFIG.sampleAudio ? (
              <audio controls src={CONFIG.sampleAudio} className="mt-4 w-full" />
            ) : (
              <p className="mt-3 text-sm">A recorded sample is on its way. In the meantime, the live transcript above shows exactly how a call unfolds.</p>
            )}
          </div>
        </div>
        <div className="reveal mt-8 text-center"><Btn href={book()}>Book a Live Demo <Arrow /></Btn></div>
      </section>

      {/* INDUSTRIES */}
      <section id="industries" className="glow-soft">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Built for Every Trade</h2>
          <p className="reveal mx-auto mt-3 max-w-lg text-center">One receptionist, tuned to how your trade takes a call.</p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {INDUSTRIES.map((c) => (
              <div key={c.h} className="reveal rounded-2xl bg-white p-6 ring-1 ring-line transition-transform hover:-translate-y-1">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${TINTS[c.tint]}`}>
                  <svg viewBox="0 0 20 20" className="h-6 w-6" fill="none"><path d={IND_ICON[c.icon]} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <h3 className="mt-4 font-bold text-ink">{c.h}</h3>
                <p className="mt-2 text-sm">{c.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COST VS HUMAN — the money shot */}
      <section className="mx-auto max-w-5xl px-5 py-20">
        <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Dispango vs a Human Receptionist</h2>
        <p className="reveal mx-auto mt-3 max-w-lg text-center">Same job answered. One of them takes weekends off and costs fifteen times more.</p>
        <div className="reveal mx-auto mt-12 max-w-2xl space-y-6">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-ink"><span>A human receptionist</span><span>$3,000+/mo</span></div>
            <div className="h-9 w-full rounded-full bg-line"><div className="h-9 rounded-full bg-gradient-to-r from-warm to-warm-amber" style={{ width: "100%" }} /></div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-ink"><span>Dispango</span><span>${PRICE}/mo</span></div>
            <div className="h-9 w-full rounded-full bg-line"><div className="h-9 rounded-full bg-gradient-to-r from-brand to-brand-700" style={{ width: "7%" }} /></div>
          </div>
        </div>
        <div className="reveal mx-auto mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
          {["Answers 5 calls at once", "Never off sick or on break", "No wages, no HR, no training"].map((t) => (
            <div key={t} className="flex items-center gap-2 rounded-xl bg-soft px-4 py-3 text-sm font-medium text-ink"><Tick /> {t}</div>
          ))}
        </div>
      </section>

      {/* COMPARE TABLE */}
      <section className="glow-soft">
        <div className="mx-auto max-w-5xl px-5 py-20">
          <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">The Honest Comparison</h2>
          <div className="reveal mt-10 overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="py-4 text-left font-semibold text-ink">What matters</th>
                  <th className="px-3 py-4 text-center font-extrabold text-brand">Dispango</th>
                  <th className="px-3 py-4 text-center font-semibold text-muted">Answering service</th>
                  <th className="px-3 py-4 text-center font-semibold text-muted">Voicemail</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((r) => (
                  <tr key={r[0]} className="border-b border-line/70">
                    <td className="py-4 text-left text-body">{r[0]}</td>
                    <td className="px-3 py-4 text-center"><Cell v={r[1]} /></td>
                    <td className="px-3 py-4 text-center"><Cell v={r[2]} /></td>
                    <td className="px-3 py-4 text-center"><Cell v={r[3]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CALCULATOR */}
      <section className="mx-auto max-w-5xl px-5 py-20">
        <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">What Are Missed Calls Costing You?</h2>
        <p className="reveal mx-auto mt-3 max-w-lg text-center">Your numbers, not ours. Drag the sliders.</p>
        <div className="reveal mt-10"><Calculator /></div>
      </section>

      {/* INTEGRATIONS / TALK TO US */}
      <section id="integrations" className="glow-soft">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Works with the Tools You Already Use</h2>
          <p className="reveal mx-auto mt-3 max-w-lg text-center">Send captured jobs straight into the software your shop already runs on.</p>
          <div className="reveal marquee-mask mt-10 overflow-hidden">
            <div className="flex w-max animate-marquee gap-3">
              {[...INTEGRATIONS, ...INTEGRATIONS].map((name, i) => (
                <span key={i} className="whitespace-nowrap rounded-full border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink">{name}</span>
              ))}
            </div>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { h: "We Build Your Integration", p: "Don't see your software? We'll connect it. Tell us the tool and we'll make it fit." },
              { h: "Custom Reporting & Analysis", p: "Want call trends, lead sources or after-hours volume? We'll run the analysis for your shop." },
              { h: "Same-Day Support", p: "A real person, same day. No ticket queues, no offshore call centre." },
            ].map((c) => (
              <div key={c.h} className="reveal rounded-2xl border border-line bg-white p-6">
                <h3 className="font-bold text-ink">{c.h}</h3>
                <p className="mt-2 text-sm">{c.p}</p>
              </div>
            ))}
          </div>
          <div className="reveal mt-10 text-center"><Btn href="#contact" variant="ghost">Talk to Us About Your Setup</Btn></div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="mx-auto max-w-3xl px-5 py-20">
        <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">One Plan. No Surprises.</h2>
        <p className="reveal mx-auto mt-3 max-w-md text-center">Everything below, one flat price, cancel anytime.</p>
        <div className="reveal mt-10 overflow-hidden rounded-3xl border border-line bg-white shadow-2xl shadow-brand/10">
          <div className="glow-dark p-10 text-center text-white">
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-100">The Dispango Plan</p>
            <p className="mt-3 flex items-start justify-center font-extrabold leading-none">
              <span className="mt-2 text-3xl">$</span>
              <CountUp to={PRICE} className="text-7xl md:text-8xl" />
              <span className="mt-3 ml-1 text-xl font-medium text-white/70">/mo</span>
            </p>
            <p className="mt-4 inline-block rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium">14-day free trial · cancel anytime · keep your number</p>
          </div>
          <div className="grid gap-3 p-8 sm:grid-cols-2">
            {["Answers every call, 24/7", "Full job details texted in seconds", "Greets callers in your shop's name", "Remembers repeat callers", "Blocks spam & robocalls", "No per-call or setup fees", "Works with your existing number", "Live the same day"].map((f) => (
              <div key={f} className="flex items-start gap-2 text-sm text-body"><span className="mt-0.5 shrink-0"><Tick /></span>{f}</div>
            ))}
          </div>
          <div className="px-8 pb-8 text-center"><Btn href={CONFIG.getStarted} className="w-full text-base sm:w-auto">Start Your Free Trial <Arrow /></Btn></div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="glow-soft">
        <div className="mx-auto max-w-3xl px-5 py-20">
          <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Questions, Answered</h2>
          <div className="reveal mt-10 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-line bg-white p-5">
                <summary className="flex cursor-pointer items-center justify-between font-semibold text-ink">{f.q}<span className="text-brand transition-transform group-open:rotate-45">+</span></summary>
                <p className="mt-3 text-sm">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="mx-auto max-w-4xl px-5 py-20">
        <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Let&apos;s Talk</h2>
        <p className="reveal mx-auto mt-3 max-w-lg text-center">Questions, custom setups, or a live walkthrough — reach a real person the same day.</p>
        <div className="reveal mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
          <a href={book()} className="rounded-2xl border border-line bg-white p-6 text-center transition-transform hover:-translate-y-1">
            <p className="font-bold text-ink">Book a Demo</p>
            <p className="mt-1 text-sm">See it live in 15 minutes.</p>
          </a>
          <a href={`mailto:${CONFIG.email}`} className="rounded-2xl border border-line bg-white p-6 text-center transition-transform hover:-translate-y-1">
            <p className="font-bold text-ink">Email Us</p>
            <p className="mt-1 break-words text-sm text-brand">{CONFIG.email}</p>
          </a>
          <a href={`tel:${CONFIG.phone.replace(/[^\d+]/g, "")}`} className="rounded-2xl border border-line bg-white p-6 text-center transition-transform hover:-translate-y-1">
            <p className="font-bold text-ink">Call Us</p>
            <p className="mt-1 text-sm text-brand">{CONFIG.phone}</p>
          </a>
        </div>
      </section>

      {/* CTA */}
      <section id="book" className="mx-auto max-w-6xl px-5 py-20">
        <div className="glow-dark relative overflow-hidden rounded-3xl px-6 py-16 text-center text-white">
          <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">Stop Losing Jobs to Voicemail</h2>
          <p className="mx-auto mt-3 max-w-lg text-white/70">Get set up today and let Dispango answer your very next call.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Btn href={CONFIG.getStarted} variant="light">Get Started <Arrow /></Btn>
            <a href={book()} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 hover:bg-white/10">Book a Demo</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-2">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted">AI receptionist for the Canadian trades industry. Answers every call, texts you the lead.</p>
            <p className="mt-4 text-xs text-muted">{CONFIG.legalName}<br />{CONFIG.address}</p>
          </div>
          <div className="flex flex-col gap-2 text-sm md:items-end">
            <a href="#how" className="hover:text-brand">How It Works</a>
            <a href="#pricing" className="hover:text-brand">Pricing</a>
            <a href="#faq" className="hover:text-brand">FAQ</a>
            <a href="#contact" className="hover:text-brand">Contact</a>
            <a href="/terms" className="hover:text-brand">Terms</a>
            <a href="/privacy" className="hover:text-brand">Privacy</a>
            <a href={`mailto:${CONFIG.email}`} className="hover:text-brand">{CONFIG.email}</a>
          </div>
        </div>
        <p className="pb-8 text-center text-xs text-muted">© {new Date().getFullYear()} {CONFIG.legalName}. Dispango is a product of {CONFIG.legalName}. All rights reserved.</p>
      </footer>

      <ContactTab email={CONFIG.email} phone={CONFIG.phone} bookHref={book()} />
    </main>
  );
}
