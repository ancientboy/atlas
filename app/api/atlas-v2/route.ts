import { env } from "cloudflare:workers";
import { atlasV2Seed } from "../../../lib/atlas-v2-data";

export const dynamic = "force-dynamic";

const tables = [
  `CREATE TABLE IF NOT EXISTS agents (id INTEGER PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL, autonomy_level INTEGER NOT NULL, schedule TEXT NOT NULL, success_rate INTEGER NOT NULL, current_task TEXT NOT NULL, tools TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS agent_tasks (id INTEGER PRIMARY KEY, agent_id INTEGER NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, task_type TEXT NOT NULL, priority INTEGER NOT NULL, risk_level INTEGER NOT NULL, status TEXT NOT NULL, requires_approval INTEGER NOT NULL DEFAULT 0, expected_outcome TEXT NOT NULL, estimated_minutes INTEGER NOT NULL, evidence TEXT NOT NULL, created_at TEXT NOT NULL, started_at TEXT, completed_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS agent_runs (id INTEGER PRIMARY KEY, agent_id INTEGER NOT NULL, task_id INTEGER, task TEXT NOT NULL, status TEXT NOT NULL, input TEXT NOT NULL, output TEXT NOT NULL, tools TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT, result TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS approvals (id INTEGER PRIMARY KEY, task_id INTEGER NOT NULL, action_type TEXT NOT NULL, title TEXT NOT NULL, reason TEXT NOT NULL, payload TEXT NOT NULL, risk_level INTEGER NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, approved_by TEXT, approved_at TEXT, expires_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS memories (id INTEGER PRIMARY KEY, memory_type TEXT NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL, source TEXT NOT NULL, confidence INTEGER NOT NULL, status TEXT NOT NULL, last_verified_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS observations (id INTEGER PRIMARY KEY AUTOINCREMENT, source_type TEXT NOT NULL, source_name TEXT NOT NULL, content TEXT NOT NULL, raw_data TEXT, observed_at TEXT NOT NULL, processed INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS opportunities (id INTEGER PRIMARY KEY, title TEXT NOT NULL, source TEXT NOT NULL, observed_at TEXT NOT NULL, confidence INTEGER NOT NULL, summary TEXT NOT NULL, suggested_action TEXT NOT NULL, status TEXT NOT NULL, signal TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS connections (id INTEGER PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL, last_sync TEXT NOT NULL, category TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS metrics (id INTEGER PRIMARY KEY AUTOINCREMENT, metric_date TEXT NOT NULL, visits INTEGER NOT NULL, signups INTEGER NOT NULL, paid INTEGER NOT NULL, conversion REAL NOT NULL, completed_tasks INTEGER NOT NULL)`,
];

