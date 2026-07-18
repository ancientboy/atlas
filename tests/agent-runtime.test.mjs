import assert from "node:assert/strict";
import test from "node:test";
import {
  analyticsSyncIdempotencyKey,
  dailyGrowthIdempotencyKey,
  isRuntimeRequestAuthorized,
  localScheduleState,
  observationScanIdempotencyKey,
  runtimeRetryDelayMs,
} from "../lib/agent-runtime.ts";

test("workspace timezone controls the daily runtime date and due state", () => {
  const now = new Date("2026-07-15T00:30:00.000Z");
  assert.deepEqual(localScheduleState(now, "Asia/Shanghai", "08:00"), { date: "2026-07-15", due: true });
  assert.deepEqual(localScheduleState(now, "America/Los_Angeles", "18:00"), { date: "2026-07-14", due: false });
});

test("invalid runtime timezone and local time are rejected", () => {
  assert.throws(() => localScheduleState(new Date(), "UTC", "25:00"), /schedule time/);
  assert.throws(() => localScheduleState(new Date(), "Not/A_Zone", "08:00"), /schedule timezone/);
});

test("daily runtime idempotency is isolated by workspace and local date", () => {
  assert.equal(dailyGrowthIdempotencyKey("workspace-a", "2026-07-15"), "daily_growth_reflection:workspace-a:2026-07-15");
  assert.notEqual(dailyGrowthIdempotencyKey("workspace-a", "2026-07-15"), dailyGrowthIdempotencyKey("workspace-b", "2026-07-15"));
  assert.notEqual(dailyGrowthIdempotencyKey("workspace-a", "2026-07-15"), dailyGrowthIdempotencyKey("workspace-a", "2026-07-16"));
});

test("observation scan idempotency uses a stable workspace cadence bucket", () => {
  const now = new Date("2026-07-15T10:15:00.000Z");
  assert.equal(observationScanIdempotencyKey("workspace-a", now, 360), observationScanIdempotencyKey("workspace-a", new Date("2026-07-15T11:59:00.000Z"), 360));
  assert.notEqual(observationScanIdempotencyKey("workspace-a", now, 360), observationScanIdempotencyKey("workspace-a", new Date("2026-07-15T12:01:00.000Z"), 360));
  assert.notEqual(observationScanIdempotencyKey("workspace-a", now, 360), observationScanIdempotencyKey("workspace-b", now, 360));
});

test("analytics sync uses an independent stable cadence bucket", () => {
  const now = new Date("2026-07-15T10:15:00.000Z");
  assert.equal(analyticsSyncIdempotencyKey("workspace-a", now, 360), analyticsSyncIdempotencyKey("workspace-a", new Date("2026-07-15T11:59:00.000Z"), 360));
  assert.notEqual(analyticsSyncIdempotencyKey("workspace-a", now, 360), observationScanIdempotencyKey("workspace-a", now, 360));
});

test("runtime endpoint requires an exact server-only secret of sufficient length", async () => {
  const secret = "atlas-runtime-test-secret-32-characters";
  assert.equal(await isRuntimeRequestAuthorized(new Headers(), secret), false);
  assert.equal(await isRuntimeRequestAuthorized(new Headers({ authorization: "Bearer wrong" }), secret), false);
  assert.equal(await isRuntimeRequestAuthorized(new Headers({ authorization: `Bearer ${secret}` }), secret), true);
  assert.equal(await isRuntimeRequestAuthorized(new Headers({ "x-atlas-runtime-secret": secret }), secret), true);
  assert.equal(await isRuntimeRequestAuthorized(new Headers({ authorization: "Bearer short" }), "short"), false);
});

test("runtime retries use bounded exponential backoff", () => {
  assert.equal(runtimeRetryDelayMs(1), 30_000);
  assert.equal(runtimeRetryDelayMs(2), 60_000);
  assert.equal(runtimeRetryDelayMs(99), 3_600_000);
});

test("workspace autonomy control gates schedules and queued execution", async () => {
  const [runtime, migration] = await Promise.all([
    import("node:fs/promises").then(({ readFile }) => readFile(new URL("../lib/agent-runtime.ts", import.meta.url), "utf8")),
    import("node:fs/promises").then(({ readFile }) => readFile(new URL("../drizzle/0012_workspace_autonomy_control.sql", import.meta.url), "utf8")),
  ]);
  assert.match(runtime, /w\.autonomy_enabled != 0/);
  assert.match(runtime, /INNER JOIN workspaces w/);
  assert.match(migration, /autonomy_enabled INTEGER NOT NULL DEFAULT 1/);
});
