CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  locale TEXT NOT NULL DEFAULT 'zh',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, user_id)
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
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
ALTER TABLE agents ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'demo-workspace';
ALTER TABLE agent_tasks ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'demo-workspace';
ALTER TABLE agent_runs ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'demo-workspace';
ALTER TABLE approvals ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'demo-workspace';
ALTER TABLE memories ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'demo-workspace';
ALTER TABLE observations ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'demo-workspace';
ALTER TABLE opportunities ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'demo-workspace';
ALTER TABLE connections ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'demo-workspace';
ALTER TABLE metrics ADD COLUMN workspace_id TEXT NOT NULL DEFAULT 'demo-workspace';
CREATE INDEX IF NOT EXISTS idx_products_workspace ON products(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_workspace ON agent_tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_workspace ON agent_runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_memories_workspace ON memories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_workspace ON opportunities(workspace_id);
