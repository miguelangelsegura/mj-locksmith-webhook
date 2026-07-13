"use client";

import { useState } from "react";

const PRICE = 199;

/* Hoisted to module scope — a stable component identity, so React never
   remounts the inputs on each drag (that remount was the "jitter"). */
function Row({ label, val, set, min, max, step, prefix, suffix }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-body">{label}</span>
        <span className="font-semibold text-ink tabular-nums">
          {prefix}{val}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={val}
        onChange={(e) => set(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--color-brand)]"
      />
    </div>
  );
}

export default function Calculator() {
  const [perWeek, setPerWeek] = useState(12);
  const [value, setValue] = useState(180);
  const [lost, setLost] = useState(60);
  const monthly = Math.round(perWeek * 4.3 * (lost / 100) * value);
  const multiple = (monthly / PRICE).toFixed(1);

  return (
    <div className="grid items-center gap-8 rounded-3xl border border-line bg-white p-8 shadow-xl shadow-ink/5 md:grid-cols-2">
      <div className="space-y-5">
        <Row label="Missed calls per week" val={perWeek} set={setPerWeek} min={1} max={40} step={1} />
        <Row label="Average job value" val={value} set={setValue} min={50} max={800} step={10} prefix="$" />
        <Row label="Callers who hire someone else" val={lost} set={setLost} min={10} max={100} step={5} suffix="%" />
      </div>
      <div className="glow-dark rounded-2xl p-8 text-center text-white">
        <p className="text-sm text-white/70">You&apos;re losing about</p>
        {/* fixed height + tabular-nums so the number never reflows the layout */}
        <p className="my-2 flex h-14 items-center justify-center text-5xl font-extrabold tabular-nums">
          ${monthly.toLocaleString()}
        </p>
        <p className="text-sm text-white/70">every month to missed calls.</p>
        <p className="mt-4 inline-block rounded-full bg-white/15 px-4 py-2 text-sm font-medium text-white">
          Dispango pays for itself {multiple}× over.
        </p>
      </div>
    </div>
  );
}
