import { runWorkspaceAutonomyLoop } from "./autonomy-loop.ts";

type Db = D1Database;

export type RuntimeMode = "manual" | "copilot" | "autonomous" | "paused";
export type RuntimeTrigger = "scheduled" | "manual" | "event" | "recovery" | "onboarding";
export type RuntimeSettings = {
  enabled: number; mode: RuntimeMode; tickIntervalMinutes: number; dailyActionLimit: number;
  dailyLlmBudgetCents: number; dailyExternalActionLimit: number; quietHoursStart: string | null;
  quietHoursEnd: string | null; timezone: string; autoExecuteRiskLevel: number; pausedReason: string | null;
};
export type ActionPolicy = { decision: "execute" | "require_approval" | "block"; reason: string; riskLevel: 0 | 1 | 2 | 3; policyCode: string };

const nowText = () => new Date().toISOString();
const dayKey = (now: Date) => now.toISOString().slice(0, 10);

export function evaluateActionPolicy(input: { mode: RuntimeMode; riskLevel: number; autoExecuteRiskLevel: number; actionsUsed: number; externalActionsUsed: number; dailyActionLimit: number; dailyExternalActionLimit: number; estimatedCostCents: number; dailyCostCents: number; dailyLlmBudgetCents: number; connectionReady?: boolean }) : ActionPolicy {
  const riskLevel = Math.max(0, Math.min(3, input.riskLevel)) as 0 | 1 | 2 | 3;
  if (riskLevel === 3) return { decision: "block", reason: "Level 3 actions always require a founder.", riskLevel, policyCode: "level_3_manual" };
  if (input.actionsUsed >= input.dailyActionLimit) return { decision: "block", reason: "Daily action limit reached.", riskLevel, policyCode: "daily_action_limit" };
  if (input.dailyCostCents + input.estimatedCostCents > input.dailyLlmBudgetCents) return { decision: "block", reason: "Daily runtime budget reached.", riskLevel, policyCode: "daily_budget_limit" };
  if (riskLevel >= 2 && !input.connectionReady) return { decision: "require_approval", reason: "A connected external account is required before execution.", riskLevel, policyCode: "connection_required" };
  if (riskLevel >= 2 && input.externalActionsUsed >= input.dailyExternalActionLimit) return { decision: "require_approval", reason: "Daily external action limit reached.", riskLevel, policyCode: "daily_external_limit" };
  if (riskLevel >= 2) return { decision: "require_approval", reason: "External actions remain founder-approved in Phase 1.", riskLevel, policyCode: "external_approval" };
  if (input.mode === "manual") return { decision: "require_approval", reason: "Manual mode does not auto-execute new work.", riskLevel, policyCode: "manual_mode" };
  if (riskLevel > input.autoExecuteRiskLevel) return { decision: "require_approval", reason: "This action exceeds the configured automatic risk level.", riskLevel, policyCode: "risk_limit" };
  return { decision: "execute", reason: "Internal, reversible action is within policy.", riskLevel, policyCode: "internal_auto" };
}

export function isQuietHour(now: Date, start: string | null, end: string | null) {
  if (!start || !end || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || start === end) return false;
  const minute = now.getUTCHours() * 60 + now.getUTCMinutes();
  const toMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  const from = toMinutes(start); const until = toMinutes(end);
  return from < until ? minute >= from && minute < until : minute >= from || minute < until;
}

export function runtimeCycleKey(workspaceId: string, trigger: RuntimeTrigger, now: Date) {
  const bucket = trigger === "manual" ? Math.floor(now.getTime() / 60_000) : Math.floor(now.getTime() / (15 * 60_000));
  return `company_runtime:${workspaceId}:${trigger}:${bucket}`;
}

