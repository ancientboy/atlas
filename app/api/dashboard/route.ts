import { env } from "cloudflare:workers";
import { sampleData } from "../../../lib/sample-data";

export const dynamic = "force-dynamic";

const createStatements = [
  `CREATE TABLE IF NOT EXISTS founders (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, product TEXT NOT NULL, url TEXT, stage TEXT NOT NULL DEFAULT 'pre-revenue', segment TEXT NOT NULL DEFAULT 'AI indie hacker', primary_channel TEXT, monthly_revenue INTEGER NOT NULL DEFAULT 0, top_pain TEXT, source TEXT, notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS pains (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT, category TEXT NOT NULL, frequency INTEGER NOT NULL DEFAULT 3, severity INTEGER NOT NULL DEFAULT 3, willingness_to_pay INTEGER NOT NULL DEFAULT 3, evidence_count INTEGER NOT NULL DEFAULT 1, current_solution TEXT, opportunity_score REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'observed', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS landscape_entities (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL, url TEXT, positioning TEXT, pricing TEXT, strengths TEXT, gaps TEXT, customer TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS hypotheses (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, statement TEXT NOT NULL, rationale TEXT, status TEXT NOT NULL DEFAULT 'untested', confidence INTEGER NOT NULL DEFAULT 30, evidence_for INTEGER NOT NULL DEFAULT 0, evidence_against INTEGER NOT NULL DEFAULT 0, next_test TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS experiments (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, hypothesis_code TEXT, channel TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'planned', owner TEXT NOT NULL DEFAULT 'Founder', metric TEXT NOT NULL, target TEXT NOT NULL, result TEXT, learning TEXT, starts_on TEXT, ends_on TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS daily_actions (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, rationale TEXT NOT NULL, expected_impact TEXT, effort_minutes INTEGER NOT NULL DEFAULT 30, priority INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'ready', due_date TEXT, linked_experiment_id INTEGER, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS research_sources (id INTEGER PRIMARY KEY AUTOINCREMENT, source_type TEXT NOT NULL, title TEXT NOT NULL, url TEXT, author TEXT, published_at TEXT, excerpt TEXT, tags TEXT, related_founder_id INTEGER, related_pain_id INTEGER, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
];

async function ensureDatabase() {
  const db = env.DB;
  await db.batch(createStatements.map((sql) => db.prepare(sql)));
  const row = await db.prepare("SELECT COUNT(*) AS count FROM founders").first<{ count: number }>();
  if ((row?.count ?? 0) > 0) return;

  const statements = [
    ...sampleData.founders.map((x) => db.prepare("INSERT INTO founders (name, product, stage, segment, primary_channel, monthly_revenue, top_pain, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(x.name, x.product, x.stage, x.segment, x.primaryChannel, x.monthlyRevenue, x.topPain, x.source)),
    ...sampleData.pains.map((x) => db.prepare("INSERT INTO pains (title, category, frequency, severity, willingness_to_pay, evidence_count, opportunity_score, status, current_solution) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(x.title, x.category, x.frequency, x.severity, x.willingnessToPay, x.evidenceCount, x.opportunityScore, x.status, x.currentSolution)),
    ...sampleData.landscape.map((x) => db.prepare("INSERT INTO landscape_entities (name, category, positioning, pricing, gaps) VALUES (?, ?, ?, ?, ?)").bind(x.name, x.category, x.positioning, x.pricing, x.gaps)),
    ...sampleData.hypotheses.map((x) => db.prepare("INSERT INTO hypotheses (code, statement, status, confidence, evidence_for, evidence_against, next_test) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(x.code, x.statement, x.status, x.confidence, x.evidenceFor, x.evidenceAgainst, x.nextTest)),
    ...sampleData.experiments.map((x) => db.prepare("INSERT INTO experiments (name, hypothesis_code, channel, status, metric, target, result, starts_on) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(x.name, x.hypothesisCode, x.channel, x.status, x.metric, x.target, x.result, x.startsOn)),
    ...sampleData.actions.map((x) => db.prepare("INSERT INTO daily_actions (title, rationale, expected_impact, effort_minutes, priority, status, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(x.title, x.rationale, x.expectedImpact, x.effortMinutes, x.priority, x.status, x.dueDate)),
  ];
  await db.batch(statements);
}

async function snapshot() {
  const db = env.DB;
  const [founders, pains, landscape, hypotheses, experiments, actions] = await Promise.all([
    db.prepare("SELECT id, name, product, stage, segment, primary_channel AS primaryChannel, monthly_revenue AS monthlyRevenue, top_pain AS topPain, source FROM founders ORDER BY id DESC").all(),
    db.prepare("SELECT id, title, category, frequency, severity, willingness_to_pay AS willingnessToPay, evidence_count AS evidenceCount, opportunity_score AS opportunityScore, status, current_solution AS currentSolution FROM pains ORDER BY opportunity_score DESC").all(),
    db.prepare("SELECT id, name, category, positioning, pricing, gaps FROM landscape_entities ORDER BY category, name").all(),
    db.prepare("SELECT id, code, statement, status, confidence, evidence_for AS evidenceFor, evidence_against AS evidenceAgainst, next_test AS nextTest FROM hypotheses ORDER BY code").all(),
    db.prepare("SELECT id, name, hypothesis_code AS hypothesisCode, channel, status, metric, target, COALESCE(result, '—') AS result, starts_on AS startsOn FROM experiments ORDER BY id").all(),
    db.prepare("SELECT id, title, rationale, expected_impact AS expectedImpact, effort_minutes AS effortMinutes, priority, status, due_date AS dueDate FROM daily_actions ORDER BY priority").all(),
  ]);
  return { founders: founders.results, pains: pains.results, landscape: landscape.results, hypotheses: hypotheses.results, experiments: experiments.results, actions: actions.results };
}

export async function GET() {
  await ensureDatabase();
  return Response.json(await snapshot());
}

export async function POST(request: Request) {
  await ensureDatabase();
  const body = await request.json() as Record<string, string>;
  if (body.type !== "founder" || !body.name || !body.product || !body.topPain) return Response.json({ error: "Invalid founder signal" }, { status: 400 });
  await env.DB.prepare("INSERT INTO founders (name, product, stage, segment, primary_channel, monthly_revenue, top_pain, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(body.name, body.product, body.stage || "Pre-revenue", "AI founder", "Unknown", 0, body.topPain, body.source || "Founder interview").run();
  return Response.json(await snapshot(), { status: 201 });
}
