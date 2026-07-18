// Business-hours logic for answer_mode='scheduled', shared so it can be unit
// tested (the webhook that uses it runs Deno.serve at import, so the pure logic
// lives here instead). `now` is injectable purely so tests can pin the clock.

export const HOURS_DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// Is `now` inside the shop's configured weekly hours, evaluated in the shop's
// timezone? Any malformed config returns true (fail toward the AI answering —
// never silently drop/forward a call because the schedule JSON was bad).
export function withinBusinessHours(
  businessHours: unknown,
  tz: string,
  now: Date = new Date(),
): boolean {
  if (!businessHours || typeof businessHours !== "object") return true;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(now);
    const wd = parts.find((p) => p.type === "weekday")?.value ?? "";
    const dayKey = HOURS_DAY_KEYS[["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd)] ?? null;
    if (!dayKey) return true;
    const day = (businessHours as Record<string, any>)[dayKey];
    if (!day || typeof day !== "object") return true;
    if (!day.on) return false;
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10) % 24;
    const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
    const nowHhmm = `${String(hour).padStart(2, "0")}:${minute}`;
    const open = typeof day.open === "string" ? day.open : "00:00";
    const close = typeof day.close === "string" ? day.close : "23:59";
    return nowHhmm >= open && nowHhmm < close;
  } catch {
    return true;
  }
}
