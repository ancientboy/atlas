import { env } from "cloudflare:workers";
import { atlasSessionCookie, findOrCreateUser, hashAuthToken, readCookie } from "../../../lib/atlas-auth";
import { getAuthenticatedUser } from "../../../lib/atlas-runtime";

async function currentUser(request: Request) {
  const authenticated = await getAuthenticatedUser(request.headers, env as Record<string, string | undefined>, env.DB);
  if (!authenticated) throw new Response("Authentication required", { status: 401 });
  return findOrCreateUser(env.DB, authenticated.email, authenticated.name);
}

export async function GET(request: Request) {
  try {
    const user = await currentUser(request);
    const [profile, identities, sessions, memberships] = await Promise.all([
      env.DB.prepare("SELECT name, email, locale FROM users WHERE id = ?").bind(user.id).first<{ name: string | null; email: string; locale: string }>(),
      env.DB.prepare("SELECT provider, email, created_at AS createdAt FROM atlas_auth_identities WHERE user_id = ? ORDER BY created_at").bind(user.id).all<{ provider: string; email: string; createdAt: string }>(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM atlas_auth_sessions WHERE user_id = ? AND datetime(expires_at) > datetime('now')").bind(user.id).first<{ count: number }>(),
      env.DB.prepare("SELECT w.id, w.name, m.role FROM workspace_members m INNER JOIN workspaces w ON w.id = m.workspace_id WHERE m.user_id = ? ORDER BY w.created_at").bind(user.id).all<{ id: string; name: string; role: string }>(),
    ]);
    const providers = new Map<string, { provider: string; email: string; createdAt: string }>();
    for (const identity of identities.results) if (!providers.has(identity.provider)) providers.set(identity.provider, identity);
    return Response.json({
      profile: { displayName: profile?.name || user.name || user.email, email: profile?.email || user.email, locale: profile?.locale === "en" ? "en" : "zh" },
      identities: Array.from(providers.values()),
      activeSessions: sessions?.count ?? 0,
      workspaces: memberships.results,
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: "Unable to load account settings." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await currentUser(request);
    const body = await request.json().catch(() => ({})) as { displayName?: string; locale?: string };
    const displayName = body.displayName?.trim() || "";
    if (displayName.length < 1 || displayName.length > 120) return Response.json({ error: "Display name must be between 1 and 120 characters." }, { status: 400 });
    const locale = body.locale === "en" ? "en" : "zh";
    await env.DB.prepare("UPDATE users SET name = ?, locale = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(displayName, locale, user.id).run();
    return Response.json({ ok: true, profile: { displayName, email: user.email, locale } });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: "Unable to update account settings." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser(request);
    const body = await request.json().catch(() => ({})) as { action?: string };
    if (body.action !== "revoke_other_sessions") return Response.json({ error: "Unsupported account action." }, { status: 400 });
    const token = readCookie(request.headers, atlasSessionCookie);
    if (token) {
      await env.DB.prepare("DELETE FROM atlas_auth_sessions WHERE user_id = ? AND token_hash <> ?").bind(user.id, await hashAuthToken(token)).run();
    } else {
      await env.DB.prepare("DELETE FROM atlas_auth_sessions WHERE user_id = ?").bind(user.id).run();
    }
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: "Unable to manage sessions." }, { status: 500 });
  }
}
