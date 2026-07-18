import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { intelligenceHealthScore } from "../lib/company-intelligence.ts";

test("company intelligence health reflects metric movement, targets, and data readiness", () => {
  assert.ok(intelligenceHealthScore({ current: 20, previous: 10, target: 100, connections: 1 }) > intelligenceHealthScore({ current: 8, previous: 12, target: 100, connections: 1 }));
  assert.ok(intelligenceHealthScore({ current: null, previous: null, target: null, connections: 1 }) > intelligenceHealthScore({ current: null, previous: null, target: null, connections: 0 }));
});

test("Company Intelligence remains workspace-scoped and uses bounded metric history", async () => {
  const [source, migration, route, validation] = await Promise.all([
    readFile(new URL("../lib/company-intelligence.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0014_company_intelligence.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/api/atlas-v2/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../scripts/validate-artifact.sh", import.meta.url), "utf8"),
  ]);
  assert.match(source, /WHERE workspace_id = \?/);
  assert.match(source, /LIMIT 2/);
  assert.match(source, /company_intelligence_snapshots/);
  assert.match(migration, /UNIQUE\(workspace_id, snapshot_date\)/);
  assert.match(route, /companyIntelligence/);
  assert.match(validation, /0014_company_intelligence\.sql/);
});

test("runtime refreshes intelligence before it plans new work", async () => {
  const source = await readFile(new URL("../lib/company-runtime.ts", import.meta.url), "utf8");
  assert.match(source, /refreshCompanyIntelligence\(db, workspaceId, now\)/);
  assert.match(source, /loadCompanyState\(db, workspaceId\)/);
});
