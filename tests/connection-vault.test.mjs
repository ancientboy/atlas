import assert from "node:assert/strict";
import test from "node:test";
import { decryptConnectionSecret, encryptConnectionSecret, redactConnectionSecret } from "../lib/connection-vault.ts";
import { authorizationUrl, oauthAppReadiness } from "../lib/oauth-providers.ts";
import { buildSearchConsoleRequest, isVerifiedHttpsProperty, parseSearchConsoleQueries, searchConsoleOpportunity } from "../lib/google-search-console.ts";

const key = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));

test("workspace credentials are encrypted with authenticated encryption", async () => {
  const secret = { accessToken: "user-token", refreshToken: "refresh-token", expiresAt: "2030-01-01T00:00:00.000Z" };
  const encrypted = await encryptConnectionSecret(secret, key);
  assert.doesNotMatch(encrypted, /user-token|refresh-token/);
  assert.deepEqual(await decryptConnectionSecret(encrypted, key), secret);
  assert.deepEqual(redactConnectionSecret(secret), { expiresAt: secret.expiresAt, hasRefreshToken: true, siteUrl: null, username: null, authorUrn: null, subreddit: null });
});

test("wrong keys and modified ciphertext are rejected", async () => {
  const encrypted = await encryptConnectionSecret({ accessToken: "token" }, key);
  const other = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  await assert.rejects(() => decryptConnectionSecret(encrypted, other), /invalid/);
  await assert.rejects(() => decryptConnectionSecret(`${encrypted}x`, key), /invalid/);
});

test("OAuth readiness exposes only application availability and authorization binds state", () => {
  const env = { ATLAS_PUBLIC_URL: "https://atlas.example.com", X_CLIENT_ID: "client", X_CLIENT_SECRET: "secret" };
  assert.deepEqual(oauthAppReadiness(env), { x: true, linkedin: false, reddit: false, google_search_console: false });
  const url = new URL(authorizationUrl("x", "state-value", "challenge", env));
  assert.equal(url.searchParams.get("state"), "state-value");
  assert.equal(url.searchParams.get("code_challenge"), "challenge");
  assert.doesNotMatch(url.toString(), /secret/);
});

test("Google Search Console accepts only verified HTTPS properties and bounded query signals", () => {
  assert.equal(isVerifiedHttpsProperty("https://atlas.example.com/"), true);
  assert.equal(isVerifiedHttpsProperty("sc-domain:example.com"), false);
  assert.equal(isVerifiedHttpsProperty("http://atlas.example.com/"), false);
  const request = buildSearchConsoleRequest("https://atlas.example.com/", "2026-07-01", "2026-07-28");
  assert.match(request.url, /webmasters\/v3\/sites\/https%3A%2F%2Fatlas\.example\.com%2F\/searchAnalytics\/query/);
  assert.equal(request.body.rowLimit, 25);
  const [opportunity] = parseSearchConsoleQueries({ rows: [{ keys: ["autonomous company runtime"], clicks: 2, impressions: 120, ctr: 0.016, position: 8.4 }] });
  assert.equal(searchConsoleOpportunity(opportunity), true);
  assert.equal(searchConsoleOpportunity({ ...opportunity, position: 2 }), false);
});
