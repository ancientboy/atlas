import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};


export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  name: text("name"),
  locale: text("locale").notNull().default("zh"),
  ...timestamps,
});

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdByUserId: text("created_by_user_id").notNull(),
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
