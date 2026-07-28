import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { inferRoutine } from "../lib/company-routines.ts";
import { normalizeTrustLevel, trustLevelDecision } from "../lib/company-trust.ts";
import { scoreCompanyDecision } from "../lib/company-brain.ts";

test("natural-language company routines infer useful triggers and playbooks", () => {
  const weekly = inferRoutine("每周一检查 GSC 中排名 8–20 的关键词，并提出三个内容实验");
  assert.equal(weekly.triggerType, "schedule");
  assert.equal(weekly.cadenceMinutes, 10080);
  assert.equal(weekly.playbookKey, "gsc-opportunities");
  assert.equal(weekly.trustLevel, "recommend");

  const release = inferRoutine("When a new version launches, prepare a release campaign");
  assert.equal(release.triggerType, "event");
  assert.equal(release.eventType, "product_release");
  assert.equal(release.playbookKey, "release-campaign");
});

test("progressive trust is action-scoped and conservative", () => {
  assert.equal(trustLevelDecision("observe", 0, 1).decision, "block");
  assert.equal(trustLevelDecision("recommend", 1, 1).decision, "block");
  assert.equal(trustLevelDecision("prepare", 1, 1).decision, "execute");
  assert.equal(trustLevelDecision("prepare", 2, 2).decision, "require_approval");
  assert.equal(trustLevelDecision("approval", 1, 1).decision, "require_approval");
  assert.equal(trustLevelDecision("autopilot", 1, 1).decision, "execute");
  assert.equal(trustLevelDecision("autopilot", 3, 3).decision, "block");
  assert.equal(normalizeTrustLevel("unknown"), "recommend");
});

test("Founder avoidance rules change future decision scores", () => {
  const base = { facts: [], knowledge: [], lessons: [], decisions: [], experiments: [] };
  const opportunity = { title: "Publish a LinkedIn post", suggestedAction: "Publish social content", confidence: 80 };
  const withoutRule = scoreCompanyDecision({ opportunity, goal: { title: "Increase signups" }, context: base });
  const withRule = scoreCompanyDecision({
    opportunity,
    goal: { title: "Increase signups" },
    context: { ...base, rules: [{ category: "publish_content", ruleText: "Avoid publish social content without a product proof point", confidence: 90 }] },
  });
  assert.ok(withRule.score < withoutRule.score);
  assert.match(withRule.rationale, /Founder rule/);
});

test("Atlas V3 migration and product surfaces are packaged", async () => {
  const [migration, route, dashboard, runtime, tick, validation] = await Promise.all([
    readFile(new URL("../drizzle/0018_trusted_company_operator.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/api/atlas-v2/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/atlas-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/company-runtime.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/runtime/tick/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../scripts/validate-artifact.sh", import.meta.url), "utf8"),
  ]);
  for (const table of ["company_routines", "company_routine_runs", "action_trust_policies", "founder_feedback", "company_behavior_rules"]) assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  assert.match(route, /action === "update_company_fact"/);
  assert.match(route, /action === "create_routine"/);
  assert.match(route, /action === "update_trust_policy"/);
  assert.match(dashboard, /COMPANY PROFILE · SHARED CONTEXT/);
  assert.match(dashboard, /COMPANY ROUTINES · CONTINUOUS WORK/);
  assert.match(dashboard, /PROGRESSIVE TRUST · CORRECTION LEARNING/);
  assert.match(runtime, /getActionTrustPolicy/);
  assert.match(tick, /runDueCompanyRoutines/);
  assert.match(validation, /0018_trusted_company_operator\.sql/);
});
