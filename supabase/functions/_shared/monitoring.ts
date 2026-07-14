// Shared monitoring queries — the single source of truth for the two health
// signals we watch, used by BOTH the admin `/health` endpoint and the scheduled
// `heartbeat-monitor`. Consolidated here so the two never drift apart.
//
//   1. Unsent dispatch — a real lead ended >2min ago but its SMS never went out
//                        (Twilio/dispatch failing). Junk outcomes are excluded.
//   2. Abuse burst     — one caller placed an unusual number of calls this hour.
//
// Both callers pass in their own Supabase service-role client. All queries FAIL
// OPEN: a DB error yields empty data (treated as "nothing wrong") rather than
// throwing — a monitoring hiccup must never masquerade as an outage.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

// Call outcomes that legitimately produce no dispatch SMS, so their rows must
// NOT be flagged as "unsent leads". Mirrors sendDispatchSms in the webhook.
export const NON_LEAD_OUTCOMES = new Set(["wrong_number", "spam", "info_only"]);

// One caller placing >= this many calls in the last hour trips the abuse signal.
// Env-overridable; default 6 matches the value the admin health card used.
export const ABUSE_BURST_THRESHOLD = Number(Deno.env.get("ABUSE_BURST_THRESHOLD") ?? "6");

export interface MonitoringSummary {
  ok: boolean;
  callsLastHour: number;
  unsentLeads: number;
  abusers: { phone: string; calls: number }[];
  checkedAt: string;
}

// Run both health checks against `calls` and return a plain summary. Never
// throws on a query error (data coalesces to []), so callers fail open.
export async function collectMonitoring(supabase: SupabaseClient): Promise<MonitoringSummary> {
  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();
  const twoMinAgo = new Date(now - 2 * 60 * 1000).toISOString();

  // 1. Unsent dispatch (real lead ended in the last hour, >2min ago, no SMS).
  const { data: unsent, error: unsentErr } = await supabase
    .from("calls").select("vapi_call_id, outcome")
    .is("notified_at", null).gte("ended_at", hourAgo).lte("ended_at", twoMinAgo);
  // Fail open, but leave a trail: a persistent query failure must not silently
  // read as "all healthy" with no way to notice.
  if (unsentErr) console.log(`[monitoring] unsent-leads query failed: ${unsentErr.message}`);
  const unsentLeads = (unsent ?? []).filter((c) =>
    !NON_LEAD_OUTCOMES.has(String(c.outcome ?? "").trim().toLowerCase().replace(/ /g, "_"))
  ).length;

  // 2. Abuse burst (one number, many calls in the last hour).
  const { data: recent, error: recentErr } = await supabase
    .from("calls").select("caller_phone")
    .gte("ended_at", hourAgo).not("caller_phone", "is", null);
  if (recentErr) console.log(`[monitoring] abuse-burst query failed: ${recentErr.message}`);
  const counts: Record<string, number> = {};
  for (const r of recent ?? []) {
    counts[r.caller_phone as string] = (counts[r.caller_phone as string] ?? 0) + 1;
  }
  const abusers = Object.entries(counts)
    .filter(([, n]) => n >= ABUSE_BURST_THRESHOLD)
    .map(([phone, calls]) => ({ phone, calls }));

  return {
    ok: unsentLeads === 0 && abusers.length === 0,
    callsLastHour: (recent ?? []).length,
    unsentLeads,
    abusers,
    checkedAt: new Date(now).toISOString(),
  };
}
