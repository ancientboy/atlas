import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { defaultKnowledgePacks, deriveDecisionProfile, explainAlternative, scoreCompanyDecision } from "../lib/company-brain.ts";

test("Company Brain ships curated operating knowledge without exposing connector secrets", () => {
  assert.ok(defaultKnowledgePacks.some((pack) => pack.key === "ai-saas-growth"));
  assert.doesNotMatch(JSON.stringify(defaultKnowledgePacks), /api[_-]?key|client_secret|token/i);
});

test("Company Brain scoring rewards evidence and knowledge while suppressing failed strategies", () => {
  const base = { opportunity: { title: "SEO signup content experiment", suggestedAction: "Publish a search-intent page", confidence: 80 }, goal: { title: "Increase signups", targetMetric: "signups" } };
  const supported = scoreCompanyDecision({ ...base, context: { facts: [], knowledge: [{ packKey: "seo-content", title: "Search intent page", content: "Publish a page", confidence: 80 }], lessons: [], decisions: [], experiments: [{ strategyKey: "seo-content", channel: "seo", status: "completed", outcome: "success", confidence: 80 }] } });
  const suppressed = scoreCompanyDecision({ ...base, context: { facts: [], knowledge: [], lessons: [{ strategyKey: "seo-content", lessonType: "failed", statement: "Recent SEO tests did not convert", confidence: 80 }], decisions: [], experiments: [{ strategyKey: "seo-content", channel: "seo", status: "completed", outcome: "failed", confidence: 80 }] } });
  assert.ok(supported.score > suppressed.score);
  assert.equal(supported.strategyKey, "seo-content");
  assert.equal(supported.breakdown.goalAlignment > 0, true);
  assert.equal(suppressed.suppressingLessons, 1);
});

test("Decision Intelligence compares cost, risk, channel capacity, and explains deferred options", () => {
  const context = { facts: [], knowledge: [], lessons: [], decisions: [], experiments: [{ strategyKey: "social-content", channel: "social", status: "running", outcome: null, confidence: null }] };
  const research = scoreCompanyDecision({ opportunity: { title: "Audit conversion funnel", suggestedAction: "Analyze signup drop-off", confidence: 74 }, goal: { title: "Increase signups", targetMetric: "signups" }, context });
  const paid = scoreCompanyDecision({ opportunity: { title: "Paid social launch", suggestedAction: "Publish paid ads", confidence: 74 }, goal: { title: "Increase signups", targetMetric: "signups" }, context });
  assert.equal(deriveDecisionProfile({ title: "Paid social launch", suggestedAction: "Publish paid ads" }).riskLevel, 3);
  assert.ok(research.breakdown.costEfficiency > paid.breakdown.costEfficiency);
  assert.ok(research.breakdown.riskFit > paid.breakdown.riskFit);
  assert.match(explainAlternative(research, paid), /Deferred because/);
});

test("Company Brain migration, runtime context assembly, and dashboard remain workspace-scoped", async () => {
  const [migration, runtime, route, validation, dashboard] = await Promise.all([
    readFile(new URL("../drizzle/0016_company_brain.sql", import.meta.url), "utf8"),
    readFile(new URL("../lib/company-runtime.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/atlas-v2/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../scripts/validate-artifact.sh", import.meta.url), "utf8"),
    readFile(new URL("../components/atlas-dashboard.tsx", import.meta.url), "utf8"),
  ]);
  for (const table of ["company_facts", "knowledge_packs", "knowledge_entries", "decision_journal", "growth_experiments", "experiment_results", "strategy_lessons"]) assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  assert.match(migration, /workspace_id TEXT NOT NULL/);
  assert.match(runtime, /assembleCompanyContext\(db, workspaceId/);
  assert.match(runtime, /decision_journal/);
  assert.match(runtime, /explainAlternative/);
  assert.match(runtime, /breakdown/);
  assert.match(route, /companyBrain/);
  assert.match(validation, /0016_company_brain\.sql/);
  assert.match(dashboard, /COMPANY BRAIN/);
});
