type Db = D1Database;

export type CompanyBrainContext = {
  facts: Array<{ factType: string; subject: string; value: unknown; confidence: number; source: string }>;
  knowledge: Array<{ packKey: string; title: string; content: string; confidence: number }>;
  lessons: Array<{ strategyKey: string; lessonType: string; statement: string; confidence: number }>;
  decisions: Array<{ title: string; rationale: string; score: number; confidence: number }>;
  experiments: Array<{ strategyKey: string; channel: string | null; status: string; outcome: string | null; confidence: number | null }>;
};

const parse = <T>(value: string | null | undefined, fallback: T): T => { try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } };
const tokens = (value: string) => value.toLowerCase().split(/[^a-z0-9\u4e00-\u9fff]+/).filter((item) => item.length > 1);
const tokenOverlap = (left: string, right: string) => {
  const leftTokens = new Set(tokens(left));
  return [...new Set(tokens(right))].filter((token) => leftTokens.has(token)).length;
};

export type DecisionScoreBreakdown = {
  evidence: number;
  goalAlignment: number;
  knowledgeFit: number;
  historicalPerformance: number;
  costEfficiency: number;
  riskFit: number;
  channelCapacity: number;
};

export type CompanyDecisionScore = {
  score: number;
  strategyKey: string;
  channel: string;
  riskLevel: 1 | 2 | 3;
  estimatedCost: "low" | "medium" | "high";
  matchingKnowledge: number;
  supportingLessons: number;
  suppressingLessons: number;
  breakdown: DecisionScoreBreakdown;
  rationale: string;
};

const strategyProfiles = [
  { key: "seo-content", channel: "seo", pattern: /\bseo\b|search|keyword|query|搜索|关键词|gsc/i },
  { key: "community", channel: "community", pattern: /reddit|community|forum|reply|社区|论坛|回复/i },
  { key: "social-content", channel: "social", pattern: /\bx\b|twitter|linkedin|social|post|社媒|推文|领英/i },
  { key: "website-conversion", channel: "website", pattern: /landing|website|homepage|pricing|conversion|cta|落地页|官网|转化|定价/i },
  { key: "product-research", channel: "research", pattern: /research|analy[sz]e|audit|competitor|调查|分析|审计|竞品/i },
] as const;

export function deriveDecisionProfile(opportunity: { title: string; suggestedAction: string; signal?: string | null }) {
  const text = `${opportunity.title} ${opportunity.suggestedAction} ${opportunity.signal ?? ""}`;
  const profile = strategyProfiles.find((item) => item.pattern.test(text)) ?? { key: "growth-experiment", channel: "growth" };
  const paid = /\bpaid\b|\bad(s|vertising)?\b|sponsor|付费广告|投放/i.test(text);
  const external = paid || /publish|send|message|reply|launch|post|发布|发送|私信|回复|上线/i.test(text);
  return {
    strategyKey: profile.key,
    channel: profile.channel,
    riskLevel: (paid ? 3 : external ? 2 : 1) as 1 | 2 | 3,
    estimatedCost: paid ? "high" as const : external ? "medium" as const : "low" as const,
  };
}

export const defaultKnowledgePacks = [
  { key: "ai-saas-growth", name: "AI SaaS Growth", description: "Evidence-led acquisition and conversion practices for early AI SaaS products.", industry: "ai_saas", stage: "early", channel: "growth", entries: [
    ["framework", "Start with a measurable bottleneck", "Choose one primary metric, then run a small, attributable acquisition or conversion experiment before scaling a channel."],
    ["sop", "Search demand to content experiment", "For queries with material impressions and positions 8–20, create one intent-matched page, use a clear CTA, and evaluate clicks and signups in a defined window."],
  ] },
  { key: "seo-content", name: "SEO Content Operations", description: "A conservative workflow for turning search signals into measurable content experiments.", industry: null, stage: "early", channel: "seo", entries: [
    ["guardrail", "Do not scale an unproven topic", "Treat an SEO page as an experiment. Keep the hypothesis, target metric, publication date, and evaluation window together."],
    ["framework", "Match intent before volume", "Prioritize a specific audience problem and conversion path over a broad keyword with no product fit."],
  ] },
] as const;

