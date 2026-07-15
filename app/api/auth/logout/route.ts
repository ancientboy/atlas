import { env } from "cloudflare:workers";
import { atlasSessionCookie, clearedSessionCookie, hashAuthToken, readCookie } from "../../../../lib/atlas-auth";

export async function POST(request: Request) {
  const token = readCookie(request.headers, atlasSessionCookie);
  if (token) await env.DB.prepare("DELETE FROM atlas_auth_sessions WHERE token_hash = ?").bind(await hashAuthToken(token)).run();
  const location = request.headers.get("oai-authenticated-user-email") ? "/signout-with-chatgpt?return_to=%2F" : "/";
  return new Response(null, { status: 303, headers: { location: new URL(location, request.url).toString(), "set-cookie": clearedSessionCookie(), "cache-control": "no-store" } });
}
