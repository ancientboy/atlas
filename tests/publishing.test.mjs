import assert from "node:assert/strict";
import test from "node:test";
import { publishCampaignAsset } from "../lib/publishing.ts";

const asset = { channel: "blog", title: "Atlas update", content: "Useful launch notes", cta: "https://example.com" };

test("WordPress publishes draft-first through the official posts endpoint", async () => {
  let request;
  const receipt = await publishCampaignAsset(asset, { WORDPRESS_BASE_URL: "https://cms.example.com", WORDPRESS_USERNAME: "editor", WORDPRESS_APP_PASSWORD: "secret" }, async (url, init) => {
    request = { url, init, body: JSON.parse(String(init.body)) };
    return Response.json({ id: 42, link: "https://cms.example.com/?p=42" });
  });
  assert.equal(request.url, "https://cms.example.com/wp-json/wp/v2/posts");
  assert.equal(request.body.status, "draft");
  assert.equal(receipt.externalPostId, "42");
});

test("X and manual-only channels are handled safely", async () => {
  const receipt = await publishCampaignAsset({ ...asset, channel: "x", content: "Launch note" }, { X_ACCESS_TOKEN: "secret" }, async (url, init) => {
    assert.equal(url, "https://api.x.com/2/tweets");
    assert.match(String(init.headers.authorization), /^Bearer /);
    return Response.json({ data: { id: "123" } });
  });
  assert.equal(receipt.publishedUrl, "https://x.com/i/web/status/123");
  await assert.rejects(() => publishCampaignAsset({ ...asset, channel: "xiaohongshu" }, {}), /manual publishing/);
});

test("provider errors expose status but never upstream bodies or keys", async () => {
  await assert.rejects(() => publishCampaignAsset(asset, { WORDPRESS_BASE_URL: "https://cms.example.com", WORDPRESS_USERNAME: "editor", WORDPRESS_APP_PASSWORD: "top-secret" }, async () => new Response("top-secret upstream failure", { status: 401 })), (error) => {
    assert.match(error.message, /status 401/);
    assert.doesNotMatch(error.message, /top-secret/);
    return true;
  });
});
