"use client";

import { useEffect, useRef, useState } from "react";
import PhoneCall from "./components/PhoneCall";
import Calculator from "./components/Calculator";
import ContactTab from "./components/ContactTab";
import CallRush from "./components/CallRush";
import BuildReceptionist from "./components/BuildReceptionist";
import CommandCenter from "./components/CommandCenter";

const CONFIG = {
  // Ready values.
  getStarted: "/get-started", // self-onboarding form (working conversion path)
  email: "hello@dispango.com",
  legalName: "Jam Works Inc.",
  // Tracked TODOs — left empty on purpose so nothing broken ships. Every UI that
  // reads one of these degrades gracefully when it's blank (see helpers below).
  book: "https://cal.com/abdul-zxafqn/30min", // live Cal.com 30-min demo booking link
  portal: "/login", // Phase 4: customer dashboard login. "Sign In" links here.
  demoLine: "+1 (651) 551-9855", // live call-in demo number (Phase 3). tel: link strips to digits; webhook handles it as the "Dispango Demo" persona with tight caps and no lead SMS.
  sampleAudio: "", // TODO: URL to a recorded sample call. The audio player renders only when set.
  phone: "", // TODO(Phase 7): public business contact line. Phone contact points are hidden until set.
  address: "", // TODO(Phase 7): registered mailing address. Footer/Terms/Privacy omit it until set.
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

/* Adds a subtle shadow to the sticky header once the page is scrolled. */
function useScrolled(threshold = 8) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
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
  const base = "group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-[transform,box-shadow,background-color,border-color] duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0";
  const styles = {
    primary: "bg-brand text-white shadow-lg shadow-brand/30 hover:bg-brand-600 hover:shadow-xl hover:shadow-brand/40",
    ghost: "border border-line bg-white text-ink hover:border-brand hover:shadow-md hover:shadow-brand/10",
    light: "bg-white text-ink shadow-lg shadow-black/10 hover:bg-indigo-50 hover:shadow-xl",
  };
  return <a href={href} className={`${base} ${styles[variant]} ${className}`}>{children}</a>;
}

