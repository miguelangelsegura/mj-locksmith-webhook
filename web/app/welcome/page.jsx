"use client";

import { useState } from "react";

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

// Forwarding is standardized across Canadian/US mobile carriers (GSM MMI codes);
// the real variable is mobile vs landline vs VoIP — hence tabs, not per-carrier.
const GUIDES = {
  Mobile: {
    intro: "On your phone's dialer, enter one of these codes with your Dispango number (the one we're texting you), then press call. We recommend “when unanswered” so you can still pick up first — Dispango only catches what you miss.",
    steps: [
      ["Forward calls you don't answer (recommended)", "**61*YOUR-DISPANGO-NUMBER#"],
      ["Forward when your line is busy", "**67*YOUR-DISPANGO-NUMBER#"],
      ["Forward every call straight to Dispango", "**21*YOUR-DISPANGO-NUMBER#"],
      ["Turn all forwarding back off", "##002#"],
    ],
    note: "Works on virtually all Canadian mobile carriers (Rogers, Bell, Telus, Fido, Koodo, Virgin, Freedom).",
  },
  Landline: {
    intro: "Landlines set forwarding through your phone provider — usually a star code on the handset or a toggle in your provider's online account.",
    steps: [
      ["Forward when unanswered (common code)", "*92 then YOUR-DISPANGO-NUMBER"],
      ["Forward all calls (common code)", "*72 then YOUR-DISPANGO-NUMBER"],
      ["Turn forwarding off (common code)", "*73"],
    ],
    note: "Exact codes vary by provider — if these don't work, your provider's website will list them, or we'll set it up with you.",
  },
  "VoIP / internet phone": {
    intro: "In your VoIP admin panel (RingCentral, Ooma, 8x8, GoTo, etc.), open your number's call-handling or call-forwarding rules.",
    steps: [
      ["Add a forwarding rule", "Send unanswered / all calls to YOUR-DISPANGO-NUMBER"],
    ],
    note: "Every VoIP dashboard is a little different — we're happy to hop on a quick call and do it with you.",
  },
};
const TABS = Object.keys(GUIDES);

export default function Welcome() {
  const [tab, setTab] = useState(TABS[0]);
  const guide = GUIDES[tab];

  return (
    <main className="glow-hero min-h-screen">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5">
        <Logo />
        <a href="/" className="text-sm font-medium text-body hover:text-brand">← Home</a>
      </header>

      <section className="mx-auto max-w-2xl px-5 pb-20 pt-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald">
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink md:text-4xl">You&apos;re All Set! 🎉</h1>
        <p className="mt-3 text-body">
          Your contract is signed and your subscription is active. Here&apos;s exactly what happens next —
          you&apos;ll be taking AI-answered calls today.
        </p>

        {/* Next steps */}
        <ol className="mt-8 space-y-4">
          {[
            ["We're activating your Dispango number", "Watch for a text and email in the next few hours with your dedicated number."],
            ["Forward your business line to it", "Use the steps below — takes about a minute. Pick your line type."],
            ["Dispango starts answering", "Every call captured, every job texted straight to your phone."],
          ].map(([h, p], i) => (
            <li key={h} className="flex gap-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-extrabold text-white">{i + 1}</span>
              <div><p className="font-bold text-ink">{h}</p><p className="mt-0.5 text-sm text-body">{p}</p></div>
            </li>
          ))}
        </ol>

        {/* Forwarding guide */}
        <div className="mt-10 rounded-3xl border border-line bg-white p-7 shadow-xl shadow-ink/5">
          <h2 className="font-bold text-ink">Set Up Call Forwarding</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === t ? "bg-brand text-white" : "border border-line text-ink hover:border-brand"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-body">{guide.intro}</p>
          <div className="mt-4 space-y-2">
            {guide.steps.map(([label, code]) => (
              <div key={label} className="rounded-xl bg-soft p-4">
                <p className="text-sm font-semibold text-ink">{label}</p>
                <p className="mt-1 font-mono text-sm text-brand">{code}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">{guide.note}</p>
        </div>

        <div className="mt-8 rounded-2xl bg-indigo-50 p-5 text-center">
          <p className="text-sm font-semibold text-ink">Rather we set it up with you?</p>
          <p className="mt-1 text-sm text-body">Same-day help — reply to your welcome email or reach us at hello@dispango.com and we&apos;ll forward your line together in 5 minutes.</p>
        </div>
      </section>
    </main>
  );
}
