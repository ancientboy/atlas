import { safeRelativeReturnPath } from "./auth-paths.ts";
import type { AuthenticatedUser } from "./atlas-runtime.ts";

export const atlasSessionCookie = "atlas_session";
const sessionDays = 30;

export function randomAuthToken(bytes = 32) {
  const value = new Uint8Array(bytes); crypto.getRandomValues(value);
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashAuthToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function readCookie(headers: Headers, name: string) {
  for (const part of (headers.get("cookie") || "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function sessionCookie(token: string, maxAge = sessionDays * 86400) {
  return `${atlasSessionCookie}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearedSessionCookie() { return `${atlasSessionCookie}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`; }

export async function findOrCreateUser(db: D1Database, emailInput: string, nameInput?: string | null) {
  const email = emailInput.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) throw new Error("A valid email address is required.");
  const existing = await db.prepare("SELECT id, email, name FROM users WHERE lower(email) = ? LIMIT 1").bind(email).first<{ id: string; email: string; name: string | null }>();
  if (existing) {
    if (nameInput?.trim() && (!existing.name || existing.name === existing.email)) await db.prepare("UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(nameInput.trim().slice(0, 120), existing.id).run();
    return { id: existing.id, email, name: nameInput?.trim() || existing.name || email } satisfies AuthenticatedUser;
  }
  const id = `user_${(await hashAuthToken(email)).slice(0, 32)}`;
  const name = nameInput?.trim().slice(0, 120) || email;
  await db.prepare("INSERT INTO users (id, email, name, locale) VALUES (?, ?, ?, 'zh')").bind(id, email, name).run();
  return { id, email, name } satisfies AuthenticatedUser;
}

export async function createAuthSession(db: D1Database, user: AuthenticatedUser, provider: string, providerSubject = user.email) {
  const token = randomAuthToken(); const tokenHash = await hashAuthToken(token);
  const expiresAt = new Date(Date.now() + sessionDays * 86400_000).toISOString();
  await db.batch([
    db.prepare("INSERT INTO atlas_auth_sessions (token_hash, user_id, provider, expires_at) VALUES (?, ?, ?, ?)").bind(tokenHash, user.id, provider, expiresAt),
    db.prepare("INSERT INTO atlas_auth_identities (provider, provider_subject, user_id, email) VALUES (?, ?, ?, ?) ON CONFLICT(provider, provider_subject) DO UPDATE SET user_id = excluded.user_id, email = excluded.email, updated_at = CURRENT_TIMESTAMP").bind(provider, providerSubject, user.id, user.email),
  ]);
  return token;
}

export async function createAuthChallenge(db: D1Database, kind: "email" | "google", returnTo: string, email?: string) {
  const token = randomAuthToken(); const tokenHash = await hashAuthToken(token);
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
  await db.prepare("INSERT INTO atlas_auth_challenges (token_hash, kind, email, return_to, expires_at) VALUES (?, ?, ?, ?, ?)").bind(tokenHash, kind, email?.trim().toLowerCase() || null, safeRelativeReturnPath(returnTo), expiresAt).run();
  return token;
}

export async function consumeAuthChallenge(db: D1Database, token: string, kind: "email" | "google") {
  const tokenHash = await hashAuthToken(token);
  const challenge = await db.prepare("SELECT email, return_to AS returnTo FROM atlas_auth_challenges WHERE token_hash = ? AND kind = ? AND used_at IS NULL AND datetime(expires_at) > datetime('now')").bind(tokenHash, kind).first<{ email: string | null; returnTo: string }>();
  if (!challenge) throw new Error("This sign-in link is invalid or expired.");
  await db.prepare("UPDATE atlas_auth_challenges SET used_at = CURRENT_TIMESTAMP WHERE token_hash = ? AND used_at IS NULL").bind(tokenHash).run();
  return challenge;
}

export function appOrigin(request: Request, configured?: string) {
  const value = configured?.trim() || new URL(request.url).origin;
  const url = new URL(value);
  if (url.protocol !== "https:" && url.hostname !== "localhost") throw new Error("ATLAS_APP_URL must use HTTPS.");
  return url.origin;
}
