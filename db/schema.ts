import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};


export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique(),
  name: text("name"),
  locale: text("locale").notNull().default("zh"),
  ...timestamps,
});

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdByUserId: text("created_by_user_id").notNull(),
  autonomyEnabled: integer("autonomy_enabled").notNull().default(1),
  autonomyUpdatedAt: text("autonomy_updated_at"),
  ...timestamps,
});

export const workspaceMembers = sqliteTable("workspace_members", {
  workspaceId: text("workspace_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("owner"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  growthGoal: text("growth_goal"),
  analysisStatus: text("analysis_status").notNull().default("pending"),
  analysisError: text("analysis_error"),
  analysisJson: text("analysis_json"),
  fetchedTitle: text("fetched_title"),
  fetchedDescription: text("fetched_description"),
  ...timestamps,
});

export const founders = sqliteTable("founders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  product: text("product").notNull(),
  url: text("url"),
  stage: text("stage").notNull().default("pre-revenue"),
  segment: text("segment").notNull().default("AI indie hacker"),
  primaryChannel: text("primary_channel"),
  monthlyRevenue: integer("monthly_revenue").notNull().default(0),
  topPain: text("top_pain"),
  source: text("source"),
  notes: text("notes"),
  ...timestamps,
});

export const pains = sqliteTable("pains", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  frequency: integer("frequency").notNull().default(3),
  severity: integer("severity").notNull().default(3),
  willingnessToPay: integer("willingness_to_pay").notNull().default(3),
  evidenceCount: integer("evidence_count").notNull().default(1),
  currentSolution: text("current_solution"),
  opportunityScore: real("opportunity_score").notNull().default(0),
  status: text("status").notNull().default("observed"),
  ...timestamps,
});

export const landscapeEntities = sqliteTable("landscape_entities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  url: text("url"),
  positioning: text("positioning"),
  pricing: text("pricing"),
  strengths: text("strengths"),
  gaps: text("gaps"),
  customer: text("customer"),
  ...timestamps,
});

export const hypotheses = sqliteTable("hypotheses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  statement: text("statement").notNull(),
  rationale: text("rationale"),
  status: text("status").notNull().default("untested"),
  confidence: integer("confidence").notNull().default(30),
  evidenceFor: integer("evidence_for").notNull().default(0),
  evidenceAgainst: integer("evidence_against").notNull().default(0),
  nextTest: text("next_test"),
  ...timestamps,
});

export const experiments = sqliteTable("experiments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  hypothesisCode: text("hypothesis_code"),
  channel: text("channel").notNull(),
  status: text("status").notNull().default("planned"),
  owner: text("owner").notNull().default("Founder"),
  metric: text("metric").notNull(),
  target: text("target").notNull(),
  result: text("result"),
  learning: text("learning"),
  startsOn: text("starts_on"),
  endsOn: text("ends_on"),
  ...timestamps,
});

export const dailyActions = sqliteTable("daily_actions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  rationale: text("rationale").notNull(),
  expectedImpact: text("expected_impact"),
  effortMinutes: integer("effort_minutes").notNull().default(30),
  priority: integer("priority").notNull().default(1),
  status: text("status").notNull().default("ready"),
  dueDate: text("due_date"),
  linkedExperimentId: integer("linked_experiment_id"),
  ...timestamps,
});

export const researchSources = sqliteTable("research_sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceType: text("source_type").notNull(),
  title: text("title").notNull(),
  url: text("url"),
  author: text("author"),
  publishedAt: text("published_at"),
  excerpt: text("excerpt"),
  tags: text("tags"),
  relatedFounderId: integer("related_founder_id"),
  relatedPainId: integer("related_pain_id"),
  ...timestamps,
});

export const agents = sqliteTable("agents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("scheduled"),
  autonomyLevel: integer("autonomy_level").notNull().default(1),
  schedule: text("schedule").notNull(),
  successRate: integer("success_rate").notNull().default(0),
  currentTask: text("current_task").notNull(),
  tools: text("tools").notNull(),
  goal: text("goal"),
  permissionsJson: text("permissions_json").notNull().default("[]"),
  ...timestamps,
});

