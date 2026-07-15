import assert from "node:assert/strict";
import test from "node:test";
import { decryptConnectionSecret, encryptConnectionSecret, redactConnectionSecret } from "../lib/connection-vault.ts";
import { authorizationUrl, oauthAppReadiness } from "../lib/oauth-providers.ts";

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
  assert.deepEqual(oauthAppReadiness(env), { x: true, linkedin: false, reddit: false });
  const url = new URL(authorizationUrl("x", "state-value", "challenge", env));
  assert.equal(url.searchParams.get("state"), "state-value");
  assert.equal(url.searchParams.get("code_challenge"), "challenge");
  assert.doesNotMatch(url.toString(), /secret/);
});
