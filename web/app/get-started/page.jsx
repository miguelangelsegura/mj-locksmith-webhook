"use client";

import { useState } from "react";

// Supabase billing Edge Function base. Set NEXT_PUBLIC_BILLING_URL in Vercel;
// the placeholder keeps the build green until it's configured.
const BILLING_URL =
  process.env.NEXT_PUBLIC_BILLING_URL || "https://REPLACE.supabase.co/functions/v1/billing";

const TRADES = ["Locksmith", "Plumber", "HVAC", "Electrician", "Contractor", "Garage Doors", "Roofer", "Other"];
const VOICES = ["No preference", "Elliot", "Ava", "Cole", "Harper"];

function Logo() {
  return (
    <a href="/" className="inline-flex items-center gap-2 text-ink">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5b5bf5" /><stop offset="1" stopColor="#3a34c9" /></linearGradient></defs>
        <rect width="32" height="32" rx="8" fill="url(#lg)" />
        <circle cx="11" cy="22" r="2.4" fill="#fff" />
        <path d="M11 17a5 5 0 0 1 5 5" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M11 12a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </svg>
      <span className="text-[1.35rem] font-extrabold tracking-[-0.02em]">Dispango</span>
    </a>
  );
}

const label = "block text-sm font-semibold text-ink";
const field = "mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-brand";

export default function GetStarted() {
  const [form, setForm] = useState({ business_name: "", contact_email: "", phone: "", trade: TRADES[0], voice: VOICES[0], company_url: "" });
  const [status, setStatus] = useState("idle"); // idle | submitting | error
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setStatus("submitting");
    setError("");
    try {
      const res = await fetch(`${BILLING_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.onboarding_url) {
        window.location.href = data.onboarding_url; // → sign contract, then pay
        return;
      }
      setError(data.error || "Something went wrong. Please try again or email hello@dispango.com.");
      setStatus("error");
    } catch {
      setError("Couldn't reach the server. Please check your connection and try again.");
      setStatus("error");
    }
  }

  return (
    <main className="glow-hero min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Logo />
        <a href="/" className="text-sm font-medium text-body hover:text-brand">← Back to site</a>
      </header>

      <section className="mx-auto max-w-lg px-5 pb-20 pt-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink md:text-4xl">Get Started</h1>
        <p className="mt-3 text-body">
          Tell us about your shop. Next you&apos;ll sign a short agreement and start your 14-day free trial —
          then we get your line live, usually the same day.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-5 rounded-3xl border border-line bg-white p-7 shadow-xl shadow-ink/5">
          <div>
            <label className={label} htmlFor="business_name">Business name</label>
            <input id="business_name" className={field} value={form.business_name} onChange={set("business_name")} required placeholder="Rapid Plumbing" />
          </div>
          <div>
            <label className={label} htmlFor="contact_email">Email</label>
            <input id="contact_email" type="email" className={field} value={form.contact_email} onChange={set("contact_email")} required placeholder="you@yourshop.ca" />
          </div>
          <div>
            <label className={label} htmlFor="phone">Phone number for leads</label>
            <input id="phone" type="tel" className={field} value={form.phone} onChange={set("phone")} required placeholder="(647) 555-0198" />
            <p className="mt-1 text-xs text-muted">Where we&apos;ll text your captured jobs. Canadian/US numbers.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="trade">Your trade</label>
              <select id="trade" className={field} value={form.trade} onChange={set("trade")}>
                {TRADES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={label} htmlFor="voice">Receptionist voice</label>
              <select id="voice" className={field} value={form.voice} onChange={set("voice")}>
                {VOICES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* Honeypot — hidden from humans, catches bots. Do not remove. */}
          <input
            type="text" tabIndex={-1} autoComplete="off" value={form.company_url} onChange={set("company_url")}
            className="absolute left-[-9999px] h-0 w-0 opacity-0" aria-hidden="true"
          />

          {status === "error" && <p className="rounded-xl bg-warm-50 px-4 py-3 text-sm text-warm">{error}</p>}

          <button
            type="submit"
            disabled={status === "submitting"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand/30 transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {status === "submitting" ? "Setting up…" : "Continue to sign & start trial"}
          </button>
          <p className="text-center text-xs text-muted">14-day free trial · cancel anytime · keep your number</p>
        </form>
      </section>
    </main>
  );
}
