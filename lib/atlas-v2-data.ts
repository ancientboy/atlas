import type { CampaignChannel } from "./campaign-channels";
import type { GrowthOperatorBrief, GrowthOperatorPlan } from "./growth-operator";
export type RiskLevel = 1 | 2 | 3;
export type TaskStatus = "queued" | "running" | "waiting_approval" | "approved" | "rejected" | "deferred" | "completed" | "failed";
export type Agent = { id: number; name: string; role: string; description: string; status: string; autonomyLevel: number; schedule: string; successRate: number; currentTask: string; tools: string[] };
export type Task = { id: number; agentId: number; title: string; description: string; taskType: string; priority: number; riskLevel: RiskLevel; status: TaskStatus; requiresApproval: boolean; expectedOutcome: string; estimatedMinutes: number; evidence: string[]; createdAt: string };
export type Approval = { id: number; taskId: number; actionType: string; title: string; reason: string; payload: string; riskLevel: RiskLevel; status: "pending" | "approved" | "rejected" | "deferred"; createdAt: string };
export type AgentRun = { id: number; agentId: number; taskId: number; task: string; status: string; input: string; output: string; tools: string[]; startedAt: string; finishedAt: string | null; result: string };
export type Opportunity = { id: number; title: string; source: string; observedAt: string; confidence: number; summary: string; suggestedAction: string; status: "new" | "saved" | "ignored"; signal: string };
export type Memory = { id: number; type: string; title: string; content: string; source: string; confidence: number; status: "active" | "unverified" | "validated" | "rejected" | "outdated"; verifiedAt: string };
export type Connection = { id: number; name: string; description: string; status: "connected" | "mock" | "available"; lastSync: string; category: string };
export type Product = { id: number; name: string; url: string; description?: string | null; growthGoal?: string | null; analysisStatus: "pending" | "running" | "completed" | "failed"; analysisError?: string | null; analysis?: ProductAnalysis | null };
export type Campaign = { id: number; opportunityId: number | null; name: string; objective: string; audience: string; coreMessage: string; offer: string; cta: string; status: string; createdAt: string; updatedAt: string };
export type CampaignAsset = { id: number; campaignId: number; approvalId: number | null; channel: CampaignChannel; title: string; content: string; cta: string; status: string; publishedUrl: string | null; publishedAt: string | null; impressions: number; clicks: number; conversions: number; createdAt: string };
export type GrowthReflection = { date: string; summary: string; goal?: string; signals: { visits?: number; signups?: number; paid?: number; impressions: number; clicks: number; conversions: number; attributedVisits: number; visitDelta?: number; signupDelta?: number; ctr?: number }; learnings?: string[]; nextAction: string; decision?: GrowthOperatorPlan; localized?: { en: GrowthOperatorBrief; zh: GrowthOperatorBrief } };
export type DailyGrowthSnapshot = { snapshotDate: string; visits: number; signups: number; paid: number; attributedVisits: number; attributedSignups: number; attributedPaid: number; reflection: GrowthReflection | null; createdAt: string };

