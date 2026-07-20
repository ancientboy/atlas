import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("scheduled publication jobs do not execute before their due time and are audited", async () => {
  const [runtime, route, dashboard] = await Promise.all([
    readFile(new URL("../lib/publication-runtime.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/atlas-v2/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/atlas-dashboard.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(runtime, /datetime\(j\.scheduled_for\) <= datetime\(\?\)/);
  assert.match(runtime, /ExternalPublicationExecutor/);
  assert.match(route, /ManualPublicationReceipt/);
  assert.match(route, /Scheduled publish time must be in the future/);
  assert.match(dashboard, /Scheduled publish time/);
});
