import assert from "node:assert/strict";
import test from "node:test";
import { evaluateActionPolicy, isQuietHour, runtimeCycleKey } from "../lib/company-runtime.ts";

const base = { mode: "autonomous", autoExecuteRiskLevel: 1, actionsUsed: 0, externalActionsUsed: 0, dailyActionLimit: 8, dailyExternalActionLimit: 2, estimatedCostCents: 0, dailyCostCents: 0, dailyLlmBudgetCents: 100 };

test("company runtime policy auto-executes only bounded internal work", () => {
  assert.equal(evaluateActionPolicy({ ...base, riskLevel: 0 }).decision, "execute");
  assert.equal(evaluateActionPolicy({ ...base, riskLevel: 1 }).decision, "execute");
  assert.equal(evaluateActionPolicy({ ...base, riskLevel: 2, connectionReady: true }).decision, "require_approval");
  assert.equal(evaluateActionPolicy({ ...base, riskLevel: 3 }).decision, "block");
});

test("company runtime policy enforces action, budget, and connection boundaries", () => {
  assert.equal(evaluateActionPolicy({ ...base, riskLevel: 1, actionsUsed: 8 }).policyCode, "daily_action_limit");
  assert.equal(evaluateActionPolicy({ ...base, riskLevel: 1, estimatedCostCents: 1, dailyCostCents: 100 }).policyCode, "daily_budget_limit");
  assert.equal(evaluateActionPolicy({ ...base, riskLevel: 2, connectionReady: false }).policyCode, "connection_required");
  assert.equal(evaluateActionPolicy({ ...base, mode: "manual", riskLevel: 1 }).policyCode, "manual_mode");
});

test("runtime quiet hours support overnight windows and stable idempotency buckets", () => {
  assert.equal(isQuietHour(new Date("2026-01-01T23:00:00Z"), "22:00", "07:00"), true);
  assert.equal(isQuietHour(new Date("2026-01-01T08:00:00Z"), "22:00", "07:00"), false);
  const now = new Date("2026-01-01T12:01:00Z");
  assert.equal(runtimeCycleKey("workspace-a", "scheduled", now), runtimeCycleKey("workspace-a", "scheduled", new Date("2026-01-01T12:14:00Z")));
  assert.notEqual(runtimeCycleKey("workspace-a", "scheduled", now), runtimeCycleKey("workspace-b", "scheduled", now));
});

test("company runtime migration is workspace scoped and packaged", async () => {
  const { readFile } = await import("node:fs/promises");
  const [migration, runtime, validation, route] = await Promise.all([
    readFile(new URL("../drizzle/0013_company_runtime.sql", import.meta.url), "utf8"),
    readFile(new URL("../lib/company-runtime.ts", import.meta.url), "utf8"),
    readFile(new URL("../scripts/validate-artifact.sh", import.meta.url), "utf8"),
    readFile(new URL("../app/api/atlas-v2/route.ts", import.meta.url), "utf8"),
  ]);
  for (const table of ["workspace_runtime_settings", "workspace_runtime_locks", "runtime_cycles", "company_goals", "company_plans", "action_executions", "runtime_daily_usage"]) assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  assert.match(migration, /workspace_id TEXT NOT NULL/);
  assert.match(runtime, /workspace_runtime_locks/);
  assert.match(runtime, /releaseWorkspaceRuntimeLock/);
  assert.match(runtime, /runDueCompanyRuntimeCycles/);
  assert.match(route, /action === "run_company_runtime"/);
  assert.match(route, /action === "update_runtime_settings"/);
  assert.match(validation, /0013_company_runtime\.sql/);
});
