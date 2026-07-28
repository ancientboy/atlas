import { advanceWorkspaceExperiments } from "./experiment-loop.ts";

type Db = D1Database;
export type RoutineTrigger = "schedule" | "event";

export const routinePlaybooks = [
  { key: "founder-brief", name: "Daily Founder Brief", instruction: "Summarize what Atlas completed, learned, and needs the Founder to decide today.", cadenceMinutes: 1440, trustLevel: "autopilot" },
  { key: "weekly-growth-review", name: "Weekly Growth Review", instruction: "Review goal progress, active experiments, channel performance, and the next best growth move.", cadenceMinutes: 10080, trustLevel: "recommend" },
  { key: "gsc-opportunities", name: "Search Opportunity Scan", instruction: "Check search queries ranking in positions 8–20 and prepare measurable content experiments.", cadenceMinutes: 10080, trustLevel: "prepare" },
  { key: "conversion-anomaly", name: "Conversion Anomaly Check", instruction: "Compare recent visits and signups, then flag a meaningful conversion change.", cadenceMinutes: 1440, trustLevel: "recommend" },
  { key: "experiment-review", name: "Experiment Due Review", instruction: "Evaluate experiments whose measurement window ended and capture reusable strategy lessons.", cadenceMinutes: 1440, trustLevel: "autopilot" },
  { key: "product-feedback-digest", name: "Product Signal Digest", instruction: "Summarize recent product feedback and identify the riskiest product assumption.", cadenceMinutes: 10080, trustLevel: "recommend" },
  { key: "sales-signal-review", name: "Sales Signal Review", instruction: "Review qualified signup and objection signals without contacting anyone.", cadenceMinutes: 10080, trustLevel: "recommend" },
  { key: "release-campaign", name: "Release Campaign", instruction: "When a release is observed, prepare a channel-specific campaign and an attributable experiment.", cadenceMinutes: 0, trustLevel: "prepare", triggerType: "event" as const, eventType: "product_release" },
] as const;

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "company-routine";

export function inferRoutine(input: string) {
  const text = input.trim();
  const lower = text.toLowerCase();
  const triggerType: RoutineTrigger = /when|whenever|after|当|每当|发布后|上线后/.test(lower) ? "event" : "schedule";
  const cadenceMinutes = /每周|weekly|week/.test(lower) ? 10080 : /每月|monthly|month/.test(lower) ? 43200 : /每小时|hourly|hour/.test(lower) ? 60 : 1440;
  const playbook = /gsc|search|keyword|seo|搜索|关键词/.test(lower) ? "gsc-opportunities"
    : /experiment|实验|复盘/.test(lower) ? "experiment-review"
      : /feedback|product|产品|反馈/.test(lower) ? "product-feedback-digest"
        : /sales|lead|signup|销售|线索|注册/.test(lower) ? "sales-signal-review"
          : /release|launch|version|发布|上线|版本/.test(lower) ? "release-campaign"
            : /conversion|cvr|转化|异常/.test(lower) ? "conversion-anomaly"
              : /brief|汇报|简报/.test(lower) ? "founder-brief"
                : "weekly-growth-review";
  const trustLevel = /publish|send|contact|付费|发布|发送|联系/.test(lower) ? "approval" : /draft|prepare|创建|准备|生成/.test(lower) ? "prepare" : "recommend";
  return {
    name: text.slice(0, 72),
    routineKey: `custom-${slug(text)}`,
    instruction: text,
    playbookKey: playbook,
    triggerType,
    cadenceMinutes: triggerType === "event" ? 0 : cadenceMinutes,
    eventType: triggerType === "event" ? (playbook === "release-campaign" ? "product_release" : "company_signal") : null,
    trustLevel,
  };
}