export async function ensureCompanyBrain(db: Db, workspaceId: string, now = new Date()) {
  const timestamp = now.toISOString();
  for (const pack of defaultKnowledgePacks) {
    const inserted = await db.prepare("INSERT OR IGNORE INTO knowledge_packs (scope, workspace_id, pack_key, name, description, industry, stage, channel, status, version, created_at, updated_at) VALUES ('atlas', NULL, ?, ?, ?, ?, ?, ?, 'active', 1, ?, ?) RETURNING id").bind(pack.key, pack.name, pack.description, pack.industry, pack.stage, pack.channel, timestamp, timestamp).first<{ id: number }>();
    const packId = inserted?.id ?? (await db.prepare("SELECT id FROM knowledge_packs WHERE scope = 'atlas' AND workspace_id IS NULL AND pack_key = ? LIMIT 1").bind(pack.key).first<{ id: number }>())?.id;
    if (!packId) continue;
    for (const [entryType, title, content] of pack.entries) await db.prepare("INSERT INTO knowledge_entries (pack_id, entry_type, title, content, tags_json, source, confidence, status) SELECT ?, ?, ?, ?, '[]', 'Atlas curated operating knowledge', 80, 'active' WHERE NOT EXISTS (SELECT 1 FROM knowledge_entries WHERE pack_id = ? AND title = ?)").bind(packId, entryType, title, content, packId, title).run();
  }
  const product = await db.prepare("SELECT name, url, description, growth_goal AS growthGoal FROM products WHERE workspace_id = ? ORDER BY id DESC LIMIT 1").bind(workspaceId).first<{ name: string; url: string; description: string | null; growthGoal: string | null }>();
  if (!product) return;
  const facts = [
    ["product", "name", product.name], ["product", "url", product.url], ["product", "description", product.description], ["goal", "growth", product.growthGoal],
  ].filter((item): item is [string, string, string] => Boolean(item[2]));
  for (const [factType, subject, value] of facts) await db.prepare("INSERT INTO company_facts (workspace_id, fact_type, subject, value_json, source, evidence_json, confidence, status, last_verified_at, updated_at) VALUES (?, ?, ?, ?, 'Product onboarding', '[]', 90, 'active', ?, ?) ON CONFLICT(workspace_id, fact_type, subject) DO UPDATE SET value_json = excluded.value_json, source = excluded.source, confidence = excluded.confidence, status = 'active', last_verified_at = excluded.last_verified_at, updated_at = excluded.updated_at").bind(workspaceId, factType, subject, JSON.stringify(value), timestamp, timestamp).run();
}

export async function assembleCompanyContext(db: Db, workspaceId: string, query: string, limit = 8): Promise<CompanyBrainContext> {
  const bounded = Math.max(1, Math.min(limit, 12));
  const [facts, entries, lessons, decisions, experiments] = await Promise.all([
    db.prepare("SELECT fact_type AS factType, subject, value_json AS valueJson, confidence, source FROM company_facts WHERE workspace_id = ? AND status = 'active' ORDER BY confidence DESC, last_verified_at DESC LIMIT ?").bind(workspaceId, bounded).all<{ factType: string; subject: string; valueJson: string; confidence: number; source: string }>(),
    db.prepare("SELECT p.pack_key AS packKey, e.title, e.content, e.confidence, e.tags_json AS tagsJson FROM knowledge_entries e INNER JOIN knowledge_packs p ON p.id = e.pack_id WHERE e.status = 'active' AND p.status = 'active' AND (p.scope = 'atlas' OR p.workspace_id = ?) ORDER BY e.confidence DESC, e.updated_at DESC LIMIT 30").bind(workspaceId).all<{ packKey: string; title: string; content: string; confidence: number; tagsJson: string }>(),
    db.prepare("SELECT strategy_key AS strategyKey, lesson_type AS lessonType, statement, confidence FROM strategy_lessons WHERE workspace_id = ? AND status = 'active' ORDER BY confidence DESC, updated_at DESC LIMIT ?").bind(workspaceId, bounded).all<{ strategyKey: string; lessonType: string; statement: string; confidence: number }>(),
    db.prepare("SELECT title, rationale, score, confidence FROM decision_journal WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?").bind(workspaceId, bounded).all<{ title: string; rationale: string; score: number; confidence: number }>(),
    db.prepare("SELECT e.strategy_key AS strategyKey, e.channel, e.status, r.outcome, r.confidence FROM growth_experiments e LEFT JOIN experiment_results r ON r.id = (SELECT latest.id FROM experiment_results latest WHERE latest.workspace_id = e.workspace_id AND latest.experiment_id = e.id ORDER BY latest.measured_at DESC, latest.id DESC LIMIT 1) WHERE e.workspace_id = ? ORDER BY e.updated_at DESC LIMIT 24").bind(workspaceId).all<{ strategyKey: string; channel: string | null; status: string; outcome: string | null; confidence: number | null }>(),
  ]);
  const queryTokens = new Set(tokens(query));
  const knowledge = entries.results.map((entry) => ({ ...entry, tags: parse<string[]>(entry.tagsJson, []) })).map((entry) => ({ entry, relevance: [...tokens(`${entry.packKey} ${entry.title} ${entry.content}`), ...entry.tags].reduce((total, token) => total + (queryTokens.has(token) ? 1 : 0), 0) })).sort((a, b) => b.relevance - a.relevance || b.entry.confidence - a.entry.confidence).slice(0, bounded).map(({ entry }) => ({ packKey: entry.packKey, title: entry.title, content: entry.content, confidence: entry.confidence }));
  return { facts: facts.results.map((fact) => ({ factType: fact.factType, subject: fact.subject, value: parse(fact.valueJson, fact.valueJson), confidence: fact.confidence, source: fact.source })), knowledge, lessons: lessons.results, decisions: decisions.results, experiments: experiments.results };
}

