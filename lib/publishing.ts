import type { CampaignChannel } from "./campaign-channels";

export type PublishableChannel = "blog" | "x" | "linkedin" | "reddit";
export type PublishAsset = { channel: CampaignChannel; title: string; content: string; cta: string };
export type PublishReceipt = { externalPostId: string; publishedUrl: string };

const required = (env: Record<string, string | undefined>, key: string) => {
  const value = env[key]?.trim();
  if (!value) throw new Error(`Provider is not configured: ${key}.`);
  return value;
};

function validateProviderUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Provider URL is invalid."); }
  if (url.protocol !== "https:" || url.username || url.password || ["localhost", "127.0.0.1", "0.0.0.0", "[::1]", "169.254.169.254"].includes(url.hostname.toLowerCase())) throw new Error("Provider URL is invalid.");
}

async function safeJson(response: Response) {
  const text = await response.text();
  if (!response.ok) throw new Error(`Provider request failed with status ${response.status}.`);
  if (text.length > 256_000) throw new Error("Provider response is too large.");
  try { return JSON.parse(text) as Record<string, unknown>; } catch { throw new Error("Provider returned an invalid response."); }
}

export function providerReadiness(env: Record<string, string | undefined>) {
  return {
    wordpress: Boolean(env.WORDPRESS_BASE_URL && env.WORDPRESS_USERNAME && env.WORDPRESS_APP_PASSWORD),
    x: Boolean(env.X_ACCESS_TOKEN),
    linkedin: Boolean(env.LINKEDIN_ACCESS_TOKEN && env.LINKEDIN_AUTHOR_URN),
    reddit: Boolean(env.REDDIT_ACCESS_TOKEN && env.REDDIT_SUBREDDIT),
    analytics: Boolean(env.GA4_PROPERTY_ID || env.POSTHOG_PROJECT_KEY || env.ATLAS_TRACKING_ENABLED === "1"),
  };
}

export function isPublishableChannel(channel: CampaignChannel): channel is PublishableChannel {
  return channel === "blog" || channel === "x" || channel === "linkedin" || channel === "reddit";
}

export async function publishCampaignAsset(asset: PublishAsset, env: Record<string, string | undefined>, fetcher: typeof fetch = fetch): Promise<PublishReceipt> {
  if (!isPublishableChannel(asset.channel)) throw new Error("This channel requires manual publishing.");
  if (asset.channel === "blog") {
    const base = required(env, "WORDPRESS_BASE_URL").replace(/\/$/, "");
    validateProviderUrl(base);
    const username = required(env, "WORDPRESS_USERNAME");
    const password = required(env, "WORDPRESS_APP_PASSWORD");
    const response = await fetcher(`${base}/wp-json/wp/v2/posts`, { method: "POST", headers: { authorization: `Basic ${btoa(`${username}:${password}`)}`, "content-type": "application/json" }, body: JSON.stringify({ title: asset.title, content: `${asset.content}\n\n${asset.cta}`, status: env.WORDPRESS_PUBLISH_STATUS === "publish" ? "publish" : "draft" }) });
    const body = await safeJson(response); const id = String(body.id ?? ""); const link = String(body.link ?? "");
    if (!id || !link) throw new Error("Provider returned an invalid response.");
    return { externalPostId: id, publishedUrl: link };
  }
  if (asset.channel === "x") {
    const response = await fetcher("https://api.x.com/2/tweets", { method: "POST", headers: { authorization: `Bearer ${required(env, "X_ACCESS_TOKEN")}`, "content-type": "application/json" }, body: JSON.stringify({ text: `${asset.content}\n\n${asset.cta}`.slice(0, 280) }) });
    const body = await safeJson(response); const data = body.data as Record<string, unknown> | undefined; const id = String(data?.id ?? "");
    if (!id) throw new Error("Provider returned an invalid response.");
    return { externalPostId: id, publishedUrl: `https://x.com/i/web/status/${id}` };
  }
  if (asset.channel === "linkedin") {
    const author = required(env, "LINKEDIN_AUTHOR_URN");
    const response = await fetcher("https://api.linkedin.com/v2/ugcPosts", { method: "POST", headers: { authorization: `Bearer ${required(env, "LINKEDIN_ACCESS_TOKEN")}`, "content-type": "application/json", "x-restli-protocol-version": "2.0.0" }, body: JSON.stringify({ author, lifecycleState: "PUBLISHED", specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text: `${asset.content}\n\n${asset.cta}` }, shareMediaCategory: "NONE" } }, visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" } }) });
    const body = await safeJson(response); const id = String(body.id ?? response.headers.get("x-restli-id") ?? "");
    if (!id) throw new Error("Provider returned an invalid response.");
    return { externalPostId: id, publishedUrl: `https://www.linkedin.com/feed/update/${encodeURIComponent(id)}` };
  }
  const subreddit = required(env, "REDDIT_SUBREDDIT").replace(/^r\//, "");
  const form = new URLSearchParams({ api_type: "json", kind: "self", sr: subreddit, title: asset.title.slice(0, 300), text: `${asset.content}\n\n${asset.cta}` });
  const response = await fetcher("https://oauth.reddit.com/api/submit", { method: "POST", headers: { authorization: `Bearer ${required(env, "REDDIT_ACCESS_TOKEN")}`, "content-type": "application/x-www-form-urlencoded", "user-agent": env.REDDIT_USER_AGENT || "Atlas/1.0" }, body: form });
  const body = await safeJson(response); const json = body.json as Record<string, unknown> | undefined; const data = json?.data as Record<string, unknown> | undefined; const url = String(data?.url ?? ""); const id = String(data?.name ?? "");
  if (!id || !url) throw new Error("Provider returned an invalid response.");
  return { externalPostId: id, publishedUrl: url };
}
