export const campaignChannels = {
  x: { label: "X", labelZh: "X", limit: 280, medium: "social", mode: "api", format: "one concise post or short thread opener; no invented mentions" },
  linkedin: { label: "LinkedIn", labelZh: "LinkedIn", limit: 3000, medium: "social", mode: "api", format: "2-6 short professional paragraphs with a useful point of view" },
  blog: { label: "Blog", labelZh: "博客", limit: 12000, medium: "content", mode: "api", format: "structured article with descriptive headings, evidence, and a conclusion" },
  reddit: { label: "Reddit", labelZh: "Reddit", limit: 10000, medium: "community", mode: "review", format: "community-native, transparent and helpful; no promotional spam or fake personal experience" },
  quora: { label: "Quora", labelZh: "Quora", limit: 10000, medium: "community", mode: "review", format: "direct answer first, then evidence and practical steps; disclose affiliation when relevant" },
  youtube: { label: "YouTube", labelZh: "YouTube", limit: 5000, medium: "video", mode: "review", format: "video title, opening hook, chapter outline, description, and CTA" },
  product_hunt: { label: "Product Hunt", labelZh: "Product Hunt", limit: 2000, medium: "launch", mode: "review", format: "clear tagline, maker story, first comment, and specific launch CTA" },
  github: { label: "GitHub", labelZh: "GitHub", limit: 10000, medium: "developer", mode: "api", format: "README or Discussion content with install/use examples and factual limitations" },
  newsletter: { label: "Newsletter", labelZh: "邮件通讯", limit: 12000, medium: "email", mode: "api", format: "subject, preview line, scannable email body, and one primary CTA" },
  xiaohongshu: { label: "Xiaohongshu", labelZh: "小红书", limit: 1000, medium: "community", mode: "manual", format: "natural Chinese note with useful detail, restrained hashtags, no fake testimonials or prohibited external-link bait" },
} as const;

export type CampaignChannel = keyof typeof campaignChannels;

export function isCampaignChannel(value: string): value is CampaignChannel {
  return Object.prototype.hasOwnProperty.call(campaignChannels, value);
}

export function campaignChannelLimit(value: string) {
  return isCampaignChannel(value) ? campaignChannels[value].limit : 12000;
}
