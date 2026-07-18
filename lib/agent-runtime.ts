export const dailyGrowthJobType = "daily_growth_reflection";
export const observationScanJobType = "observation_scan";
export const analyticsSyncJobType = "analytics_sync";

export type AgentSchedule = {
  id: number;
  workspaceId: string;
  agentId: number;
  scheduleKey: string;
  timezone: string;
  localTime: string;
  enabled: number;
  lastRunDate: string | null;
  cadenceMinutes: number | null;
  nextRunAt: string | null;
};

export type AgentJob = {
  id: number;
  workspaceId: string;
  agentId: number;
  scheduleId: number | null;
  jobType: string;
  status: string;
  attemptCount: number;
  maxAttempts: number;
  inputJson: string;
};

export type AgentJobExecutor = (job: AgentJob) => Promise<Record<string, unknown>>;

export function localScheduleState(now: Date, timezone: string, localTime: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(localTime)) throw new Error("Invalid runtime schedule time.");
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
  } catch {
    throw new Error("Invalid runtime schedule timezone.");
  }
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const date = `${value("year")}-${value("month")}-${value("day")}`;
  const minutes = Number(value("hour")) * 60 + Number(value("minute"));
  const [scheduledHour, scheduledMinute] = localTime.split(":").map(Number);
  return { date, due: minutes >= scheduledHour * 60 + scheduledMinute };
}

export function dailyGrowthIdempotencyKey(workspaceId: string, localDate: string) {
  return `${dailyGrowthJobType}:${workspaceId}:${localDate}`;
}

export function observationScanIdempotencyKey(workspaceId: string, now: Date, cadenceMinutes: number) {
  const bucket = Math.floor(now.getTime() / (Math.max(1, cadenceMinutes) * 60_000));
  return `${observationScanJobType}:${workspaceId}:${bucket}`;
}

export function analyticsSyncIdempotencyKey(workspaceId: string, now: Date, cadenceMinutes: number) {
  const bucket = Math.floor(now.getTime() / (Math.max(1, cadenceMinutes) * 60_000));
  return `${analyticsSyncJobType}:${workspaceId}:${bucket}`;
}

export function runtimeRetryDelayMs(attemptCount: number) {
  return Math.min(60 * 60 * 1000, 30_000 * 2 ** Math.max(0, attemptCount - 1));
}

