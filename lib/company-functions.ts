type Db = D1Database;

export type CompanyFunctionKey = "growth" | "product" | "sales";
export type CompanyFunctionSnapshot = {
  functionKey: CompanyFunctionKey;
  status: "observing" | "ready" | "acting" | "learning";
  confidence: number;
  summary: string;
  nextAction: string;
  evidence: string[];
  metricName: string | null;
  metricValue: number | null;
};

const nowText = () => new Date().toISOString();
const safeParse = <T>(value: string | null | undefined, fallback: T): T => { try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } };

export function deriveCompanyFunctions(input: {
  productName?: string | null;
  productAnalysis?: Record<string, unknown> | null;
  visits: number;
  signups: number;
  paid: number;
  opportunities: number;
  completedExperiments: number;
}): CompanyFunctionSnapshot[] {
  const conversion = input.visits > 0 ? (input.signups / input.visits) * 100 : 0;
  const activationEvidence = input.productAnalysis ? ["Validated Product Analysis"] : ["Product analysis is not complete"];
  const growth: CompanyFunctionSnapshot = {
    functionKey: "growth",
    status: input.opportunities > 0 ? "acting" : "observing",
    confidence: input.opportunities > 0 ? 82 : 58,
    summary: input.opportunities > 0
      ? `Atlas is tracking ${input.opportunities} qualified growth opportunity(ies) and ${input.completedExperiments} completed experiment(s).`
      : "Atlas is observing company signals before recommending a growth experiment.",
    nextAction: input.opportunities > 0 ? "Prioritize the best attributable growth experiment." : "Collect a fresh website, search, or analytics signal.",
    evidence: [`${input.opportunities} qualified opportunities`, `${input.completedExperiments} completed experiments`],
    metricName: "signups",
    metricValue: input.signups,
  };
  const product: CompanyFunctionSnapshot = {
    functionKey: "product",
    status: input.productAnalysis ? (conversion > 0 && conversion < 3 ? "acting" : "ready") : "observing",
    confidence: input.productAnalysis ? 78 : 45,
    summary: input.productAnalysis
      ? `${input.productName ?? "The product"} has a verified product profile; visit-to-signup conversion is ${conversion.toFixed(1)}%.`
      : "Product Intelligence is waiting for a verified product profile.",
    nextAction: !input.productAnalysis
      ? "Complete Product Analysis."
      : conversion > 0 && conversion < 3
        ? "Audit the activation path and value proposition before adding acquisition spend."
        : "Validate the highest-risk product assumption with user evidence.",
    evidence: [...activationEvidence, `${input.visits} visits`, `${input.signups} signups`],
    metricName: "conversion",
    metricValue: Number(conversion.toFixed(2)),
  };
  const sales: CompanyFunctionSnapshot = {
    functionKey: "sales",
    status: input.signups > 0 ? (input.paid > 0 ? "learning" : "ready") : "observing",
    confidence: input.signups > 0 ? 72 : 48,
    summary: input.signups > 0
      ? `${input.signups} signup(s) and ${input.paid} paid conversion(s) provide the first sales signal.`
      : "Sales Intelligence is waiting for qualified signup or lead evidence.",
    nextAction: input.signups === 0
      ? "Clarify the ideal customer and create a measurable lead capture path."
      : input.paid === 0
        ? "Review qualified signups and document the objections blocking first payment."
        : "Extract the common trigger and objection pattern from paid conversions.",
    evidence: [`${input.signups} signups`, `${input.paid} paid conversions`],
    metricName: "paid",
    metricValue: input.paid,
  };
  return [growth, product, sales];
}