export const atlasV2Seed = {
  agents: [
    { id: 1, name: "Growth Operator", role: "增长执行员", description: "观察市场、生成计划、准备低风险增长工作，并将外部操作送入审批队列。", status: "running", autonomyLevel: 2, schedule: "每日 08:00 计划 · 每 4 小时扫描", successRate: 82, currentTask: "准备 Landing Page 首屏改版", tools: ["网站分析", "竞品搜索", "内容生成", "任务创建"] },
    { id: 2, name: "Reflection Agent", role: "复盘助手", description: "汇总执行结果、验证假设并将结论写入公司记忆。", status: "scheduled", autonomyLevel: 1, schedule: "每日 22:00", successRate: 96, currentTask: "等待今日执行结果", tools: ["指标汇总", "假设更新", "Memory 写入"] },
  ] satisfies Agent[],
  tasks: [
    { id: 101, agentId: 1, title: "重写 Landing Page 首屏标题", description: "当前首屏描述了功能，但没有清楚说明目标用户与可验证结果。Atlas 已准备了三版修改稿。", taskType: "landing_page_optimization", priority: 1, riskLevel: 2, status: "waiting_approval", requiresApproval: true, expectedOutcome: "提高访问到注册转化率", estimatedMinutes: 15, evidence: ["首屏没有明确 ICP", "3 个竞品均先描述结果", "跳出率 62%"], createdAt: "今天 08:12" },
    { id: 102, agentId: 1, title: "发布 X 内容草稿：从 0 到首批付费用户", description: "Atlas 根据近期访谈与高互动话题生成了一条内容草稿。", taskType: "social_post", priority: 2, riskLevel: 2, status: "waiting_approval", requiresApproval: true, expectedOutcome: "获得 80+ 目标受众曝光", estimatedMinutes: 5, evidence: ["类似话题 7 天增长 34%", "3 位受访 Founder 反复提及"], createdAt: "今天 08:19" },
    { id: 103, agentId: 1, title: "整理 6 个新竞品的定价与卖点", description: "自动抓取公开页面并更新竞品记忆。", taskType: "competitive_research", priority: 3, riskLevel: 1, status: "completed", requiresApproval: false, expectedOutcome: "更新竞争格局与 ICP 证据", estimatedMinutes: 18, evidence: ["Product Hunt 新发布", "竞品 changelog"], createdAt: "今天 07:04" },
    { id: 104, agentId: 1, title: "生成 3 条 Reddit 回复建议", description: "针对正在讨论 AI 产品增长的相关帖子，生成有价值、不推销的回复草稿。", taskType: "community_reply", priority: 3, riskLevel: 2, status: "queued", requiresApproval: true, expectedOutcome: "获得 3 次高相关对话", estimatedMinutes: 20, evidence: ["Reddit 出现求助讨论", "话题与 ICP 高匹配"], createdAt: "今天 09:00" },
  ] satisfies Task[],
  approvals: [
    { id: 201, taskId: 101, actionType: "公开网站文案修改", title: "批准 Landing Page 首屏改版", reason: "当前价值主张不清晰；改稿已引用 3 个竞品和 6 条访谈证据。", payload: "标题：让 AI 产品每天知道下一步该做什么\n副标题：Atlas 自动观察、规划并准备增长工作，只在需要时请求你的批准。", riskLevel: 2, status: "pending", createdAt: "08:14" },
    { id: 202, taskId: 102, actionType: "X 内容发布", title: "批准发布 X 内容", reason: "内容主题来自最近增长 34% 的讨论，目标受众为 AI 独立开发者。", payload: "你的 AI 产品没有增长问题，通常是因为每天不知道最值得做的下一步。\n\nAtlas 会先观察、分析、准备执行，然后只在需要时请求批准。", riskLevel: 2, status: "pending", createdAt: "08:20" },
  ] satisfies Approval[],
  runs: [
    { id: 301, agentId: 1, taskId: 103, task: "竞品扫描：6 个新产品", status: "completed", input: "Product Hunt、竞品网站与 changelog", output: "新增 6 条竞品记录，发现 2 个定位变化。", tools: ["SearchCompetitorsTool", "SaveMemoryTool"], startedAt: "07:04", finishedAt: "07:22", result: "成功 · Memory 已更新" },
    { id: 302, agentId: 1, taskId: 101, task: "Landing Page 诊断", status: "waiting_approval", input: "产品首页、定价页、FAQ、3 个竞品", output: "生成 3 套首屏文案与前后对比。", tools: ["FetchWebsiteTool", "AnalyzeLandingPageTool", "RequestApprovalTool"], startedAt: "08:02", finishedAt: "08:14", result: "等待批准" },
    { id: 303, agentId: 1, taskId: 102, task: "内容机会转为 X 草稿", status: "waiting_approval", input: "X 主题趋势、Founder 访谈、产品定位", output: "生成 1 条发布草稿。", tools: ["GenerateContentTool", "RequestApprovalTool"], startedAt: "08:16", finishedAt: "08:20", result: "等待批准" },
    { id: 304, agentId: 2, taskId: 0, task: "昨日复盘", status: "completed", input: "昨日任务、内容表现、注册数据", output: "验证 H1；建议继续测试 Landing Page 诊断。", tools: ["RecordMetricTool", "SaveMemoryTool"], startedAt: "昨天 22:00", finishedAt: "昨天 22:08", result: "成功 · 2 条 Memory 已更新" },
  ] satisfies AgentRun[],
  opportunities: [
    { id: 401, title: "Reddit 出现“如何获得首批 SaaS 用户？”讨论", source: "r/SideProject", observedAt: "12 分钟前", confidence: 88, summary: "发帖者正在寻找 AI SaaS 的首批分发策略，与你的 ICP 高度匹配。", suggestedAction: "准备一条有价值的回复草稿", status: "new", signal: "社区求助" },
    { id: 402, title: "“AI founder growth”关键词搜索热度上升", source: "关键词趋势", observedAt: "1 小时前", confidence: 76, summary: "过去 7 天搜索兴趣上升 34%，现有内容竞争较弱。", suggestedAction: "生成比较页与博客大纲", status: "new", signal: "关键词机会" },
    { id: 403, title: "竞品 GrowthFlow 新增内容日历", source: "竞品 changelog", observedAt: "3 小时前", confidence: 91, summary: "竞品从分析扩展到执行层，验证市场正在向 Growth Operator 演进。", suggestedAction: "更新竞品记忆并审查差异化", status: "saved", signal: "竞品变化" },
  ] satisfies Opportunity[],
  memories: [
    { id: 501, type: "ICP", title: "当前最可能的 ICP：AI 独立开发者", content: "已发布产品、具备基础流量，但尚未建立重复获客流程的 AI Builder。", source: "产品网站 + 7 场访谈 + 竞品分析", confidence: 82, status: "validated", verifiedAt: "今天 08:12" },
    { id: 502, type: "增长瓶颈", title: "主要瓶颈位于价值主张与持续分发", content: "用户能理解“AI”，但还不能快速理解 Atlas 带来的可验证增长结果。", source: "Landing Page 分析 + 跳出率", confidence: 76, status: "active", verifiedAt: "今天 08:14" },
    { id: 503, type: "假设", title: "H1：Founder 需要每日高杠杆行动", content: "18 条证据支持该假设；仍需验证用户是否愿意为此持续付费。", source: "访谈 + 内容表现", confidence: 68, status: "unverified", verifiedAt: "昨天 22:08" },
    { id: 504, type: "决策", title: "第一阶段只服务 Growth Operator", content: "暂不扩展到 Finance、Sales、Support 等 Agent，先跑通 Observe → Reflect 闭环。", source: "产品战略", confidence: 100, status: "validated", verifiedAt: "今天 07:30" },
  ] satisfies Memory[],
  connections: [
    { id: 601, name: "产品网站", description: "抓取 Landing Page、Pricing、FAQ 与 Changelog", status: "connected", lastSync: "今天 08:02", category: "产品" },
    { id: 602, name: "Google Analytics", description: "访问、注册、转化与流量来源", status: "mock", lastSync: "模拟数据", category: "数据" },
    { id: 603, name: "Product Hunt", description: "新品、竞品与发布机会", status: "mock", lastSync: "今天 07:04", category: "市场" },
    { id: 604, name: "X", description: "内容草稿与发布审批", status: "available", lastSync: "待连接", category: "分发" },
    { id: 605, name: "Reddit", description: "社区讨论与回复机会", status: "mock", lastSync: "12 分钟前", category: "分发" },
    { id: 606, name: "OpenClaw / MCP", description: "后续外部工具执行层", status: "available", lastSync: "待连接", category: "执行" },
  ] satisfies Connection[],
};