async function digest(value: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

export async function isRuntimeRequestAuthorized(headers: Headers, expectedSecret?: string) {
  if (!expectedSecret || expectedSecret.length < 32) return false;
  const authorization = headers.get("authorization");
  const provided = authorization?.startsWith("Bearer ") ? authorization.slice(7) : headers.get("x-atlas-runtime-secret") ?? "";
  const [actualHash, expectedHash] = await Promise.all([digest(provided), digest(expectedSecret)]);
  let difference = provided.length === expectedSecret.length ? 0 : 1;
  for (let index = 0; index < expectedHash.length; index += 1) difference |= actualHash[index] ^ expectedHash[index];
  return difference === 0;
}

export async function ensureGrowthOperatorSchedules(db: D1Database, workspaceId?: string) {
  const condition = "a.role = 'Growth Operator' AND EXISTS (SELECT 1 FROM workspaces w WHERE w.id = a.workspace_id AND w.autonomy_enabled != 0) AND EXISTS (SELECT 1 FROM products p WHERE p.workspace_id = a.workspace_id AND p.analysis_status = 'completed')";
  const suffix = workspaceId ? " AND a.workspace_id = ?" : "";
  const daily = db.prepare(`INSERT OR IGNORE INTO agent_schedules (workspace_id, agent_id, schedule_key, timezone, local_time, enabled) SELECT a.workspace_id, a.id, 'daily_growth', 'UTC', '08:00', 1 FROM agents a WHERE ${condition}${suffix}`);
  const observations = db.prepare(`INSERT OR IGNORE INTO agent_schedules (workspace_id, agent_id, schedule_key, timezone, local_time, enabled, cadence_minutes, next_run_at) SELECT a.workspace_id, a.id, 'observation_scan', 'UTC', '00:00', 1, 360, CURRENT_TIMESTAMP FROM agents a WHERE ${condition}${suffix}`);
  const analyticsCondition = `${condition} AND EXISTS (SELECT 1 FROM platform_connections pc WHERE pc.workspace_id = a.workspace_id AND pc.provider = 'posthog' AND pc.status = 'connected')`;
  const analytics = db.prepare(`INSERT OR IGNORE INTO agent_schedules (workspace_id, agent_id, schedule_key, timezone, local_time, enabled, cadence_minutes, next_run_at) SELECT a.workspace_id, a.id, 'analytics_sync', 'UTC', '00:00', 1, 360, CURRENT_TIMESTAMP FROM agents a WHERE ${analyticsCondition}${suffix}`);
  if (workspaceId) await db.batch([daily.bind(workspaceId), observations.bind(workspaceId), analytics.bind(workspaceId)]);
  else await db.batch([daily, observations, analytics]);
}

export async function runAgentRuntimeTick(
  db: D1Database,
  executor: AgentJobExecutor,
  now = new Date(),
  limit = 20,
) {
  await ensureGrowthOperatorSchedules(db);
  const nowText = now.toISOString();
  const schedules = await db.prepare("SELECT s.id, s.workspace_id AS workspaceId, s.agent_id AS agentId, s.schedule_key AS scheduleKey, s.timezone, s.local_time AS localTime, s.enabled, s.last_run_date AS lastRunDate, s.cadence_minutes AS cadenceMinutes, s.next_run_at AS nextRunAt FROM agent_schedules s INNER JOIN workspaces w ON w.id = s.workspace_id WHERE s.enabled = 1 AND w.autonomy_enabled != 0 AND s.schedule_key IN ('daily_growth', 'observation_scan', 'analytics_sync') ORDER BY CASE s.schedule_key WHEN 'analytics_sync' THEN 0 WHEN 'observation_scan' THEN 1 ELSE 2 END, s.id LIMIT 400").all<AgentSchedule>();
  let enqueued = 0;

  for (const schedule of schedules.results) {
    if (schedule.scheduleKey === "observation_scan" || schedule.scheduleKey === "analytics_sync") {
      const cadenceMinutes = schedule.cadenceMinutes ?? 360;
      if (schedule.nextRunAt && new Date(schedule.nextRunAt).getTime() > now.getTime()) continue;
      const nextRunAt = new Date(now.getTime() + cadenceMinutes * 60_000).toISOString();
      const jobType = schedule.scheduleKey === "analytics_sync" ? analyticsSyncJobType : observationScanJobType;
      const idempotencyKey = schedule.scheduleKey === "analytics_sync" ? analyticsSyncIdempotencyKey(schedule.workspaceId, now, cadenceMinutes) : observationScanIdempotencyKey(schedule.workspaceId, now, cadenceMinutes);
      const result = await db.prepare("INSERT OR IGNORE INTO agent_jobs (workspace_id, agent_id, schedule_id, job_type, idempotency_key, status, scheduled_for, input_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'queued', ?, ?, ?, ?)")
        .bind(schedule.workspaceId, schedule.agentId, schedule.id, jobType, idempotencyKey, nowText, JSON.stringify({ scheduledAt: nowText, nextRunAt, cadenceMinutes, metricDate: nowText.slice(0, 10) }), nowText, nowText)
        .run();
      if ((result.meta?.changes ?? 0) > 0) enqueued += 1;
      continue;
    }
    const state = localScheduleState(now, schedule.timezone, schedule.localTime);
    if (!state.due || schedule.lastRunDate === state.date) continue;
    const result = await db.prepare("INSERT OR IGNORE INTO agent_jobs (workspace_id, agent_id, schedule_id, job_type, idempotency_key, status, scheduled_for, input_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'queued', ?, ?, ?, ?)")
      .bind(schedule.workspaceId, schedule.agentId, schedule.id, dailyGrowthJobType, dailyGrowthIdempotencyKey(schedule.workspaceId, state.date), nowText, JSON.stringify({ localDate: state.date, timezone: schedule.timezone }), nowText, nowText)
      .run();
    if ((result.meta?.changes ?? 0) > 0) enqueued += 1;
  }

  const due = await db.prepare("SELECT j.id, j.workspace_id AS workspaceId, j.agent_id AS agentId, j.schedule_id AS scheduleId, j.job_type AS jobType, j.status, j.attempt_count AS attemptCount, j.max_attempts AS maxAttempts, j.input_json AS inputJson FROM agent_jobs j INNER JOIN workspaces w ON w.id = j.workspace_id WHERE w.autonomy_enabled != 0 AND ((j.status IN ('queued', 'retrying') AND (j.next_attempt_at IS NULL OR datetime(j.next_attempt_at) <= datetime(?))) OR (j.status = 'running' AND datetime(j.lease_expires_at) <= datetime(?))) AND datetime(j.scheduled_for) <= datetime(?) ORDER BY CASE j.job_type WHEN 'analytics_sync' THEN 0 WHEN 'observation_scan' THEN 1 ELSE 2 END, j.scheduled_for, j.id LIMIT ?")
    .bind(nowText, nowText, nowText, limit)
    .all<AgentJob>();

  let completed = 0;
  let failed = 0;
  let retried = 0;
  for (const candidate of due.results) {
    const leaseToken = crypto.randomUUID();
    const leaseExpiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
    await db.prepare("UPDATE agent_jobs SET status = 'running', lease_token = ?, lease_expires_at = ?, attempt_count = attempt_count + 1, started_at = COALESCE(started_at, ?), updated_at = ? WHERE id = ? AND ((status IN ('queued', 'retrying') AND (next_attempt_at IS NULL OR datetime(next_attempt_at) <= datetime(?))) OR (status = 'running' AND datetime(lease_expires_at) <= datetime(?)))")
      .bind(leaseToken, leaseExpiresAt, nowText, nowText, candidate.id, nowText, nowText)
      .run();
    const job = await db.prepare("SELECT id, workspace_id AS workspaceId, agent_id AS agentId, schedule_id AS scheduleId, job_type AS jobType, status, attempt_count AS attemptCount, max_attempts AS maxAttempts, input_json AS inputJson FROM agent_jobs WHERE id = ? AND lease_token = ? AND status = 'running'")
      .bind(candidate.id, leaseToken)
      .first<AgentJob>();
    if (!job) continue;

    try {
      const output = await executor(job);
      const finishedAt = new Date().toISOString();
      const input = JSON.parse(job.inputJson) as { localDate?: string; nextRunAt?: string };
      await db.batch([
        db.prepare("UPDATE agent_jobs SET status = 'completed', output_json = ?, last_error = NULL, lease_token = NULL, lease_expires_at = NULL, finished_at = ?, updated_at = ? WHERE id = ? AND lease_token = ?").bind(JSON.stringify(output), finishedAt, finishedAt, job.id, leaseToken),
        db.prepare("UPDATE agent_schedules SET last_run_date = ?, last_run_at = ?, last_status = 'completed', last_error = NULL, next_run_at = COALESCE(?, next_run_at), updated_at = ? WHERE id = ? AND workspace_id = ?").bind(input.localDate ?? finishedAt.slice(0, 10), finishedAt, input.nextRunAt ?? null, finishedAt, job.scheduleId, job.workspaceId),
      ]);
      completed += 1;
    } catch {
      const failedAt = new Date().toISOString();
      const exhausted = job.attemptCount >= job.maxAttempts;
      const nextAttemptAt = new Date(now.getTime() + runtimeRetryDelayMs(job.attemptCount)).toISOString();
      const safeError = "Runtime job failed. Atlas will retry safely.";
      await db.batch([
        db.prepare("UPDATE agent_jobs SET status = ?, next_attempt_at = ?, last_error = ?, lease_token = NULL, lease_expires_at = NULL, finished_at = ?, updated_at = ? WHERE id = ? AND lease_token = ?").bind(exhausted ? "failed" : "retrying", exhausted ? null : nextAttemptAt, safeError, exhausted ? failedAt : null, failedAt, job.id, leaseToken),
        ...(exhausted ? [db.prepare("UPDATE agent_schedules SET last_run_at = ?, last_status = 'failed', last_error = ?, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(failedAt, safeError, failedAt, job.scheduleId, job.workspaceId)] : []),
      ]);
      if (exhausted) failed += 1;
      else retried += 1;
    }
  }

  return { scannedSchedules: schedules.results.length, enqueued, completed, retried, failed };
}
