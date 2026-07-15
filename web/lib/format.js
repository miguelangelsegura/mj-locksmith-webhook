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

// Canonical call-outcome vocabulary the AI now emits (Vapi structured-output enum):
//   lead | spam | wrong_number | info_only | abandoned
// Legacy rows used dispatched / unable_to_dispatch / caller_hung_up — map them here
// so old calls still render correctly after the enum change.
export function normOutcome(outcome) {
  const o = String(outcome ?? "").trim().toLowerCase().replace(/ /g, "_");
  if (o === "dispatched" || o === "unable_to_dispatch") return "lead";
  if (o === "caller_hung_up" || o === "hung_up") return "abandoned";
  if (o === "robocall") return "spam";
  return o;
}

// Not a captured job. `abandoned` is a missed/hung-up call — still texted to the shop
// (they get the callback number) but NOT counted as a captured job.
const JUNK = new Set(["spam", "wrong_number", "info_only", "abandoned"]);

// A captured job worth following up. An empty/unknown outcome on a completed call is
// treated optimistically as a lead (fail-open — mirrors the webhook texting it anyway).
export function isLead(outcome) {
  const o = normOutcome(outcome);
  if (!o) return true;
  return !JUNK.has(o);
}

// Human label + tint for a call's disposition. Minimal palette so the list scans fast.
export function callStatus(call) {
  const o = normOutcome(call?.outcome);
  if (o === "spam") return { label: "Spam", tone: "spam" };
  if (o === "wrong_number") return { label: "Wrong number", tone: "muted" };
  if (o === "info_only") return { label: "Info only", tone: "muted" };
  if (o === "abandoned") return { label: "Abandoned", tone: "muted" };
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
