import { assertEquals } from "jsr:@std/assert@1";
import { withinBusinessHours } from "./schedule.ts";

// A Mon–Fri 9–5 America/Toronto schedule; weekend off.
const HOURS = {
  mon: { on: true, open: "09:00", close: "17:00" },
  tue: { on: true, open: "09:00", close: "17:00" },
  wed: { on: true, open: "09:00", close: "17:00" },
  thu: { on: true, open: "09:00", close: "17:00" },
  fri: { on: true, open: "09:00", close: "17:00" },
  sat: { on: false },
  sun: { on: false },
};
const TZ = "America/Toronto";

// 2026-07-13 is a Monday. Toronto is UTC-4 in July (EDT), so 14:00Z = 10:00 EDT.
Deno.test("inside hours on a weekday → AI answers (true)", () => {
  assertEquals(withinBusinessHours(HOURS, TZ, new Date("2026-07-13T14:00:00Z")), true); // 10:00 EDT Mon
});

Deno.test("before open on a weekday → out of hours (false)", () => {
  assertEquals(withinBusinessHours(HOURS, TZ, new Date("2026-07-13T12:00:00Z")), false); // 08:00 EDT Mon
});

Deno.test("after close on a weekday → out of hours (false)", () => {
  assertEquals(withinBusinessHours(HOURS, TZ, new Date("2026-07-13T22:00:00Z")), false); // 18:00 EDT Mon
});

Deno.test("exactly at open is inclusive (true), exactly at close is exclusive (false)", () => {
  assertEquals(withinBusinessHours(HOURS, TZ, new Date("2026-07-13T13:00:00Z")), true); // 09:00 EDT
  assertEquals(withinBusinessHours(HOURS, TZ, new Date("2026-07-13T21:00:00Z")), false); // 17:00 EDT
});

Deno.test("day marked off → out of hours all day (false)", () => {
  assertEquals(withinBusinessHours(HOURS, TZ, new Date("2026-07-18T14:00:00Z")), false); // Saturday
});

Deno.test("timezone is respected: 10:00 EDT is inside, same instant 07:00 PDT is not", () => {
  const instant = new Date("2026-07-13T14:00:00Z");
  assertEquals(withinBusinessHours(HOURS, "America/Toronto", instant), true); // 10:00
  assertEquals(withinBusinessHours(HOURS, "America/Los_Angeles", instant), false); // 07:00
});

Deno.test("malformed / missing config fails OPEN (true) — never silently drop a call", () => {
  assertEquals(withinBusinessHours(null, TZ, new Date("2026-07-13T02:00:00Z")), true);
  assertEquals(withinBusinessHours("not an object", TZ, new Date()), true);
  assertEquals(withinBusinessHours({}, TZ, new Date("2026-07-18T14:00:00Z")), true); // no day entry
  assertEquals(withinBusinessHours(HOURS, "Not/AZone", new Date()), true); // bad tz → catch → true
});
