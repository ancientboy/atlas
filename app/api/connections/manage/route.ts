import { env } from "cloudflare:workers";
import { getAuthenticatedUser, resolveCloudflareDoh, resolvePublicAddresses, validatePublicUrl } from "../../../../lib/atlas-runtime";
import { encryptConnectionSecret } from "../../../../lib/connection-vault";

export const dynamic = "force-dynamic";
async function workspace(request: Request, workspaceId: string) { const user = await getAuthenticatedUser(request.headers, env as Record<string, string | undefined>); if (!user) throw new Response("Authentication required", { status: 401 }); const member = await env.DB.prepare("SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?").bind(workspaceId, user.id).first(); if (!member) throw new Response("Workspace access denied", { status: 403 }); return user; }

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: string; workspaceId?: string; provider?: string; siteUrl?: string; username?: string; applicationPassword?: string; subreddit?: string }; if (!body.workspaceId) return new Response("Workspace is required", { status: 400 }); await workspace(request, body.workspaceId);
    if (body.action === "disconnect" && body.provider) { await env.DB.prepare("DELETE FROM platform_connections WHERE workspace_id = ? AND provider = ?").bind(body.workspaceId, body.provider).run(); return Response.json({ ok: true }); }
    if (body.action === "connect_wordpress" && body.siteUrl && body.username && body.applicationPassword) {
      const siteUrl = validatePublicUrl(body.siteUrl).toString().replace(/\/$/, ""); if (new URL(siteUrl).protocol !== "https:") return new Response("WordPress must use HTTPS", { status: 400 }); const resolver = env.ATLAS_DNS_RESOLVER; if (!resolver) return new Response("Trusted DNS resolver is not configured", { status: 400 }); await resolvePublicAddresses(new URL(siteUrl).hostname, (hostname) => resolveCloudflareDoh(hostname, resolver));
      const auth = `Basic ${btoa(`${body.username}:${body.applicationPassword}`)}`; const check = await fetch(`${siteUrl}/wp-json/wp/v2/users/me?context=edit`, { headers: { authorization: auth } }); if (!check.ok) return new Response("WordPress credentials could not be verified", { status: 400 }); const identity = await check.json() as { id?: number; name?: string };
      const encrypted = await encryptConnectionSecret({ accessToken: "wordpress-application-password", siteUrl, username: body.username, applicationPassword: body.applicationPassword }, env.CONNECTION_ENCRYPTION_KEY);
      await env.DB.prepare("INSERT INTO platform_connections (workspace_id, provider, external_account_id, account_label, status, scopes_json, credential_reference, credential_ciphertext, last_sync_at, created_at, updated_at) VALUES (?, 'wordpress', ?, ?, 'connected', '[\"posts:write\"]', 'workspace_vault', ?, ?, ?, ?) ON CONFLICT(workspace_id, provider, external_account_id) DO UPDATE SET account_label = excluded.account_label, status = 'connected', credential_ciphertext = excluded.credential_ciphertext, updated_at = excluded.updated_at").bind(body.workspaceId, String(identity.id ?? body.username), `${identity.name ?? body.username} · ${new URL(siteUrl).hostname}`, encrypted, new Date().toISOString(), new Date().toISOString(), new Date().toISOString()).run(); return Response.json({ ok: true });
    }
    if (body.action === "update_reddit" && body.subreddit) { await env.DB.prepare("UPDATE platform_connections SET metadata_json = ?, updated_at = ? WHERE workspace_id = ? AND provider = 'reddit' AND status = 'connected'").bind(JSON.stringify({ subreddit: body.subreddit.replace(/^r\//, "") }), new Date().toISOString(), body.workspaceId).run(); return Response.json({ ok: true }); }
    return new Response("Invalid connection action", { status: 400 });
  } catch (error) { if (error instanceof Response) return error; return new Response("Connection request failed", { status: 400 }); }
}
