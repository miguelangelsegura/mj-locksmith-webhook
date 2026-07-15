"use client";

import { useEffect, useRef, useState } from "react";

/* Per-trade receptionist config — genuinely distinct shop, greeting, captured
   fields, rules, and a formatted lead-text SMS (the "trained on YOUR shop" proof). */
const TRADES = {
  locksmith: {
    label: "Locksmith",
    accent: "#5b5bf5",
    shop: "Rapid Lock & Key",
    greetingTail: "Are you locked out right now?",
    captures: ["Location & unit", "Lock type", "How urgent", "Callback number"],
    rules: ["Flag active lockouts as URGENT", "Always confirm the callback number", "Quote the after-hours call-out rate up front"],
    lead: { icon: "🔑", title: "New job — LOCKOUT (urgent)", lines: ["412 Bloor W, Unit 3", "Deadbolt, no spare key", "Callback 647-555-0198"], secs: 6 },
  },
  plumber: {
    label: "Plumber",
    accent: "#2f9bff",
    shop: "Rapid Plumbing",
    greetingTail: "Is water still running right now?",
    captures: ["Address", "What's leaking", "Water shut off?", "Callback number"],
    rules: ["Burst pipes = URGENT dispatch", "Ask if the main is shut off", "Confirm access to the unit"],
    lead: { icon: "🔧", title: "New job — BURST PIPE (urgent)", lines: ["88 Queen St E, basement", "Kitchen supply line, still leaking", "Callback 416-555-0142"], secs: 5 },
  },
  hvac: {
    label: "HVAC",
    accent: "#ff7a4d",
    shop: "TrueTemp Heating & Cooling",
    greetingTail: "Is the heat or the AC out?",
    captures: ["Address", "Heat or cool", "System type", "Callback number"],
    rules: ["No-heat below 0°C = URGENT", "Note furnace vs. heat pump", "Ask about any burning smell"],
    lead: { icon: "🔥", title: "New job — NO HEAT (urgent)", lines: ["17 Maple Ave, side entrance", "Furnace dead, house at 12°C", "Callback 905-555-0177"], secs: 7 },
  },
  electrician: {
    label: "Electrician",
    accent: "#ffb020",
    shop: "Bright Spark Electric",
    greetingTail: "Is anything sparking or smoking?",
    captures: ["Address", "What's affected", "Any smoke/spark", "Callback number"],
    rules: ["Sparking panel = URGENT", "Tell caller to kill the breaker", "Confirm safe to approach"],
    lead: { icon: "⚡", title: "New job — PANEL SPARKING (urgent)", lines: ["9 Dundas St W, Unit 12", "Breaker panel arcing, half the house dark", "Callback 647-555-0163"], secs: 6 },
  },
  garage: {
    label: "Garage Doors",
    accent: "#10b981",
    shop: "OverHead Garage Doors",
    greetingTail: "Is your car stuck inside?",
    captures: ["Address", "Door problem", "Car trapped?", "Callback number"],
    rules: ["Trapped vehicle = priority", "Note spring vs. opener", "Confirm door size"],
    lead: { icon: "🚪", title: "New job — DOOR STUCK", lines: ["240 King St, detached garage", "Broken spring, car trapped inside", "Callback 289-555-0119"], secs: 6 },
  },
  roofer: {
    label: "Roofer",
    accent: "#ff5c8a",
    shop: "PeakLine Roofing",
    greetingTail: "Is water coming in right now?",
    captures: ["Address", "Leak or damage", "Active leak?", "Callback number"],
    rules: ["Active interior leak = URGENT", "Note storm vs. wear", "Offer tarp same-day"],
    lead: { icon: "🏠", title: "New job — ROOF LEAK (storm)", lines: ["55 Birch Rd, two-storey", "Shingles off, water into bedroom", "Callback 705-555-0188"], secs: 8 },
  },
};
const TRADE_ORDER = ["locksmith", "plumber", "hvac", "electrician", "garage", "roofer"];

// Mirrors the voices offered on the signup form; "Elliot" is Dispango's live
// Vapi voice today. (Confirm the full roster against the Vapi dashboard.)
const VOICES = [
  { id: "Elliot", tone: "professional" },
  { id: "Ava", tone: "warm" },
  { id: "Cole", tone: "calm" },
  { id: "Harper", tone: "friendly" },
];