export async function ensureRuntimeSettings(db: Db, workspaceId: string) {
  await db.prepare("INSERT OR IGNORE INTO workspace_runtime_settings (workspace_id, next_tick_at) VALUES (?, CURRENT_TIMESTAMP)").bind(workspaceId).run();
  return db.prepare("SELECT enabled, mode, tick_interval_minutes AS tickIntervalMinutes, daily_action_limit AS dailyActionLimit, daily_llm_budget_cents AS dailyLlmBudgetCents, daily_external_action_limit AS dailyExternalActionLimit, quiet_hours_start AS quietHoursStart, quiet_hours_end AS quietHoursEnd, timezone, auto_execute_risk_level AS autoExecuteRiskLevel, paused_reason AS pausedReason FROM workspace_runtime_settings WHERE workspace_id = ?").bind(workspaceId).first<RuntimeSettings>();
}

export async function loadCompanyState(db: Db, workspaceId: string) {
  const [product, goal, observations, opportunities, approvals, tasks, metrics, connections, memory, agent] = await Promise.all([
    db.prepare("SELECT id, name, growth_goal AS growthGoal FROM products WHERE workspace_id = ? ORDER BY id DESC LIMIT 1").bind(workspaceId).first(),
    db.prepare("SELECT id, title, description, target_metric AS targetMetric, target_value AS targetValue, current_value AS currentValue FROM company_goals WHERE workspace_id = ? AND status = 'active' ORDER BY priority, id LIMIT 1").bind(workspaceId).first(),
    db.prepare("SELECT id, title, content, confidence FROM observations WHERE workspace_id = ? ORDER BY observed_at DESC, id DESC LIMIT 8").bind(workspaceId).all(),
    db.prepare("SELECT id, title, summary, suggested_action AS suggestedAction, confidence, signal FROM opportunities WHERE workspace_id = ? AND status NOT IN ('ignored', 'archived') ORDER BY confidence DESC, id DESC LIMIT 8").bind(workspaceId).all(),
    db.prepare("SELECT COUNT(*) AS count FROM approvals WHERE workspace_id = ? AND status = 'pending'").bind(workspaceId).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) AS count FROM agent_tasks WHERE workspace_id = ? AND status IN ('queued', 'running', 'waiting_approval')").bind(workspaceId).first<{ count: number }>(),
    db.prepare("SELECT visits, signups, paid FROM metrics WHERE workspace_id = ? ORDER BY metric_date DESC, id DESC LIMIT 1").bind(workspaceId).first(),
    db.prepare("SELECT provider, status FROM platform_connections WHERE workspace_id = ? AND status = 'connected' LIMIT 12").bind(workspaceId).all(),
    db.prepare("SELECT title, content, confidence FROM memories WHERE workspace_id = ? ORDER BY last_verified_at DESC LIMIT 8").bind(workspaceId).all(),
    db.prepare("SELECT id FROM agents WHERE workspace_id = ? AND role = 'Growth Operator' LIMIT 1").bind(workspaceId).first<{ id: number }>(),
  ]);
  return { product, goal, observations: observations.results, opportunities: opportunities.results, pendingApprovals: approvals?.count ?? 0, openTasks: tasks?.count ?? 0, metrics, connections: connections.results, memory: memory.results, agentId: agent?.id ?? null };
}

async function acquireWorkspaceRuntimeLock(db: Db, workspaceId: string, token: string, now: Date) {
  const expiresAt = new Date(now.getTime() + 8 * 60_000).toISOString();
  const result = await db.prepare("INSERT INTO workspace_runtime_locks (workspace_id, lock_token, locked_at, expires_at) VALUES (?, ?, ?, ?) ON CONFLICT(workspace_id) DO UPDATE SET lock_token = excluded.lock_token, locked_at = excluded.locked_at, expires_at = excluded.expires_at WHERE workspace_runtime_locks.expires_at <= excluded.locked_at").bind(workspaceId, token, now.toISOString(), expiresAt).run();
  return (result.meta?.changes ?? 0) === 1;
}
async function releaseWorkspaceRuntimeLock(db: Db, workspaceId: string, token: string) {
  await db.prepare("DELETE FROM workspace_runtime_locks WHERE workspace_id = ? AND lock_token = ?").bind(workspaceId, token).run();
}

