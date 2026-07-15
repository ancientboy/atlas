import { env } from "cloudflare:workers";
import { getAuthenticatedUser } from "../../../../lib/atlas-runtime";
import { authorizationUrl, createPkce, isOAuthProvider } from "../../../../lib/oauth-providers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request.headers, env as Record<string, string | undefined>, env.DB); if (!user) return new Response("Authentication required", { status: 401 });
  const url = new URL(request.url); const provider = url.searchParams.get("provider") ?? ""; const workspaceId = url.searchParams.get("workspaceId") ?? "";
  if (!isOAuthProvider(provider) || !workspaceId) return new Response("Invalid connection request", { status: 400 });
  const member = await env.DB.prepare("SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?").bind(workspaceId, user.id).first(); if (!member) return new Response("Workspace access denied", { status: 403 });
  const state = crypto.randomUUID(); const pkce = provider === "x" ? await createPkce() : null; const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM oauth_connection_states WHERE expires_at < ?").bind(new Date().toISOString()),
    env.DB.prepare("INSERT INTO oauth_connection_states (state, workspace_id, user_id, provider, code_verifier, return_to, expires_at) VALUES (?, ?, ?, ?, ?, '/app?view=connections', ?)").bind(state, workspaceId, user.id, provider, pkce?.verifier ?? null, expiresAt),
  ]);
  try { return Response.redirect(authorizationUrl(provider, state, pkce?.challenge ?? null, env as Record<string, string | undefined>), 302); } catch (error) { return new Response(error instanceof Error ? error.message : "Connection is not configured", { status: 400 }); }
}
