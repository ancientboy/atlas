type Db = D1Database;

export type CompanyBrainContext = {
  facts: Array<{ factType: string; subject: string; value: unknown; confidence: number; source: string }>;
  knowledge: Array<{ packKey: string; title: string; content: string; confidence: number }>;
  lessons: Array<{ strategyKey: string; lessonType: string; statement: string; confidence: number }>;
  decisions: Array<{ title: string; rationale: string; score: number; confidence: number }>;
};

const parse = <T>(value: string | null | undefined, fallback: T): T => { try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } };
const tokens = (value: string) => value.toLowerCase().split(/[^a-z0-9\u4e00-\u9fff]+/).filter((item) => item.length > 1);

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
  const [facts, entries, lessons, decisions] = await Promise.all([
    db.prepare("SELECT fact_type AS factType, subject, value_json AS valueJson, confidence, source FROM company_facts WHERE workspace_id = ? AND status = 'active' ORDER BY confidence DESC, last_verified_at DESC LIMIT ?").bind(workspaceId, bounded).all<{ factType: string; subject: string; valueJson: string; confidence: number; source: string }>(),
    db.prepare("SELECT p.pack_key AS packKey, e.title, e.content, e.confidence, e.tags_json AS tagsJson FROM knowledge_entries e INNER JOIN knowledge_packs p ON p.id = e.pack_id WHERE e.status = 'active' AND p.status = 'active' AND (p.scope = 'atlas' OR p.workspace_id = ?) ORDER BY e.confidence DESC, e.updated_at DESC LIMIT 30").bind(workspaceId).all<{ packKey: string; title: string; content: string; confidence: number; tagsJson: string }>(),
    db.prepare("SELECT strategy_key AS strategyKey, lesson_type AS lessonType, statement, confidence FROM strategy_lessons WHERE workspace_id = ? AND status = 'active' ORDER BY confidence DESC, updated_at DESC LIMIT ?").bind(workspaceId, bounded).all<{ strategyKey: string; lessonType: string; statement: string; confidence: number }>(),
    db.prepare("SELECT title, rationale, score, confidence FROM decision_journal WHERE workspace_id = ? ORDER BY created_at DESC LIMIT ?").bind(workspaceId, bounded).all<{ title: string; rationale: string; score: number; confidence: number }>(),
  ]);
  const queryTokens = new Set(tokens(query));
  const knowledge = entries.results.map((entry) => ({ ...entry, tags: parse<string[]>(entry.tagsJson, []) })).map((entry) => ({ entry, relevance: [...tokens(`${entry.packKey} ${entry.title} ${entry.content}`), ...entry.tags].reduce((total, token) => total + (queryTokens.has(token) ? 1 : 0), 0) })).sort((a, b) => b.relevance - a.relevance || b.entry.confidence - a.entry.confidence).slice(0, bounded).map(({ entry }) => ({ packKey: entry.packKey, title: entry.title, content: entry.content, confidence: entry.confidence }));
  return { facts: facts.results.map((fact) => ({ factType: fact.factType, subject: fact.subject, value: parse(fact.valueJson, fact.valueJson), confidence: fact.confidence, source: fact.source })), knowledge, lessons: lessons.results, decisions: decisions.results };
}

export function scoreCompanyDecision(input: { opportunity: { confidence: number; title: string; suggestedAction: string }; goal: { title?: string | null } | null; context: CompanyBrainContext }) {
  const text = `${input.opportunity.title} ${input.opportunity.suggestedAction}`;
  const matchingKnowledge = input.context.knowledge.filter((entry) => tokens(`${entry.title} ${entry.content}`).some((token) => tokens(text).includes(token))).length;
  const negativeLessons = input.context.lessons.filter((lesson) => lesson.lessonType === "avoid" || lesson.lessonType === "failed").length;
  const score = Math.max(0, Math.min(100, Math.round(input.opportunity.confidence * 0.6 + Math.min(16, matchingKnowledge * 8) + (input.goal ? 12 : 0) - Math.min(24, negativeLessons * 8))));
  return { score, matchingKnowledge, negativeLessons, rationale: `Selected for the active goal${input.goal?.title ? ` “${input.goal.title}”` : ""}; evidence confidence is ${input.opportunity.confidence}%, with ${matchingKnowledge} relevant operating knowledge item(s) and ${negativeLessons} suppressing lesson(s).` };
}
