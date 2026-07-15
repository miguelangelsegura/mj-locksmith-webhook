"use client";

import { useEffect, useRef, useState } from "react";

/* Counts 0→to on mount (respects reduced-motion). Local copy so this component
   stays self-contained; panels mount on select so the count re-runs each visit. */
function Counter({ to, className = "" }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) { setN(to); return; }
    let raf = 0;
    let start = 0;
    const dur = 900;
    const tick = (now) => {
      if (!start) start = now;
      const p = Math.min(1, (now - start) / dur);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <span className={className}>{n.toLocaleString()}</span>;
}

const NAV = [
  { group: null, items: [{ id: "overview", label: "Overview" }] },
  { group: "Activity", items: [
    { id: "leads", label: "Leads" },
    { id: "logs", label: "Call Logs" },
    { id: "sms", label: "SMS History" },
  ] },
  { group: "Insights", items: [{ id: "analytics", label: "Analytics" }] },
  { group: "Account", items: [
    { id: "billing", label: "Billing" },
    { id: "settings", label: "Settings" },
  ] },
];
const FLAT = NAV.flatMap((g) => g.items);

const LEADS = [
  { name: "Jamie Ortiz", job: "Burst pipe — kitchen", trade: "Plumbing", addr: "412 Bloor W, Unit 3", urg: "Urgent", time: "2m ago", quote: "…there's water everywhere, the whole floor is soaked…" },
  { name: "Sarah Kim", job: "Locked out — no spare", trade: "Locksmith", addr: "88 Queen St E", urg: "Urgent", time: "18m ago", quote: "…I'm standing outside, kids are inside, please hurry…" },
  { name: "Noah Bell", job: "No heat — furnace dead", trade: "HVAC", addr: "17 Maple Ave", urg: "High", time: "1h ago", quote: "…furnace won't kick on, house is down to twelve degrees…" },
  { name: "Mia Roy", job: "Panel sparking", trade: "Electrical", addr: "9 Dundas St W", urg: "Urgent", time: "3h ago", quote: "…the breaker box is making a buzzing noise and sparked…" },
];

const CALLS = [
  { name: "Jamie Ortiz", status: "Answered", dur: "1:24", time: "2m ago", quote: "Captured burst-pipe job, texted to you." },
  { name: "Unknown", status: "Spam", dur: "0:06", time: "40m ago", quote: "Auto-warranty robocall — blocked, no text sent." },
  { name: "Sarah Kim", status: "Answered", dur: "0:58", time: "18m ago", quote: "Lockout captured, callback confirmed." },
  { name: "No caller ID", status: "Missed", dur: "—", time: "2h ago", quote: "Rang out before pickup — no voicemail left." },
  { name: "Noah Bell", status: "Answered", dur: "2:11", time: "1h ago", quote: "No-heat job, flagged high urgency." },
];
const CALL_FILTERS = ["All", "Answered", "Missed", "Spam"];

const URG = { Urgent: "bg-danger-50 text-danger", High: "bg-warm-50 text-warm-amber" };
const STATUS = { Answered: "bg-emerald-50 text-emerald", Spam: "bg-violet-50 text-violet", Missed: "bg-danger-50 text-danger" };