export async function ensureDefaultCompanyRoutines(db: Db, workspaceId: string, now = new Date()) {
  for (const routine of routinePlaybooks) {
    const triggerType = "triggerType" in routine ? routine.triggerType : "schedule";
    const eventType = "eventType" in routine ? routine.eventType : null;
    const nextRunAt = triggerType === "schedule" ? now.toISOString() : null;
    await db.prepare(
      `INSERT OR IGNORE INTO company_routines
       (workspace_id, routine_key, name, instruction, playbook_key, trigger_type, cadence_minutes, event_type, trust_level, status, next_run_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
    ).bind(workspaceId, routine.key, routine.name, routine.instruction, routine.key, triggerType, routine.cadenceMinutes, eventType, routine.trustLevel, nextRunAt, now.toISOString(), now.toISOString()).run();
  }
}

type Routine = {
  id: number; workspaceId: string; routineKey: string; name: string; instruction: string; playbookKey: string;
  triggerType: RoutineTrigger; cadenceMinutes: number; eventType: string | null; trustLevel: string;
};

async function summarizeRoutine(db: Db, routine: Routine, now: Date) {
  if (routine.playbookKey === "founder-brief") {
    const { runDailyGrowthReflection } = await import("./daily-growth-runtime.ts");
    const result = await runDailyGrowthReflection(db, routine.workspaceId, { date: now.toISOString().slice(0, 10), force: true });
    return { summary: result.skipped ? "Founder brief was already current." : "Founder brief refreshed from the latest company signals.", output: result };
  }
  if (routine.playbookKey === "experiment-review") {
    const result = await advanceWorkspaceExperiments(db, routine.workspaceId, now);
    return { summary: `${result.considered} experiment(s) checked for measurement or learning.`, output: result };
  }
  const [metrics, goal, experiments, observations] = await Promise.all([
    db.prepare("SELECT visits, signups, paid, conversion FROM metrics WHERE workspace_id = ? ORDER BY metric_date DESC, id DESC LIMIT 2").bind(routine.workspaceId).all<Record<string, unknown>>(),
    db.prepare("SELECT title, target_metric AS targetMetric, current_value AS currentValue, target_value AS targetValue FROM company_goals WHERE workspace_id = ? AND status = 'active' ORDER BY priority, id LIMIT 1").bind(routine.workspaceId).first<Record<string, unknown>>(),
    db.prepare("SELECT status, COUNT(*) AS count FROM growth_experiments WHERE workspace_id = ? GROUP BY status").bind(routine.workspaceId).all<Record<string, unknown>>(),
    db.prepare("SELECT title, content, source_type AS sourceType FROM observations WHERE workspace_id = ? ORDER BY observed_at DESC LIMIT 6").bind(routine.workspaceId).all<Record<string, unknown>>(),
  ]);
  const evidence = { metrics: metrics.results, goal, experiments: experiments.results, observations: observations.results };
  const summary = `${routine.name} reviewed ${observations.results.length} recent signal(s), ${experiments.results.reduce((sum, item) => sum + Number(item.count ?? 0), 0)} experiment(s), and the active goal${goal?.title ? ` “${goal.title}”` : ""}.`;
  await db.prepare(
    "INSERT INTO memories (workspace_id, memory_type, title, content, source, confidence, status, last_verified_at) VALUES (?, 'Routine', ?, ?, 'Company Routine', 75, 'unverified', ?)",
  ).bind(routine.workspaceId, `${routine.name} · ${now.toISOString().slice(0, 10)}`, summary, now.toISOString()).run();
  return { summary, output: evidence };
}

export async function runCompanyRoutine(db: Db, routine: Routine, trigger: RoutineTrigger = "schedule", now = new Date()) {
  const bucketMinutes = Math.max(30, routine.cadenceMinutes || 30);
  const bucket = Math.floor(now.getTime() / (bucketMinutes * 60_000));
  const idempotencyKey = `routine:${routine.id}:${trigger}:${bucket}`;
  const run = await db.prepare(
    `INSERT OR IGNORE INTO company_routine_runs
     (workspace_id, routine_id, trigger_type, status, started_at, idempotency_key)
     VALUES (?, ?, ?, 'running', ?, ?) RETURNING id`,
  ).bind(routine.workspaceId, routine.id, trigger, now.toISOString(), idempotencyKey).first<{ id: number }>();
  if (!run) return { skipped: true, reason: "idempotent" };
  try {
    const result = await summarizeRoutine(db, routine, now);
    const nextRunAt = routine.triggerType === "schedule" ? new Date(now.getTime() + Math.max(60, routine.cadenceMinutes) * 60_000).toISOString() : null;
    await db.batch([
      db.prepare("UPDATE company_routine_runs SET status = 'completed', output_json = ?, summary = ?, completed_at = ? WHERE id = ? AND workspace_id = ?").bind(JSON.stringify(result.output), result.summary, now.toISOString(), run.id, routine.workspaceId),
      db.prepare("UPDATE company_routines SET last_run_at = ?, last_status = 'completed', last_summary = ?, next_run_at = ?, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(now.toISOString(), result.summary, nextRunAt, now.toISOString(), routine.id, routine.workspaceId),
    ]);
    return { skipped: false, routineId: routine.id, ...result };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 240) : "Routine failed";
    await db.batch([
      db.prepare("UPDATE company_routine_runs SET status = 'failed', summary = ?, completed_at = ? WHERE id = ? AND workspace_id = ?").bind(message, now.toISOString(), run.id, routine.workspaceId),
      db.prepare("UPDATE company_routines SET last_run_at = ?, last_status = 'failed', last_summary = ?, next_run_at = ?, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(now.toISOString(), message, new Date(now.getTime() + 60 * 60_000).toISOString(), now.toISOString(), routine.id, routine.workspaceId),
    ]);
    throw error;
  }
}

export async function runDueCompanyRoutines(db: Db, now = new Date(), limit = 20) {
  const rows = await db.prepare(
    `SELECT id, workspace_id AS workspaceId, routine_key AS routineKey, name, instruction, playbook_key AS playbookKey,
      trigger_type AS triggerType, cadence_minutes AS cadenceMinutes, event_type AS eventType, trust_level AS trustLevel
     FROM company_routines
     WHERE status = 'active' AND trigger_type = 'schedule' AND (next_run_at IS NULL OR datetime(next_run_at) <= datetime(?))
     ORDER BY next_run_at, id LIMIT ?`,
  ).bind(now.toISOString(), limit).all<Routine>();
  const results = [];
  for (const routine of rows.results) {
    try { results.push(await runCompanyRoutine(db, routine, "schedule", now)); }
    catch { results.push({ skipped: true, routineId: routine.id, reason: "failed" }); }
  }
  return { considered: rows.results.length, results };
}
