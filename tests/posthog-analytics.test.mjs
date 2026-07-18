import assert from "node:assert/strict";
import test from "node:test";
import { buildPostHogGrowthQuery, fetchPostHogGrowthMetrics, normalizePostHogConfig, normalizePostHogHost, parsePostHogGrowthResults } from "../lib/posthog-analytics.ts";

const config = normalizePostHogConfig({ host: "https://us.posthog.com", projectId: "12345", pageviewEvent: "$pageview", signupEvent: "user_signed_up", paidEvent: "subscription_started" });

test("PostHog configuration accepts official hosts and bounded event names", () => {
  assert.equal(normalizePostHogHost("https://eu.posthog.com"), "https://eu.posthog.com");
  assert.throws(() => normalizePostHogHost("https://example.com"), /official PostHog/);
  assert.throws(() => normalizePostHogConfig({ host: "https://us.posthog.com", projectId: "bad", signupEvent: "signup" }), /project ID/);
  assert.throws(() => normalizePostHogConfig({ host: "https://us.posthog.com", projectId: "1", signupEvent: "x'; DROP TABLE events" }), /event name/);
});

test("PostHog growth query is a single bounded aggregate without person data", () => {
  const query = buildPostHogGrowthQuery(config, "2026-07-15");
  assert.match(query, /2026-07-15 00:00:00/);
  assert.match(query, /2026-07-16 00:00:00/);
  assert.match(query, /count\(DISTINCT distinct_id\)/);
  assert.match(query, /LIMIT 3/);
  assert.doesNotMatch(query, /SELECT \*/i);
});

test("PostHog aggregate rows map to Atlas growth metrics", () => {
  assert.deepEqual(parsePostHogGrowthResults([["$pageview", 41], ["user_signed_up", 7], ["subscription_started", 2]], config), { visits: 41, signups: 7, paid: 2 });
  assert.deepEqual(parsePostHogGrowthResults([], config), { visits: 0, signups: 0, paid: 0 });
});

test("PostHog query uses bearer auth without leaking it into the query", async () => {
  let captured;
  const metrics = await fetchPostHogGrowthMetrics(config, "phx_test_secret_key", "2026-07-15", async (url, init) => {
    captured = { url: String(url), init };
    return Response.json({ results: [["$pageview", 9], ["user_signed_up", 1]] });
  });
  assert.deepEqual(metrics, { visits: 9, signups: 1, paid: 0 });
  assert.equal(captured.url, "https://us.posthog.com/api/projects/12345/query/");
  assert.equal(captured.init.headers.authorization, "Bearer phx_test_secret_key");
  assert.doesNotMatch(captured.init.body, /phx_test_secret_key/);
});