export type WorkspaceSummary = { id: string; name: string; productName: string | null; productUrl: string | null; analysisStatus: string | null };
export type PlatformConnection = { provider: string; externalAccountId: string; accountLabel: string; status: string; expiresAt: string | null; lastSyncAt: string | null; metadata: Record<string, unknown> };
export type RuntimeSchedule = { id: number; timezone: string; localTime: string; enabled: number; lastRunDate: string | null; lastRunAt: string | null; lastStatus: string | null; lastError: string | null };
export type RuntimeJob = { id: number; jobType: string; status: string; attemptCount: number; maxAttempts: number; scheduledFor: string; nextAttemptAt: string | null; lastError: string | null; startedAt: string | null; finishedAt: string | null };
export type ObservationSourceState = { id: number; sourceKey: string; sourceType: string; name: string; targetUrl: string; status: string; cadenceMinutes: number; lastCheckedAt: string | null; lastChangedAt: string | null; lastStatus: string | null; lastError: string | null; consecutiveFailures: number; nextRunAt: string | null };
export type Insight = { id: number; insightType: string; title: string; summary: string; confidence: number; evidence: string[]; status: string; createdAt: string };
export type AtlasV2Data = typeof atlasV2Seed & { product?: Product | null; workspace?: { id: string; autonomyEnabled?: boolean; autonomyUpdatedAt?: string | null }; workspaces?: WorkspaceSummary[]; campaigns?: Campaign[]; campaignAssets?: CampaignAsset[]; growthSnapshots?: DailyGrowthSnapshot[]; platformConnections?: PlatformConnection[]; runtime?: { schedule: RuntimeSchedule | null; jobs: RuntimeJob[] }; observationEngine?: { sources: ObservationSourceState[]; insights: Insight[] }; oauthApps?: { x: boolean; linkedin: boolean; reddit: boolean }; publishing?: { wordpress: boolean; x: boolean; linkedin: boolean; reddit: boolean; analytics: boolean }; metrics: { visits: number; signups: number; paid: number; conversion: number; yesterdayCompleted: number } };
import type { ProductAnalysis } from "./atlas-runtime";