export function scoreCompanyDecision(input: {
  opportunity: { confidence: number; title: string; summary?: string | null; suggestedAction: string; signal?: string | null; source?: string | null };
  goal: { title?: string | null; targetMetric?: string | null } | null;
  context: CompanyBrainContext;
}): CompanyDecisionScore {
  const text = `${input.opportunity.title} ${input.opportunity.summary ?? ""} ${input.opportunity.suggestedAction} ${input.opportunity.signal ?? ""}`;
  const profile = deriveDecisionProfile(input.opportunity);
  const matchingKnowledge = input.context.knowledge.filter((entry) => entry.packKey === profile.strategyKey || tokenOverlap(text, `${entry.packKey} ${entry.title} ${entry.content}`) > 0).length;
  const relevantLessons = input.context.lessons.filter((lesson) => lesson.strategyKey === profile.strategyKey || tokenOverlap(text, `${lesson.strategyKey} ${lesson.statement}`) > 0);
  const suppressingLessons = relevantLessons.filter((lesson) => lesson.lessonType === "avoid" || lesson.lessonType === "failed").length;
  const supportingLessons = relevantLessons.filter((lesson) => lesson.lessonType === "successful" || lesson.lessonType === "repeat").length;
  const history = input.context.experiments.filter((experiment) => experiment.strategyKey === profile.strategyKey || experiment.channel === profile.channel);
  const successes = history.filter((experiment) => experiment.outcome === "success" || experiment.outcome === "positive").length;
  const failures = history.filter((experiment) => experiment.outcome === "failed" || experiment.outcome === "negative").length;
  const activeInChannel = history.filter((experiment) => ["planned", "running", "measuring"].includes(experiment.status)).length;
  const goalText = `${input.goal?.title ?? ""} ${input.goal?.targetMetric ?? ""}`;
  const goalSignals = /signup|user|lead|revenue|traffic|visit|conversion|注册|用户|线索|收入|流量|访问|转化/i.test(`${goalText} ${text}`) ? 4 : 0;
  const breakdown: DecisionScoreBreakdown = {
    evidence: Math.round(Math.max(0, Math.min(100, input.opportunity.confidence)) * 0.3),
    goalAlignment: input.goal ? Math.min(20, 8 + tokenOverlap(goalText, text) * 4 + goalSignals) : 0,
    knowledgeFit: Math.min(15, matchingKnowledge * 5),
    historicalPerformance: Math.max(-15, Math.min(15, successes * 6 + supportingLessons * 4 - failures * 8 - suppressingLessons * 6)),
    costEfficiency: profile.estimatedCost === "low" ? 10 : profile.estimatedCost === "medium" ? 6 : 2,
    riskFit: profile.riskLevel === 1 ? 10 : profile.riskLevel === 2 ? 6 : 2,
    channelCapacity: activeInChannel === 0 ? 5 : Math.max(-10, 5 - activeInChannel * 5),
  };
  const score = Math.max(0, Math.min(100, Object.values(breakdown).reduce((total, value) => total + value, 0)));
  const rationale = `Prioritized for ${input.goal?.title ? `the active goal “${input.goal.title}”` : "the current growth objective"} with a ${score}/100 decision score. Evidence contributed ${breakdown.evidence} points, goal alignment ${breakdown.goalAlignment}, operating knowledge ${breakdown.knowledgeFit}, and prior results ${breakdown.historicalPerformance >= 0 ? "+" : ""}${breakdown.historicalPerformance}. The ${profile.channel} path is estimated ${profile.estimatedCost} cost at risk level ${profile.riskLevel}; ${activeInChannel ? `${activeInChannel} similar active experiment(s) reduced channel capacity` : "no overlapping active experiment was found"}.`;
  return { score, ...profile, matchingKnowledge, supportingLessons, suppressingLessons, breakdown, rationale };
}

export function explainAlternative(selected: CompanyDecisionScore, alternative: CompanyDecisionScore) {
  const labels: Record<keyof DecisionScoreBreakdown, string> = {
    evidence: "evidence quality", goalAlignment: "goal alignment", knowledgeFit: "operating knowledge fit",
    historicalPerformance: "historical performance", costEfficiency: "cost efficiency", riskFit: "risk fit", channelCapacity: "channel capacity",
  };
  const factor = (Object.keys(selected.breakdown) as Array<keyof DecisionScoreBreakdown>)
    .map((key) => ({ key, gap: selected.breakdown[key] - alternative.breakdown[key] }))
    .sort((a, b) => b.gap - a.gap)[0];
  return factor && factor.gap > 0
    ? `Deferred because the selected option scored ${factor.gap} point(s) higher on ${labels[factor.key]}.`
    : "Deferred because its total expected contribution did not exceed the selected option.";
}