async function ensureGoal(db: Db, workspaceId: string, product: { name?: string; growthGoal?: string | null } | null) {
  const current = await db.prepare("SELECT id FROM company_goals WHERE workspace_id = ? AND status = 'active' ORDER BY priority, id LIMIT 1").bind(workspaceId).first<{ id: number }>();
  if (current) return current.id;
  const title = product?.growthGoal?.trim() || `Establish repeatable growth for ${product?.name ?? "this company"}`;
  const created = await db.prepare("INSERT INTO company_goals (workspace_id, title, description, goal_type, target_metric, priority) VALUES (?, ?, ?, 'growth', 'signups', 1) RETURNING id").bind(workspaceId, title, "Created from the current company profile so the runtime has an explicit operating objective.").first<{ id: number }>();
  return created?.id ?? null;
}

export async function runCompanyRuntimeCycle(db: Db, workspaceId: string, trigger: RuntimeTrigger, options: { now?: Date; idempotencyKey?: string } = {}) {
  const now = options.now ?? new Date(); const startedAt = now.toISOString();
  const workspace = await db.prepare("SELECT autonomy_enabled AS autonomyEnabled FROM workspaces WHERE id = ?").bind(workspaceId).first<{ autonomyEnabled: number }>();
  const settings = await ensureRuntimeSettings(db, workspaceId);
  if (!workspace || !settings || workspace.autonomyEnabled === 0 || settings.enabled === 0 || settings.mode === "paused") return { skipped: true, reason: "paused" };
  if (trigger === "scheduled" && settings.mode === "manual") return { skipped: true, reason: "manual_mode" };
  if (trigger === "scheduled" && isQuietHour(now, settings.quietHoursStart, settings.quietHoursEnd)) return { skipped: true, reason: "quiet_hours" };
  const token = crypto.randomUUID();
  if (!(await acquireWorkspaceRuntimeLock(db, workspaceId, token, now))) return { skipped: true, reason: "locked" };
  const key = options.idempotencyKey ?? runtimeCycleKey(workspaceId, trigger, now);
  let cycleId: number | null = null;
  try {
    const created = await db.prepare("INSERT OR IGNORE INTO runtime_cycles (workspace_id, trigger_type, status, started_at, current_stage, idempotency_key) VALUES (?, ?, 'running', ?, 'load_state', ?) RETURNING id").bind(workspaceId, trigger, startedAt, key).first<{ id: number }>();
    if (!created) return { skipped: true, reason: "idempotent" };
    cycleId = created.id;
    const usage = await db.prepare("SELECT cycles_count AS cyclesCount, actions_count AS actionsCount, external_actions_count AS externalActionsCount, estimated_cost_cents AS estimatedCostCents FROM runtime_daily_usage WHERE workspace_id = ? AND usage_date = ?").bind(workspaceId, dayKey(now)).first<{ cyclesCount: number; actionsCount: number; externalActionsCount: number; estimatedCostCents: number }>() ?? { cyclesCount: 0, actionsCount: 0, externalActionsCount: 0, estimatedCostCents: 0 };
    if (usage.actionsCount >= settings.dailyActionLimit || usage.estimatedCostCents >= settings.dailyLlmBudgetCents) {
      await db.prepare("UPDATE runtime_cycles SET status = 'paused_budget', current_stage = 'budget', completed_at = ?, summary = ? WHERE id = ? AND workspace_id = ?").bind(nowText(), "Runtime paused because the daily resource limit was reached.", cycleId, workspaceId).run();
      return { skipped: true, reason: "daily_limit", cycleId };
    }
    const state = await loadCompanyState(db, workspaceId);
    const goalId = await ensureGoal(db, workspaceId, state.product as { name?: string; growthGoal?: string | null } | null);
    await db.prepare("UPDATE runtime_cycles SET current_stage = 'prioritize', observations_count = ? WHERE id = ? AND workspace_id = ?").bind(state.observations.length, cycleId, workspaceId).run();
    const autonomy = await runWorkspaceAutonomyLoop(db, workspaceId);
    const opportunity = state.opportunities[0] as { id: number; title: string; summary: string; suggestedAction: string; confidence: number } | undefined;
    let planId: number | null = null; let taskId: number | null = null; let approvalCount = 0; let executed = 0;
    if (opportunity && state.agentId) {
      const plan = await db.prepare("INSERT OR IGNORE INTO company_plans (workspace_id, goal_id, opportunity_id, title, hypothesis, strategy, expected_impact, confidence, risk_level, estimated_cost_cents, status, created_by_agent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 'planned', ?) RETURNING id").bind(workspaceId, goalId, opportunity.id, `Validate: ${opportunity.title}`.slice(0, 200), `If Atlas executes ${opportunity.suggestedAction}, it can validate this opportunity with bounded internal work.`, opportunity.suggestedAction, "A measurable next growth signal and a traceable plan.", opportunity.confidence, state.agentId).first<{ id: number }>();
      planId = plan?.id ?? (await db.prepare("SELECT id FROM company_plans WHERE workspace_id = ? AND opportunity_id = ? ORDER BY id DESC LIMIT 1").bind(workspaceId, opportunity.id).first<{ id: number }>())?.id ?? null;
      const policy = evaluateActionPolicy({ mode: settings.mode, riskLevel: 1, autoExecuteRiskLevel: settings.autoExecuteRiskLevel, actionsUsed: usage.actionsCount, externalActionsUsed: usage.externalActionsCount, dailyActionLimit: settings.dailyActionLimit, dailyExternalActionLimit: settings.dailyExternalActionLimit, estimatedCostCents: 0, dailyCostCents: usage.estimatedCostCents, dailyLlmBudgetCents: settings.dailyLlmBudgetCents });
      const task = await db.prepare("INSERT INTO agent_tasks (workspace_id, agent_id, title, description, task_type, priority, risk_level, status, requires_approval, expected_outcome, estimated_minutes, evidence, created_at) SELECT ?, ?, ?, ?, 'company_runtime_plan', 1, 1, ?, ?, ?, 20, ?, ? WHERE NOT EXISTS (SELECT 1 FROM agent_tasks WHERE workspace_id = ? AND task_type = 'company_runtime_plan' AND title = ? AND substr(created_at, 1, 10) = ? ) RETURNING id").bind(workspaceId, state.agentId, opportunity.suggestedAction.slice(0, 200), opportunity.summary, policy.decision === "execute" ? "completed" : "waiting_approval", policy.decision === "execute" ? 0 : 1, "Create a traceable experiment from this opportunity.", JSON.stringify([opportunity.title, `Plan #${planId ?? "pending"}`]), startedAt, workspaceId, opportunity.suggestedAction.slice(0, 200), dayKey(now)).first<{ id: number }>();
      taskId = task?.id ?? null;
      if (taskId && policy.decision === "require_approval") { await db.prepare("INSERT OR IGNORE INTO approvals (workspace_id, task_id, action_type, title, reason, payload, risk_level, status, created_at) VALUES (?, ?, 'company_runtime_plan', ?, ?, ?, 1, 'pending', ?)").bind(workspaceId, taskId, `Approve plan: ${opportunity.title}`.slice(0, 220), policy.reason, JSON.stringify({ planId, opportunityId: opportunity.id }), startedAt).run(); approvalCount += 1; }
      const execution = await db.prepare("INSERT OR IGNORE INTO action_executions (workspace_id, cycle_id, plan_id, task_id, agent_id, action_type, risk_level, policy_decision, status, input_json, output_json, idempotency_key, started_at, completed_at) VALUES (?, ?, ?, ?, ?, 'create_internal_task', 1, ?, ?, ?, ?, ?, ?, ?)").bind(workspaceId, cycleId, planId, taskId, state.agentId, policy.decision, policy.decision === "execute" ? "completed" : "waiting_approval", JSON.stringify({ opportunityId: opportunity.id }), JSON.stringify({ policy: policy.policyCode, taskId }), `runtime-action:${cycleId}:create_internal_task`, startedAt, policy.decision === "execute" ? startedAt : null).run();
      if ((execution.meta?.changes ?? 0) > 0 && policy.decision === "execute") executed = 1;
    }
    const summary = opportunity ? `Atlas prioritized ${opportunity.title}${autonomy.campaigns ? ` and prepared ${autonomy.campaigns} approval-gated campaign(s)` : ""}.` : "Atlas refreshed company state; no new qualified opportunity needs a plan yet.";
    await db.batch([
      db.prepare("INSERT INTO runtime_daily_usage (workspace_id, usage_date, cycles_count, actions_count, external_actions_count, estimated_cost_cents) VALUES (?, ?, 1, ?, 0, 0) ON CONFLICT(workspace_id, usage_date) DO UPDATE SET cycles_count = cycles_count + 1, actions_count = actions_count + excluded.actions_count").bind(workspaceId, dayKey(now), executed),
      db.prepare("INSERT INTO memories (workspace_id, memory_type, title, content, source, confidence, status, last_verified_at) SELECT ?, 'Runtime reflection', ?, ?, 'Company Runtime', 70, 'unverified', ? WHERE NOT EXISTS (SELECT 1 FROM memories WHERE workspace_id = ? AND source = 'Company Runtime' AND title = ?)").bind(workspaceId, `Runtime reflection · ${dayKey(now)}`, summary, startedAt, workspaceId, `Runtime reflection · ${dayKey(now)}`),
      db.prepare("UPDATE runtime_cycles SET status = 'completed', current_stage = 'reflect', completed_at = ?, opportunities_count = ?, plans_count = ?, tasks_created_count = ?, tasks_executed_count = ?, approvals_created_count = ?, summary = ? WHERE id = ? AND workspace_id = ?").bind(nowText(), autonomy.promoted, planId ? 1 : 0, taskId ? 1 : 0, executed, approvalCount, summary, cycleId, workspaceId),
      db.prepare("UPDATE workspace_runtime_settings SET last_tick_at = ?, next_tick_at = ?, updated_at = ? WHERE workspace_id = ?").bind(startedAt, new Date(now.getTime() + settings.tickIntervalMinutes * 60_000).toISOString(), startedAt, workspaceId),
    ]);
    return { skipped: false, cycleId, summary, planId, taskId, autonomy };
  } catch (error) {
    if (cycleId) await db.prepare("UPDATE runtime_cycles SET status = 'failed', current_stage = 'failed', completed_at = ?, error_code = 'runtime_failed', error_message = ? WHERE id = ? AND workspace_id = ?").bind(nowText(), error instanceof Error ? error.message.slice(0, 300) : "Runtime cycle failed", cycleId, workspaceId).run();
    throw error;
  } finally { await releaseWorkspaceRuntimeLock(db, workspaceId, token); }
}

export async function runDueCompanyRuntimeCycles(db: Db, now = new Date(), limit = 10) {
  const due = await db.prepare("SELECT s.workspace_id AS workspaceId FROM workspace_runtime_settings s INNER JOIN workspaces w ON w.id = s.workspace_id WHERE s.enabled != 0 AND s.mode NOT IN ('manual', 'paused') AND w.autonomy_enabled != 0 AND (s.next_tick_at IS NULL OR s.next_tick_at <= ?) ORDER BY s.next_tick_at LIMIT ?").bind(now.toISOString(), limit).all<{ workspaceId: string }>();
  const results = [];
  for (const item of due.results) { try { results.push(await runCompanyRuntimeCycle(db, item.workspaceId, "scheduled", { now })); } catch { results.push({ skipped: true, reason: "failed" }); } }
  return { considered: due.results.length, results };
}