export default function BuildReceptionist() {
  const [trade, setTrade] = useState("locksmith");
  const [voice, setVoice] = useState("Elliot");
  const rootRef = useRef(null);
  const touched = useRef(false); // true once the visitor picks anything
  const timers = useRef([]);

  // Stop the scripted auto-demo the instant the visitor takes over.
  const stopDemo = () => {
    touched.current = true;
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const pickTrade = (key) => { stopDemo(); setTrade(key); };
  const pickVoice = (id) => { stopDemo(); setVoice(id); };

  // Auto-demo: cycle trade + voice once when scrolled into view so passive
  // visitors see the card react — but never override a real choice.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting || touched.current) return;
        io.disconnect();
        timers.current = [
          setTimeout(() => { if (!touched.current) setVoice("Cole"); }, 900),
          setTimeout(() => { if (!touched.current) setTrade("plumber"); }, 1700),
          setTimeout(() => { if (!touched.current) { setTrade("locksmith"); setVoice("Elliot"); } }, 2900),
        ];
      });
    }, { threshold: 0.35 });
    io.observe(el);
    return () => { io.disconnect(); timers.current.forEach(clearTimeout); };
  }, []);

  const t = TRADES[trade];
  const v = VOICES.find((x) => x.id === voice) || VOICES[0];

  return (
    <div ref={rootRef} className="grid grid-cols-1 gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      {/* Controls */}
      <div className="reveal min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Your trade</p>
        <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:flex-wrap lg:overflow-visible">
          {TRADE_ORDER.map((key) => {
            const on = key === trade;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => pickTrade(key)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  on ? "bg-brand text-white shadow-lg shadow-brand/30" : "border border-line bg-white text-ink hover:border-brand"
                }`}
              >
                {TRADES[key].label}
              </button>
            );
          })}
        </div>

        <p className="mt-7 text-xs font-bold uppercase tracking-wider text-muted">Pick a voice</p>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {VOICES.map((opt) => {
            const on = opt.id === voice;
            return (
              <button
                key={opt.id}
                type="button"
                aria-pressed={on}
                onClick={() => pickVoice(opt.id)}
                className={`flex items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-left transition-colors ${
                  on ? "border-brand bg-indigo-50" : "border-line bg-white hover:border-brand"
                }`}
              >
                <span>
                  <span className="block text-sm font-bold text-ink">{opt.id}</span>
                  <span className="block text-xs text-muted">{opt.tone}</span>
                </span>
                {on ? (
                  <span className="voicebars text-brand" aria-hidden="true"><span /><span /><span /><span /><span /></span>
                ) : (
                  <svg viewBox="0 0 20 20" className="h-4 w-4 text-muted" fill="none" aria-hidden="true"><path d="M7 6l6 4-6 4V6Z" fill="currentColor" /></svg>
                )}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted">Previews animate the voice — no audio plays.</p>
      </div>

      {/* Live preview card — keyed so it crossfades on any change */}
      <div className="reveal min-w-0">
        <div
          key={`${trade}-${voice}`}
          className="animate-slideup overflow-hidden rounded-3xl border border-line bg-white shadow-xl shadow-ink/5"
        >
          {/* header */}
          <div className="flex items-center gap-3 border-b border-line px-5 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: t.accent }}>
              {voice[0]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">{voice} · AI receptionist</p>
              <p className="truncate text-xs text-muted">for {t.shop}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald">
              <span className="h-1.5 w-1.5 animate-dot rounded-full bg-emerald" /> Live
            </span>
          </div>

          <div className="space-y-5 p-5">
            {/* greeting */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Greeting</p>
              <p className="mt-1.5 rounded-2xl bg-soft px-4 py-3 text-sm text-ink">
                &ldquo;Thanks for calling <b>{t.shop}</b> — this is {voice}. {t.greetingTail}&rdquo;
              </p>
            </div>

            {/* captures */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">What it captures</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {t.captures.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink">
                    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-emerald" fill="none"><path d="M5 10l3.5 3.5L15 6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {c}
                  </span>
                ))}
              </div>
            </div>

            {/* the SMS you'd get */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">The text you&apos;d get</p>
              <div className="mt-2 flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-emerald px-4 py-3 text-white shadow-md shadow-emerald/20">
                  <p className="text-sm font-bold">{t.lead.icon} {t.lead.title}</p>
                  <p className="mt-1 text-xs text-white/80">{voice} captured:</p>
                  <ul className="mt-1 space-y-0.5 font-mono text-[12px] leading-relaxed">
                    {t.lead.lines.map((l) => (
                      <li key={l}>• {l}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] font-semibold text-white/90">✓ Texted to you {t.lead.secs}s after the call</p>
                </div>
              </div>
            </div>

            {/* special instructions */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Special instructions</p>
              <ul className="mt-2 space-y-1.5">
                {t.rules.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-sm text-body">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: t.accent }} />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
