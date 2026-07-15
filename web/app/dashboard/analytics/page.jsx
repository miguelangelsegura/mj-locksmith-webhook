"use client";

import { useDashboard } from "@/lib/dashboardData";
import { computeAnalytics, AVG_JOB_VALUE, DISPANGO_MONTHLY, MONTHLY_RECEPTIONIST } from "@/lib/analytics";
import { StatCard, PageHeader, Skeleton } from "../ui";

export default function AnalyticsPage() {
  const { profile, calls, loading } = useDashboard();
  if (loading || !profile) return <AnalyticsSkeleton />;

  const tz = profile.timezone || "America/Edmonton";
  const a = computeAnalytics(calls, tz);
  const maxBar = Math.max(1, ...a.byDay.map((d) => d.count));

  return (
    <div className="animate-slideup space-y-6">
      <PageHeader title="Analytics" subtitle="The value your AI receptionist is putting back in your pocket." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard value={a.answered} label="Calls answered" tint="brand" />
        <StatCard value={a.leads} label="Jobs captured" tint="emerald" />
        <StatCard value={a.afterHours} label="After-hours catches" tint="sky" />
        <StatCard value={a.thisWeek} label="Calls this week" tint="violet" />
      </div>

      {/* Weekly volume */}
      <section className="rounded-2xl border border-line bg-white p-5">
        <p className="mb-4 text-xs font-bold uppercase tracking-wider text-muted">Calls answered · last 7 days</p>
        <div className="flex h-36 items-end gap-2.5">
          {a.byDay.map((d, i) => (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-[11px] font-bold tabular-nums text-ink">{d.count || ""}</span>
              <div className="w-full rounded-t-md bg-gradient-to-t from-brand to-brand-600 transition-all"
                style={{ height: `${Math.max(6, (d.count / maxBar) * 116)}px` }} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2.5">
          {a.byDay.map((d, i) => <span key={i} className="flex-1 text-center text-[10px] text-muted">{d.label}</span>)}
        </div>
      </section>

      {/* ROI */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="glow-dark rounded-2xl p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-100">Estimated value captured</p>
          <p className="mt-1 text-3xl font-extrabold">${a.estValue.toLocaleString()}</p>
          <p className="mt-2 text-xs leading-relaxed text-white/70">
            {a.leads.toLocaleString()} job{a.leads === 1 ? "" : "s"} captured × ~${AVG_JOB_VALUE}/job
            (a deliberately conservative estimate — most jobs are worth more).
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">Vs. a human receptionist</p>
          <p className="mt-1 text-3xl font-extrabold text-ink">
            ${a.receptionistSaved.toLocaleString()}<span className="text-base font-semibold text-muted">/mo saved</span>
          </p>
          <p className="mt-2 text-xs leading-relaxed text-body">
            A part-time receptionist runs about <span className="font-semibold text-ink">${MONTHLY_RECEPTIONIST.toLocaleString()}/mo</span>.
            Dispango is a flat <span className="font-semibold text-ink">${DISPANGO_MONTHLY}/mo</span> — and answers
            nights, weekends, and holidays a receptionist wouldn't.
          </p>
        </div>
      </section>

      <p className="text-center text-[11px] text-muted">
        Estimates use conservative industry figures to keep the numbers honest. Your real job values will vary.
      </p>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-48" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
      <Skeleton className="h-52 rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-36 rounded-2xl" /><Skeleton className="h-36 rounded-2xl" /></div>
    </div>
  );
}
