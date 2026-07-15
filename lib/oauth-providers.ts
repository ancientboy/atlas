export type OAuthProvider = "x" | "linkedin" | "reddit";
export function isOAuthProvider(value: string): value is OAuthProvider { return value === "x" || value === "linkedin" || value === "reddit"; }

const config = {
  x: { authorize: "https://x.com/i/oauth2/authorize", token: "https://api.x.com/2/oauth2/token", scopes: "tweet.read tweet.write users.read offline.access" },
  linkedin: { authorize: "https://www.linkedin.com/oauth/v2/authorization", token: "https://www.linkedin.com/oauth/v2/accessToken", scopes: "openid profile w_member_social" },
  reddit: { authorize: "https://www.reddit.com/api/v1/authorize", token: "https://www.reddit.com/api/v1/access_token", scopes: "identity submit read" },
} as const;

function appCredential(provider: OAuthProvider, env: Record<string, string | undefined>) {
  const prefix = provider.toUpperCase(); const clientId = env[`${prefix}_CLIENT_ID`]?.trim(); const clientSecret = env[`${prefix}_CLIENT_SECRET`]?.trim();
  if (!clientId || !clientSecret) throw new Error(`${provider} OAuth application is not configured.`);
  return { clientId, clientSecret };
}
export function oauthAppReadiness(env: Record<string, string | undefined>) { return { x: Boolean(env.X_CLIENT_ID && env.X_CLIENT_SECRET), linkedin: Boolean(env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET), reddit: Boolean(env.REDDIT_CLIENT_ID && env.REDDIT_CLIENT_SECRET) }; }
export function oauthCallbackUrl(provider: OAuthProvider, env: Record<string, string | undefined>) { const base = env.ATLAS_PUBLIC_URL?.replace(/\/$/, ""); if (!base?.startsWith("https://")) throw new Error("Atlas public URL is not configured."); return `${base}/api/connections/callback?provider=${provider}`; }

export function authorizationUrl(provider: OAuthProvider, state: string, challenge: string | null, env: Record<string, string | undefined>) {
  const { clientId } = appCredential(provider, env); const url = new URL(config[provider].authorize);
  url.searchParams.set("client_id", clientId); url.searchParams.set("redirect_uri", oauthCallbackUrl(provider, env)); url.searchParams.set("response_type", "code"); url.searchParams.set("state", state); url.searchParams.set("scope", config[provider].scopes);
  if (provider === "x" && challenge) { url.searchParams.set("code_challenge", challenge); url.searchParams.set("code_challenge_method", "S256"); }
  if (provider === "reddit") { url.searchParams.set("duration", "permanent"); }
  return url.toString();
}

export async function exchangeOAuthCode(provider: OAuthProvider, code: string, verifier: string | null, env: Record<string, string | undefined>, fetcher: typeof fetch = fetch) {
  const { clientId, clientSecret } = appCredential(provider, env); const form = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: oauthCallbackUrl(provider, env) });
  const headers: Record<string, string> = { "content-type": "application/x-www-form-urlencoded" };
  if (provider === "x") { form.set("client_id", clientId); if (verifier) form.set("code_verifier", verifier); headers.authorization = `Basic ${btoa(`${clientId}:${clientSecret}`)}`; }
  else if (provider === "linkedin") { form.set("client_id", clientId); form.set("client_secret", clientSecret); }
  else headers.authorization = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
  const response = await fetcher(config[provider].token, { method: "POST", headers, body: form }); const text = await response.text();
  if (!response.ok) throw new Error(`OAuth token exchange failed with status ${response.status}.`); if (text.length > 64_000) throw new Error("OAuth response is too large.");
  let body: Record<string, unknown>; try { body = JSON.parse(text) as Record<string, unknown>; } catch { throw new Error("OAuth provider returned an invalid response."); }
  const accessToken = String(body.access_token ?? ""); if (!accessToken) throw new Error("OAuth provider returned an invalid response.");
  const expiresIn = Number(body.expires_in ?? 0); return { accessToken, refreshToken: body.refresh_token ? String(body.refresh_token) : undefined, tokenType: String(body.token_type ?? "Bearer"), expiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : undefined };
}

export async function fetchOAuthIdentity(provider: OAuthProvider, accessToken: string, fetcher: typeof fetch = fetch) {
  const url = provider === "x" ? "https://api.x.com/2/users/me" : provider === "linkedin" ? "https://api.linkedin.com/v2/userinfo" : "https://oauth.reddit.com/api/v1/me";
  const response = await fetcher(url, { headers: { authorization: `Bearer ${accessToken}`, ...(provider === "reddit" ? { "user-agent": "Atlas/1.0" } : {}) } }); const body = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error(`OAuth identity request failed with status ${response.status}.`);
  if (provider === "x") { const data = body.data as Record<string, unknown> | undefined; return { id: String(data?.id ?? ""), label: String(data?.username ?? data?.name ?? "X account") }; }
  if (provider === "linkedin") return { id: String(body.sub ?? ""), label: String(body.name ?? body.email ?? "LinkedIn account"), authorUrn: `urn:li:person:${String(body.sub ?? "")}` };
  return { id: String(body.id ?? body.name ?? ""), label: String(body.name ?? "Reddit account") };
}

export async function createPkce() { const verifier = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", ""); const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)); const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); return { verifier, challenge }; }
