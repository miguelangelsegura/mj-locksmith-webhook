import { assertEquals } from "jsr:@std/assert@1";
import { isLeadOutcome, NON_LEAD_OUTCOMES } from "./monitoring.ts";

Deno.test("real-lead outcomes count as leads", () => {
  for (const o of ["service_booked", "lead_captured", "quote_requested", "callback", ""]) {
    assertEquals(isLeadOutcome(o), true, `expected lead: ${o}`);
  }
});

Deno.test("known non-lead outcomes are excluded", () => {
  for (const o of NON_LEAD_OUTCOMES) {
    assertEquals(isLeadOutcome(o), false, `expected non-lead: ${o}`);
  }
});

Deno.test("normalization: case, spaces, and 'wrong number' → 'wrong_number' are all excluded", () => {
  assertEquals(isLeadOutcome("Wrong Number"), false);
  assertEquals(isLeadOutcome("  SPAM  "), false);
  assertEquals(isLeadOutcome("Info_Only"), false);
});

Deno.test("null / undefined outcome is treated as a lead (fail toward alerting on unsent)", () => {
  assertEquals(isLeadOutcome(null), true);
  assertEquals(isLeadOutcome(undefined), true);
});
