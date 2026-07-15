"use client";

import { useEffect, useRef, useState } from "react";

// Counts 0→to when it scrolls into view (respects reduced-motion). Mirrors the
// marketing site's CountUp so the app feels continuous with it.
export function CountUp({ to, prefix = "", suffix = "", className = "" }) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) { setN(to); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const dur = 850;
        const tick = (now) => {
          const p = Math.min(1, (now - start) / dur);
          setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [to]);
  return <span ref={ref} className={className}>{prefix}{n.toLocaleString()}{suffix}</span>;
}

const TINT = {
  brand: "text-brand", emerald: "text-emerald", sky: "text-sky",
  violet: "text-violet", amber: "text-warm-amber", ink: "text-ink",
};

export function StatCard({ value, label, prefix = "", suffix = "", tint = "brand", hint }) {
  return (
    <div className="lift rounded-2xl border border-line bg-white p-4">
      <CountUp to={value} prefix={prefix} suffix={suffix}
        className={`text-2xl font-extrabold tabular-nums md:text-[1.7rem] ${TINT[tint] || TINT.brand}`} />
      <p className="mt-0.5 text-xs font-medium text-muted">{label}</p>
      {hint && <p className="mt-1 text-[11px] leading-tight text-muted/80">{hint}</p>}
    </div>
  );
}

export function PageHeader({ title, subtitle, right }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-extrabold text-ink md:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

const TONE = {
  urgent: "bg-danger-50 text-danger",
  high: "bg-warm-50 text-warm-amber",
  normal: "bg-indigo-50 text-brand",
  ok: "bg-emerald-50 text-emerald",
  lead: "bg-emerald-50 text-emerald",
  spam: "bg-violet-50 text-violet",
  muted: "bg-soft text-muted",
};

export function Badge({ tone = "normal", children }) {
  return (
    <span className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TONE[tone] || TONE.normal}`}>
      {children}
    </span>
  );
}

export function LiveBadge({ live = true, label }) {
  return (
    <div className={`flex items-center gap-2.5 rounded-2xl border px-4 py-3 ${
      live ? "border-emerald/30 bg-emerald-50/60" : "border-line bg-soft"
    }`}>
      <span className={`h-2.5 w-2.5 rounded-full ${live ? "animate-dot bg-emerald" : "bg-muted"}`} />
      <p className="text-sm font-semibold text-ink">{label}</p>
    </div>
  );
}

export function EmptyState({ title, body, icon }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white/60 px-6 py-14 text-center">
      {icon && <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-brand">{icon}</div>}
      <p className="text-sm font-bold text-ink">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-xs text-xs text-muted">{body}</p>}
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}