export const agentTasks = sqliteTable("agent_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  agentId: integer("agent_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  taskType: text("task_type").notNull(),
  priority: integer("priority").notNull(),
  riskLevel: integer("risk_level").notNull(),
  status: text("status").notNull().default("queued"),
  requiresApproval: integer("requires_approval").notNull().default(0),
  expectedOutcome: text("expected_outcome").notNull(),
  estimatedMinutes: integer("estimated_minutes").notNull(),
  evidence: text("evidence").notNull(),
  createdAt: text("created_at").notNull(),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
});

export const agentRuns = sqliteTable("agent_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  agentId: integer("agent_id").notNull(),
  taskId: integer("task_id"),
  task: text("task").notNull(),
  status: text("status").notNull(),
  input: text("input").notNull(),
  output: text("output").notNull(),
  tools: text("tools").notNull(),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  result: text("result").notNull(),
});

export const approvals = sqliteTable("approvals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  taskId: integer("task_id").notNull(),
  actionType: text("action_type").notNull(),
  title: text("title").notNull(),
  reason: text("reason").notNull(),
  payload: text("payload").notNull(),
  riskLevel: integer("risk_level").notNull(),
  status: text("status").notNull().default("pending"),
  approvedBy: text("approved_by"),
  approvedAt: text("approved_at"),
  expiresAt: text("expires_at"),
  createdAt: text("created_at").notNull(),
});

export const memories = sqliteTable("memories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  memoryType: text("memory_type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  source: text("source").notNull(),
  confidence: integer("confidence").notNull(),
  status: text("status").notNull().default("unverified"),
  lastVerifiedAt: text("last_verified_at").notNull(),
  ...timestamps,
});

export const observations = sqliteTable("observations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  sourceType: text("source_type").notNull(),
  sourceName: text("source_name").notNull(),
  content: text("content").notNull(),
  rawData: text("raw_data"),
  observedAt: text("observed_at").notNull(),
  processed: integer("processed").notNull().default(0),
  sourceId: integer("source_id"),
  fingerprint: text("fingerprint"),
  title: text("title"),
  url: text("url"),
  confidence: integer("confidence").notNull().default(60),
});

export const observationSources = sqliteTable("observation_sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  sourceKey: text("source_key").notNull(),
  sourceType: text("source_type").notNull(),
  name: text("name").notNull(),
  targetUrl: text("target_url").notNull(),
  status: text("status").notNull().default("active"),
  cadenceMinutes: integer("cadence_minutes").notNull().default(1440),
  cursorJson: text("cursor_json").notNull().default("{}"),
  contentHash: text("content_hash"),
  lastCheckedAt: text("last_checked_at"),
  lastChangedAt: text("last_changed_at"),
  lastStatus: text("last_status"),
  lastError: text("last_error"),
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  nextRunAt: text("next_run_at"),
  ...timestamps,
});

