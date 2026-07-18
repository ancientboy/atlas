import test from "node:test";
import assert from "node:assert/strict";
import { buildGrowthOperatorPlan } from "../lib/growth-operator.ts";

const base = {
  date: "2026-07-15",
  productName: "Atlas",
  goal: "Reach 100 activated founders",
  visits: 0,
  signups: 0,
  paid: 0,
  impressions: 0,
  clicks: 0,
  conversions: 0,
  attributedVisits: 0,
  previous: null,
  completedYesterday: [],
  pendingApprovals: 0,
  analyticsConnected: false,
  observations: [],
  opportunities: [],
};

test("Growth Operator starts with measurement when no trustworthy signal exists", () => {
  const plan = buildGrowthOperatorPlan(base);
  assert.equal(plan.stage, "measure");
  assert.match(plan.localized.en.nextAction, /measurement baseline/i);
  assert.match(plan.localized.zh.nextAction, /数据基线/);
  assert.equal(plan.localized.en.today[0].riskLevel, 1);
});

test("Growth Operator ranks the strongest acquisition opportunity with traceable evidence", () => {
  const plan = buildGrowthOperatorPlan({
    ...base,
    analyticsConnected: true,
    opportunities: [
      { title: "Low confidence", summary: "A", suggestedAction: "Ignore this", confidence: 42, signal: "trend", source: "source-a" },
      { title: "Founder discussion", summary: "Founders need help", suggestedAction: "Prepare a useful founder reply", confidence: 91, signal: "community", source: "Reddit" },
    ],
  });
  assert.equal(plan.stage, "acquire");
  assert.equal(plan.localized.en.nextAction, "Prepare a useful founder reply");
  assert.match(plan.evidence.join(" "), /Founder discussion/);
  assert.equal(plan.localized.en.discoveries[0].confidence, 91);
});

test("Growth Operator focuses on conversion and surfaces approval blockers", () => {
  const plan = buildGrowthOperatorPlan({ ...base, visits: 120, impressions: 1000, clicks: 50, pendingApprovals: 2, previous: { visits: 90, signups: 0 } });
  assert.equal(plan.stage, "convert");
  assert.equal(plan.localized.en.today[1].riskLevel, 2);
  assert.match(plan.localized.en.today[1].title, /2 pending actions/);
  assert.match(plan.localized.zh.risk, /批准/);
});

test("Growth Operator scales only after a measurable conversion signal", () => {
  const plan = buildGrowthOperatorPlan({ ...base, visits: 200, signups: 12, paid: 1, impressions: 4000, clicks: 180, conversions: 7, previous: { visits: 150, signups: 7, paid: 0 } });
  assert.equal(plan.stage, "scale");
  assert.match(plan.localized.en.nextAction, /best converting message/i);
  assert.ok(plan.confidence > 60);
  assert.ok(plan.priorityScore >= 70);
});
