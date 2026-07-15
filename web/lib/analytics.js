import { isLead } from "@/lib/format";

// Conservative assumptions, shown to the customer inline so the ROI is honest, not
// a black box. A locksmith job is worth well more than this on average; we lowball
// deliberately so the number is defensible.
export const AVG_JOB_VALUE = 150; // $ — estimated value of one captured job
export const DISPANGO_MONTHLY = 199; // flat plan price
// A live human answering service typically bills per answered call.
export const HUMAN_PER_CALL = 2.25;

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Returns weekday index (0=Sun) and hour (0-23) for an instant, in a timezone.
function localParts(iso, tz) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, weekday: "short", hour: "numeric", hour12: false,
    }).formatToParts(d);
    const wd = parts.find((p) => p.type === "weekday")?.value;
    let hourStr = parts.find((p) => p.type === "hour")?.value ?? "0";
    let hour = parseInt(hourStr, 10) % 24;
    const idx = DAY_LABELS.indexOf(wd);
    return { day: idx, hour };
  } catch {
    return { day: d.getDay(), hour: d.getHours() };
  }
}

// Outside Mon–Fri 8am–6pm (shop-local) = the hours a human would likely miss.
function isAfterHours(iso, tz) {
  const p = localParts(iso, tz);
  if (!p) return false;
  if (p.day === 0 || p.day === 6) return true; // weekend
  return p.hour < 8 || p.hour >= 18;
}

export function computeAnalytics(calls, tz = "America/Edmonton") {
  const answered = calls.length;
  const leads = calls.filter((c) => isLead(c.outcome)).length;
  const afterHours = calls.filter((c) => isLead(c.outcome) && isAfterHours(c.ended_at, tz)).length;

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = calls.filter((c) => new Date(c.ended_at).getTime() >= weekAgo).length;

  // Last 7 calendar days, oldest→newest, answered-call counts (for the bar chart).
  const byDay = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now - i * 24 * 60 * 60 * 1000);
    const label = DAY_LABELS[dayStart.getDay()];
    byDay.push({ label, key: dayStart.toISOString().slice(0, 10), count: 0 });
  }
  const byKey = Object.fromEntries(byDay.map((d) => [d.key, d]));
  for (const c of calls) {
    const key = new Date(c.ended_at).toISOString().slice(0, 10);
    if (byKey[key]) byKey[key].count++;
  }

  const estValue = leads * AVG_JOB_VALUE;
  const humanCost = Math.round(answered * HUMAN_PER_CALL);

  return { answered, leads, afterHours, thisWeek, byDay, estValue, humanCost };
}