export const observationRuns = sqliteTable("observation_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  sourceId: integer("source_id").notNull(),
  jobId: integer("job_id"),
  status: text("status").notNull(),
  cursorBeforeJson: text("cursor_before_json").notNull().default("{}"),
  cursorAfterJson: text("cursor_after_json"),
  itemsSeen: integer("items_seen").notNull().default(0),
  itemsCreated: integer("items_created").notNull().default(0),
  errorCode: text("error_code"),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insights = sqliteTable("insights", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  sourceId: integer("source_id"),
  observationId: integer("observation_id"),
  fingerprint: text("fingerprint").notNull(),
  insightType: text("insight_type").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  confidence: integer("confidence").notNull(),
  evidenceJson: text("evidence_json").notNull().default("[]"),
  status: text("status").notNull().default("new"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const opportunities = sqliteTable("opportunities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  title: text("title").notNull(),
  source: text("source").notNull(),
  observedAt: text("observed_at").notNull(),
  confidence: integer("confidence").notNull(),
  summary: text("summary").notNull(),
  suggestedAction: text("suggested_action").notNull(),
  status: text("status").notNull().default("new"),
  signal: text("signal").notNull(),
  autonomyScore: integer("autonomy_score").notNull().default(0),
  autoCreatedCampaignId: integer("auto_created_campaign_id"),
  dedupeKey: text("dedupe_key"),
  evidenceJson: text("evidence_json").notNull().default("[]"),
  expectedImpact: text("expected_impact"),
  effort: integer("effort"),
  riskLevel: integer("risk_level").notNull().default(1),
  discoveredAt: text("discovered_at"),
  lastSeenAt: text("last_seen_at"),
  relatedGoalId: integer("related_goal_id"),
});

export const workspaceRuntimeSettings = sqliteTable("workspace_runtime_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  enabled: integer("enabled").notNull().default(1),
  mode: text("mode").notNull().default("copilot"),
  tickIntervalMinutes: integer("tick_interval_minutes").notNull().default(360),
  dailyActionLimit: integer("daily_action_limit").notNull().default(8),
  dailyLlmBudgetCents: integer("daily_llm_budget_cents").notNull().default(100),
  dailyExternalActionLimit: integer("daily_external_action_limit").notNull().default(2),
  quietHoursStart: text("quiet_hours_start"), quietHoursEnd: text("quiet_hours_end"), timezone: text("timezone").notNull().default("UTC"),
  autonomyLevel: integer("autonomy_level").notNull().default(1), autoExecuteRiskLevel: integer("auto_execute_risk_level").notNull().default(1),
  pausedReason: text("paused_reason"), lastTickAt: text("last_tick_at"), nextTickAt: text("next_tick_at"), ...timestamps,
});
export const runtimeCycles = sqliteTable("runtime_cycles", {
  id: integer("id").primaryKey({ autoIncrement: true }), workspaceId: text("workspace_id").notNull(), triggerType: text("trigger_type").notNull(), status: text("status").notNull(),
  startedAt: text("started_at").notNull(), completedAt: text("completed_at"), currentStage: text("current_stage").notNull(), observationsCount: integer("observations_count").notNull().default(0),
  opportunitiesCount: integer("opportunities_count").notNull().default(0), plansCount: integer("plans_count").notNull().default(0), tasksCreatedCount: integer("tasks_created_count").notNull().default(0), tasksExecutedCount: integer("tasks_executed_count").notNull().default(0), approvalsCreatedCount: integer("approvals_created_count").notNull().default(0),
  llmTokensUsed: integer("llm_tokens_used").notNull().default(0), estimatedCostCents: integer("estimated_cost_cents").notNull().default(0), summary: text("summary"), errorCode: text("error_code"), errorMessage: text("error_message"), idempotencyKey: text("idempotency_key").notNull(), createdAt: text("created_at").notNull(),
});
export const companyGoals = sqliteTable("company_goals", {
  id: integer("id").primaryKey({ autoIncrement: true }), workspaceId: text("workspace_id").notNull(), title: text("title").notNull(), description: text("description"), goalType: text("goal_type").notNull(), targetMetric: text("target_metric"), targetValue: real("target_value"), currentValue: real("current_value"), deadline: text("deadline"), priority: integer("priority").notNull().default(1), status: text("status").notNull().default("active"), constraintsJson: text("constraints_json").notNull().default("{}"), ...timestamps,
});
export const companyPlans = sqliteTable("company_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }), workspaceId: text("workspace_id").notNull(), goalId: integer("goal_id"), opportunityId: integer("opportunity_id"), title: text("title").notNull(), hypothesis: text("hypothesis").notNull(), strategy: text("strategy").notNull(), expectedImpact: text("expected_impact").notNull(), confidence: integer("confidence").notNull().default(50), riskLevel: integer("risk_level").notNull().default(1), estimatedCostCents: integer("estimated_cost_cents").notNull().default(0), status: text("status").notNull().default("planned"), createdByAgentId: integer("created_by_agent_id"), ...timestamps,
});
export const actionExecutions = sqliteTable("action_executions", {
  id: integer("id").primaryKey({ autoIncrement: true }), workspaceId: text("workspace_id").notNull(), cycleId: integer("cycle_id").notNull(), planId: integer("plan_id"), taskId: integer("task_id"), agentId: integer("agent_id"), actionType: text("action_type").notNull(), riskLevel: integer("risk_level").notNull(), policyDecision: text("policy_decision").notNull(), status: text("status").notNull(), inputJson: text("input_json").notNull().default("{}"), outputJson: text("output_json"), externalReceipt: text("external_receipt"), idempotencyKey: text("idempotency_key").notNull(), costCents: integer("cost_cents").notNull().default(0), startedAt: text("started_at").notNull(), completedAt: text("completed_at"), rollbackStatus: text("rollback_status"), errorMessage: text("error_message"),
});
export const runtimeDailyUsage = sqliteTable("runtime_daily_usage", {
  workspaceId: text("workspace_id").notNull(), usageDate: text("usage_date").notNull(), cyclesCount: integer("cycles_count").notNull().default(0), actionsCount: integer("actions_count").notNull().default(0), externalActionsCount: integer("external_actions_count").notNull().default(0), llmRequests: integer("llm_requests").notNull().default(0), inputTokens: integer("input_tokens").notNull().default(0), outputTokens: integer("output_tokens").notNull().default(0), estimatedCostCents: integer("estimated_cost_cents").notNull().default(0),
});

