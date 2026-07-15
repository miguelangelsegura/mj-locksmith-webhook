"use client";

import Link from "next/link";
import { useDashboard } from "@/lib/dashboardData";
import { computeAnalytics, AVG_JOB_VALUE } from "@/lib/analytics";
import { isLead, jobLine, displayName, relativeTime, urgencyTone } from "@/lib/format";
import { StatCard, PageHeader, Badge, LiveBadge, EmptyState, Skeleton } from "./ui";

export default function OverviewPage() {
  const { profile, calls, loading } = useDashboard();
  if (loading || !profile) return <OverviewSkeleton />;

  const tz = profile.timezone || "America/Edmonton";
  const a = computeAnalytics(calls, tz);
  const live = profile.active && ["active", "none"].includes(profile.provision_status);
  const scheduled = profile.answer_mode === "scheduled";

  const recentLeads = calls.filter((c) => isLead(c.outcome)).slice(0, 5);
  const firstName = (profile.business_name || "there").split(/\s+/)[0];

  return (
    <div className="animate-slideup space-y-6">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        subtitle="Here's what your AI receptionist has been up to."
      />

      <LiveBadge
        live={live}
        label={
          live
            ? scheduled
              ? "Dispango is answering during your set hours."
              : "Dispango is live and answering — 24/7."
            : "Your line isn't live yet. Finish setup to start capturing calls."
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard value={a.answered} label="Calls answered" tint="brand" />
        <StatCard value={a.leads} label="Jobs captured" tint="emerald" />
        <StatCard value={a.afterHours} label="After-hours catches" tint="sky" />
        <StatCard value={a.estValue} prefix="$" label="Value captured" tint="emerald"
          hint={`~$${AVG_JOB_VALUE}/job (conservative)`} />
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Latest jobs</h2>
          <Link href="/dashboard/leads" className="text-xs font-bold text-brand hover:underline">View all →</Link>
        </div>
        {recentLeads.length === 0 ? (
          <EmptyState
            title="No jobs captured yet"
            body="As soon as a caller reaches your Dispango line, their job appears here and gets texted to you."
            icon={<IconInbox />}
          />
        ) : (
          <div className="space-y-2">
            {recentLeads.map((c) => (
              <Link key={c.vapi_call_id} href={`/dashboard/leads?call=${encodeURIComponent(c.vapi_call_id)}`}
                className="lift flex items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-brand">
                  {(displayName(c)[0] || "?").toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ink">{displayName(c)}</span>
                  <span className="block truncate text-xs text-muted">{jobLine(c)}</span>
                </span>
                {c.urgency && <Badge tone={urgencyTone(c.urgency)}>{c.urgency}</Badge>}
                <span className="hidden shrink-0 text-[11px] text-muted sm:block">{relativeTime(c.ended_at)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-14 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
    </div>
  );
}

function IconInbox() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 13h4l2 3h4l2-3h4M4 13 6 5h12l2 8v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
