import assert from "node:assert/strict";
import test from "node:test";
import { campaignTrackingUrl, normalizePublishedUrl } from "../lib/campaign-tracking.ts";

test("campaign links preserve the destination and add stable Atlas attribution", () => {
  const tracked = new URL(campaignTrackingUrl("https://example.com/pricing?plan=pro", "linkedin", 12, 34));
  assert.equal(tracked.origin + tracked.pathname, "https://example.com/pricing");
  assert.equal(tracked.searchParams.get("plan"), "pro");
  assert.equal(tracked.searchParams.get("utm_source"), "linkedin");
  assert.equal(tracked.searchParams.get("utm_medium"), "social");
  assert.equal(tracked.searchParams.get("utm_campaign"), "atlas_campaign_12");
  assert.equal(tracked.searchParams.get("utm_content"), "asset_34");
});

test("community channels use channel-specific attribution", () => {
  const reddit = new URL(campaignTrackingUrl("https://example.com", "reddit", 7, 9));
  const xiaohongshu = new URL(campaignTrackingUrl("https://example.com", "xiaohongshu", 7, 10));
  assert.equal(reddit.searchParams.get("utm_medium"), "community");
  assert.equal(xiaohongshu.searchParams.get("utm_source"), "xiaohongshu");
  assert.equal(xiaohongshu.searchParams.get("utm_medium"), "community");
});

test("manual publishing requires a credential-free HTTPS receipt URL", () => {
  assert.equal(normalizePublishedUrl("https://x.com/example/status/1"), "https://x.com/example/status/1");
  assert.throws(() => normalizePublishedUrl("http://x.com/example/status/1"), /valid HTTPS/);
  assert.throws(() => normalizePublishedUrl("https://user:pass@example.com/post"), /valid HTTPS/);
  assert.throws(() => normalizePublishedUrl(undefined), /valid HTTPS/);
});
