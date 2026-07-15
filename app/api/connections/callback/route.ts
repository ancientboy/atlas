import { env } from "cloudflare:workers";
import { getAuthenticatedUser } from "../../../../lib/atlas-runtime";
import { encryptConnectionSecret } from "../../../../lib/connection-vault";
import { exchangeOAuthCode, fetchOAuthIdentity, isOAuthProvider } from "../../../../lib/oauth-providers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request.headers, env as Record<string, string | undefined>, env.DB); if (!user) return Response.redirect(new URL("/login?return_to=/app?view=connections", request.url), 302);
  const url = new URL(request.url); const provider = url.searchParams.get("provider") ?? ""; const state = url.searchParams.get("state") ?? ""; const code = url.searchParams.get("code") ?? "";
  if (!isOAuthProvider(provider) || !state || !code) return new Response("Invalid OAuth callback", { status: 400 });
  const row = await env.DB.prepare("SELECT workspace_id AS workspaceId, user_id AS userId, provider, code_verifier AS codeVerifier, return_to AS returnTo, expires_at AS expiresAt FROM oauth_connection_states WHERE state = ?").bind(state).first<{ workspaceId: string; userId: string; provider: string; codeVerifier: string | null; returnTo: string; expiresAt: string }>();
  if (!row || row.userId !== user.id || row.provider !== provider || row.expiresAt < new Date().toISOString()) return new Response("OAuth state is invalid or expired", { status: 400 });
  await env.DB.prepare("DELETE FROM oauth_connection_states WHERE state = ?").bind(state).run();
  try {
    const token = await exchangeOAuthCode(provider, code, row.codeVerifier, env as Record<string, string | undefined>); const identity = await fetchOAuthIdentity(provider, token.accessToken);
    if (!identity.id) throw new Error("OAuth identity is invalid.");
    const credentialCiphertext = await encryptConnectionSecret({ ...token, authorUrn: identity.authorUrn }, env.CONNECTION_ENCRYPTION_KEY);
    await env.DB.prepare("INSERT INTO platform_connections (workspace_id, provider, external_account_id, account_label, status, scopes_json, credential_reference, credential_ciphertext, expires_at, last_sync_at, created_at, updated_at) VALUES (?, ?, ?, ?, 'connected', '[]', 'workspace_vault', ?, ?, ?, ?, ?) ON CONFLICT(workspace_id, provider, external_account_id) DO UPDATE SET account_label = excluded.account_label, status = 'connected', credential_ciphertext = excluded.credential_ciphertext, expires_at = excluded.expires_at, updated_at = excluded.updated_at").bind(row.workspaceId, provider, identity.id, identity.label, credentialCiphertext, token.expiresAt ?? null, new Date().toISOString(), new Date().toISOString(), new Date().toISOString()).run();
    return Response.redirect(new URL(`${row.returnTo}&workspaceId=${encodeURIComponent(row.workspaceId)}&connected=${provider}`, request.url), 302);
  } catch { return Response.redirect(new URL(`/app?view=connections&workspaceId=${encodeURIComponent(row.workspaceId)}&connection_error=${provider}`, request.url), 302); }
}
