import { ensureWorkspaceAgent } from "./atlas-workspace-runtime";
import { buildGrowthOperatorPlan, type GrowthOperatorObservation, type GrowthOperatorOpportunity } from "./growth-operator";

export type DailyGrowthResult = {
  date: string;
  skipped: boolean;
  summary?: string;
  nextAction?: string;
  runId?: number;
  decisionId?: number;
};

function previousDate(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export async function runDailyGrowthReflection(
  db: D1Database,
  workspaceId: string,
  options: { force?: boolean; date?: string } = {},
): Promise<DailyGrowthResult> {
  const date = options.date ?? new Date().toISOString().slice(0, 10);
  const existing = await db
    .prepare("SELECT id FROM daily_growth_snapshots WHERE workspace_id = ? AND snapshot_date = ?")
    .bind(workspaceId, date)
    .first<{ id: number }>();
  if (existing && !options.force) return { date, skipped: true };

  const product = await db
    .prepare("SELECT name, growth_goal AS growthGoal, analysis_json AS analysisJson FROM products WHERE workspace_id = ? AND analysis_status = 'completed' ORDER BY id DESC LIMIT 1")
    .bind(workspaceId)
    .first<{ name: string; growthGoal: string | null; analysisJson: string | null }>();
  if (!product) return { date, skipped: true };

  const agentId = await ensureWorkspaceAgent(db, workspaceId);
  const [metrics, campaign, attributed, previous, observations, opportunities, approvals, completed, analytics] = await Promise.all([
    db.prepare("SELECT visits, signups, paid FROM metrics WHERE workspace_id = ? ORDER BY metric_date DESC, id DESC LIMIT 1").bind(workspaceId).first<{ visits: number; signups: number; paid: number }>(),
    db.prepare("SELECT COALESCE(SUM(impressions), 0) AS impressions, COALESCE(SUM(clicks), 0) AS clicks, COALESCE(SUM(conversions), 0) AS conversions FROM campaign_assets WHERE workspace_id = ?").bind(workspaceId).first<{ impressions: number; clicks: number; conversions: number }>(),
    db.prepare("SELECT COUNT(*) AS visits FROM marketing_events e WHERE e.event_name = 'page_view' AND e.utm_campaign IN (SELECT 'atlas_campaign_' || id FROM campaigns WHERE workspace_id = ?) AND substr(e.created_at, 1, 10) = ?").bind(workspaceId, date).first<{ visits: number }>(),
    db.prepare("SELECT visits, signups, paid, attributed_visits AS attributedVisits FROM daily_growth_snapshots WHERE workspace_id = ? AND snapshot_date < ? ORDER BY snapshot_date DESC LIMIT 1").bind(workspaceId, date).first<{ visits: number; signups: number; paid: number; attributedVisits: number }>(),
    db.prepare("SELECT source_type AS sourceType, source_name AS sourceName, content, observed_at AS observedAt FROM observations WHERE workspace_id = ? ORDER BY observed_at DESC, id DESC LIMIT 10").bind(workspaceId).all<GrowthOperatorObservation>(),
    db.prepare("SELECT title, summary, suggested_action AS suggestedAction, confidence, signal, source FROM opportunities WHERE workspace_id = ? AND status != 'ignored' ORDER BY confidence DESC, id DESC LIMIT 5").bind(workspaceId).all<GrowthOperatorOpportunity>(),
    db.prepare("SELECT COUNT(*) AS count FROM approvals WHERE workspace_id = ? AND status = 'pending'").bind(workspaceId).first<{ count: number }>(),
    db.prepare("SELECT title FROM agent_tasks WHERE workspace_id = ? AND status = 'completed' AND substr(completed_at, 1, 10) = ? ORDER BY completed_at DESC LIMIT 5").bind(workspaceId, previousDate(date)).all<{ title: string }>(),
    db.prepare("SELECT COUNT(*) AS count FROM platform_connections WHERE workspace_id = ? AND provider IN ('ga4', 'posthog') AND status = 'connected'").bind(workspaceId).first<{ count: number }>(),
  ]);

  const visits = metrics?.visits ?? 0;
  const signups = metrics?.signups ?? 0;
  const paid = metrics?.paid ?? 0;
  const attributedVisits = attributed?.visits ?? 0;
  const impressions = campaign?.impressions ?? 0;
  const clicks = campaign?.clicks ?? 0;
  const conversions = campaign?.conversions ?? 0;
  const plan = buildGrowthOperatorPlan({
    date,
    productName: product.name,
    goal: product.growthGoal,
    visits,
    signups,
    paid,
    impressions,
    clicks,
    conversions,
    attributedVisits,
    previous,
    completedYesterday: completed.results.map((item) => item.title),
    pendingApprovals: approvals?.count ?? 0,
    analyticsConnected: (analytics?.count ?? 0) > 0,
    observations: observations.results,
    opportunities: opportunities.results,
  });
  const analysis = parseJson<{ contentLanguage?: "zh" | "en" }>(product.analysisJson, {});
  const preferredLocale = analysis.contentLanguage === "zh" ? "zh" : "en";
  const brief = plan.localized[preferredLocale];
  const started = new Date().toISOString();
  const run = await db
    .prepare("INSERT INTO agent_runs (workspace_id, agent_id, task_id, task, status, input, output, tools, started_at, finished_at, result) VALUES (?, ?, NULL, 'Growth Operator Daily Plan', 'completed', ?, ?, ?, ?, ?, 'Success · Evidence-ranked plan updated') RETURNING id")
    .bind(workspaceId, agentId, `Observations, metrics, opportunities and approvals for ${date}`, brief.summary, JSON.stringify(["ObservationReaderTool", "GrowthSnapshotTool", "DecisionEngineTool", "TaskPlannerTool", "MemoryWriterTool"]), started, started)
    .first<{ id: number }>();
  const decision = await db
    .prepare("INSERT INTO agent_decisions (workspace_id, agent_id, run_id, decision_date, decision_type, title, rationale, evidence_json, expected_impact, priority_score, confidence, risk_level, status, payload_json) VALUES (?, ?, ?, ?, 'next_best_action', ?, ?, ?, ?, ?, ?, ?, 'proposed', ?) ON CONFLICT(workspace_id, decision_type, decision_date) DO UPDATE SET run_id = excluded.run_id, title = excluded.title, rationale = excluded.rationale, evidence_json = excluded.evidence_json, expected_impact = excluded.expected_impact, priority_score = excluded.priority_score, confidence = excluded.confidence, risk_level = excluded.risk_level, payload_json = excluded.payload_json, created_at = CURRENT_TIMESTAMP RETURNING id")
    .bind(workspaceId, agentId, run?.id ?? null, date, brief.nextAction, brief.today[0].why, JSON.stringify(brief.today[0].evidence), brief.today[0].expectedOutcome, plan.priorityScore, plan.confidence, brief.today[0].riskLevel, JSON.stringify(plan))
    .first<{ id: number }>();

  const reflection = {
    date,
    summary: plan.localized.en.summary,
    goal: plan.goal,
    signals: {
      visits,
      signups,
      paid,
      impressions,
      clicks,
      conversions,
      attributedVisits,
      visitDelta: visits - (previous?.visits ?? visits),
      signupDelta: signups - (previous?.signups ?? signups),
      ctr: impressions ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
    },
    learnings: plan.localized.en.discoveries.map((item) => item.title),
    nextAction: plan.localized.en.nextAction,
    decision: plan,
    localized: plan.localized,
  };
  const signalPayload = { date, visits, signups, paid, impressions, clicks, conversions, attributedVisits };

  await db.batch([
    db.prepare("INSERT INTO daily_growth_snapshots (workspace_id, snapshot_date, visits, signups, paid, attributed_visits, attributed_signups, attributed_paid, reflection_json, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?) ON CONFLICT(workspace_id, snapshot_date) DO UPDATE SET visits = excluded.visits, signups = excluded.signups, paid = excluded.paid, attributed_visits = excluded.attributed_visits, reflection_json = excluded.reflection_json").bind(workspaceId, date, visits, signups, paid, attributedVisits, JSON.stringify(reflection), started),
    db.prepare("INSERT INTO observations (workspace_id, source_type, source_name, content, raw_data, observed_at, processed) SELECT ?, 'growth_metrics', 'Atlas first-party growth signals', ?, ?, ?, 1 WHERE NOT EXISTS (SELECT 1 FROM observations WHERE workspace_id = ? AND source_type = 'growth_metrics' AND substr(observed_at, 1, 10) = ?)").bind(workspaceId, brief.summary, JSON.stringify(signalPayload), started, workspaceId, date),
    db.prepare("UPDATE observations SET processed = 1 WHERE workspace_id = ? AND observed_at <= ?").bind(workspaceId, started),
    db.prepare("INSERT INTO agent_tasks (workspace_id, agent_id, title, description, task_type, priority, risk_level, status, requires_approval, expected_outcome, estimated_minutes, evidence, created_at) SELECT ?, ?, ?, ?, 'daily_growth_action', 1, ?, 'queued', 0, ?, 30, ?, ? WHERE NOT EXISTS (SELECT 1 FROM agent_tasks WHERE workspace_id = ? AND task_type = 'daily_growth_action' AND substr(created_at, 1, 10) = ?)").bind(workspaceId, agentId, brief.nextAction, brief.today[0].why, brief.today[0].riskLevel, brief.today[0].expectedOutcome, JSON.stringify(brief.today[0].evidence), started, workspaceId, date),
    db.prepare("INSERT INTO memories (workspace_id, memory_type, title, content, source, confidence, status, last_verified_at) SELECT ?, 'Growth learning', ?, ?, 'Growth Operator Decision Engine', ?, 'validated', ? WHERE NOT EXISTS (SELECT 1 FROM memories WHERE workspace_id = ? AND source = 'Growth Operator Decision Engine' AND substr(last_verified_at, 1, 10) = ?)").bind(workspaceId, `Growth decision · ${date}`, `${brief.summary}\n\nNext action: ${brief.nextAction}\n\nEvidence: ${brief.today[0].evidence.join(" · ")}`, plan.confidence, started, workspaceId, date),
    db.prepare("UPDATE agents SET status = 'running', description = 'Observes product and campaign signals, ranks evidence, plans measurable next actions, and asks for approval before external actions.', schedule = 'Daily brief · continuous planning', current_task = ?, goal = ?, permissions_json = ?, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(brief.nextAction, plan.goal, JSON.stringify(["read_workspace", "write_memory", "create_task", "request_approval"]), started, agentId, workspaceId),
    db.prepare("INSERT INTO agent_tool_calls (workspace_id, job_id, run_id, tool_name, status, input_json, output_json, started_at, finished_at) VALUES (?, NULL, ?, 'GrowthOperatorDecisionEngine', 'completed', ?, ?, ?, ?)").bind(workspaceId, run?.id ?? null, JSON.stringify({ signalPayload, observationCount: observations.results.length, opportunityCount: opportunities.results.length, pendingApprovals: approvals?.count ?? 0 }), JSON.stringify({ decisionId: decision?.id ?? null, stage: plan.stage, confidence: plan.confidence, priorityScore: plan.priorityScore, nextAction: brief.nextAction }), started, started),
  ]);

  return { date, skipped: false, summary: brief.summary, nextAction: brief.nextAction, runId: run?.id, decisionId: decision?.id };
}