export const companyIntelligenceSnapshots = sqliteTable("company_intelligence_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  snapshotDate: text("snapshot_date").notNull(),
  goalId: integer("goal_id"),
  metricName: text("metric_name"),
  metricValue: real("metric_value"),
  previousValue: real("previous_value"),
  metricDelta: real("metric_delta"),
  healthScore: integer("health_score").notNull().default(50),
  evidenceJson: text("evidence_json").notNull().default("[]"),
  summary: text("summary").notNull(),
  ...timestamps,
});

export const connections = sqliteTable("connections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("available"),
  lastSync: text("last_sync").notNull(),
  category: text("category").notNull(),
});

export const metrics = sqliteTable("metrics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  metricDate: text("metric_date").notNull(),
  visits: integer("visits").notNull().default(0),
  signups: integer("signups").notNull().default(0),
  paid: integer("paid").notNull().default(0),
  conversion: real("conversion").notNull().default(0),
  completedTasks: integer("completed_tasks").notNull().default(0),
});


export const agentRateLimits = sqliteTable("agent_rate_limits", {
  key: text("key").primaryKey(),
  userId: text("user_id").notNull(),
  workspaceId: text("workspace_id").notNull(),
  count: integer("count").notNull().default(0),
  windowStart: text("window_start").notNull(),
});

export const campaigns = sqliteTable("campaigns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  opportunityId: integer("opportunity_id"),
  name: text("name").notNull(),
  objective: text("objective").notNull(),
  audience: text("audience").notNull(),
  coreMessage: text("core_message").notNull(),
  offer: text("offer").notNull(),
  cta: text("cta").notNull(),
  status: text("status").notNull().default("draft"),
  ...timestamps,
});

export const campaignAssets = sqliteTable("campaign_assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  campaignId: integer("campaign_id").notNull(),
  approvalId: integer("approval_id"),
  channel: text("channel").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  cta: text("cta").notNull(),
  status: text("status").notNull().default("pending_approval"),
  publishedUrl: text("published_url"),
  publishedAt: text("published_at"),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  conversions: integer("conversions").notNull().default(0),
  ...timestamps,
});

