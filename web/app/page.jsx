"use client";

import { useEffect } from "react";
import PhoneCall from "./components/PhoneCall";
import Calculator from "./components/Calculator";

const CONFIG = {
  calendly: "https://calendly.com/REPLACE-WITH-YOUR-LINK/demo",
  email: "hello@dispango.com",
  phone: "(000) 000-0000",
  legalName: "Jam Works Inc.",
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

function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-extrabold text-ink">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5b5bf5" /><stop offset="1" stopColor="#3a34c9" /></linearGradient></defs>
        <rect width="32" height="32" rx="8" fill="url(#lg)" />
        <circle cx="11" cy="22" r="2.4" fill="#fff" />
        <path d="M11 17a5 5 0 0 1 5 5" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M11 12a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </svg>
      <span className="text-xl tracking-tight">Dispango</span>
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

const BENEFITS = [
  { h: "Answers in 2 rings, 24/7", p: "Nights, weekends, mid-job — every call gets picked up." },
  { h: "The whole job, texted to you", p: "Name, number, address and what they need — in seconds." },
  { h: "No busy signal, ever", p: "Answers unlimited calls at once. Nobody waits on hold." },
  { h: "Callers can't tell it's AI", p: "A natural voice that greets them with your shop's name." },
  { h: "Kills the time-wasters", p: "Spam, robocalls and wrong numbers never reach your phone." },
  { h: "One flat $199/mo", p: "A fraction of an answering service. Zero per-call fees." },
];

const INDUSTRIES = [
  { h: "Locksmiths", p: "Lockouts captured with address and urgency, day or night." },
  { h: "Plumbers", p: "Burst pipes and floods triaged the second they call." },
  { h: "HVAC", p: "No-heat and no-cool calls logged and sent to you fast." },
  { h: "Electricians", p: "Every service call caught, even after hours." },
  { h: "Contractors", p: "Quote requests captured while you're on site." },
  { h: "Garage & more", p: "Any trade that lives and dies by the phone." },
];

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
  const cal = () => CONFIG.calendly;

  return (
    <main id="top" className="text-body">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-line/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-ink md:flex">
            <a href="#how" className="hover:text-brand">How it works</a>
            <a href="#industries" className="hover:text-brand">Industries</a>
            <a href="#pricing" className="hover:text-brand">Pricing</a>
            <a href="#faq" className="hover:text-brand">FAQ</a>
          </nav>
          <Btn href={cal()}>Book a demo <Arrow /></Btn>
        </div>
      </header>

      {/* HERO */}
      <section className="glow-hero relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:py-24">
          <div className="reveal">
            <span className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-brand-700">
              AI receptionist for home &amp; trade services
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-ink md:text-6xl">
              The call you missed just became <span className="text-brand">someone else&apos;s job.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-body">
              Dispango answers every call, captures the job, and texts you the lead in seconds — 24/7, even when you&apos;re on the tools.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Btn href={cal()}>Book a demo <Arrow /></Btn>
              <Btn href="#how" variant="ghost">See how it works</Btn>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-body">
              {["Keeps your number", "Live today", `Flat $${PRICE}/mo`].map((t) => (
                <li key={t} className="flex items-center gap-2"><Tick /> {t}</li>
              ))}
            </ul>
          </div>
          <div className="reveal"><PhoneCall /></div>
        </div>
      </section>

      {/* CALL-RUSH */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
          Five calls at once? It answers all five.
        </h2>
        <p className="reveal mx-auto mt-3 max-w-xl text-center">You can only pick up one. The other four hit voicemail — and voicemail is where jobs go to die.</p>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="reveal rounded-2xl border border-line bg-white p-7">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Without Dispango</p>
            <p className="mt-3 text-2xl font-extrabold text-ink">4 of 5 → voicemail</p>
            <p className="mt-2 text-sm">One line, one you. The rush hits and most callers just dial the next name on the list.</p>
          </div>
          <div className="reveal rounded-2xl border border-brand/20 bg-indigo-50 p-7">
            <p className="text-xs font-bold uppercase tracking-wide text-brand-700">With Dispango</p>
            <p className="mt-3 text-2xl font-extrabold text-ink">5 of 5 → captured</p>
            <p className="mt-2 text-sm">Every caller answered at once, job details taken, leads texted straight to your phone.</p>
          </div>
        </div>
      </section>

      {/* TRAINED */}
      <section className="glow-soft">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center">
          <h2 className="reveal text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Trained on your shop, not a script.</h2>
          <p className="reveal mx-auto mt-4 max-w-xl text-lg">It answers in your business name, knows your service area and hours, and greets repeat callers by name — so it sounds like the person who&apos;s worked your front desk for years.</p>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Everything a great receptionist does. None of the overhead.</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.h} className="reveal rounded-2xl border border-line bg-white p-6 transition-transform hover:-translate-y-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-brand"><Tick className="text-brand" /></div>
              <h3 className="mt-4 font-bold text-ink">{b.h}</h3>
              <p className="mt-2 text-sm">{b.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* INDUSTRIES */}
      <section id="industries" className="glow-soft">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Built for the trades that live on the phone.</h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {INDUSTRIES.map((c) => (
              <div key={c.h} className="reveal rounded-2xl bg-white p-6 ring-1 ring-line transition-transform hover:-translate-y-1">
                <h3 className="font-bold text-ink">{c.h}</h3>
                <p className="mt-2 text-sm">{c.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="glow-dark">
        <div className="mx-auto grid max-w-5xl gap-8 px-5 py-14 text-center text-white sm:grid-cols-3">
          {[["2 rings", "And it picks up — always"], ["<10s", "Lead texted to your phone"], ["24/7", "Every call, every night"]].map(([big, small]) => (
            <div key={big} className="reveal"><p className="text-4xl font-extrabold">{big}</p><p className="mt-1 text-sm text-white/70">{small}</p></div>
          ))}
        </div>
      </section>

      {/* COMPARE */}
      <section className="mx-auto max-w-5xl px-5 py-20">
        <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">The honest comparison.</h2>
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
      </section>

      {/* CALCULATOR */}
      <section className="glow-soft">
        <div className="mx-auto max-w-5xl px-5 py-20">
          <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">What are missed calls costing you?</h2>
          <p className="reveal mx-auto mt-3 max-w-lg text-center">Your numbers, not ours. Drag the sliders.</p>
          <div className="reveal mt-10"><Calculator /></div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="mx-auto max-w-3xl px-5 py-20">
        <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">One plan. No surprises.</h2>
        <div className="reveal mt-10 overflow-hidden rounded-3xl border border-line bg-white shadow-xl shadow-ink/5">
          <div className="glow-dark p-8 text-center text-white">
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-100">Dispango</p>
            <p className="mt-2 text-5xl font-extrabold">${PRICE}<span className="text-lg font-medium text-white/70">/mo</span></p>
            <p className="mt-2 text-sm text-white/70">14-day free trial · cancel anytime · keep your number</p>
          </div>
          <div className="grid gap-3 p-8 sm:grid-cols-2">
            {["Answers every call, 24/7", "Full job details texted in seconds", "Greets callers in your shop's name", "Remembers repeat callers", "Blocks spam & robocalls", "No per-call or setup fees", "Works with your existing number", "Live the same day"].map((f) => (
              <div key={f} className="flex items-start gap-2 text-sm text-body"><span className="mt-0.5 shrink-0"><Tick /></span>{f}</div>
            ))}
          </div>
          <div className="px-8 pb-8 text-center"><Btn href={cal()} className="w-full sm:w-auto">Start your free trial <Arrow /></Btn></div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="glow-soft">
        <div className="mx-auto max-w-3xl px-5 py-20">
          <h2 className="reveal text-center text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Questions, answered.</h2>
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

      {/* CTA */}
      <section id="book" className="mx-auto max-w-6xl px-5 py-20">
        <div className="glow-dark relative overflow-hidden rounded-3xl px-6 py-16 text-center text-white">
          <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">Stop losing jobs to voicemail.</h2>
          <p className="mx-auto mt-3 max-w-lg text-white/70">See it answer a call in 15 minutes. We&apos;ll show you exactly what your callers hear.</p>
          <div className="mt-8"><Btn href={cal()} variant="light">Book your demo <Arrow /></Btn></div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-2">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted">AI receptionist for home &amp; trade services. Answers every call, texts you the lead.</p>
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
