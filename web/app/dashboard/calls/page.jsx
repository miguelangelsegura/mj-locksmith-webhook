"use client";

import { useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboardData";
import { isLead, jobLine, displayName, relativeTime, formatDuration, callStatus } from "@/lib/format";
import { PageHeader, Badge, EmptyState, Skeleton } from "../ui";
import CallDetail from "../CallDetail";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "leads", label: "Leads" },
  { key: "junk", label: "Spam / Junk" },
];

export default function CallsPage() {
  const { profile, calls, loading } = useDashboard();
  const [filter, setFilter] = useState("all");
  const [selId, setSelId] = useState(null);

  const rows = useMemo(() => {
    if (filter === "leads") return calls.filter((c) => isLead(c.outcome));
    if (filter === "junk") return calls.filter((c) => !isLead(c.outcome));
    return calls;
  }, [calls, filter]);

  const selected = rows.find((c) => c.vapi_call_id === selId) || rows[0] || null;
  const tz = profile?.timezone || "America/Edmonton";

  if (loading) return <ListSkeleton />;

  return (
    <div className="animate-slideup">
      <PageHeader title="Call Logs" subtitle={`Every call your Dispango line has handled.`} />

      {calls.length === 0 ? (
        <EmptyState title="No calls yet" body="Once your line goes live, every call — answered, spam, or otherwise — is logged here." icon={<IconPhone />} />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button key={f.key} type="button" onClick={() => { setFilter(f.key); setSelId(null); }}
                aria-pressed={f.key === filter}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  f.key === filter ? "bg-brand text-white shadow" : "border border-line bg-white text-body hover:border-brand"
                }`}>
                {f.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="space-y-2">
              {rows.map((c) => {
                const on = selected && c.vapi_call_id === selected.vapi_call_id;
                const st = callStatus(c);
                return (
                  <button key={c.vapi_call_id} type="button" onClick={() => setSelId(c.vapi_call_id)}
                    aria-pressed={on}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                      on ? "border-brand bg-indigo-50" : "border-line bg-white hover:border-brand"
                    }`}>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-ink">{displayName(c)}</span>
                        <span className="shrink-0 text-[10px] tabular-nums text-muted">{formatDuration(c.duration_seconds)}</span>
                      </span>
                      <span className="block truncate text-xs text-muted">{jobLine(c)}</span>
                    </span>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge tone={st.tone}>{st.label}</Badge>
                      <span className="text-[10px] text-muted">{relativeTime(c.ended_at)}</span>
                    </div>
                  </button>
                );
              })}
              {rows.length === 0 && (
                <p className="rounded-xl border border-line bg-white px-3 py-6 text-center text-xs text-muted">No calls in this filter.</p>
              )}
            </div>

            <div className="md:sticky md:top-6 md:self-start">
              <CallDetail call={selected} tz={tz} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-48" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

function IconPhone() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2A15 15 0 0 1 3 6a2 2 0 0 1 2-2Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