export async function refreshCompanyFunctions(db: Db, workspaceId: string, now = new Date()) {
  const [product, metrics, opportunities, experiments] = await Promise.all([
    db.prepare("SELECT name, analysis_json AS analysisJson FROM products WHERE workspace_id = ? AND analysis_status = 'completed' ORDER BY id DESC LIMIT 1").bind(workspaceId).first<{ name: string; analysisJson: string | null }>(),
    db.prepare("SELECT visits, signups, paid FROM metrics WHERE workspace_id = ? ORDER BY metric_date DESC, id DESC LIMIT 1").bind(workspaceId).first<{ visits: number; signups: number; paid: number }>(),
    db.prepare("SELECT COUNT(*) AS count FROM opportunities WHERE workspace_id = ? AND status NOT IN ('ignored', 'archived')").bind(workspaceId).first<{ count: number }>(),
    db.prepare("SELECT COUNT(*) AS count FROM growth_experiments WHERE workspace_id = ? AND status = 'completed'").bind(workspaceId).first<{ count: number }>(),
  ]);
  const snapshots = deriveCompanyFunctions({
    productName: product?.name,
    productAnalysis: safeParse<Record<string, unknown> | null>(product?.analysisJson, null),
    visits: metrics?.visits ?? 0,
    signups: metrics?.signups ?? 0,
    paid: metrics?.paid ?? 0,
    opportunities: opportunities?.count ?? 0,
    completedExperiments: experiments?.count ?? 0,
  });
  const timestamp = now.toISOString();
  for (const snapshot of snapshots) {
    await db.prepare(
      `INSERT INTO company_function_snapshots
        (workspace_id, function_key, status, confidence, summary, next_action, evidence_json, metric_name, metric_value, observed_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(workspace_id, function_key) DO UPDATE SET
         status = excluded.status,
         confidence = excluded.confidence,
         summary = excluded.summary,
         next_action = excluded.next_action,
         evidence_json = excluded.evidence_json,
         metric_name = excluded.metric_name,
         metric_value = excluded.metric_value,
         observed_at = excluded.observed_at,
         updated_at = excluded.updated_at`,
    ).bind(workspaceId, snapshot.functionKey, snapshot.status, snapshot.confidence, snapshot.summary, snapshot.nextAction, JSON.stringify(snapshot.evidence), snapshot.metricName, snapshot.metricValue, timestamp, timestamp).run();
  }
  await ensureFunctionOpportunity(db, workspaceId, snapshots, now);
  return snapshots;
}

async function ensureFunctionOpportunity(db: Db, workspaceId: string, snapshots: CompanyFunctionSnapshot[], now: Date) {
  const product = snapshots.find((item) => item.functionKey === "product");
  const sales = snapshots.find((item) => item.functionKey === "sales");
  const candidates = [
    product?.status === "acting" ? {
      key: "company-function:product:activation",
      title: "Product activation path needs a focused conversion audit",
      summary: product.summary,
      action: product.nextAction,
      signal: "Product Intelligence",
      confidence: product.confidence,
    } : null,
    sales?.status === "ready" ? {
      key: "company-function:sales:first-revenue",
      title: "Qualified signups need a first-revenue learning loop",
      summary: sales.summary,
      action: sales.nextAction,
      signal: "Sales Intelligence",
      confidence: sales.confidence,
    } : null,
  ].filter(Boolean) as Array<{ key: string; title: string; summary: string; action: string; signal: string; confidence: number }>;
  for (const candidate of candidates) {
    await db.prepare(
      `INSERT INTO opportunities
        (workspace_id, title, source, observed_at, confidence, summary, suggested_action, status, signal, dedupe_key, evidence_json, expected_impact, effort, risk_level, discovered_at, last_seen_at)
       VALUES (?, ?, 'Atlas Company Functions', ?, ?, ?, ?, 'new', ?, ?, ?, ?, 2, 1, ?, ?)
       ON CONFLICT(workspace_id, dedupe_key) DO UPDATE SET
         confidence = excluded.confidence,
         summary = excluded.summary,
         suggested_action = excluded.suggested_action,
         evidence_json = excluded.evidence_json,
         last_seen_at = excluded.last_seen_at`,
    ).bind(workspaceId, candidate.title, now.toISOString(), candidate.confidence, candidate.summary, candidate.action, candidate.signal, candidate.key, JSON.stringify([candidate.signal, candidate.summary]), "A verified product or sales learning that changes the next company decision.", now.toISOString(), now.toISOString()).run();
  }
}

export async function recordRuntimeHeartbeat(db: Db, input: {
  workspaceId: string;
  source: string;
  status: "running" | "healthy" | "failed";
  startedAt: string;
  completedAt?: string | null;
  nextExpectedAt?: string | null;
  details?: Record<string, unknown>;
}) {
  await db.prepare(
    `INSERT INTO runtime_heartbeats
      (workspace_id, source, status, started_at, completed_at, next_expected_at, details_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(workspace_id) DO UPDATE SET
       source = excluded.source,
       status = excluded.status,
       started_at = excluded.started_at,
       completed_at = excluded.completed_at,
       next_expected_at = excluded.next_expected_at,
       details_json = excluded.details_json,
       updated_at = excluded.updated_at`,
  ).bind(input.workspaceId, input.source, input.status, input.startedAt, input.completedAt ?? null, input.nextExpectedAt ?? null, JSON.stringify(input.details ?? {}), nowText()).run();
}
