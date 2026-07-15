"use client";

import { useEffect, useRef, useState } from "react";

/* The 5 emergency callers (shared data). `won` = the Dispango-side outcome
   fragment that flips in as each call is answered. */
const CALLERS = [
  { name: "Jamie", job: "Burst pipe — kitchen", value: 420, won: "Texted to you" },
  { name: "Sarah", job: "Locked out — no spare", value: 180, won: "Address captured" },
  { name: "Noah", job: "No heat — furnace dead", value: 350, won: "Urgent flagged" },
  { name: "Mia", job: "Panel sparking", value: 300, won: "Callback saved" },
  { name: "Liam", job: "Garage door stuck", value: 220, won: "Job logged" },
];
const TOTAL = CALLERS.reduce((s, c) => s + c.value, 0); // 1470
const LOST_OLD = CALLERS.slice(1).reduce((s, c) => s + c.value, 0); // 1050

/* Eases a displayed number toward `target` with rAF (mirrors Calculator's
   useEased) so the $-recovered meter glides up as each call resolves. */
function useEased(target) {
  const [shown, setShown] = useState(target);
  const raf = useRef(0);
  const from = useRef(target);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce) { setShown(target); return; }
    cancelAnimationFrame(raf.current);
    from.current = shown;
    let start = 0;
    const dur = 500;
    const tick = (now) => {
      if (!start) start = now;
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(from.current + (target - from.current) * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return shown;
}

const OUTCOMES = [
  { k: "0s hold time", d: "Nobody ever waits." },
  { k: "∞ calls at once", d: "Every line, same second." },
  { k: "Every job texted", d: "Straight to your phone." },
];

export default function CallRush() {
  const [mode, setMode] = useState("old"); // 'old' | 'dispango'
  const [phase, setPhase] = useState(0); // how many callers have resolved
  const [runId, setRunId] = useState(0); // bump to replay
  const [started, setStarted] = useState(false);
  const rootRef = useRef(null);
  const firstPlay = useRef(true); // stagger only the first auto-demo; toggles snap

  // Auto-demo once when scrolled into view (or immediately if IO unsupported /
  // reduced-motion). Passive visitors still see the divergence play out.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce || !("IntersectionObserver" in window)) { setStarted(true); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { setStarted(true); io.disconnect(); }
      });
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // First scroll-in auto-demo staggers the reveal (the wow). Every manual toggle
  // after that snaps straight to the resolved state — no grey "Ringing…" reset,
  // so the 1/5-vs-5/5 divergence is instant when you flip the switch.
  useEffect(() => {
    if (!started) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduce || !firstPlay.current) { setPhase(CALLERS.length); firstPlay.current = false; return; }
    firstPlay.current = false;
    setPhase(0);
    const timers = [];
    for (let i = 1; i <= CALLERS.length; i++) {
      timers.push(setTimeout(() => setPhase(i), 220 + i * 200));
    }
    return () => timers.forEach(clearTimeout);
  }, [mode, runId, started]);

  const replay = (next) => {
    setStarted(true);
    if (next === mode) setRunId((n) => n + 1);
    else setMode(next);
  };

  const isDispango = mode === "dispango";
  const answered = isDispango ? phase : Math.min(phase, 1); // old way: only caller #1
  const meterTarget = isDispango
    ? CALLERS.slice(0, phase).reduce((s, c) => s + c.value, 0)
    : phase >= 1 ? CALLERS[0].value : 0;
  const meter = useEased(meterTarget);

  return (
    <div ref={rootRef}>
      {/* Toggle — the "you decide" */}
      <div className="reveal mx-auto flex w-fit items-center gap-1.5 rounded-full border border-line bg-white p-1.5 shadow-lg shadow-ink/5">
        <button
          type="button"
          aria-pressed={!isDispango}
          onClick={() => replay("old")}
          className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-colors sm:px-6 ${
            !isDispango ? "bg-ink text-white shadow" : "text-body hover:text-ink"
          }`}
        >
          Old way — one front desk
        </button>
        <button
          type="button"
          aria-pressed={isDispango}
          onClick={() => replay("dispango")}
          className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-colors sm:px-6 ${
            isDispango ? "bg-brand text-white shadow-lg shadow-brand/30" : "text-body hover:text-ink"
          }`}
        >
          The Dispango way
        </button>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[1.35fr_1fr]">
        {/* Callers column */}
        <div
          className={`reveal min-w-0 rounded-3xl border p-5 transition-colors sm:p-6 ${
            isDispango ? "border-emerald/30 bg-emerald-50/40" : "border-danger/30 bg-danger-50/40"
          }`}
        >
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Incoming — 5 calls at once</p>
            {isDispango ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald px-3 py-1 text-xs font-bold text-white">
                <span className="h-1.5 w-1.5 animate-dot rounded-full bg-white" /> 5 active · 0 waiting
              </span>
            ) : (
              <span className="rounded-full bg-danger px-3 py-1 text-xs font-bold text-white">4 sent to voicemail</span>
            )}
          </div>

          <div className="space-y-2.5">
            {CALLERS.map((c, i) => {
              const done = i < answered;
              const onCall = !isDispango && i === 0; // old way: caller #1 is live
              const voicemail = !isDispango && i >= 1 && i < phase;
              return (
                <div
                  key={c.name}
                  className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 transition-all ${
                    voicemail ? "border-line opacity-55" : "border-line"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      onCall
                        ? "bg-indigo-50 text-brand"
                        : done
                        ? "bg-emerald-50 text-emerald"
                        : voicemail
                        ? "bg-danger-50 text-danger"
                        : "bg-soft text-muted"
                    }`}
                  >
                    {c.name[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{c.name}</p>
                    <p className={`truncate text-xs ${voicemail ? "line-through text-muted" : "text-body"}`}>{c.job}</p>
                  </div>
                  {onCall ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-brand">
                      <span className="voicebars text-brand"><span /><span /><span /><span /><span /></span>
                      On the call
                    </span>
                  ) : done ? (
                    <span className="animate-pop inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald">
                      <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none"><path d="M5 10l3.5 3.5L15 6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      {c.won}
                    </span>
                  ) : voicemail ? (
                    <span className="shrink-0 rounded-full bg-danger-50 px-2.5 py-1 text-xs font-bold text-danger">Voicemail</span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-soft px-2.5 py-1 text-xs font-semibold text-muted">Ringing…</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Big score */}
          <div className="mt-5 flex items-baseline gap-2">
            <span className={`text-4xl font-extrabold tracking-tight ${isDispango ? "text-emerald" : "text-danger"}`}>
              {answered} / 5
            </span>
            <span className="text-sm font-semibold text-muted">answered</span>
          </div>
        </div>

        {/* $-recovered meter (the anchor) */}
        <div className="reveal min-w-0">
          <div className="glow-dark flex h-full flex-col justify-center rounded-3xl p-7 text-center text-white">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-100">Recovered this rush</p>
            <p className="my-2 flex items-center justify-center text-6xl font-extrabold tabular-nums">
              ${meter.toLocaleString()}
            </p>
            {isDispango ? (
              <p className="text-sm text-white/70">
                All five jobs caught — worth <b className="text-white">${TOTAL.toLocaleString()}</b>.
              </p>
            ) : (
              <p className="text-sm text-white/70">
                <b className="text-warm">${LOST_OLD.toLocaleString()}</b> gone to voicemail.
              </p>
            )}
            <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/15">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ease-out ${isDispango ? "bg-emerald" : "bg-warm"}`}
                style={{ width: `${(meterTarget / TOTAL) * 100}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-white/50">
              {isDispango ? "Every caller, same second." : "One front desk can only hold one line."}
            </p>
          </div>
        </div>
      </div>

      {/* Outcome strip */}
      <div className="reveal mt-6 grid gap-3 sm:grid-cols-3">
        {OUTCOMES.map((o) => (
          <div key={o.k} className="rounded-2xl border border-line bg-white px-4 py-4 text-center">
            <p className="text-lg font-extrabold text-ink">{o.k}</p>
            <p className="mt-0.5 text-xs text-muted">{o.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
