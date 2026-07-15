// Small presentation helpers shared across the dashboard. Pure functions, no deps.

export function formatPhone(n) {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(n || "");
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : n || "—";
}

export function relativeTime(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (isNaN(then)) return "";
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export function formatDateTime(iso, tz) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      weekday: "short", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
      ...(tz ? { timeZone: tz } : {}),
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

export function formatDuration(seconds) {
  if (seconds == null || isNaN(seconds)) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function titleCase(s) {
  if (!s || typeof s !== "string") return "";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// A call counts as a captured lead unless it's a junk outcome (mirrors the
// webhook's NON_LEAD_OUTCOMES so the customer's numbers match what was texted).
const NON_LEAD = new Set(["wrong_number", "spam", "info_only"]);
export function isLead(outcome) {
  return !NON_LEAD.has(String(outcome ?? "").trim().toLowerCase().replace(/ /g, "_"));
}

// Human label + tint for a call's disposition. Kept minimal (research: green good,
// red bad, one accent for spam) so the list scans instantly.
export function callStatus(call) {
  const o = String(call?.outcome ?? "").trim().toLowerCase().replace(/ /g, "_");
  if (o === "spam" || o === "robocall") return { label: "Spam", tone: "spam" };
  if (o === "wrong_number") return { label: "Wrong number", tone: "muted" };
  if (o === "info_only") return { label: "Info only", tone: "muted" };
  if (call?.ended_at) return { label: "Lead captured", tone: "lead" };
  return { label: "Answered", tone: "ok" };
}

export const URGENCY_TONE = {
  urgent: "urgent", emergency: "urgent", high: "high",
  normal: "normal", low: "normal",
};
export function urgencyTone(u) {
  return URGENCY_TONE[String(u ?? "").trim().toLowerCase()] || "normal";
}

// The single best one-line description of the job on a call row.
export function jobLine(call) {
  const door = call?.door_type ? titleCase(call.door_type) : null;
  const dmg = call?.damage_description || null;
  return [door, dmg].filter(Boolean).join(" — ") || call?.summary || "Captured call";
}

export function displayName(call) {
  const n = (call?.caller_name || "").trim();
  if (n && !["unknown", "null", "n/a"].includes(n.toLowerCase())) return n;
  return call?.caller_phone ? formatPhone(call.caller_phone) : "Unknown caller";
}
