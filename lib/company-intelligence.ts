type Db = D1Database;

export type CompanyIntelligence = {
  snapshotDate: string;
  goal: { id: number; title: string; targetMetric: string | null; targetValue: number | null; currentValue: number | null } | null;
  metric: { name: string | null; value: number | null; previousValue: number | null; delta: number | null };
  healthScore: number;
  summary: string;
  evidence: string[];
  connectedProviders: string[];
};

const dateKey = (now = new Date()) => now.toISOString().slice(0, 10);
const metricColumn = (metric: string | null | undefined) => metric === "visits" || metric === "paid" || metric === "signups" ? metric : "signups";
const numberOrNull = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;

export function intelligenceHealthScore(input: { current: number | null; previous: number | null; target: number | null; connections: number }) {
  let score = input.connections > 0 ? 65 : 45;
  if (input.current !== null && input.previous !== null) {
    if (input.current > input.previous) score += 15;
    if (input.current < input.previous) score -= 18;
  }
  if (input.current !== null && input.target !== null && input.target > 0) score += Math.min(20, Math.round((input.current / input.target) * 20));
  return Math.max(0, Math.min(100, score));
}

export async function refreshCompanyIntelligence(db: Db, workspaceId: string, now = new Date()): Promise<CompanyIntelligence> {
  const snapshotDate = dateKey(now);
  const [goal, rows, connections] = await Promise.all([
    db.prepare("SELECT id, title, target_metric AS targetMetric, target_value AS targetValue, current_value AS currentValue FROM company_goals WHERE workspace_id = ? AND status = 'active' ORDER BY priority, id LIMIT 1").bind(workspaceId).first<{ id: number; title: string; targetMetric: string | null; targetValue: number | null; currentValue: number | null }>(),
    db.prepare("SELECT metric_date AS metricDate, visits, signups, paid FROM metrics WHERE workspace_id = ? ORDER BY metric_date DESC, id DESC LIMIT 2").bind(workspaceId).all<{ metricDate: string; visits: number; signups: number; paid: number }>(),
    db.prepare("SELECT provider FROM platform_connections WHERE workspace_id = ? AND status = 'connected' ORDER BY provider LIMIT 12").bind(workspaceId).all<{ provider: string }>(),
  ]);
  const name = metricColumn(goal?.targetMetric);
  const latest = rows.results[0] ?? null;
  const previous = rows.results[1] ?? null;
  const currentValue = latest ? numberOrNull(latest[name]) : null;
  const previousValue = previous ? numberOrNull(previous[name]) : null;
  const delta = currentValue !== null && previousValue !== null ? currentValue - previousValue : null;
  const providers = connections.results.map((item) => item.provider);
  const healthScore = intelligenceHealthScore({ current: currentValue, previous: previousValue, target: goal?.targetValue ?? null, connections: providers.length });
  const evidence = [
    latest ? `Latest ${name}: ${currentValue ?? 0} on ${latest.metricDate}.` : "No growth metric has been recorded yet.",
    previousValue !== null && delta !== null ? `Change from previous snapshot: ${delta >= 0 ? "+" : ""}${delta}.` : "A comparison baseline is not available yet.",
    providers.length ? `Connected data sources: ${providers.join(", ")}.` : "No analytics connection is configured; Atlas is using internal workspace metrics only.",
  ];
  const summary = currentValue === null
    ? "Atlas needs a first metric snapshot before it can evaluate goal progress."
    : delta === null
      ? `Atlas recorded the first ${name} baseline for the active company goal.`
      : delta >= 0
        ? `${name} is moving in the right direction; Atlas will keep measuring the active goal.`
        : `${name} declined since the previous snapshot; Atlas will prioritize evidence-backed recovery work.`;
  await db.batch([
    ...(goal && currentValue !== null ? [db.prepare("UPDATE company_goals SET current_value = ?, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(currentValue, now.toISOString(), goal.id, workspaceId)] : []),
    db.prepare("INSERT INTO company_intelligence_snapshots (workspace_id, snapshot_date, goal_id, metric_name, metric_value, previous_value, metric_delta, health_score, evidence_json, summary, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(workspace_id, snapshot_date) DO UPDATE SET goal_id = excluded.goal_id, metric_name = excluded.metric_name, metric_value = excluded.metric_value, previous_value = excluded.previous_value, metric_delta = excluded.metric_delta, health_score = excluded.health_score, evidence_json = excluded.evidence_json, summary = excluded.summary, updated_at = excluded.updated_at").bind(workspaceId, snapshotDate, goal?.id ?? null, currentValue === null ? null : name, currentValue, previousValue, delta, healthScore, JSON.stringify(evidence), summary, now.toISOString()),
  ]);
  return { snapshotDate, goal: goal ? { ...goal, currentValue } : null, metric: { name: currentValue === null ? null : name, value: currentValue, previousValue, delta }, healthScore, summary, evidence, connectedProviders: providers };
}
