export function campaignTrackingUrl(productUrl: string, channel: string, campaignId: number, assetId: number) {
  try {
    const url = new URL(productUrl);
    if (!/^https?:$/.test(url.protocol)) return productUrl;
    url.searchParams.set("utm_source", channel);
    url.searchParams.set("utm_medium", channel === "blog" ? "content" : "social");
    url.searchParams.set("utm_campaign", `atlas_campaign_${campaignId}`);
    url.searchParams.set("utm_content", `asset_${assetId}`);
    return url.toString();
  } catch {
    return productUrl;
  }
}

export function normalizePublishedUrl(value: string | undefined) {
  try {
    const parsed = new URL(value?.trim() || "");
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error("invalid");
    return parsed.toString();
  } catch {
    throw new Error("A valid HTTPS published URL is required for manual publishing.");
  }
}
