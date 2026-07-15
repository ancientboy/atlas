import test from "node:test";
import assert from "node:assert/strict";
import { appOrigin, atlasSessionCookie, clearedSessionCookie, hashAuthToken, randomAuthToken, readCookie, sessionCookie } from "../lib/atlas-auth.ts";

test("Atlas sessions use opaque tokens, stored hashes, and hardened cookies", async () => {
  const token = randomAuthToken();
  assert.equal(token.length, 64);
  assert.notEqual(await hashAuthToken(token), token);
  const cookie = sessionCookie(token);
  assert.match(cookie, new RegExp(`^${atlasSessionCookie}=`));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.equal(readCookie(new Headers({ cookie }), atlasSessionCookie), token);
  assert.match(clearedSessionCookie(), /Max-Age=0/);
});

test("auth callback origin is HTTPS and cannot be supplied by an insecure deployment", () => {
  assert.equal(appOrigin(new Request("https://atlas.lumeword.com/login"), "https://atlas.lumeword.com"), "https://atlas.lumeword.com");
  assert.throws(() => appOrigin(new Request("https://atlas.lumeword.com/login"), "http://evil.example"), /HTTPS/);
});
