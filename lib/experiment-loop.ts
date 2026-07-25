type Db = D1Database;

export type ExperimentOutcome = "success" | "failed" | "inconclusive";
export type MetricSnapshot = {
  metric: string;
  value: number;
  source: string;
  capturedAt: string;
  evidence: string[];
};

type Experiment = {
  id: number;
  workspaceId: string;
  name: string;
  strategyKey: string;
  primaryMetric: string;
  baselineValue: number | null;
  targetValue: number | null;
  minimumDelta: number;
  successThresholdPct: number;
  evaluationStartsAt: string | null;
  evaluationEndsAt: string | null;
  status: string;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function evaluateExperiment(input: {
  baseline: number;
  current: number;
  target?: number | null;
  minimumDelta?: number;
  successThresholdPct?: number;
  hasReliableSample?: boolean;
}) {
  const delta = input.current - input.baseline;
  const minimumDelta = Math.max(0, input.minimumDelta ?? 1);
  const relativeDelta = input.baseline > 0 ? (delta / input.baseline) * 100 : delta > 0 ? 100 : 0;
  const targetReached = input.target != null
    ? input.current >= input.target
    : delta >= minimumDelta && relativeDelta >= (input.successThresholdPct ?? 5);
  const outcome: ExperimentOutcome = !input.hasReliableSample
    ? "inconclusive"
    : targetReached
      ? "success"
      : "failed";
  const confidence = outcome === "inconclusive"
    ? 45
    : clamp(Math.round(60 + Math.min(30, Math.abs(relativeDelta))), 60, 90);
  return { outcome, delta, relativeDelta, targetReached, confidence };
}

async function metricSnapshot(db: Db, workspaceId: string, experimentId: number, metric: string, now: Date): Promise<MetricSnapshot> {
  const normalized = metric.toLowerCase().replace(/[^a-z_]/g, "");
  if (["impressions", "clicks", "conversions"].includes(normalized)) {
    const totals = await db.prepare(
      `SELECT COALESCE(SUM(a.${normalized}), 0) AS value, COUNT(*) AS assets
       FROM campaign_assets a
       INNER JOIN campaigns c ON c.id = a.campaign_id AND c.workspace_id = a.workspace_id
       WHERE a.workspace_id = ? AND c.experiment_id = ?`,
    ).bind(workspaceId, experimentId).first<{ value: number; assets: number }>();
    return {
      metric: normalized,
      value: Number(totals?.value ?? 0),
      source: "Campaign attribution",
      capturedAt: now.toISOString(),
      evidence: [`${totals?.assets ?? 0} linked campaign asset(s)`, `experiment:${experimentId}`],
    };
  }
  const row = await db.prepare(
    "SELECT metric_date AS metricDate, visits, signups, paid, conversion FROM metrics WHERE workspace_id = ? ORDER BY metric_date DESC, id DESC LIMIT 1",
  ).bind(workspaceId).first<{ metricDate: string; visits: number; signups: number; paid: number; conversion: number }>();
  const key = ["visits", "signups", "paid", "conversion"].includes(normalized) ? normalized as "visits" | "signups" | "paid" | "conversion" : "signups";
  return {
    metric: key,
    value: Number(row?.[key] ?? 0),
    source: "Workspace metrics",
    capturedAt: now.toISOString(),
    evidence: [row?.metricDate ? `metric_date:${row.metricDate}` : "No metric row available", `workspace:${workspaceId}`],
  };
}

export async function refreshStrategyLearning(db: Db, workspaceId: string, strategyKey: string, now = new Date()) {
  const results = await db.prepare(
    `SELECT r.outcome, r.confidence, r.summary, r.measured_at AS measuredAt, e.id AS experimentId
     FROM experiment_results r
     INNER JOIN growth_experiments e ON e.id = r.experiment_id AND e.workspace_id = r.workspace_id
     WHERE r.workspace_id = ? AND e.strategy_key = ?
     ORDER BY datetime(r.measured_at) DESC, r.id DESC LIMIT 12`,
  ).bind(workspaceId, strategyKey).all<{ outcome: ExperimentOutcome; confidence: number; summary: string; measuredAt: string; experimentId: number }>();
  if (!results.results.length) return null;
  const conclusive = results.results.filter((item) => item.outcome !== "inconclusive");
  const successCount = conclusive.filter((item) => item.outcome === "success").length;
  const failureCount = conclusive.filter((item) => item.outcome === "failed").length;
  let consecutiveFailures = 0;
  for (const result of results.results) {
    if (result.outcome === "failed") consecutiveFailures += 1;
    else if (result.outcome === "success") break;
  }
  const weight = clamp(1 + successCount * 0.12 - failureCount * 0.16, 0.4, 1.6);
  const suppressedUntil = consecutiveFailures >= 2 ? new Date(now.getTime() + 30 * 86_400_000).toISOString() : null;
  const latest = results.results[0];
  await db.prepare(
    `INSERT INTO strategy_performance
      (workspace_id, strategy_key, experiments_count, success_count, failure_count, consecutive_failures, weight, suppressed_until, last_outcome, last_evaluated_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(workspace_id, strategy_key) DO UPDATE SET
       experiments_count = excluded.experiments_count,
       success_count = excluded.success_count,
       failure_count = excluded.failure_count,
       consecutive_failures = excluded.consecutive_failures,
       weight = excluded.weight,
       suppressed_until = excluded.suppressed_until,
       last_outcome = excluded.last_outcome,
       last_evaluated_at = excluded.last_evaluated_at,
       updated_at = excluded.updated_at`,
  ).bind(workspaceId, strategyKey, results.results.length, successCount, failureCount, consecutiveFailures, weight, suppressedUntil, latest.outcome, now.toISOString(), now.toISOString()).run();
  const lessonType = suppressedUntil ? "avoid" : successCount > failureCount ? "repeat" : latest.outcome === "failed" ? "failed" : "observe";
  const statement = suppressedUntil
    ? `${strategyKey} produced ${consecutiveFailures} consecutive failed experiments and is suppressed for 30 days.`
    : successCount > failureCount
      ? `${strategyKey} has ${successCount} successful and ${failureCount} failed experiment(s); prefer it when current evidence matches.`
      : `${strategyKey} remains unproven with ${successCount} successful and ${failureCount} failed experiment(s).`;
  await db.prepare("UPDATE strategy_lessons SET status = 'inactive', updated_at = ? WHERE workspace_id = ? AND strategy_key = ? AND lesson_type != ? AND status = 'active'")
    .bind(now.toISOString(), workspaceId, strategyKey, lessonType).run();
  await db.prepare(
    `INSERT INTO strategy_lessons
      (workspace_id, strategy_key, lesson_type, statement, evidence_json, confidence, status, last_applied_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
     ON CONFLICT(workspace_id, strategy_key, lesson_type) DO UPDATE SET
       statement = excluded.statement,
       evidence_json = excluded.evidence_json,
       confidence = excluded.confidence,
       status = 'active',
       last_applied_at = excluded.last_applied_at,
       updated_at = excluded.updated_at`,
  ).bind(
    workspaceId,
    strategyKey,
    lessonType,
    statement,
    JSON.stringify(results.results.slice(0, 5).map((item) => ({ experimentId: item.experimentId, outcome: item.outcome, measuredAt: item.measuredAt }))),
    clamp(55 + conclusive.length * 7, 55, 92),
    now.toISOString(),
    now.toISOString(),
  ).run();
  return { strategyKey, weight, suppressedUntil, successCount, failureCount, consecutiveFailures, lessonType };
}

async function startExperiment(db: Db, experiment: Experiment, now: Date) {
  const campaign = await db.prepare(
    "SELECT status FROM campaigns WHERE workspace_id = ? AND experiment_id = ? ORDER BY id DESC LIMIT 1",
  ).bind(experiment.workspaceId, experiment.id).first<{ status: string }>();
  if (campaign && !["active", "completed"].includes(campaign.status)) return { started: false, waitingFor: "campaign" };
  const baseline = await metricSnapshot(db, experiment.workspaceId, experiment.id, experiment.primaryMetric, now);
  const end = experiment.evaluationEndsAt && new Date(experiment.evaluationEndsAt) > now
    ? experiment.evaluationEndsAt
    : new Date(now.getTime() + 14 * 86_400_000).toISOString();
  await db.prepare(
    "UPDATE growth_experiments SET baseline_value = ?, baseline_captured_at = ?, evaluation_starts_at = ?, evaluation_ends_at = ?, status = 'running', updated_at = ? WHERE id = ? AND workspace_id = ? AND status = 'planned'",
  ).bind(baseline.value, now.toISOString(), now.toISOString(), end, now.toISOString(), experiment.id, experiment.workspaceId).run();
  return { started: true, baseline };
}

async function completeExperiment(db: Db, experiment: Experiment, now: Date) {
  const snapshot = await metricSnapshot(db, experiment.workspaceId, experiment.id, experiment.primaryMetric, now);
  const campaignSample = experiment.primaryMetric === "impressions"
    ? snapshot.value >= 100
    : experiment.primaryMetric === "clicks"
      ? snapshot.value >= 10
      : true;
  const evaluation = evaluateExperiment({
    baseline: experiment.baselineValue ?? 0,
    current: snapshot.value,
    target: experiment.targetValue,
    minimumDelta: experiment.minimumDelta,
    successThresholdPct: experiment.successThresholdPct,
    hasReliableSample: campaignSample,
  });
  const summary = `${experiment.name}: ${snapshot.metric} moved from ${experiment.baselineValue ?? 0} to ${snapshot.value} (${evaluation.delta >= 0 ? "+" : ""}${evaluation.delta.toFixed(2)}). Outcome: ${evaluation.outcome}.`;
  const inserted = await db.prepare(
    `INSERT OR IGNORE INTO experiment_results
      (workspace_id, experiment_id, metric_value, outcome, confidence, summary, evidence_json, measured_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    experiment.workspaceId,
    experiment.id,
    snapshot.value,
    evaluation.outcome,
    evaluation.confidence,
    summary,
    JSON.stringify([...snapshot.evidence, `baseline:${experiment.baselineValue ?? 0}`, `delta:${evaluation.delta}`, `relative_delta:${evaluation.relativeDelta}`]),
    now.toISOString(),
  ).run();
  if ((inserted.meta?.changes ?? 0) === 0) return { completed: false, reason: "idempotent" };
  await db.prepare(
    "UPDATE growth_experiments SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ? AND workspace_id = ?",
  ).bind(now.toISOString(), now.toISOString(), experiment.id, experiment.workspaceId).run();
  const learning = await refreshStrategyLearning(db, experiment.workspaceId, experiment.strategyKey, now);
  return { completed: true, outcome: evaluation.outcome, result: evaluation, learning };
}

export async function advanceWorkspaceExperiments(db: Db, workspaceId: string, now = new Date(), limit = 12) {
  const rows = await db.prepare(
    `SELECT id, workspace_id AS workspaceId, name, strategy_key AS strategyKey, primary_metric AS primaryMetric,
      baseline_value AS baselineValue, target_value AS targetValue, minimum_delta AS minimumDelta,
      success_threshold_pct AS successThresholdPct, evaluation_starts_at AS evaluationStartsAt,
      evaluation_ends_at AS evaluationEndsAt, status
     FROM growth_experiments
     WHERE workspace_id = ? AND status IN ('planned', 'running', 'measuring')
     ORDER BY id LIMIT ?`,
  ).bind(workspaceId, limit).all<Experiment>();
  const results: unknown[] = [];
  for (const experiment of rows.results) {
    if (experiment.status === "planned") {
      results.push({ experimentId: experiment.id, ...(await startExperiment(db, experiment, now)) });
      continue;
    }
    const due = experiment.evaluationEndsAt && new Date(experiment.evaluationEndsAt) <= now;
    if (due) results.push({ experimentId: experiment.id, ...(await completeExperiment(db, experiment, now)) });
  }
  return { considered: rows.results.length, results };
}

export async function runDueExperimentEvaluations(db: Db, now = new Date(), workspaceLimit = 20) {
  const due = await db.prepare(
    `SELECT DISTINCT workspace_id AS workspaceId
     FROM growth_experiments
     WHERE status = 'planned'
        OR (status IN ('running', 'measuring') AND evaluation_ends_at IS NOT NULL AND datetime(evaluation_ends_at) <= datetime(?))
     ORDER BY workspace_id LIMIT ?`,
  ).bind(now.toISOString(), workspaceLimit).all<{ workspaceId: string }>();
  const workspaces = [];
  for (const item of due.results) workspaces.push({ workspaceId: item.workspaceId, ...(await advanceWorkspaceExperiments(db, item.workspaceId, now)) });
  return { considered: due.results.length, workspaces };
}
