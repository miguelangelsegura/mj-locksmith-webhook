import { isLead } from "@/lib/format";

export const DEFAULT_JOB_VALUE = 150; // fallback if a shop hasn't set its own
export const DISPANGO_MONTHLY = 199; // flat plan price
// A part-time receptionist's typical monthly cost — used for a GENERAL comparison
// line, not a per-shop "you saved exactly $X" claim.
export const MONTHLY_RECEPTIONIST = 2400;

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// weekday index (0=Sun), HH:MM, and YYYY-MM-DD for an instant, in a timezone.
function localParts(iso, tz) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  try {
    const p = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(d);
    const get = (t) => p.find((x) => x.type === t)?.value ?? "";
    const day = DAY_LABELS.indexOf(get("weekday"));
    let hour = parseInt(get("hour"), 10) % 24;
    const hhmm = `${String(hour).padStart(2, "0")}:${get("minute")}`;
    const date = `${get("year")}-${get("month")}-${get("day")}`;
    return { day, hhmm, date };
  } catch {
    return null;
  }
}

// "After-hours" = outside the shop's configured hours (in its timezone). If the shop
// has set `business_hours`, honor them exactly; otherwise fall back to Mon–Fri 8–6.
function isAfterHours(iso, tz, businessHours) {
  const lp = localParts(iso, tz);
  if (!lp) return false;
  const bh = businessHours && typeof businessHours === "object" ? businessHours : null;
  if (bh) {
    const day = bh[HOURS_KEYS[lp.day]];
    if (!day || typeof day !== "object" || !day.on) return true; // closed day
    const open = typeof day.open === "string" ? day.open : "00:00";
    const close = typeof day.close === "string" ? day.close : "23:59";
    return !(lp.hhmm >= open && lp.hhmm < close);
  }
  // Default window: Mon–Fri 08:00–18:00.
  if (lp.day === 0 || lp.day === 6) return true;
  return lp.hhmm < "08:00" || lp.hhmm >= "18:00";
}

export function computeAnalytics(calls, { tz = "America/Edmonton", businessHours = null, avgJobValue = DEFAULT_JOB_VALUE } = {}) {
  const answered = calls.length;
  const leadCalls = calls.filter((c) => isLead(c.outcome));
  const leads = leadCalls.length;
  const afterHours = leadCalls.filter((c) => isAfterHours(c.ended_at, tz, businessHours)).length;

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = calls.filter((c) => new Date(c.ended_at).getTime() >= weekAgo).length;

  // Last 7 calendar days (shop-local), oldest→newest, answered-call counts.
  const byDay = [];
  const byKey = {};
  for (let i = 6; i >= 0; i--) {
    const lp = localParts(new Date(now - i * 24 * 60 * 60 * 1000).toISOString(), tz);
    const key = lp?.date ?? String(i);
    const entry = { label: lp ? DAY_LABELS[lp.day] : "", key, count: 0 };
    byDay.push(entry);
    byKey[key] = entry;
  }
  for (const c of calls) {
    const lp = localParts(c.ended_at, tz);
    if (lp && byKey[lp.date]) byKey[lp.date].count++;
  }

  const jobValue = Number.isFinite(Number(avgJobValue)) ? Number(avgJobValue) : DEFAULT_JOB_VALUE;
  const estValue = Math.round(leads * jobValue);

  return { answered, leads, afterHours, thisWeek, byDay, estValue, jobValue };
}
