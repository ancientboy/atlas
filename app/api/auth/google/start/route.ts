import { env } from "cloudflare:workers";
import { appOrigin, createAuthChallenge } from "../../../../../lib/atlas-auth";
import { safeRelativeReturnPath } from "../../../../../lib/auth-paths";

export async function GET(request: Request) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return Response.redirect(new URL("/login?error=google_unavailable", request.url), 302);
  const url = new URL(request.url); const returnTo = safeRelativeReturnPath(url.searchParams.get("return_to") || "/app");
  const state = await createAuthChallenge(env.DB, "google", returnTo);
  const callback = `${appOrigin(request, env.ATLAS_APP_URL)}/api/auth/google/callback`;
  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorize.searchParams.set("client_id", env.GOOGLE_CLIENT_ID); authorize.searchParams.set("redirect_uri", callback); authorize.searchParams.set("response_type", "code"); authorize.searchParams.set("scope", "openid email profile"); authorize.searchParams.set("state", state); authorize.searchParams.set("prompt", "select_account");
  return Response.redirect(authorize, 302);
}