async function ensureSeed() {
  const db = env.DB;
  await db.batch(tables.map((statement) => db.prepare(statement)));
  const count = await db.prepare("SELECT COUNT(*) AS count FROM agents").first<{ count: number }>();
  if ((count?.count ?? 0) > 0) return;

  const statements = [
    ...atlasV2Seed.agents.map((item) => db.prepare("INSERT INTO agents (id, name, role, description, status, autonomy_level, schedule, success_rate, current_task, tools) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(item.id, item.name, item.role, item.description, item.status, item.autonomyLevel, item.schedule, item.successRate, item.currentTask, JSON.stringify(item.tools))),
    ...atlasV2Seed.tasks.map((item) => db.prepare("INSERT INTO agent_tasks (id, agent_id, title, description, task_type, priority, risk_level, status, requires_approval, expected_outcome, estimated_minutes, evidence, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(item.id, item.agentId, item.title, item.description, item.taskType, item.priority, item.riskLevel, item.status, Number(item.requiresApproval), item.expectedOutcome, item.estimatedMinutes, JSON.stringify(item.evidence), item.createdAt)),
    ...atlasV2Seed.approvals.map((item) => db.prepare("INSERT INTO approvals (id, task_id, action_type, title, reason, payload, risk_level, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(item.id, item.taskId, item.actionType, item.title, item.reason, item.payload, item.riskLevel, item.status, item.createdAt)),
    ...atlasV2Seed.runs.map((item) => db.prepare("INSERT INTO agent_runs (id, agent_id, task_id, task, status, input, output, tools, started_at, finished_at, result) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(item.id, item.agentId, item.taskId, item.task, item.status, item.input, item.output, JSON.stringify(item.tools), item.startedAt, item.finishedAt, item.result)),
    ...atlasV2Seed.opportunities.map((item) => db.prepare("INSERT INTO opportunities (id, title, source, observed_at, confidence, summary, suggested_action, status, signal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(item.id, item.title, item.source, item.observedAt, item.confidence, item.summary, item.suggestedAction, item.status, item.signal)),
    ...atlasV2Seed.memories.map((item) => db.prepare("INSERT INTO memories (id, memory_type, title, content, source, confidence, status, last_verified_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(item.id, item.type, item.title, item.content, item.source, item.confidence, item.status, item.verifiedAt)),
    ...atlasV2Seed.connections.map((item) => db.prepare("INSERT INTO connections (id, name, description, status, last_sync, category) VALUES (?, ?, ?, ?, ?, ?)").bind(item.id, item.name, item.description, item.status, item.lastSync, item.category)),
    db.prepare("INSERT INTO metrics (metric_date, visits, signups, paid, conversion, completed_tasks) VALUES (?, ?, ?, ?, ?, ?)").bind("2026-07-14", 1240, 68, 5, 5.5, 6),
  ];
  await db.batch(statements);
}

const parse = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== "string") return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

async function snapshot() {
  const db = env.DB;
  const [agents, tasks, approvals, runs, opportunities, memories, connections, metrics] = await Promise.all([
    db.prepare("SELECT id, name, role, description, status, autonomy_level AS autonomyLevel, schedule, success_rate AS successRate, current_task AS currentTask, tools FROM agents ORDER BY id").all(),
    db.prepare("SELECT id, agent_id AS agentId, title, description, task_type AS taskType, priority, risk_level AS riskLevel, status, requires_approval AS requiresApproval, expected_outcome AS expectedOutcome, estimated_minutes AS estimatedMinutes, evidence, created_at AS createdAt FROM agent_tasks ORDER BY priority").all(),
    db.prepare("SELECT id, task_id AS taskId, action_type AS actionType, title, reason, payload, risk_level AS riskLevel, status, created_at AS createdAt FROM approvals ORDER BY id").all(),
    db.prepare("SELECT id, agent_id AS agentId, task_id AS taskId, task, status, input, output, tools, started_at AS startedAt, finished_at AS finishedAt, result FROM agent_runs ORDER BY id DESC").all(),
    db.prepare("SELECT id, title, source, observed_at AS observedAt, confidence, summary, suggested_action AS suggestedAction, status, signal FROM opportunities ORDER BY id DESC").all(),
    db.prepare("SELECT id, memory_type AS type, title, content, source, confidence, status, last_verified_at AS verifiedAt FROM memories ORDER BY id DESC").all(),
    db.prepare("SELECT id, name, description, status, last_sync AS lastSync, category FROM connections ORDER BY id").all(),
    db.prepare("SELECT visits, signups, paid, conversion, completed_tasks AS completedTasks FROM metrics ORDER BY id DESC LIMIT 1").first(),
  ]);

  return {
    agents: agents.results.map((item) => ({ ...item, tools: parse(item.tools, []) })),
    tasks: tasks.results.map((item) => ({ ...item, requiresApproval: Boolean(item.requiresApproval), evidence: parse(item.evidence, []) })),
    approvals: approvals.results,
    runs: runs.results.map((item) => ({ ...item, tools: parse(item.tools, []) })),
    opportunities: opportunities.results,
    memories: memories.results,
    connections: connections.results,
    metrics: { ...(metrics ?? { visits: 0, signups: 0, paid: 0, conversion: 0, completedTasks: 0 }), yesterdayCompleted: 6 },
  };
}

export async function GET() {
  await ensureSeed();
  return Response.json(await snapshot());
}

export async function POST(request: Request) {
  await ensureSeed();
  const body = await request.json() as { action?: string; id?: number };
  if (!body.id || !["approve", "reject", "defer", "save_opportunity", "ignore_opportunity"].includes(body.action ?? "")) return Response.json({ error: "Invalid action" }, { status: 400 });
  const db = env.DB;
  if (body.action === "approve" || body.action === "reject" || body.action === "defer") {
    const status = body.action === "approve" ? "approved" : body.action === "reject" ? "rejected" : "deferred";
    const approval = await db.prepare("SELECT task_id AS taskId FROM approvals WHERE id = ?").first<{ taskId: number }>(body.id);
    await db.batch([
      db.prepare("UPDATE approvals SET status = ?, approved_by = ?, approved_at = ? WHERE id = ?").bind(status, "Founder", "刚刚", body.id),
      ...(approval ? [db.prepare("UPDATE agent_tasks SET status = ? WHERE id = ?").bind(status === "approved" ? "approved" : status, approval.taskId)] : []),
    ]);
  } else {
    await db.prepare("UPDATE opportunities SET status = ? WHERE id = ?").bind(body.action === "save_opportunity" ? "saved" : "ignored", body.id).run();
  }
  return Response.json(await snapshot());
}
