"use client";

import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboardData";
import { isLead, jobLine, displayName, relativeTime, urgencyTone } from "@/lib/format";
import { PageHeader, Badge, EmptyState, Skeleton } from "../ui";
import CallDetail from "../CallDetail";

export default function LeadsPage() {
  const { profile, calls, loading } = useDashboard();
  const [selId, setSelId] = useState(null);
  const [q, setQ] = useState("");

  const leads = useMemo(() => calls.filter((c) => isLead(c.outcome)), [calls]);

  // Honour a ?call=<id> deep-link from the Overview page (read once on mount).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("call");
    if (id) setSelId(id);
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return leads;
    return leads.filter((c) =>
      [displayName(c), jobLine(c), c.service_address, c.caller_phone]
        .filter(Boolean).join(" ").toLowerCase().includes(needle));
  }, [leads, q]);

  const selected = filtered.find((c) => c.vapi_call_id === selId) || filtered[0] || null;
  const tz = profile?.timezone || "America/Edmonton";

  if (loading) return <ListSkeleton />;

  return (
    <div className="animate-slideup">
      <PageHeader
        title="Leads"
        subtitle={`${leads.length} job${leads.length === 1 ? "" : "s"} captured by your AI receptionist.`}
      />

      {leads.length === 0 ? (
        <EmptyState
          title="No leads yet"
          body="Every job your Dispango line captures shows up here — with the caller, the problem, and the address."
          icon={<IconInbox />}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, address, phone…"
              className="mb-2.5 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-brand"
            />
            <div className="space-y-2">
              {filtered.map((c) => {
                const on = selected && c.vapi_call_id === selected.vapi_call_id;
                return (
                  <button key={c.vapi_call_id} type="button" onClick={() => setSelId(c.vapi_call_id)}
                    aria-pressed={on}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                      on ? "border-brand bg-indigo-50" : "border-line bg-white hover:border-brand"
                    }`}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-brand">
                      {(displayName(c)[0] || "?").toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-ink">{displayName(c)}</span>
                        <span className="shrink-0 text-[10px] text-muted">{relativeTime(c.ended_at)}</span>
                      </span>
                      <span className="block truncate text-xs text-muted">{jobLine(c)}</span>
                    </span>
                    {c.urgency && <Badge tone={urgencyTone(c.urgency)}>{c.urgency}</Badge>}
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <p className="rounded-xl border border-line bg-white px-3 py-6 text-center text-xs text-muted">No leads match “{q}”.</p>
              )}
            </div>
          </div>

          <div className="md:sticky md:top-6 md:self-start">
            <CallDetail call={selected} tz={tz} />
          </div>
        </div>
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

function IconInbox() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 13h4l2 3h4l2-3h4M4 13 6 5h12l2 8v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5Z" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
