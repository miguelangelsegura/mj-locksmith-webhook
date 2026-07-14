"use client";

import { useEffect, useState } from "react";

// Supabase billing Edge Function base (same env the get-started page uses). The
// placeholder keeps the build green until NEXT_PUBLIC_BILLING_URL is set in Vercel.
const BILLING_URL =
  process.env.NEXT_PUBLIC_BILLING_URL || "https://REPLACE.supabase.co/functions/v1/billing";

function formatPhone(n) {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(n || "");
  return m ? `+1 (${m[1]}) ${m[2]}-${m[3]}` : n;
}

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
    intro: "Dial one code, press call. We recommend “when unanswered” so you still pick up first.",
    steps: [
      ["When unanswered (recommended)", "**61*NUM#"],
      ["When your line is busy", "**67*NUM#"],
      ["Every call", "**21*NUM#"],
      ["Turn forwarding off", "##002#"],
    ],
    note: "Works on Rogers, Bell, Telus, Fido, Koodo, Virgin & Freedom.",
  },
  Landline: {
    intro: "Enter a star code on the handset (or toggle it in your provider account).",
    steps: [
      ["When unanswered", "*92 → NUM"],
      ["All calls", "*72 → NUM"],
      ["Turn off", "*73"],
    ],
    note: "Codes vary by provider — if these don’t work we’ll set it up with you.",
  },
  "VoIP": {
    intro: "In your VoIP panel (RingCentral, Ooma, 8x8…), add a call-forwarding rule.",
    steps: [
      ["Forward rule", "unanswered / all → NUM"],
    ],
    note: "Every dashboard differs — happy to hop on and do it together.",
  },
};
const TABS = Object.keys(GUIDES);

export default function Welcome() {
  const [tab, setTab] = useState(TABS[0]);
  const [number, setNumber] = useState(null);
  const guide = GUIDES[tab];

  // The Stripe success redirect can land here before the payment webhook has
  // finished provisioning, so poll the tokenized read endpoint until the assigned
  // number shows up (or we give up and keep the graceful "setting up" state).
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) return;
    let tries = 0;
    let timer;
    let cancelled = false;
    async function poll() {
      tries += 1;
      try {
        const res = await fetch(`${BILLING_URL}/welcome-info/${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && data.inbound_number) {
          setNumber(data.inbound_number);
          return;
        }
      } catch {
        // network hiccup — keep polling
      }
      if (!cancelled && tries < 12) timer = setTimeout(poll, 4000);
    }
    poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  // Drop the real number into the forwarding codes once we have it.
  const withNumber = (code) => code.replace("NUM", number || "your Dispango number");

  return (
    <main className="glow-hero min-h-screen">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5">
        <Logo />
        <a href="/" className="text-sm font-medium text-body hover:text-brand">← Home</a>
      </header>

      <section className="mx-auto max-w-lg px-5 pb-24 pt-8 text-center">
        <div className="animate-pop mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald">
          <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none"><path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h1 className="animate-slideup mt-5 text-3xl font-extrabold tracking-tight text-ink md:text-4xl" style={{ animationDelay: ".05s" }}>
          You&apos;re all set 🎉
        </h1>
        <p className="animate-slideup mt-2 text-body" style={{ animationDelay: ".1s" }}>
          Here&apos;s your number — forward your line to it and you&apos;re live.
        </p>

        {/* Number — the hero */}
        <div className="animate-slideup animate-glow relative mt-8 overflow-hidden rounded-3xl border border-brand/25 bg-white p-8 shadow-xl shadow-brand/5" style={{ animationDelay: ".15s" }}>
          <span className="eyebrow">Your Dispango number</span>
          {number ? (
            <>
              <p className="mt-3 font-mono text-[2rem] font-extrabold tracking-tight text-ink md:text-4xl">{formatPhone(number)}</p>
              <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-emerald">
                <span className="animate-dot inline-block h-2 w-2 rounded-full bg-emerald" />
                Going live — we&apos;ll text you the moment it&apos;s ready
              </p>
            </>
          ) : (
            <>
              <p className="text-shimmer mt-3 font-mono text-[2rem] font-extrabold tracking-tight md:text-4xl">+1 (•••) •••-••••</p>
              <p className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-brand">
                <span className="animate-dot inline-block h-2 w-2 rounded-full bg-brand" />
                Assigning your number…
              </p>
            </>
          )}
        </div>

        {/* Three tiny steps */}
        <div className="animate-slideup mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-body" style={{ animationDelay: ".2s" }}>
          {["Forward your line", "We flip it live", "Jobs text you"].map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              {i > 0 && <span className="text-line">→</span>}
              <span className="rounded-full bg-soft px-3 py-1.5">{s}</span>
            </span>
          ))}
        </div>

        {/* Forwarding guide — compact */}
        <div className="animate-slideup mt-8 rounded-3xl border border-line bg-white p-6 text-left shadow-xl shadow-ink/5" style={{ animationDelay: ".25s" }}>
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${tab === t ? "bg-brand text-white" : "border border-line text-ink hover:border-brand"}`}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-body">{guide.intro}</p>
          <div key={tab} className="animate-slideup mt-3 space-y-2">
            {guide.steps.map(([label, code]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-soft px-4 py-2.5">
                <span className="text-sm font-medium text-ink">{label}</span>
                <span className="font-mono text-sm font-semibold text-brand">{withNumber(code)}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">{guide.note}</p>
        </div>

        <p className="animate-slideup mt-6 text-sm text-body" style={{ animationDelay: ".3s" }}>
          Want us to set it up with you? <a className="font-semibold text-brand hover:underline" href="mailto:hello@dispango.com">hello@dispango.com</a> — done in 5 minutes.
        </p>
      </section>
    </main>
  );
}
