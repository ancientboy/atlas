import { decryptConnectionSecret } from "./connection-vault.ts";

export type PostHogMetricConfig = {
  host: string;
  projectId: string;
  pageviewEvent: string;
  signupEvent: string;
  paidEvent: string;
};

export type GrowthMetricCounts = { visits: number; signups: number; paid: number };
type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const officialHosts = new Set(["us.posthog.com", "eu.posthog.com"]);
const eventPattern = /^[\w$.:/-]{1,120}$/;

export function normalizePostHogHost(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash || !officialHosts.has(url.hostname)) {
    throw new Error("Use an official PostHog US or EU host.");
  }
  return `https://${url.hostname}`;
}

export function normalizePostHogConfig(input: Partial<PostHogMetricConfig>): PostHogMetricConfig {
  const projectId = String(input.projectId ?? "").trim();
  if (!/^\d{1,20}$/.test(projectId)) throw new Error("PostHog project ID is invalid.");
  const pageviewEvent = String(input.pageviewEvent ?? "$pageview").trim();
  const signupEvent = String(input.signupEvent ?? "user_signed_up").trim();
  const paidEvent = String(input.paidEvent ?? "subscription_started").trim();
  for (const event of [pageviewEvent, signupEvent, paidEvent]) if (!eventPattern.test(event)) throw new Error("PostHog event name is invalid.");
  return { host: normalizePostHogHost(input.host ?? "https://us.posthog.com"), projectId, pageviewEvent, signupEvent, paidEvent };
}

function hogqlString(value: string) { return `'${value.replaceAll("'", "\\'")}'`; }

