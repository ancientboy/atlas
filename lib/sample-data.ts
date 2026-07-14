export type Founder = { id: number; name: string; product: string; stage: string; segment: string; primaryChannel: string; monthlyRevenue: number; topPain: string; source: string };
export type Pain = { id: number; title: string; category: string; frequency: number; severity: number; willingnessToPay: number; evidenceCount: number; opportunityScore: number; status: string; currentSolution: string };
export type LandscapeEntity = { id: number; name: string; category: string; positioning: string; pricing: string; gaps: string };
export type Hypothesis = { id: number; code: string; statement: string; status: string; confidence: number; evidenceFor: number; evidenceAgainst: number; nextTest: string };
export type Experiment = { id: number; name: string; hypothesisCode: string; channel: string; status: string; metric: string; target: string; result: string; startsOn: string };
export type DailyAction = { id: number; title: string; rationale: string; expectedImpact: string; effortMinutes: number; priority: number; status: string; dueDate: string };
export type DashboardData = { founders: Founder[]; pains: Pain[]; landscape: LandscapeEntity[]; hypotheses: Hypothesis[]; experiments: Experiment[]; actions: DailyAction[] };

export const sampleData: DashboardData = {
  founders: [
    { id: 1, name: "Maya Chen", product: "Briefly AI", stage: "$1k–10k MRR", segment: "AI SaaS", primaryChannel: "SEO", monthlyRevenue: 4200, topPain: "内容带来流量，却没有带来付费用户 / Content brings traffic but not paid users", source: "Indie Hackers" },
    { id: 2, name: "Jon Bell", product: "ClarityKit", stage: "首批客户 / First customers", segment: "独立开发者 / Solo founder", primaryChannel: "X", monthlyRevenue: 640, topPain: "不知道该把精力放在哪个渠道 / Doesn't know which channel deserves focus", source: "X 访谈 / X interview" },
    { id: 3, name: "Aisha Rahman", product: "DemoFlow", stage: "未盈利 / Pre-revenue", segment: "AI 开发工具 / AI dev tool", primaryChannel: "Product Hunt", monthlyRevenue: 0, topPain: "发布高峰在 48 小时内消失 / Launch spike disappeared in 48 hours", source: "Reddit" },
    { id: 4, name: "Leo Wang", product: "ClawDesk", stage: "测试版 / Beta", segment: "Agent 平台 / Agent platform", primaryChannel: "社区 / Community", monthlyRevenue: 0, topPain: "产品能快速上线，但分发每次都从零开始 / Can ship fast, but distribution restarts at zero", source: "创始人笔记 / Founder note" },
    { id: 5, name: "Nora Kim", product: "ThreadPilot", stage: "$1k–10k MRR", segment: "创作者 SaaS / Creator SaaS", primaryChannel: "联盟 / Affiliates", monthlyRevenue: 7800, topPain: "跨渠道归因不清晰 / Attribution across channels is unclear", source: "创始人访谈 / Founder interview" },
  ],
  pains: [
    { id: 1, title: "不知道今天最该做什么 / Don't know today's best action", category: "决策 / Decision", frequency: 5, severity: 5, willingnessToPay: 4, evidenceCount: 18, opportunityScore: 92, status: "priority", currentSolution: "建议分散在工具与社区中 / Advice scattered across tools and communities" },
    { id: 2, title: "产品上线后没有持续曝光 / No sustained visibility after launch", category: "分发 / Distribution", frequency: 5, severity: 5, willingnessToPay: 4, evidenceCount: 15, opportunityScore: 89, status: "priority", currentSolution: "一次性的 Product Hunt 发布 / One-off launch on Product Hunt" },
    { id: 3, title: "不知道为什么用户不付费 / Don't know why users don't pay", category: "转化 / Conversion", frequency: 4, severity: 5, willingnessToPay: 5, evidenceCount: 11, opportunityScore: 87, status: "validated", currentSolution: "分析工具加人工猜测 / Analytics plus manual guesswork" },
    { id: 4, title: "每个平台都要重新写内容", category: "Content", frequency: 5, severity: 3, willingnessToPay: 3, evidenceCount: 13, opportunityScore: 72, status: "observed", currentSolution: "ChatGPT and schedulers" },
    { id: 5, title: "无法判断哪条渠道带来付费", category: "Attribution", frequency: 3, severity: 4, willingnessToPay: 4, evidenceCount: 7, opportunityScore: 68, status: "observed", currentSolution: "UTMs and PostHog" },
  ],
  landscape: [
    { id: 1, name: "Product Hunt", category: "Launch", positioning: "Launch discovery network", pricing: "Free / paid promos", gaps: "Traffic spike, weak continuity" },
    { id: 2, name: "Ahrefs", category: "SEO", positioning: "Search intelligence suite", pricing: "$129+/mo", gaps: "Powerful data, little execution guidance" },
    { id: 3, name: "Profound", category: "GEO", positioning: "AI visibility analytics", pricing: "Enterprise", gaps: "Measures visibility, does not own growth outcome" },
    { id: 4, name: "Typefully", category: "Social", positioning: "Writing and scheduling for social", pricing: "$12.50+/mo", gaps: "Publishing without customer context" },
    { id: 5, name: "PostHog", category: "Analytics", positioning: "Product analytics stack", pricing: "Usage-based", gaps: "Shows what happened, not the next action" },
    { id: 6, name: "Loops", category: "Lifecycle", positioning: "Email for SaaS", pricing: "$49+/mo", gaps: "Channel execution, not cross-channel decisioning" },
    { id: 7, name: "Common Room", category: "Community", positioning: "Customer intelligence", pricing: "Enterprise", gaps: "Built for teams, not solo founders" },
    { id: 8, name: "n8n", category: "Automation", positioning: "Workflow automation", pricing: "Open source / cloud", gaps: "Flexible plumbing; founder must design the playbook" },
  ],
  hypotheses: [
    { id: 1, code: "H1", statement: "AI founders' biggest growth pain is choosing today's highest-leverage action.", status: "testing", confidence: 68, evidenceFor: 18, evidenceAgainst: 4, nextTest: "Interview 10 founders and ask for last week's abandoned growth tasks" },
    { id: 2, code: "H2", statement: "Founders will pay more for a prioritized daily plan than for another content generator.", status: "untested", confidence: 42, evidenceFor: 6, evidenceAgainst: 2, nextTest: "Sell a 2-week concierge action plan to 5 founders" },
    { id: 3, code: "H3", statement: "The best wedge is launch diagnosis for products with traffic but no paid conversion.", status: "testing", confidence: 55, evidenceFor: 9, evidenceAgainst: 5, nextTest: "Run 15 landing audits and track implementation rate" },
    { id: 4, code: "H4", statement: "Cross-channel learning data becomes a defensible advantage after 100 active products.", status: "assumption", confidence: 30, evidenceFor: 2, evidenceAgainst: 1, nextTest: "Define the minimum normalized event model" },
  ],
  experiments: [
    { id: 1, name: "Concierge NBA pilot", hypothesisCode: "H2", channel: "Direct outreach", status: "running", metric: "Paid pilot conversion", target: "3 of 10", result: "1 of 4 so far", startsOn: "2026-07-14" },
    { id: 2, name: "Founder pain interviews", hypothesisCode: "H1", channel: "X + network", status: "running", metric: "Qualified interviews", target: "20", result: "7 complete", startsOn: "2026-07-12" },
    { id: 3, name: "Landing diagnosis offer", hypothesisCode: "H3", channel: "Reddit", status: "planned", metric: "Audit requests", target: "15", result: "—", startsOn: "2026-07-18" },
    { id: 4, name: "Daily action email", hypothesisCode: "H1", channel: "Email", status: "complete", metric: "Action completion", target: "40%", result: "52% (n=21)", startsOn: "2026-07-01" },
  ],
  actions: [
    { id: 1, title: "招募 3 位有流量但无付费的 AI Founder", rationale: "This is the fastest way to test whether diagnosis—not content—is the right wedge.", expectedImpact: "3 discovery calls + 1 paid pilot", effortMinutes: 45, priority: 1, status: "ready", dueDate: "Today" },
    { id: 2, title: "整理 7 次访谈中的原话证据", rationale: "Pain scores need verbatim evidence before H1 confidence can increase.", expectedImpact: "Update 5 pain cards", effortMinutes: 30, priority: 2, status: "ready", dueDate: "Today" },
    { id: 3, title: "定义首个 concierge 报告模板", rationale: "A manual service reveals the repeatable workflow before automation.", expectedImpact: "Reusable delivery in under 60 min", effortMinutes: 60, priority: 3, status: "queued", dueDate: "Tomorrow" },
  ],
};
