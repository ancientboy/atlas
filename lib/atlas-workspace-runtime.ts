export type ProductAnalysisInput = { name: string; url: string; description?: string; growthGoal?: string };
export type PreparedStatement = { bind: (...values: unknown[]) => { first: <T>() => Promise<T | null> } };
export type WorkspaceDb = { prepare: (sql: string) => PreparedStatement };
export type AnalysisRecords = { agentId: number; taskId: number; runId: number; productId: number };

const growthOperatorTools = JSON.stringify(["SafeFetchWebsiteTool", "LLMAnalyzeProductTool", "SaveWorkspaceMemoryTool"]);

export async function ensureWorkspaceAgent(db: WorkspaceDb, workspaceId: string) {
  const existing = await db.prepare("SELECT id FROM agents WHERE workspace_id = ? AND role = ? ORDER BY id LIMIT 1").bind(workspaceId, "Growth Operator").first<{ id: number }>();
  if (existing) return existing.id;
  const created = await db.prepare("INSERT INTO agents (workspace_id, name, role, description, status, autonomy_level, schedule, success_rate, current_task, tools) VALUES (?, 'Growth Operator', 'Growth Operator', 'Observes public product data, plans growth actions, and asks for approval before external actions.', 'running', 2, 'On demand analysis · daily planning', 0, 'Waiting for product analysis', ?) RETURNING id").bind(workspaceId, growthOperatorTools).first<{ id: number }>();
  if (!created) throw new Error("Analysis failed. Please retry later.");
  return created.id;
}

export async function createProductAnalysisRecords(db: WorkspaceDb, workspaceId: string, input: ProductAnalysisInput, startedAt: string): Promise<AnalysisRecords> {
  const agentId = await ensureWorkspaceAgent(db, workspaceId);
  const task = await db.prepare("INSERT INTO agent_tasks (workspace_id, agent_id, title, description, task_type, priority, risk_level, status, requires_approval, expected_outcome, estimated_minutes, evidence, created_at, started_at) VALUES (?, ?, ?, ?, 'product_analysis', 1, 1, 'running', 0, ?, 3, ?, ?, ?) RETURNING id").bind(workspaceId, agentId, `Analyze ${input.name}`, `Fetch and analyze ${input.url}`, "Create product memory and next best actions", JSON.stringify([input.url]), startedAt, startedAt).first<{ id: number }>();
  const run = await db.prepare("INSERT INTO agent_runs (workspace_id, agent_id, task_id, task, status, input, output, tools, started_at, result) VALUES (?, ?, ?, 'Product Analysis Agent', 'running', ?, 'Fetching public website', ?, ?, 'Running') RETURNING id").bind(workspaceId, agentId, task?.id ?? null, input.url, growthOperatorTools, startedAt).first<{ id: number }>();
  const product = await db.prepare("INSERT INTO products (workspace_id, name, url, description, growth_goal, analysis_status) VALUES (?, ?, ?, ?, ?, 'running') RETURNING id").bind(workspaceId, input.name, input.url, input.description || null, input.growthGoal || null).first<{ id: number }>();
  if (!task?.id || !run?.id || !product?.id) throw new Error("Analysis failed. Please retry later.");
  return { agentId, taskId: task.id, runId: run.id, productId: product.id };
}
