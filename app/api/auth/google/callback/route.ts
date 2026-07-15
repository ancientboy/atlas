import { env } from "cloudflare:workers";
import { appOrigin, consumeAuthChallenge, createAuthSession, findOrCreateUser, sessionCookie } from "../../../../../lib/atlas-auth";

export async function GET(request: Request) {
  const url = new URL(request.url); const state = url.searchParams.get("state") || ""; const code = url.searchParams.get("code") || "";
  try {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !code) throw new Error("Google sign-in is unavailable.");
    const challenge = await consumeAuthChallenge(env.DB, state, "google");
    const redirectUri = `${appOrigin(request, env.ATLAS_APP_URL)}/api/auth/google/callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri, grant_type: "authorization_code" }) });
    if (!tokenResponse.ok) throw new Error("Google token exchange failed.");
    const tokens = await tokenResponse.json() as { access_token?: string };
    if (!tokens.access_token) throw new Error("Google token exchange failed.");
    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${tokens.access_token}` } });
    if (!profileResponse.ok) throw new Error("Google profile request failed.");
    const profile = await profileResponse.json() as { sub?: string; email?: string; email_verified?: boolean; name?: string };
    if (!profile.sub || !profile.email || profile.email_verified !== true) throw new Error("A verified Google email is required.");
    const user = await findOrCreateUser(env.DB, profile.email, profile.name);
    const session = await createAuthSession(env.DB, user, "google", profile.sub);
    return new Response(null, { status: 302, headers: { location: new URL(challenge.returnTo || "/app", request.url).toString(), "set-cookie": sessionCookie(session), "cache-control": "no-store" } });
  } catch {
    return Response.redirect(new URL("/login?error=google_failed", request.url), 302);
  }
}
