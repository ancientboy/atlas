CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  locale TEXT NOT NULL DEFAULT 'zh',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, user_id)
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  growth_goal TEXT,
  analysis_status TEXT NOT NULL DEFAULT 'pending',
  analysis_error TEXT,
  analysis_json TEXT,
  fetched_title TEXT,
  fetched_description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS agent_rate_limits (
  key TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TEXT NOT NULL
);
ALTER TABLE agents ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'migration-required';
ALTER TABLE agent_tasks ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'migration-required';
ALTER TABLE agent_runs ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'migration-required';
ALTER TABLE approvals ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'migration-required';
ALTER TABLE memories ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'migration-required';
ALTER TABLE observations ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'migration-required';
ALTER TABLE opportunities ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'migration-required';
ALTER TABLE connections ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'migration-required';
ALTER TABLE metrics ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'migration-required';
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_products_workspace_status ON products(workspace_id, analysis_status);
CREATE INDEX IF NOT EXISTS idx_products_workspace_url_status ON products(workspace_id, url, analysis_status);
CREATE INDEX IF NOT EXISTS idx_agents_workspace ON agents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_workspace ON agent_tasks(workspace_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_agent_runs_workspace ON agent_runs(workspace_id, started_at);
CREATE INDEX IF NOT EXISTS idx_approvals_workspace ON approvals(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_memories_workspace ON memories(workspace_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_observations_workspace ON observations(workspace_id, observed_at);
CREATE INDEX IF NOT EXISTS idx_opportunities_workspace ON opportunities(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_connections_workspace ON connections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_metrics_workspace ON metrics(workspace_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_workspace ON agent_rate_limits(user_id, workspace_id, window_start);