function Arrow() {
  return <svg viewBox="0 0 20 20" className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5" fill="none" aria-hidden="true"><path d="M4 10h11m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function Tick({ className = "text-emerald" }) {
  return <svg viewBox="0 0 20 20" className={`h-4 w-4 ${className}`} fill="none"><path d="M5 10l3.5 3.5L15 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

/* Word-light: four punchy claims, each a 2–4 word promise + one short line. */
const USPS = [
  { h: "Answers everyone at once", p: "Unlimited calls, same second. No hold, no busy signal.", tint: "brand" },
  { h: "Never off the clock", p: "Nights, weekends, mid-job — 24/7/365.", tint: "sky" },
  { h: "Texts you the whole job", p: "Name, address, problem, urgency — in seconds.", tint: "emerald" },
  { h: "Kills spam & robocalls", p: "Only real jobs ever reach your phone.", tint: "violet" },
];

const TINTS = {
  brand: "bg-indigo-50 text-brand",
  warm: "bg-warm-50 text-warm",
  emerald: "bg-emerald-50 text-emerald",
  amber: "bg-warm-50 text-warm-amber",
  sky: "bg-sky-50 text-sky",
  violet: "bg-violet-50 text-violet",
  pink: "bg-pink-50 text-pink",
};

/* Literal class strings so Tailwind's scanner generates them (no dynamic concat). */
const DOT = {
  brand: "bg-brand", warm: "bg-warm", emerald: "bg-emerald", amber: "bg-warm-amber",
  sky: "bg-sky", violet: "bg-violet", pink: "bg-pink",
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
  { h: "Locksmiths", p: "Lockouts don't wait. Miss the call and they dial the next locksmith — you won't.", icon: "lock", tint: "brand" },
  { h: "Plumbers", p: "A burst pipe at 11pm won't leave a voicemail. Dispango answers it, address and all.", icon: "drop", tint: "emerald" },
  { h: "HVAC", p: "No heat, no patience. Every no-heat and no-cool call caught, day or night.", icon: "flame", tint: "warm" },
  { h: "Electricians", p: "Sparks and panic don't leave messages. The address is logged before they call the next guy.", icon: "bolt", tint: "amber" },
  { h: "Contractors", p: "Quote requests captured while you're on site and hands-full.", icon: "hammer", tint: "brand" },
  { h: "Garage Doors", p: "Under a torsion spring you can't touch the phone. Dispango can.", icon: "garage", tint: "emerald" },
  { h: "Roofers", p: "Storm hits and every roofer's phone rings at once — yours is the one that gets answered.", icon: "roof", tint: "warm" },
  { h: "& Every Trade", p: "If your work makes it impossible to grab the phone, Dispango grabs it for you.", icon: "more", tint: "amber" },
];

/* Integrations wall, grouped by category (Calio-style). Brand-colored chips.
   Aspirational: availability varies / we build the connection on request. */
const INTEGRATIONS = [
  { cat: "Field service", tint: "brand", tools: [{ n: "Jobber", c: "#2FA84F" }, { n: "Housecall Pro", c: "#1F6FEB" }, { n: "ServiceTitan", c: "#2E5BFF" }] },
  { cat: "Accounting", tint: "emerald", tools: [{ n: "QuickBooks", c: "#2CA01C" }, { n: "Xero", c: "#13B5EA" }, { n: "FreshBooks", c: "#0075DD" }] },
  { cat: "Scheduling", tint: "sky", tools: [{ n: "Google Calendar", c: "#4285F4" }, { n: "Calendly", c: "#006BFF" }] },
  { cat: "Automation", tint: "warm", tools: [{ n: "Zapier", c: "#FF4F00" }, { n: "Make", c: "#6D00CC" }] },
  { cat: "Comms & CRM", tint: "violet", tools: [{ n: "Slack", c: "#4A154B" }, { n: "HubSpot", c: "#FF7A59" }, { n: "Gmail", c: "#EA4335" }] },
];

/* Dispango vs. a human receptionist. Last row is the honest concession where a
   human still wins — kept in on purpose (a trust device, Calio-style). */
const COMPARE = [
  { dim: "Monthly cost", us: `$${PRICE}/mo flat`, them: "$3,000–5,500/mo, fully loaded" },
  { dim: "Answers every call", us: "Always, instantly", them: "Misses calls when busy or away" },
  { dim: "Calls at the same time", us: "Unlimited, all at once", them: "One caller at a time" },
  { dim: "Available", us: "24/7/365 — holidays too", them: "Business hours, ~5 days a week" },
  { dim: "Time to go live", us: "Same day", them: "Weeks to hire and train" },
  { dim: "Texts you the job", us: "In seconds, every time", them: "Manual, easy to forget" },
  { dim: "Sick days & turnover", us: "Never sick, never quits", them: "Time off, turnover, rehiring" },
  { dim: "Complex, emotional calls", us: "Hands it straight to you", them: "A real human still wins here", concede: true },
];

const FAQ = [
  { q: "Do I keep my own number?", a: "Yes. You forward your existing line to Dispango — callers dial the exact same number they always have." },
  { q: "Will it sound like a robot?", a: "No. A natural voice that greets callers with your shop's name. Most can't tell it isn't a person." },
  { q: "What does it cost?", a: `A flat $${PRICE}/month — no per-call fees, no setup fee. Start with a 14-day free trial and cancel anytime.` },
  { q: "Can it work with my software?", a: "Often, yes — we integrate with tools like Jobber, Housecall Pro and QuickBooks, and we'll build custom integrations on request." },
  { q: "What about my callers' data?", a: "It's shared only with you. We follow Canadian privacy law (PIPEDA) — see our privacy policy." },
];

export default function Page() {
  useReveal();
  const scrolled = useScrolled();
  // Booking CTAs → the live Cal.com link; defensive fallback to self-serve if ever unset.
  const book = () => CONFIG.book || CONFIG.getStarted;

  return (
    <main id="top" className="text-body">
      {/* NAV */}
      <header className={`nav-bar sticky top-0 z-50 border-b border-line/70 backdrop-blur-md ${scrolled ? "nav-scrolled" : "bg-white/80"}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <a href="#top" aria-label="Dispango — back to top" className="rounded-lg"><Logo /></a>
          <nav className="hidden items-center gap-7 text-sm font-medium text-ink lg:flex">
            <a href="#how" className="navlink hover:text-brand">How It Works</a>
            <a href="#industries" className="navlink hover:text-brand">Industries</a>
            <a href="#integrations" className="navlink hover:text-brand">Integrations</a>
            <a href="#pricing" className="navlink hover:text-brand">Pricing</a>
            <a href="#faq" className="navlink hover:text-brand">FAQ</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            {CONFIG.portal && (
              <a href={CONFIG.portal} className="navlink hidden text-sm font-semibold text-ink hover:text-brand sm:inline">Sign In</a>
            )}
            <Btn href={CONFIG.getStarted}>Get Started <Arrow /></Btn>
          </div>
        </div>
      </header>

      {/* HERO — "On the tools" */}
      <section className="glow-hero relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:py-24">
          <div className="reveal">
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-brand-700">
              <span className="h-1.5 w-1.5 animate-dot rounded-full bg-emerald" /> AI receptionist for the trades
            </span>
            <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.02] tracking-tight text-ink md:text-6xl">
              You&apos;re on the tools.<br /><span className="text-shimmer">Dispango&apos;s on the phone.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-body">
              Every call answered, every job captured, texted to you in seconds — 24/7, even when your hands are full.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Btn href={CONFIG.getStarted}>Get Started <Arrow /></Btn>
              <Btn href={book()} variant="ghost">Book a Demo</Btn>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-body">
              {["Keep your number", "Live the same day", `Flat $${PRICE}/mo`].map((t) => (
                <li key={t} className="flex items-center gap-2"><Tick /> {t}</li>
              ))}
            </ul>
          </div>
          <div className="reveal"><PhoneCall /></div>
        </div>
      </section>

      {/* STAT STRIP — research-grounded pain, near-zero words */}
      <section className="border-y border-line bg-soft">
        <div className="mx-auto grid max-w-5xl gap-6 px-5 py-10 sm:grid-cols-3">
          {[
            { n: 67, suf: "%", t: "of callers won't leave a voicemail — they just dial the next name." },
            { n: 78, suf: "%", t: "of jobs go to the business that answers first." },
            { n: null, big: "24/7", t: "Dispango answers every call. You never miss the first ring." },
          ].map((s, i) => (
            <div key={i} style={{ transitionDelay: `${i * 80}ms` }} className="reveal text-center sm:text-left">
              <p className="text-4xl font-extrabold tracking-tight text-brand md:text-5xl">
                {s.big ? s.big : <><CountUp to={s.n} />{s.suf}</>}
              </p>
              <p className="mt-1.5 text-sm text-body">{s.t}</p>
            </div>
          ))}
        </div>
      </section>

      {/* USPS — four punchy claims, word-light */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <p className="reveal eyebrow text-center">Why shops switch</p>
        <h2 className="reveal mt-2 text-center text-3xl font-extrabold tracking-tight text-ink md:text-5xl">Four reasons voicemail can&apos;t compete.</h2>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {USPS.map((u, i) => (
            <div key={u.h} style={{ transitionDelay: `${(i % 4) * 70}ms` }} className={`reveal lift rounded-2xl border border-line bg-white p-6 ${i === 0 ? "animate-glow" : ""}`}>
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${TINTS[u.tint]}`}>
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none"><path d="M5 10l3.5 3.5L15 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <h3 className="mt-4 text-lg font-bold text-ink">{u.h}</h3>
              <p className="mt-1.5 text-sm">{u.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CALL RUSH — "you decide" + $-recovered meter */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <p className="reveal eyebrow text-center">The call rush</p>
        <h2 className="reveal mt-2 text-center text-3xl font-extrabold tracking-tight text-ink md:text-5xl">
          Five calls at once. You grab one. <span className="text-shimmer">Dispango grabs all five.</span>
        </h2>
        <p className="reveal mx-auto mt-3 max-w-xl text-center">It doesn&apos;t just answer fast — it answers everyone at the same time, gets the job, and texts it to you before voicemail even picks up.</p>
        <div className="reveal mt-12"><CallRush /></div>
      </section>

      {/* BUILD YOUR RECEPTIONIST — trade + voice → live preview */}
      <section className="glow-soft">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <p className="reveal eyebrow text-center">Built around your business</p>
          <h2 className="reveal mt-2 text-center text-3xl font-extrabold tracking-tight text-ink md:text-5xl">Not a script. A receptionist trained on your shop.</h2>
          <p className="reveal mx-auto mt-3 max-w-xl text-center">Your trade, your service area, your hours, your rules — every caller hears your business, never a generic bot.</p>
          <div className="reveal mt-12"><BuildReceptionist /></div>
        </div>
      </section>

      {/* COMMAND CENTER — dashboard preview (aspirational) */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <p className="reveal eyebrow text-center">Your command center</p>
        <h2 className="reveal mt-2 text-center text-3xl font-extrabold tracking-tight text-ink md:text-5xl">Every call. Logged, summarized, done.</h2>
        <p className="reveal mx-auto mt-3 max-w-xl text-center">Every lead, call and text in one place — so nothing slips.</p>
        <div className="reveal mt-12"><CommandCenter /></div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="glow-soft">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <p className="reveal eyebrow text-center">How it works</p>
          <h2 className="reveal mt-2 text-center text-3xl font-extrabold tracking-tight text-ink md:text-5xl">Texted to you before they hang up.</h2>
          <p className="reveal mx-auto mt-3 max-w-lg text-center">No hardware, no new number, no training. Four steps, seconds long.</p>
          <div className="relative mt-14 grid gap-10 md:grid-cols-4">
            {/* connector line (desktop) */}
            <div className="pointer-events-none absolute left-0 right-0 top-5 hidden h-px bg-gradient-to-r from-transparent via-brand/30 to-transparent md:block" />
            {STEPS.map((s, i) => (
              <div key={s.h} style={{ transitionDelay: `${i * 90}ms` }} className="reveal relative text-center">
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
        <p className="reveal eyebrow text-center">See it in action</p>
        <h2 className="reveal mt-2 text-center text-3xl font-extrabold tracking-tight text-ink md:text-5xl">Hear it handle a real call.</h2>
        <p className="reveal mx-auto mt-3 max-w-lg text-center">Watch the live call above — or ring it yourself and try to trip it up.</p>
        <div className="reveal mt-10 grid gap-5 sm:grid-cols-2">
          {/* Call-in tile */}
          <div className="lift rounded-3xl border border-line bg-white p-8 text-center shadow-xl shadow-ink/5">
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
          <div className="lift rounded-3xl border border-line bg-white p-8 text-center shadow-xl shadow-ink/5">
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
          <p className="reveal eyebrow text-center">Industries</p>
          <h2 className="reveal mt-2 text-center text-3xl font-extrabold tracking-tight text-ink md:text-5xl">Built for the trades that can&apos;t miss a call.</h2>
          <p className="reveal mx-auto mt-3 max-w-lg text-center">One receptionist, tuned to how your trade takes a call.</p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {INDUSTRIES.map((c, i) => (
              <div key={c.h} style={{ transitionDelay: `${(i % 4) * 70}ms` }} className="reveal lift rounded-2xl border border-line bg-white p-6">
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
        <p className="reveal eyebrow text-center">The math</p>
        <h2 className="reveal mt-2 text-center text-3xl font-extrabold tracking-tight text-ink md:text-5xl">Fifteen times cheaper. Never off the clock.</h2>
        <p className="reveal mx-auto mt-3 max-w-lg text-center">Same job answered — one of them takes weekends off and costs fifteen times more.</p>
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
          {["Answers unlimited calls at once", "Never off sick or on break", "No wages, no HR, no training"].map((t) => (
            <div key={t} className="flex items-center gap-2 rounded-xl bg-soft px-4 py-3 text-sm font-medium text-ink"><Tick /> {t}</div>
          ))}
        </div>
      </section>

      {/* COMPARE — Dispango vs a human receptionist */}
      <section className="glow-soft">
        <div className="mx-auto max-w-4xl px-5 py-20">
          <p className="reveal eyebrow text-center">The honest comparison</p>
          <h2 className="reveal mt-2 text-center text-3xl font-extrabold tracking-tight text-ink md:text-5xl">Dispango vs. a human receptionist.</h2>
          <p className="reveal mx-auto mt-3 max-w-lg text-center">The stuff that actually hits your bottom line — and yes, we left in the one row a human still wins.</p>
          <div className="reveal mt-10 overflow-x-auto">
            <div role="table" aria-label="Dispango vs. a human receptionist" className="min-w-[600px] overflow-hidden rounded-3xl border border-line bg-white shadow-xl shadow-ink/5">
              {/* header */}
              <div role="row" className="grid grid-cols-[1.15fr_1fr_1fr] gap-3 border-b border-line bg-soft px-6 py-4 text-sm font-bold">
                <span role="columnheader" />
                <span role="columnheader" className="text-center text-brand">Dispango</span>
                <span role="columnheader" className="text-center text-muted">A human receptionist</span>
              </div>
              {COMPARE.map((r) => (
                <div key={r.dim} role="row" className={`grid grid-cols-[1.15fr_1fr_1fr] items-center gap-3 border-b border-line/60 px-6 py-4 text-sm last:border-0 ${r.concede ? "bg-warm-50/50" : ""}`}>
                  <span role="rowheader" className="font-semibold text-ink">{r.dim}</span>
                  <span role="cell" className="flex items-center justify-center gap-1.5 text-center">
                    {r.concede
                      ? <span className="text-muted">{r.us}</span>
                      : <><Tick className="shrink-0 text-emerald" /><span className="font-medium text-ink">{r.us}</span></>}
                  </span>
                  <span role="cell" className="flex items-center justify-center gap-1.5 text-center">
                    {r.concede
                      ? <><Tick className="shrink-0 text-warm" /><span className="font-semibold text-ink">{r.them}</span></>
                      : <span className="text-muted">{r.them}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="reveal mx-auto mt-5 max-w-lg text-center text-sm text-muted">Dispango catches the calls you&apos;re losing today, and hands off the ones that need a human touch.</p>
        </div>
      </section>

      {/* CALCULATOR */}
      <section className="mx-auto max-w-5xl px-5 py-20">
        <p className="reveal eyebrow text-center">Do the math</p>
        <h2 className="reveal mt-2 text-center text-3xl font-extrabold tracking-tight text-ink md:text-5xl">What are missed calls costing you?</h2>
        <p className="reveal mx-auto mt-3 max-w-lg text-center">Your numbers, not ours. Slide to see what voicemail takes off your books every month.</p>
        <div className="reveal mt-10"><Calculator /></div>
      </section>

      {/* INTEGRATIONS — logo wall by category */}
      <section id="integrations" className="glow-soft">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <p className="reveal eyebrow text-center">Works with your tools</p>
          <h2 className="reveal mt-2 text-center text-3xl font-extrabold tracking-tight text-ink md:text-5xl">Your tools stay. We add the phone.</h2>
          <p className="reveal mx-auto mt-3 max-w-xl text-center">Dispango sits on top of the software you already run on. No migration, no switching, no disruption — captured jobs land where your shop already works.</p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {INTEGRATIONS.map((group, i) => (
              <div key={group.cat} style={{ transitionDelay: `${(i % 3) * 70}ms` }} className="reveal lift rounded-2xl border border-line bg-white p-6">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${DOT[group.tint]}`} />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted">{group.cat}</h3>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {group.tools.map((t) => (
                    <span key={t.n} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold text-ink">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: t.c }} />
                      {t.n}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="reveal mx-auto mt-8 max-w-xl text-center text-sm text-muted">
            Don&apos;t see your platform? <a href="#contact" className="font-semibold text-brand hover:underline">Tell us what you use</a> — we build the connection on request. Integration availability varies by setup.
          </p>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="mx-auto max-w-3xl px-5 py-20">
        <p className="reveal eyebrow text-center">Simple, honest pricing</p>
        <h2 className="reveal mt-2 text-center text-3xl font-extrabold tracking-tight text-ink md:text-5xl">One plan. No surprises.</h2>
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
          <p className="reveal eyebrow text-center">FAQ</p>
          <h2 className="reveal mt-2 text-center text-3xl font-extrabold tracking-tight text-ink md:text-5xl">Questions, answered.</h2>
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
        <p className="reveal eyebrow text-center">Contact</p>
        <h2 className="reveal mt-2 text-center text-3xl font-extrabold tracking-tight text-ink md:text-5xl">Have questions? Let&apos;s talk.</h2>
        <p className="reveal mx-auto mt-3 max-w-lg text-center">Questions, custom setups, or a live walkthrough — reach a real person the same day.</p>
        <div className={`reveal mx-auto mt-10 grid max-w-2xl gap-4 ${CONFIG.phone ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          <a href={book()} className="lift rounded-2xl border border-line bg-white p-6 text-center">
            <p className="font-bold text-ink">Book a Demo</p>
            <p className="mt-1 text-sm">See it live in 15 minutes.</p>
          </a>
          <a href={`mailto:${CONFIG.email}`} className="lift rounded-2xl border border-line bg-white p-6 text-center">
            <p className="font-bold text-ink">Email Us</p>
            <p className="mt-1 break-words text-sm text-brand">{CONFIG.email}</p>
          </a>
          {CONFIG.phone && (
            <a href={`tel:${CONFIG.phone.replace(/[^\d+]/g, "")}`} className="lift rounded-2xl border border-line bg-white p-6 text-center">
              <p className="font-bold text-ink">Call Us</p>
              <p className="mt-1 text-sm text-brand">{CONFIG.phone}</p>
            </a>
          )}
        </div>
      </section>

      {/* CTA */}
      <section id="book" className="mx-auto max-w-6xl px-5 py-20">
        <div className="glow-dark relative overflow-hidden rounded-3xl px-6 py-16 text-center text-white">
          <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">Your next job is calling right now.</h2>
          <p className="mx-auto mt-3 max-w-lg text-white/70">Don&apos;t send it to voicemail. Get set up today and let Dispango answer your very next call.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Btn href={CONFIG.getStarted} variant="light">Get Started <Arrow /></Btn>
            <a href={book()} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-[transform,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/10 active:translate-y-0">Book a Demo</a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-2">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted">AI receptionist for the Canadian trades industry. Answers every call, texts you the lead.</p>
            <p className="mt-4 text-xs text-muted">{CONFIG.legalName}{CONFIG.address && <><br />{CONFIG.address}</>}</p>
          </div>
          <div className="flex flex-col gap-2 text-sm md:items-end">
            <a href="#how" className="w-fit hover:text-brand">How It Works</a>
            <a href="#pricing" className="w-fit hover:text-brand">Pricing</a>
            <a href="#faq" className="w-fit hover:text-brand">FAQ</a>
            <a href="#contact" className="w-fit hover:text-brand">Contact</a>
            <a href="/terms" className="w-fit hover:text-brand">Terms</a>
            <a href="/privacy" className="w-fit hover:text-brand">Privacy</a>
            <a href={`mailto:${CONFIG.email}`} className="w-fit hover:text-brand">{CONFIG.email}</a>
          </div>
        </div>
        <p className="pb-8 text-center text-xs text-muted">© {new Date().getFullYear()} {CONFIG.legalName}. Dispango is a product of {CONFIG.legalName}. All rights reserved.</p>
      </footer>

      <ContactTab email={CONFIG.email} phone={CONFIG.phone} bookHref={book()} />
    </main>
  );
}
