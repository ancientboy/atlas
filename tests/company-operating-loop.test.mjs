import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { deriveCompanyFunctions } from "../lib/company-functions.ts";
import { evaluateExperiment } from "../lib/experiment-loop.ts";
import { scoreCompanyDecision } from "../lib/company-brain.ts";

test("Experiment Loop classifies success, failure, and insufficient samples deterministically", () => {
  const success = evaluateExperiment({ baseline: 10, current: 13, minimumDelta: 1, successThresholdPct: 5, hasReliableSample: true });
  const failed = evaluateExperiment({ baseline: 10, current: 10, minimumDelta: 1, successThresholdPct: 5, hasReliableSample: true });
  const inconclusive = evaluateExperiment({ baseline: 0, current: 4, minimumDelta: 1, successThresholdPct: 5, hasReliableSample: false });
  assert.equal(success.outcome, "success");
  assert.equal(success.delta, 3);
  assert.equal(failed.outcome, "failed");
  assert.equal(inconclusive.outcome, "inconclusive");
});

test("Learning Loop suppresses a strategy without blocking unrelated strategies", () => {
  const context = {
    facts: [],
    knowledge: [],
    lessons: [],
    decisions: [],
    experiments: [],
    strategyPerformance: [{
      strategyKey: "seo-content",
      weight: 0.6,
      suppressedUntil: "2099-01-01T00:00:00.000Z",
      consecutiveFailures: 2,
      successCount: 0,
      failureCount: 2,
    }],
  };
  const seo = scoreCompanyDecision({ opportunity: { title: "SEO keyword page", suggestedAction: "Publish search page", confidence: 90 }, goal: { title: "Increase signups", targetMetric: "signups" }, context });
  const research = scoreCompanyDecision({ opportunity: { title: "Audit onboarding", suggestedAction: "Analyze signup drop-off", confidence: 70 }, goal: { title: "Increase signups", targetMetric: "signups" }, context });
  assert.equal(seo.suppressed, true);
  assert.ok(seo.score <= 15);
  assert.equal(research.suppressed, false);
  assert.ok(research.score > seo.score);
});

test("Product and Sales Intelligence derive evidence-backed company functions", () => {
  const functions = deriveCompanyFunctions({ productName: "Atlas", productAnalysis: { icp: "AI founders" }, visits: 1000, signups: 20, paid: 0, opportunities: 3, completedExperiments: 2 });
  assert.deepEqual(functions.map((item) => item.functionKey), ["growth", "product", "sales"]);
  assert.equal(functions.find((item) => item.functionKey === "product")?.status, "acting");
  assert.equal(functions.find((item) => item.functionKey === "sales")?.status, "ready");
  assert.match(functions.find((item) => item.functionKey === "sales")?.nextAction ?? "", /qualified signups/i);
});

test("Operating Loop migration and trusted scheduler remain scoped and approval-safe", async () => {
  const [migration, runtime, tick, workflow, dashboard, validation] = await Promise.all([
    readFile(new URL("../drizzle/0017_company_operating_loop.sql", import.meta.url), "utf8"),
    readFile(new URL("../lib/company-runtime.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/runtime/tick/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/atlas-runtime.yml", import.meta.url), "utf8"),
    readFile(new URL("../components/atlas-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../scripts/validate-artifact.sh", import.meta.url), "utf8"),
  ]);
  for (const table of ["strategy_performance", "company_function_snapshots", "runtime_heartbeats"]) assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  assert.match(migration, /workspace_id TEXT NOT NULL/);
  assert.match(runtime, /selection\.decision\.riskLevel/);
  assert.match(runtime, /policy\.decision === "require_approval"/);
  assert.match(tick, /runDueExperimentEvaluations/);
  assert.match(workflow, /secrets\.ATLAS_RUNTIME_SECRET/);
  assert.match(workflow, /Authorization: Bearer/);
  assert.doesNotMatch(workflow, /ATLAS_RUNTIME_SECRET:\s+[A-Za-z0-9_-]{32}/);
  assert.match(dashboard, /COMPANY OPERATING LOOP/);
  assert.match(dashboard, /EXPERIMENT & LEARNING LOOP/);
  assert.match(validation, /0017_company_operating_loop\.sql/);
});