function Overview() {
  return (
    <div className="animate-slideup space-y-5">
      <div className="flex items-center gap-3 rounded-2xl border border-emerald/30 bg-emerald-50/60 px-4 py-3">
        <span className="h-2.5 w-2.5 animate-dot rounded-full bg-emerald" />
        <p className="text-sm font-semibold text-ink">Dispango is live and answering.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { n: 248, l: "Calls answered", tint: "text-brand" },
          { n: 91, l: "Jobs captured", tint: "text-emerald" },
          { n: 6, l: "This week", tint: "text-sky" },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl border border-line bg-white p-4">
            <Counter to={s.n} className={`text-2xl font-extrabold tabular-nums ${s.tint}`} />
            <p className="mt-0.5 text-xs text-muted">{s.l}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Today&apos;s jobs</p>
        <div className="space-y-2">
          {LEADS.slice(0, 3).map((l) => (
            <div key={l.name} className="flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{l.name}</span>
              <span className="hidden truncate text-xs text-muted sm:block">{l.job}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${URG[l.urg]}`}>{l.urg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Leads() {
  const [sel, setSel] = useState(0);
  const l = LEADS[sel];
  return (
    <div className="animate-slideup grid gap-4 md:grid-cols-[1fr_1fr]">
      <div className="space-y-2">
        {LEADS.map((x, i) => (
          <button
            key={x.name}
            type="button"
            aria-pressed={i === sel}
            onClick={() => setSel(i)}
            className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
              i === sel ? "border-brand bg-indigo-50" : "border-line bg-white hover:border-brand"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-bold text-ink">{x.name}</span>
              <span className="shrink-0 text-[10px] text-muted">{x.time}</span>
            </div>
            <p className="truncate text-xs text-muted">{x.job}</p>
          </button>
        ))}
      </div>
      <div className="rounded-2xl border border-line bg-soft p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-ink">{l.name}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
              <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4" /><path d="M10 6.5V10l2.5 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Captured {l.time}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${URG[l.urg]}`}>{l.urg}</span>
        </div>
        <dl className="mt-3 space-y-1.5 text-xs">
          <div className="flex gap-2"><dt className="w-16 shrink-0 text-muted">Trade</dt><dd className="font-medium text-ink">{l.trade}</dd></div>
          <div className="flex gap-2"><dt className="w-16 shrink-0 text-muted">Job</dt><dd className="font-medium text-ink">{l.job}</dd></div>
          <div className="flex gap-2"><dt className="w-16 shrink-0 text-muted">Address</dt><dd className="font-medium text-ink">{l.addr}</dd></div>
        </dl>
        <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs italic text-body">{l.quote}</p>
      </div>
    </div>
  );
}

function Logs() {
  const [filter, setFilter] = useState("All");
  const [sel, setSel] = useState(0);
  const rows = CALLS.filter((c) => filter === "All" || c.status === filter);
  const active = rows[sel] || rows[0];
  return (
    <div className="animate-slideup space-y-4">
      <div className="flex flex-wrap gap-2">
        {CALL_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={f === filter}
            onClick={() => { setFilter(f); setSel(0); }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              f === filter ? "bg-brand text-white" : "border border-line bg-white text-body hover:border-brand"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
        <div className="space-y-2">
          {rows.map((c, i) => (
            <button
              key={`${c.name}-${i}`}
              type="button"
              aria-pressed={i === sel}
              onClick={() => setSel(i)}
              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                i === sel ? "border-brand bg-indigo-50" : "border-line bg-white hover:border-brand"
              }`}
            >
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{c.name}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS[c.status]}`}>{c.status}</span>
              <span className="shrink-0 text-[10px] tabular-nums text-muted">{c.dur}</span>
            </button>
          ))}
          {rows.length === 0 && <p className="rounded-xl border border-line bg-white px-3 py-4 text-center text-xs text-muted">No calls in this filter.</p>}
        </div>
        {active && (
          <div className="rounded-2xl border border-line bg-soft p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-ink">{active.name}</p>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS[active.status]}`}>{active.status}</span>
            </div>
            <p className="mt-1 text-[11px] text-muted">{active.time} · {active.dur}</p>
            <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs italic text-body">{active.quote}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Analytics() {
  const hours = [
    { l: "6a", v: 24 }, { l: "9a", v: 52 }, { l: "12p", v: 70 },
    { l: "3p", v: 88 }, { l: "6p", v: 61 },
    { l: "9p", v: 55, night: true }, { l: "12a", v: 40, night: true }, { l: "3a", v: 22, night: true },
  ];
  const tiles = [
    { n: 34, l: "After-hours jobs caught", sub: "nights & weekends — would've hit voicemail", tint: "text-sky" },
    { n: 248, l: "Calls answered", sub: "0 missed · 100% picked up", tint: "text-brand" },
    { n: 6, suf: "s", l: "Avg. time to text you", sub: "from hang-up to your phone", tint: "text-violet" },
    { pre: "$", n: 2800, suf: "/mo", l: "Saved vs. a receptionist", sub: "no wages, no HR, no sick days", tint: "text-emerald" },
  ];
  return (
    <div className="animate-slideup space-y-4">
      {/* ROI hero — jobs captured + their $ value */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald/30 bg-emerald-50/60 p-4">
          <p className="text-xs font-semibold text-emerald">Jobs captured this month</p>
          <Counter to={91} className="mt-1 block text-3xl font-extrabold tabular-nums text-emerald" />
          <p className="mt-0.5 text-xs text-muted">real jobs booked, not voicemails</p>
        </div>
        <div className="glow-dark rounded-2xl p-4 text-white">
          <p className="text-xs font-semibold text-indigo-100">Est. value of those jobs</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums">$<Counter to={28400} /></p>
          <p className="mt-0.5 text-xs text-white/70">captured revenue · $199/mo pays for itself</p>
        </div>
      </div>

      {/* Owner-value stat tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.l} className="rounded-2xl border border-line bg-white p-4">
            <p className={`text-2xl font-extrabold tabular-nums ${t.tint}`}>{t.pre}<Counter to={t.n} />{t.suf}</p>
            <p className="mt-1 text-xs font-semibold text-ink">{t.l}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted">{t.sub}</p>
          </div>
        ))}
      </div>

      {/* Busiest call times — after-hours highlighted */}
      <div className="rounded-2xl border border-line bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Busiest call times</p>
          <span className="flex items-center gap-1.5 text-[10px] font-semibold text-sky"><span className="h-2 w-2 rounded-sm bg-sky" />After-hours</span>
        </div>
        <div className="flex h-28 items-end gap-1.5">
          {hours.map((b) => (
            <div
              key={b.l}
              className={`flex-1 rounded-t-md ${b.night ? "bg-sky" : "bg-gradient-to-t from-brand to-brand-600"}`}
              style={{ height: `${b.v}%` }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex gap-1.5">
          {hours.map((b) => (
            <span key={b.l} className={`flex-1 text-center text-[10px] tabular-nums ${b.night ? "font-semibold text-sky" : "text-muted"}`}>{b.l}</span>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted">The evening &amp; overnight rush is exactly when a shop is off the clock — and when Dispango still answers.</p>
      </div>
    </div>
  );
}

function DeliveredTick() {
  return (
    <svg viewBox="0 0 22 20" className="h-3.5 w-3.5 shrink-0 text-emerald" fill="none" aria-hidden="true">
      <path d="M3 11l3 3 6-7M10 14l1 1 7-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const SMS_TEXTS = [
  { emoji: "🔑", trade: "Locksmith", job: "Locked out — no spare", addr: "88 Queen St E", urg: "Urgent", time: "2m ago", reply: true },
  { emoji: "🔧", trade: "Plumbing", job: "Burst pipe — kitchen", addr: "412 Bloor W, Unit 3", urg: "Urgent", time: "18m ago", reply: true },
  { emoji: "🔥", trade: "HVAC", job: "No heat — furnace dead", addr: "17 Maple Ave", urg: "High", time: "1h ago", reply: true },
  { emoji: "⚡", trade: "Electrical", job: "Panel sparking", addr: "9 Dundas St W", urg: "Urgent", time: "3h ago", reply: false },
];

function Sms() {
  return (
    <div className="animate-slideup space-y-3">
      <p className="text-xs text-muted">The paper trail of every text Dispango sends — the job alert to <span className="font-semibold text-ink">you</span>, and the confirmation to your <span className="font-semibold text-ink">caller</span>.</p>
      {SMS_TEXTS.map((t, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-line bg-white">
          {/* Job alert texted to the owner */}
          <div className="p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
                <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none"><path d="M4 4h12v9H7l-3 3V4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
                To you
              </span>
              <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted"><DeliveredTick />Delivered · {t.time}</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-ink">{t.emoji} New {t.trade} job — {t.job}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              <span className="min-w-0 truncate">{t.addr}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${URG[t.urg]}`}>{t.urg}</span>
            </div>
          </div>
          {/* Auto-reply texted to the caller */}
          {t.reply && (
            <div className="border-t border-line bg-soft px-3.5 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2 py-0.5 text-[10px] font-bold text-body">
                  <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none"><path d="M5 4h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H8l-3 3v-3H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
                  To caller
                </span>
                <span className="flex shrink-0 items-center gap-1 text-[10px] text-muted"><DeliveredTick />Delivered</span>
              </div>
              <p className="mt-1.5 text-xs italic text-body">&ldquo;You&apos;re all set — someone will call you in minutes.&rdquo;</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StubBilling() {
  return (
    <div className="animate-slideup space-y-4">
      <div className="glow-dark rounded-2xl p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">The Dispango Plan</p>
        <p className="mt-1 text-3xl font-extrabold">$199<span className="text-base font-medium text-white/60">/mo</span></p>
        <p className="mt-2 text-xs text-white/70">Renews Aug 1 · Visa •••• 4242</p>
      </div>
      <div className="rounded-2xl border border-line bg-white p-4 text-sm text-body">
        <div className="flex items-center justify-between py-1"><span>Jul 2026</span><span className="font-semibold text-ink">$199.00 · Paid</span></div>
        <div className="flex items-center justify-between border-t border-line py-1"><span>Jun 2026</span><span className="font-semibold text-ink">$199.00 · Paid</span></div>
      </div>
    </div>
  );
}

function StubSettings() {
  const toggles = [
    { l: "Text me every new lead", on: true },
    { l: "Block spam & robocalls", on: true },
    { l: "After-hours surcharge quote", on: false },
  ];
  return (
    <div className="animate-slideup space-y-2.5">
      {toggles.map((t) => (
        <div key={t.l} className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3">
          <span className="text-sm font-medium text-ink">{t.l}</span>
          <span className={`flex h-6 w-11 items-center rounded-full px-0.5 ${t.on ? "justify-end bg-brand" : "justify-start bg-line"}`}>
            <span className="h-5 w-5 rounded-full bg-white shadow" />
          </span>
        </div>
      ))}
    </div>
  );
}

const PANELS = {
  overview: Overview, leads: Leads, logs: Logs, sms: Sms,
  analytics: Analytics, billing: StubBilling, settings: StubSettings,
};

export default function CommandCenter() {
  const [active, setActive] = useState("overview");
  const Panel = PANELS[active];

  return (
    <div className="reveal overflow-hidden rounded-2xl border border-line bg-white shadow-2xl shadow-ink/10">
      {/* macOS title bar */}
      <div className="flex items-center gap-2 border-b border-line bg-soft px-4 py-3">
        <span className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </span>
        <span className="mx-auto flex items-center gap-2 rounded-md bg-white px-3 py-1 text-xs text-muted ring-1 ring-line">
          <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none"><path d="M6 9V6.5a4 4 0 0 1 8 0V9M5 9h10v7H5V9Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
          app.dispango.com
        </span>
        <span className="rounded-full bg-warm-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-warm-amber">Preview</span>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Sidebar (md+) / horizontal chip scroll (mobile) */}
        <nav className="flex gap-1.5 overflow-x-auto bg-ink px-3 py-3 md:w-52 md:flex-col md:gap-0.5 md:overflow-visible md:py-4" aria-label="Dashboard sections">
          {NAV.map((g, gi) => (
            <div key={gi} className="flex shrink-0 gap-1.5 md:mt-1 md:flex-col md:gap-0.5">
              {g.group && <p className="hidden px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-white/35 md:block">{g.group}</p>}
              {g.items.map((it) => {
                const on = it.id === active;
                return (
                  <button
                    key={it.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setActive(it.id)}
                    className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                      on ? "bg-brand text-white shadow" : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {it.label}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="hidden md:mt-auto md:block md:pt-4">
            <span className="block rounded-lg px-3 py-2 text-sm font-medium text-white/40">Sign out</span>
          </div>
        </nav>

        {/* Main panel */}
        <div className="min-h-[360px] min-w-0 flex-1 bg-white p-5">
          <p className="mb-4 text-lg font-extrabold text-ink">{FLAT.find((x) => x.id === active)?.label}</p>
          <Panel />
        </div>
      </div>
    </div>
  );
}
