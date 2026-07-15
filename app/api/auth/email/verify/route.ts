import { env } from "cloudflare:workers";
import { consumeAuthChallenge, createAuthSession, findOrCreateUser, sessionCookie } from "../../../../../lib/atlas-auth";

export async function GET(request: Request) {
  const url = new URL(request.url); const token = url.searchParams.get("token") || "";
  try {
    const challenge = await consumeAuthChallenge(env.DB, token, "email");
    if (!challenge.email) throw new Error("Invalid email challenge.");
    const user = await findOrCreateUser(env.DB, challenge.email);
    const session = await createAuthSession(env.DB, user, "email", user.email);
    return new Response(null, { status: 302, headers: { location: new URL(challenge.returnTo || "/app", request.url).toString(), "set-cookie": sessionCookie(session), "cache-control": "no-store" } });
  } catch {
    return Response.redirect(new URL("/login?error=expired", request.url), 302);
  }
}
