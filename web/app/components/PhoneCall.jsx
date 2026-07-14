"use client";

import { useEffect, useRef, useState } from "react";

/* Looping simulated trade call: AI answers, captures the job, texts the lead.
   Original script + artwork. Concept only is inspired by category norms. */
const SHOP = "Rapid Plumbing";
const AGENT = "Ava";
const LINES = [
  { who: "ai", t: `Thanks for calling ${SHOP} — this is ${AGENT}. What's going on?` },
  { who: "caller", t: "My kitchen pipe burst, there's water everywhere." },
  { who: "ai", t: "Okay, I've got you. What's the address?" },
  { who: "caller", t: "412 Bloor West, unit 3." },
  { who: "ai", t: "And the best number to reach you?" },
  { who: "caller", t: "647-555-0198." },
  { who: "ai", t: "Sending this to the team now — someone will call you in minutes." },
];

function fmt(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function PhoneCall() {
  const [progress, setProgress] = useState(0); // completed lines
  const [partial, setPartial] = useState("");
  const [mode, setMode] = useState("typing"); // 'typing' | 'sent'
  const [sec, setSec] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    if (mode === "sent") {
      timer.current = setTimeout(() => {
        setProgress(0);
        setPartial("");
        setSec(0);
        setMode("typing");
      }, 3000);
      return () => clearTimeout(timer.current);
    }
    if (progress >= LINES.length) {
      timer.current = setTimeout(() => setMode("sent"), 700);
      return () => clearTimeout(timer.current);
    }
    const line = LINES[progress].t;
    if (partial.length < line.length) {
      timer.current = setTimeout(() => setPartial(line.slice(0, partial.length + 1)), 26);
    } else {
      timer.current = setTimeout(() => {
        setProgress((p) => p + 1);
        setPartial("");
      }, 520);
    }
    return () => clearTimeout(timer.current);
  }, [progress, partial, mode]);

  useEffect(() => {
    if (mode !== "typing") return;
    const id = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [mode]);

  const completed = LINES.slice(0, progress);

  return (
    <div className="relative mx-auto w-[300px]">
      {/* aura + rings behind phone */}
      <div className="animate-aura pointer-events-none absolute left-1/2 top-16 -z-10 h-[520px] w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(91,91,245,0.35),transparent_65%)]" />
      <span className="animate-ringpulse pointer-events-none absolute left-1/2 top-1/2 -z-10 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand/30" />

      {/* phone */}
      <div className="animate-floaty relative h-[600px] rounded-[2.6rem] bg-ink p-2.5 shadow-2xl shadow-brand/25 ring-1 ring-black/10">
        {/* notch + live dot */}
        <div className="absolute left-1/2 top-3 z-30 flex h-5 w-24 -translate-x-1/2 items-center justify-end rounded-full bg-black pr-3">
          <span className="animate-dot h-2 w-2 rounded-full bg-emerald" />
        </div>

        <div className="relative flex h-full flex-col overflow-hidden rounded-[2.1rem] bg-[#0a0e1c]">
          <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_50%_0%,rgba(91,91,245,0.30),transparent_68%)]" />

          {/* status bar */}
          <div className="relative flex items-center justify-between px-5 pt-8 text-[11px] font-semibold text-white/60">
            <span className="tabular-nums">9:41</span>
            <span>Dispango</span>
          </div>

          {/* call header */}
          <div className="relative px-5 pt-4">
            <p className="text-[13px] font-semibold text-white">{SHOP}</p>
            <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/50">
              <span className="animate-dot inline-block h-1.5 w-1.5 rounded-full bg-emerald" />
              {mode === "sent" ? "Wrapping up" : "Live call"}
              <span className="tabular-nums">· {fmt(sec)}</span>
              <span className="voicebars ml-auto text-brand"><span /><span /><span /><span /><span /></span>
            </div>
          </div>

          {/* transcript */}
          <div className="relative mt-3 flex-1 space-y-2 overflow-hidden px-4">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-white/30">Live transcript</p>
            {completed.map((l, i) => (
              <Bubble key={i} who={l.who} text={l.t} />
            ))}
            {mode === "typing" && progress < LINES.length && (
              <Bubble who={LINES[progress].who} text={partial} typing />
            )}
          </div>

          {/* lead-sent card */}
          {mode === "sent" && (
            <div className="animate-slideup relative mx-3 mb-4 rounded-2xl bg-white/95 p-4 shadow-lg">
              <p className="text-[10px] font-bold uppercase tracking-wide text-brand">Lead sent to you</p>
              <div className="mt-2 space-y-1 text-[12px] leading-snug text-ink">
                <p><b>Job:</b> Burst pipe — kitchen · urgent</p>
                <p><b>Callback:</b> (647) 555-0198</p>
                <p><b>Address:</b> 412 Bloor West, Unit 3</p>
              </div>
              <p className="mt-2 text-[11px] font-medium text-emerald">✓ Texted to your phone in 6 seconds</p>
            </div>
          )}
        </div>
      </div>

      {/* animated pointer cue */}
      <span className="animate-pointer pointer-events-none absolute bottom-24 right-6 z-40 text-white drop-shadow" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M4 2l16 8-6.5 1.8L10 20z" /></svg>
      </span>
    </div>
  );
}

function Bubble({ who, text, typing }) {
  const ai = who === "ai";
  return (
    <div className={`flex ${ai ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-3 py-1.5 text-[12px] leading-snug ${
          ai ? "bg-white/10 text-white/90" : "bg-brand text-white"
        } ${typing ? "caret" : ""}`}
      >
        {text}
      </div>
    </div>
  );
}