export function buildPostHogGrowthQuery(config: PostHogMetricConfig, date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Metric date is invalid.");
  const start = `${date} 00:00:00`;
  const end = new Date(`${date}T00:00:00.000Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  const endText = `${end.toISOString().slice(0, 10)} 00:00:00`;
  const events = [config.pageviewEvent, config.signupEvent, config.paidEvent].map(hogqlString).join(", ");
  return `SELECT event, count(DISTINCT distinct_id) AS people FROM events WHERE timestamp >= toDateTime('${start}') AND timestamp < toDateTime('${endText}') AND event IN (${events}) GROUP BY event LIMIT 3`;
}

export function parsePostHogGrowthResults(results: unknown, config: PostHogMetricConfig): GrowthMetricCounts {
  const counts = new Map<string, number>();
  if (Array.isArray(results)) for (const row of results) {
    if (!Array.isArray(row) || typeof row[0] !== "string") continue;
    counts.set(row[0], Math.max(0, Math.floor(Number(row[1]) || 0)));
  }
  return { visits: counts.get(config.pageviewEvent) ?? 0, signups: counts.get(config.signupEvent) ?? 0, paid: counts.get(config.paidEvent) ?? 0 };
}

export async function fetchPostHogGrowthMetrics(config: PostHogMetricConfig, apiKey: string, date: string, fetcher: Fetcher = fetch) {
  if (!apiKey || apiKey.length < 12) throw new Error("PostHog personal API key is invalid.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetcher(`${config.host}/api/projects/${config.projectId}/query/`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query: buildPostHogGrowthQuery(config, date) }, name: "atlas_daily_growth_metrics", refresh: "blocking" }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("PostHog credentials or project access could not be verified.");
    const payload = await response.json() as { results?: unknown };
    if (!Array.isArray(payload.results)) throw new Error("PostHog returned an invalid metric response.");
    return parsePostHogGrowthResults(payload.results, config);
  } finally { clearTimeout(timeout); }
}

export async function syncPostHogConnection(db: D1Database, workspaceId: string, masterKey: string | undefined, options: { date?: string; connectionId?: number; fetcher?: Fetcher } = {}) {
  const startedAt = new Date().toISOString();
  const date = options.date ?? startedAt.slice(0, 10);
  const connection = await db.prepare("SELECT id, external_account_id AS projectId, credential_ciphertext AS credentialCiphertext, metadata_json AS metadataJson FROM platform_connections WHERE workspace_id = ? AND provider = 'posthog' AND status = 'connected' AND (? IS NULL OR id = ?) ORDER BY updated_at DESC LIMIT 1")
    .bind(workspaceId, options.connectionId ?? null, options.connectionId ?? null)
    .first<{ id: number; projectId: string; credentialCiphertext: string; metadataJson: string }>();
  if (!connection?.credentialCiphertext) throw new Error("PostHog is not connected.");
  const metadata = JSON.parse(connection.metadataJson || "{}") as Partial<PostHogMetricConfig>;
  const config = normalizePostHogConfig({ ...metadata, projectId: connection.projectId });
  const secret = await decryptConnectionSecret(connection.credentialCiphertext, masterKey);
  const run = await db.prepare("INSERT INTO analytics_sync_runs (workspace_id, connection_id, provider, metric_date, status, started_at) VALUES (?, ?, 'posthog', ?, 'running', ?) RETURNING id")
    .bind(workspaceId, connection.id, date, startedAt).first<{ id: number }>();
  try {
    const counts = await fetchPostHogGrowthMetrics(config, secret.accessToken, date, options.fetcher);
    const conversion = counts.visits ? Math.round((counts.signups / counts.visits) * 10_000) / 100 : 0;
    const finishedAt = new Date().toISOString();
    const updated = await db.prepare("UPDATE metrics SET visits = ?, signups = ?, paid = ?, conversion = ? WHERE workspace_id = ? AND metric_date = ?")
      .bind(counts.visits, counts.signups, counts.paid, conversion, workspaceId, date).run();
    const statements = [
      ...((updated.meta?.changes ?? 0) > 0 ? [] : [db.prepare("INSERT INTO metrics (workspace_id, metric_date, visits, signups, paid, conversion, completed_tasks) VALUES (?, ?, ?, ?, ?, ?, 0)").bind(workspaceId, date, counts.visits, counts.signups, counts.paid, conversion)]),
      db.prepare("UPDATE analytics_sync_runs SET status = 'completed', visits = ?, signups = ?, paid = ?, finished_at = ? WHERE id = ? AND workspace_id = ?").bind(counts.visits, counts.signups, counts.paid, finishedAt, run?.id ?? 0, workspaceId),
      db.prepare("UPDATE platform_connections SET last_sync_at = ?, metadata_json = ?, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(finishedAt, JSON.stringify({ ...config, lastStatus: "completed", lastError: null, lastSyncedMetricDate: date }), finishedAt, connection.id, workspaceId),
      db.prepare("INSERT INTO agent_tool_calls (workspace_id, job_id, run_id, tool_name, status, input_json, output_json, started_at, finished_at) VALUES (?, NULL, NULL, 'PostHogMetricsTool', 'completed', ?, ?, ?, ?)").bind(workspaceId, JSON.stringify({ connectionId: connection.id, date }), JSON.stringify(counts), startedAt, finishedAt),
    ];
    await db.batch(statements);
    return { date, ...counts, connectionId: connection.id };
  } catch {
    const finishedAt = new Date().toISOString();
    const safeError = "PostHog metrics could not be refreshed. Atlas will retry safely.";
    await db.batch([
      db.prepare("UPDATE analytics_sync_runs SET status = 'failed', error_code = 'posthog_sync_failed', finished_at = ? WHERE id = ? AND workspace_id = ?").bind(finishedAt, run?.id ?? 0, workspaceId),
      db.prepare("UPDATE platform_connections SET metadata_json = ?, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(JSON.stringify({ ...config, lastStatus: "failed", lastError: safeError, lastSyncedMetricDate: date }), finishedAt, connection.id, workspaceId),
      db.prepare("INSERT INTO agent_tool_calls (workspace_id, job_id, run_id, tool_name, status, input_json, error_code, started_at, finished_at) VALUES (?, NULL, NULL, 'PostHogMetricsTool', 'failed', ?, 'posthog_sync_failed', ?, ?)").bind(workspaceId, JSON.stringify({ connectionId: connection.id, date }), startedAt, finishedAt),
    ]);
    throw new Error(safeError);
  }
}