export const marketingEvents = sqliteTable("marketing_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  anonymousId: text("anonymous_id").notNull(),
  eventName: text("event_name").notNull(),
  path: text("path").notNull(),
  referrer: text("referrer"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const platformConnections = sqliteTable("platform_connections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  provider: text("provider").notNull(),
  externalAccountId: text("external_account_id"),
  accountLabel: text("account_label"),
  status: text("status").notNull().default("pending"),
  scopesJson: text("scopes_json").notNull().default("[]"),
  credentialReference: text("credential_reference"),
  credentialCiphertext: text("credential_ciphertext"),
  refreshCiphertext: text("refresh_ciphertext"),
  metadataJson: text("metadata_json").notNull().default("{}"),
  expiresAt: text("expires_at"),
  lastSyncAt: text("last_sync_at"),
  ...timestamps,
});

export const oauthConnectionStates = sqliteTable("oauth_connection_states", {
  state: text("state").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  userId: text("user_id").notNull(),
  provider: text("provider").notNull(),
  codeVerifier: text("code_verifier"),
  returnTo: text("return_to").notNull().default("/app?view=connections"),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const publicationJobs = sqliteTable("publication_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  assetId: integer("asset_id").notNull(),
  connectionId: integer("connection_id"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  status: text("status").notNull().default("queued"),
  scheduledFor: text("scheduled_for"),
  attemptCount: integer("attempt_count").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(4),
  nextAttemptAt: text("next_attempt_at"),
  externalPostId: text("external_post_id"),
  publishedUrl: text("published_url"),
  lastError: text("last_error"),
  ...timestamps,
});

export const campaignMetricSnapshots = sqliteTable("campaign_metric_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  assetId: integer("asset_id").notNull(),
  snapshotDate: text("snapshot_date").notNull(),
  source: text("source").notNull(),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  engagements: integer("engagements").notNull().default(0),
  conversions: integer("conversions").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const analyticsSyncRuns = sqliteTable("analytics_sync_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  connectionId: integer("connection_id"),
  provider: text("provider").notNull(),
  metricDate: text("metric_date").notNull(),
  status: text("status").notNull(),
  visits: integer("visits").notNull().default(0),
  signups: integer("signups").notNull().default(0),
  paid: integer("paid").notNull().default(0),
  errorCode: text("error_code"),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const dailyGrowthSnapshots = sqliteTable("daily_growth_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  snapshotDate: text("snapshot_date").notNull(),
  visits: integer("visits").notNull().default(0),
  signups: integer("signups").notNull().default(0),
  paid: integer("paid").notNull().default(0),
  attributedVisits: integer("attributed_visits").notNull().default(0),
  attributedSignups: integer("attributed_signups").notNull().default(0),
  attributedPaid: integer("attributed_paid").notNull().default(0),
  reflectionJson: text("reflection_json"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const agentSchedules = sqliteTable("agent_schedules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  agentId: integer("agent_id").notNull(),
  scheduleKey: text("schedule_key").notNull(),
  timezone: text("timezone").notNull().default("UTC"),
  localTime: text("local_time").notNull().default("08:00"),
  enabled: integer("enabled").notNull().default(1),
  lastRunDate: text("last_run_date"),
  lastRunAt: text("last_run_at"),
  lastStatus: text("last_status"),
  lastError: text("last_error"),
  cadenceMinutes: integer("cadence_minutes"),
  nextRunAt: text("next_run_at"),
  ...timestamps,
});

export const agentJobs = sqliteTable("agent_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  agentId: integer("agent_id").notNull(),
  taskId: integer("task_id"),
  scheduleId: integer("schedule_id"),
  jobType: text("job_type").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  status: text("status").notNull().default("queued"),
  scheduledFor: text("scheduled_for").notNull(),
  attemptCount: integer("attempt_count").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  nextAttemptAt: text("next_attempt_at"),
  leaseToken: text("lease_token"),
  leaseExpiresAt: text("lease_expires_at"),
  inputJson: text("input_json").notNull().default("{}"),
  outputJson: text("output_json"),
  lastError: text("last_error"),
  startedAt: text("started_at"),
  finishedAt: text("finished_at"),
  ...timestamps,
});

export const agentToolCalls = sqliteTable("agent_tool_calls", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  jobId: integer("job_id"),
  runId: integer("run_id"),
  toolName: text("tool_name").notNull(),
  status: text("status").notNull(),
  inputJson: text("input_json").notNull().default("{}"),
  outputJson: text("output_json"),
  errorCode: text("error_code"),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const agentDecisions = sqliteTable("agent_decisions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workspaceId: text("workspace_id").notNull(),
  agentId: integer("agent_id").notNull(),
  runId: integer("run_id"),
  decisionDate: text("decision_date").notNull(),
  decisionType: text("decision_type").notNull(),
  title: text("title").notNull(),
  rationale: text("rationale").notNull(),
  evidenceJson: text("evidence_json").notNull().default("[]"),
  expectedImpact: text("expected_impact").notNull(),
  priorityScore: integer("priority_score").notNull(),
  confidence: integer("confidence").notNull(),
  riskLevel: integer("risk_level").notNull().default(1),
  status: text("status").notNull().default("proposed"),
  payloadJson: text("payload_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const atlasAuthSessions = sqliteTable("atlas_auth_sessions", {
  tokenHash: text("token_hash").primaryKey(), userId: text("user_id").notNull(), provider: text("provider").notNull(), expiresAt: text("expires_at").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), lastSeenAt: text("last_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const atlasAuthChallenges = sqliteTable("atlas_auth_challenges", {
  tokenHash: text("token_hash").primaryKey(), kind: text("kind").notNull(), email: text("email"), returnTo: text("return_to").notNull().default("/app"), expiresAt: text("expires_at").notNull(), usedAt: text("used_at"), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const atlasAuthIdentities = sqliteTable("atlas_auth_identities", {
  provider: text("provider").notNull(), providerSubject: text("provider_subject").notNull(), userId: text("user_id").notNull(), email: text("email").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
