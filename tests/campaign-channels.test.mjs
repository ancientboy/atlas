import assert from "node:assert/strict";
import test from "node:test";
import { campaignChannels, campaignChannelLimit, isCampaignChannel } from "../lib/campaign-channels.ts";

test("campaign channel catalog covers owned, social, community, launch, and developer distribution", () => {
  assert.deepEqual(Object.keys(campaignChannels), ["x", "linkedin", "blog", "reddit", "quora", "youtube", "product_hunt", "github", "newsletter", "xiaohongshu"]);
  assert.equal(campaignChannels.x.mode, "api");
  assert.equal(campaignChannels.reddit.mode, "review");
  assert.equal(campaignChannels.xiaohongshu.mode, "manual");
  assert.equal(isCampaignChannel("product_hunt"), true);
  assert.equal(isCampaignChannel("unknown"), false);
  assert.equal(campaignChannelLimit("x"), 280);
});
