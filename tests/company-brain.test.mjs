import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { defaultKnowledgePacks, scoreCompanyDecision } from "../lib/company-brain.ts";

test("Company Brain ships curated operating knowledge without exposing connector secrets", () => {
  assert.ok(defaultKnowledgePacks.some((pack) => pack.key === "ai-saas-growth"));
  assert.doesNotMatch(JSON.stringify(defaultKnowledgePacks), /api[_-]?key|client_secret|token/i);
});

test("Company Brain scoring rewards evidence and knowledge while suppressing failed strategies", () => {
  const base = { opportunity: { title: "SEO content experiment", suggestedAction: "Publish a search-intent page", confidence: 80 }, goal: { title: "Increase signups" } };
  const supported = scoreCompanyDecision({ ...base, context: { facts: [], knowledge: [{ packKey: "seo", title: "Search intent page", content: "Publish a page", confidence: 80 }], lessons: [], decisions: [] } });
  const suppressed = scoreCompanyDecision({ ...base, context: { facts: [], knowledge: [], lessons: [{ strategyKey: "seo", lessonType: "failed", statement: "Recent SEO tests did not convert", confidence: 80 }], decisions: [] } });
  assert.ok(supported.score > suppressed.score);
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
  assert.match(route, /companyBrain/);
  assert.match(validation, /0016_company_brain\.sql/);
  assert.match(dashboard, /COMPANY BRAIN/);
});
