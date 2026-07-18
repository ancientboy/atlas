CREATE TABLE IF NOT EXISTS workspace_runtime_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  enabled INTEGER NOT NULL DEFAULT 1,
  mode TEXT NOT NULL DEFAULT 'copilot',
  tick_interval_minutes INTEGER NOT NULL DEFAULT 360,
  daily_action_limit INTEGER NOT NULL DEFAULT 8,
  daily_llm_budget_cents INTEGER NOT NULL DEFAULT 100,
  daily_external_action_limit INTEGER NOT NULL DEFAULT 2,
  quiet_hours_start TEXT,
  quiet_hours_end TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  autonomy_level INTEGER NOT NULL DEFAULT 1,
  auto_execute_risk_level INTEGER NOT NULL DEFAULT 1,
  paused_reason TEXT,
  last_tick_at TEXT,
  next_tick_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workspace_runtime_due
  ON workspace_runtime_settings(enabled, mode, next_tick_at);

CREATE TABLE IF NOT EXISTS workspace_runtime_locks (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  lock_token TEXT NOT NULL,
  locked_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runtime_cycles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TEXT NOT NULL,
  completed_at TEXT,
  current_stage TEXT NOT NULL DEFAULT 'load_state',
  observations_count INTEGER NOT NULL DEFAULT 0,
  opportunities_count INTEGER NOT NULL DEFAULT 0,
  plans_count INTEGER NOT NULL DEFAULT 0,
  tasks_created_count INTEGER NOT NULL DEFAULT 0,
  tasks_executed_count INTEGER NOT NULL DEFAULT 0,
  approvals_created_count INTEGER NOT NULL DEFAULT 0,
  llm_tokens_used INTEGER NOT NULL DEFAULT 0,
  estimated_cost_cents INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  error_code TEXT,
  error_message TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_runtime_cycles_workspace
  ON runtime_cycles(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS company_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL DEFAULT 'growth',
  target_metric TEXT,
  target_value REAL,
  current_value REAL,
  deadline TEXT,
  priority INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  constraints_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_company_goals_workspace
  ON company_goals(workspace_id, status, priority);

CREATE TABLE IF NOT EXISTS company_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  goal_id INTEGER REFERENCES company_goals(id) ON DELETE SET NULL,
  opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  strategy TEXT NOT NULL,
  expected_impact TEXT NOT NULL,
  confidence INTEGER NOT NULL DEFAULT 50,
  risk_level INTEGER NOT NULL DEFAULT 1,
  estimated_cost_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned',
  created_by_agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, opportunity_id, title)
);

CREATE TABLE IF NOT EXISTS action_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  cycle_id INTEGER NOT NULL REFERENCES runtime_cycles(id) ON DELETE CASCADE,
  plan_id INTEGER REFERENCES company_plans(id) ON DELETE SET NULL,
  task_id INTEGER REFERENCES agent_tasks(id) ON DELETE SET NULL,
  agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  risk_level INTEGER NOT NULL,
  policy_decision TEXT NOT NULL,
  status TEXT NOT NULL,
  input_json TEXT NOT NULL DEFAULT '{}',
  output_json TEXT,
  external_receipt TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  rollback_status TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_action_executions_workspace
  ON action_executions(workspace_id, cycle_id, status);

CREATE TABLE IF NOT EXISTS runtime_daily_usage (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  usage_date TEXT NOT NULL,
  cycles_count INTEGER NOT NULL DEFAULT 0,
  actions_count INTEGER NOT NULL DEFAULT 0,
  external_actions_count INTEGER NOT NULL DEFAULT 0,
  llm_requests INTEGER NOT NULL DEFAULT 0,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_cents INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (workspace_id, usage_date)
);

ALTER TABLE opportunities ADD COLUMN dedupe_key TEXT;
ALTER TABLE opportunities ADD COLUMN evidence_json TEXT NOT NULL DEFAULT '[]';
ALTER TABLE opportunities ADD COLUMN expected_impact TEXT;
ALTER TABLE opportunities ADD COLUMN effort INTEGER;
ALTER TABLE opportunities ADD COLUMN risk_level INTEGER NOT NULL DEFAULT 1;
ALTER TABLE opportunities ADD COLUMN discovered_at TEXT;
ALTER TABLE opportunities ADD COLUMN last_seen_at TEXT;
ALTER TABLE opportunities ADD COLUMN related_goal_id INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_opportunities_workspace_dedupe
  ON opportunities(workspace_id, dedupe_key);
