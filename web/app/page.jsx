"use client";

import { useEffect, useRef, useState } from "react";

/* ---- Fill these in before go-live (legal footer requires real values) ---- */
const CONFIG = {
  calendly: "https://calendly.com/REPLACE-WITH-YOUR-LINK/demo",
  email: "hello@dispango.com",
  phone: "(000) 000-0000",
  legalName: "REPLACE — legal corporation name",
  address: "REPLACE — registered mailing address, City, ON, Canada",
};

const PRICE = "199";

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
    // failsafe: never leave content hidden if the observer misfires
    const failsafe = setTimeout(
      () => els.forEach((el) => el.classList.add("in")),
      2500
    );
    return () => {
      io.disconnect();
      clearTimeout(failsafe);
    };
  }, []);
}

function Logo({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold text-ink ${className}`}>
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2f6bed" />
            <stop offset="1" stopColor="#1f51c4" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#g)" />
        <circle cx="11" cy="22" r="2.4" fill="#fff" />
        <path d="M11 17a5 5 0 0 1 5 5" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M11 12a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </svg>
      <span className="text-xl tracking-tight">Dispango</span>
    </span>
  );
}

function Btn({ children, href = "#book", variant = "primary", className = "" }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-transform duration-100 hover:-translate-y-0.5";
  const styles = {
    primary: "bg-brand text-white shadow-lg shadow-brand/25 hover:bg-brand-700",
    ghost: "border border-line bg-white text-ink hover:border-brand",
    light: "bg-white text-ink hover:bg-brand-50",
  };
  return (
    <a href={href} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </a>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path d="M4 10h11m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------------- Live-call demo (typed transcript) ---------------- */
const SCRIPT = [
  { who: "ai", t: "Thanks for calling — this is your Dispango line. What's going on?" },
  { who: "caller", t: "I'm locked out of my car, keys are inside and it's running." },
  { who: "ai", t: "Got it — is anyone inside the vehicle right now?" },
  { who: "caller", t: "My toddler's in the back seat." },
  { who: "ai", t: "Understood, that's a priority. What's the best callback number and your location?" },
  { who: "caller", t: "416-555-0142, I'm at Queen St W and Bathurst." },
  { who: "ai", t: "Perfect. I'm texting your locksmith now — they'll call you right back." },
];

function Demo() {
  const [playing, setPlaying] = useState(false);
  const [shown, setShown] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    if (!playing) return;
    if (shown >= SCRIPT.length) {
      setPlaying(false);
      return;
    }
    timer.current = setTimeout(() => setShown((s) => s + 1), shown === 0 ? 400 : 1300);
    return () => clearTimeout(timer.current);
  }, [playing, shown]);

  function toggle() {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (shown >= SCRIPT.length) setShown(0);
    setPlaying(true);
  }

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-line bg-white p-6 shadow-xl shadow-ink/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white animate-ring"
            aria-label={playing ? "Pause demo" : "Play demo call"}
          >
            {playing ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>
          <div>
            <p className="font-semibold text-ink">Hear it answer a call</p>
            <p className="text-sm text-muted">A real lockout, start to finish</p>
          </div>
        </div>
        {playing && (
          <span className="eq text-brand" aria-hidden="true"><span /><span /><span /><span /><span /></span>
        )}
      </div>
      <div className="mt-5 space-y-2">
        {SCRIPT.slice(0, shown).map((line, i) => (
          <div key={i} className={`flex ${line.who === "ai" ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                line.who === "ai" ? "bg-brand-50 text-ink" : "bg-ink text-white"
              }`}
            >
              {line.t}
            </div>
          </div>
        ))}
        {shown === 0 && (
          <p className="py-6 text-center text-sm text-muted">Press play to hear how the agent handles an emergency call.</p>
        )}
        {shown >= SCRIPT.length && (
          <div className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald">
            ✓ Lead texted to the locksmith in under 10 seconds.
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Missed-call cost calculator ---------------- */
function Calculator() {
  const [perWeek, setPerWeek] = useState(12);
  const [value, setValue] = useState(160);
  const [bookElsewhere, setBookElsewhere] = useState(60);
  const monthly = Math.round(perWeek * 4.3 * (bookElsewhere / 100) * value);
  const multiple = (monthly / Number(PRICE)).toFixed(1);

  const Row = ({ label, val, set, min, max, step, suffix }) => (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-body">{label}</span>
        <span className="font-semibold text-ink">
          {suffix === "$" ? "$" : ""}
          {val}
          {suffix && suffix !== "$" ? suffix : ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={val}
        onChange={(e) => set(Number(e.target.value))}
        className="mt-2 w-full accent-brand"
      />
    </div>
  );

  return (
    <div className="grid items-center gap-8 rounded-3xl border border-line bg-white p-8 shadow-xl shadow-ink/5 md:grid-cols-2">
      <div className="space-y-5">
        <Row label="Missed calls per week" val={perWeek} set={setPerWeek} min={1} max={40} step={1} />
        <Row label="Average job value" val={value} set={setValue} min={50} max={600} step={10} suffix="$" />
        <Row label="Callers who book elsewhere" val={bookElsewhere} set={setBookElsewhere} min={10} max={100} step={5} suffix="%" />
      </div>
      <div className="rounded-2xl bg-ink p-8 text-center text-white">
        <p className="text-sm text-white/70">You&apos;re losing about</p>
        <p className="my-2 text-5xl font-extrabold">${monthly.toLocaleString()}</p>
        <p className="text-sm text-white/70">every month to missed calls.</p>
        <p className="mt-4 rounded-full bg-brand/20 px-4 py-2 text-sm font-medium text-brand-100">
          Dispango pays for itself {multiple}× over.
        </p>
      </div>
    </div>
  );
}

/* ---------------- Sections data ---------------- */
const STEPS = [
  { n: "1", h: "The call comes in", p: "Day, night, weekend — even while you're on a job. Dispango picks up on the first ring." },
  { n: "2", h: "It gathers the job", p: "Name, callback number, location, and exactly what they need — like a receptionist who knows locksmithing." },
  { n: "3", h: "You get a text", p: "The full lead lands on your phone in seconds, so you can call back and win the job." },
  { n: "4", h: "It remembers", p: "Repeat callers are greeted by name, with their history — no starting from scratch." },
];

const BENEFITS = [
  { h: "Catch every lead", p: "Two-thirds of locksmith calls come after hours. Stop sending them to voicemail." },
  { h: "Keep your own number", p: "Forward your existing line. Customers never know it isn't you picking up." },
  { h: "Sounds human", p: "A natural voice that greets callers by your shop's name — not a clunky robot." },
  { h: "Filters the junk", p: "Wrong numbers, robocalls and spam get handled — you only hear about real jobs." },
  { h: "Cheaper than a service", p: "A flat monthly rate. No per-call fees, no answering-service markup." },
  { h: "Live in a day", p: "No hardware, no contracts. Forward your calls and you're up in minutes." },
];

const CALLS = [
  { h: "Residential lockouts", p: "Front-door lockouts captured with the address and urgency, day or night." },
  { h: "Auto lockouts", p: "Car lockouts triaged fast — including the emergencies that can't wait." },
  { h: "Commercial & rekeys", p: "Business calls, lock changes and rekeys logged with all the details." },
  { h: "After-hours emergencies", p: "The 2 a.m. calls your competitors miss — answered and texted to you." },
];

const COMPARE = [
  ["Answers 24/7, instantly", true, false, false],
  ["Handles many calls at once", true, false, false],
  ["Captures the full job details", true, "partial", false],
  ["Texts you the lead in seconds", true, "partial", false],
  ["Keeps your own number", true, "partial", true],
  ["Flat monthly cost", `$${PRICE}/mo`, "$1,500+/mo", "$0"],
  ["Filters spam & wrong numbers", true, "partial", false],
];

const FAQ = [
  { q: "Does it use my own phone number?", a: "Yes. You forward your existing business line to Dispango, so customers keep calling the number they already know." },
  { q: "Will it sound like a robot?", a: "No — it uses a natural voice and greets callers with your shop's name. Most callers don't realize it's AI." },
  { q: "What does it cost?", a: `A simple flat $${PRICE}/month — no per-call charges and no setup fee. Start with a 14-day free trial and cancel anytime.` },
  { q: "What happens to my callers' information?", a: "It's only ever shared with you, the locksmith who received the call. We follow Canadian privacy law (PIPEDA). See our privacy policy." },
  { q: "What if I want to answer myself?", a: "Dispango only steps in when you can't — after hours, when you're on a job, or when a call would otherwise go to voicemail." },
];

function Check({ v }) {
  if (v === true)
    return (
      <svg viewBox="0 0 20 20" className="mx-auto h-5 w-5 text-emerald" fill="none"><path d="M5 10l3.5 3.5L15 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
    );
  if (v === false)
    return <span className="mx-auto block h-5 w-5 text-center leading-5 text-muted">—</span>;
  if (v === "partial")
    return <span className="text-xs font-medium text-muted">limited</span>;
  return <span className="text-sm font-semibold text-ink">{v}</span>;
}

export default function Page() {
  useReveal();
  const cal = () => CONFIG.calendly;

  return (
    <main id="top" className="text-body">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-line/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-ink md:flex">
            <a href="#how" className="hover:text-brand">How it works</a>
            <a href="#why" className="hover:text-brand">Why Dispango</a>
            <a href="#pricing" className="hover:text-brand">Pricing</a>
            <a href="#faq" className="hover:text-brand">FAQ</a>
          </nav>
          <Btn href={cal()}>Book a demo <Arrow /></Btn>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-2 md:py-28">
          <div className="reveal">
            <span className="inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">
              AI receptionist for locksmiths
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-ink md:text-5xl">
              Every missed call is a job that went to{" "}
              <span className="text-brand">someone else.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-body">
              Dispango answers in a natural voice, captures the job, and texts you the
              lead in seconds — 24/7, even when your hands are full.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Btn href={cal()}>Book a demo <Arrow /></Btn>
              <Btn href="#how" variant="ghost">See how it works</Btn>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-body">
              {["Works with your number", "No contracts", "Set up in a day"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <svg viewBox="0 0 20 20" className="h-4 w-4 text-emerald" fill="none"><path d="M5 10l3.5 3.5L15 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* phone mock */}
          <div className="reveal relative mx-auto w-full max-w-sm">
            <div className="animate-floaty rounded-[2.2rem] border border-ink/10 bg-ink p-4 shadow-2xl shadow-ink/25">
              <div className="rounded-[1.6rem] bg-white p-4">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>Missed call · 2:14 AM</span>
                  <span>(416) 555-0142</span>
                </div>
                <div className="mt-3 rounded-2xl bg-brand-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Dispango · new lead</p>
                  <p className="mt-2 text-sm text-ink">
                    <b>URGENT</b> — car lockout<br />
                    Call back: (416) 555-0142<br />
                    Where: Queen St W &amp; Bathurst<br />
                    Name: Marcus<br />
                    Notes: keys locked in running car, toddler inside.
                  </p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 rounded-full bg-emerald px-4 py-2 text-sm font-semibold text-white shadow-lg">
              Answered in 8s
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-ink">
        <div className="mx-auto grid max-w-5xl gap-8 px-5 py-14 text-center text-white sm:grid-cols-3">
          {[["24/7", "Answered, day or night"], ["<10s", "Lead texted to your phone"], ["Every call", "Captured, even on a job"]].map(([big, small]) => (
            <div key={big} className="reveal">
              <p className="text-4xl font-extrabold text-brand-100">{big}</p>
              <p className="mt-1 text-sm text-white/70">{small}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
          A receptionist that never sleeps.
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="reveal rounded-2xl border border-line bg-white p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{s.n}</div>
              <h3 className="mt-4 font-bold text-ink">{s.h}</h3>
              <p className="mt-2 text-sm">{s.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHY */}
      <section id="why" className="bg-soft">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
            Stop sending jobs to whoever picks up first.
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {BENEFITS.map((b) => (
              <div key={b.h} className="reveal rounded-2xl border border-line bg-white p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand">
                  <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none"><path d="M5 10l3.5 3.5L15 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <h3 className="mt-4 font-bold text-ink">{b.h}</h3>
                <p className="mt-2 text-sm">{b.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BUILT FOR */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
          Built for every kind of locksmith call.
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CALLS.map((c) => (
            <div key={c.h} className="reveal rounded-2xl bg-gradient-to-b from-brand-50 to-white p-6 ring-1 ring-line">
              <h3 className="font-bold text-ink">{c.h}</h3>
              <p className="mt-2 text-sm">{c.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DEMO */}
      <section className="bg-soft">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
            Listen to it in action.
          </h2>
          <p className="reveal mx-auto mt-3 max-w-lg text-center">
            No script, no hold music — just the agent doing the job.
          </p>
          <div className="reveal mt-10"><Demo /></div>
        </div>
      </section>

      {/* COMPARE */}
      <section className="mx-auto max-w-5xl px-5 py-20">
        <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
          The honest comparison.
        </h2>
        <div className="reveal mt-10 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="py-4 text-left font-semibold text-ink">What matters</th>
                <th className="px-3 py-4 text-center font-extrabold text-brand">Dispango</th>
                <th className="px-3 py-4 text-center font-semibold text-muted">Answering service</th>
                <th className="px-3 py-4 text-center font-semibold text-muted">Voicemail</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row) => (
                <tr key={row[0]} className="border-b border-line/70">
                  <td className="py-4 text-left text-body">{row[0]}</td>
                  <td className="px-3 py-4 text-center"><Check v={row[1]} /></td>
                  <td className="px-3 py-4 text-center"><Check v={row[2]} /></td>
                  <td className="px-3 py-4 text-center"><Check v={row[3]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CALCULATOR */}
      <section className="bg-soft">
        <div className="mx-auto max-w-5xl px-5 py-20">
          <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
            What are missed calls costing you?
          </h2>
          <p className="reveal mx-auto mt-3 max-w-lg text-center">Your numbers, not ours. Slide to see what voicemail takes off your books.</p>
          <div className="reveal mt-10"><Calculator /></div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="mx-auto max-w-3xl px-5 py-20">
        <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
          One plan. No surprises.
        </h2>
        <div className="reveal mt-10 overflow-hidden rounded-3xl border border-line bg-white shadow-xl shadow-ink/5">
          <div className="bg-brand p-8 text-center text-white">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-100">Dispango</p>
            <p className="mt-2 text-5xl font-extrabold">${PRICE}<span className="text-lg font-medium text-brand-100">/mo</span></p>
            <p className="mt-2 text-sm text-brand-100">14-day free trial · cancel anytime · keep your number</p>
          </div>
          <div className="grid gap-3 p-8 sm:grid-cols-2">
            {[
              "AI answers every call, 24/7",
              "Full job details texted to you in seconds",
              "Greets callers with your shop's name",
              "Returning-caller memory",
              "Spam & wrong-number filtering",
              "No per-call fees, no setup fee",
              "Works with your existing number",
              "Live in a day",
            ].map((f) => (
              <div key={f} className="flex items-start gap-2 text-sm text-body">
                <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0 text-emerald" fill="none"><path d="M5 10l3.5 3.5L15 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {f}
              </div>
            ))}
          </div>
          <div className="px-8 pb-8 text-center">
            <Btn href={cal()} className="w-full sm:w-auto">Start your free trial <Arrow /></Btn>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-soft">
        <div className="mx-auto max-w-3xl px-5 py-20">
          <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Questions, answered.</h2>
          <div className="reveal mt-10 space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-line bg-white p-5">
                <summary className="flex cursor-pointer items-center justify-between font-semibold text-ink">
                  {f.q}
                  <span className="text-brand transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="book" className="mx-auto max-w-6xl px-5 py-20">
        <div className="relative overflow-hidden rounded-3xl bg-ink px-6 py-16 text-center text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(47,107,237,0.35),transparent_60%)]" />
          <div className="relative">
            <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">See it answer a call in 15 minutes.</h2>
            <p className="mx-auto mt-3 max-w-lg text-white/70">A quick, no-pressure walkthrough. We&apos;ll show you exactly what your callers hear.</p>
            <div className="mt-8"><Btn href={cal()} variant="light">Book your demo <Arrow /></Btn></div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-2">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted">
              AI receptionist &amp; dispatch for locksmiths. Answers every call, texts you the lead.
            </p>
            <p className="mt-4 text-xs text-muted">{CONFIG.legalName}<br />{CONFIG.address}</p>
          </div>
          <div className="flex flex-col gap-2 text-sm md:items-end">
            <a href="#how" className="hover:text-brand">How it works</a>
            <a href="#pricing" className="hover:text-brand">Pricing</a>
            <a href="#faq" className="hover:text-brand">FAQ</a>
            <a href="/privacy" className="hover:text-brand">Privacy</a>
            <a href={`mailto:${CONFIG.email}`} className="hover:text-brand">{CONFIG.email}</a>
          </div>
        </div>
        <p className="pb-8 text-center text-xs text-muted">© {new Date().getFullYear()} Dispango. All rights reserved.</p>
      </footer>
    </main>
  );
}
