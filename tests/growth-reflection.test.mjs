import test from "node:test";
import assert from "node:assert/strict";
import { buildGrowthReflection } from "../lib/growth-reflection.ts";

test("daily reflection creates a measurement-first action without signals", () => {
  const result = buildGrowthReflection({ date: "2026-07-15", visits: 0, signups: 0, paid: 0, impressions: 0, clicks: 0, conversions: 0, attributedVisits: 0 });
  assert.match(result.nextAction, /Connect analytics|UTM-tracked/);
  assert.equal(result.signals.ctr, 0);
});

test("daily reflection detects attention without conversion and calculates deltas", () => {
  const result = buildGrowthReflection({ date: "2026-07-15", goal: "10 signups", visits: 120, signups: 4, paid: 0, impressions: 1000, clicks: 50, conversions: 0, attributedVisits: 30, previous: { visits: 90, signups: 2 } });
  assert.match(result.nextAction, /landing-page continuity/);
  assert.equal(result.signals.ctr, 5);
  assert.equal(result.signals.visitDelta, 30);
  assert.equal(result.signals.signupDelta, 2);
});

test("daily reflection reinforces a converting campaign", () => {
  const result = buildGrowthReflection({ date: "2026-07-15", visits: 200, signups: 15, paid: 2, impressions: 4000, clicks: 160, conversions: 8, attributedVisits: 100 });
  assert.match(result.summary, /measurable conversions/);
  assert.match(result.nextAction, /best converting channel/);
});
