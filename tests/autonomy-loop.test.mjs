import assert from "node:assert/strict";
import test from "node:test";
import { opportunityDedupeKey, scoreAutonomyOpportunity, selectAutonomyChannels } from "../lib/autonomy-loop.ts";

test("qualified observations receive deterministic opportunity scores", () => {
  assert.equal(scoreAutonomyOpportunity({ confidence: 74, signal: "GitHub release", summary: "launch campaign content" }), 88);
  assert.equal(scoreAutonomyOpportunity({ confidence: 95, signal: "website positioning", summary: "growth distribution" }), 100);
  assert.equal(scoreAutonomyOpportunity({ confidence: 40, signal: "generic note", summary: "small update" }), 40);
});

test("observation opportunities use a workspace-scoped stable dedupe key", () => {
  assert.equal(opportunityDedupeKey("workspace-a", "GitHub release: Atlas v2!"), opportunityDedupeKey("workspace-a", "github release atlas v2"));
  assert.notEqual(opportunityDedupeKey("workspace-a", "GitHub release"), opportunityDedupeKey("workspace-b", "GitHub release"));
});

test("autonomy selects a small channel set and preserves approval safety", () => {
  assert.deepEqual(selectAutonomyChannels(79), ["blog"]);
  assert.deepEqual(selectAutonomyChannels(80), ["blog", "x"]);
  assert.deepEqual(selectAutonomyChannels(90), ["blog", "x", "linkedin"]);
});
