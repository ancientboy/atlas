ALTER TABLE agents ADD COLUMN goal TEXT;
ALTER TABLE agents ADD COLUMN permissions_json TEXT NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS agent_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  schedule_key TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  local_time TEXT NOT NULL DEFAULT '08:00',
  enabled INTEGER NOT NULL DEFAULT 1,
  last_run_date TEXT,
  last_run_at TEXT,
  last_status TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, schedule_key)
);

CREATE INDEX IF NOT EXISTS idx_agent_schedules_enabled
  ON agent_schedules(enabled, schedule_key, workspace_id);

CREATE TABLE IF NOT EXISTS agent_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  task_id INTEGER REFERENCES agent_tasks(id) ON DELETE SET NULL,
  schedule_id INTEGER REFERENCES agent_schedules(id) ON DELETE SET NULL,
  job_type TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued',
  scheduled_for TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_attempt_at TEXT,
  lease_token TEXT,
  lease_expires_at TEXT,
  input_json TEXT NOT NULL DEFAULT '{}',
  output_json TEXT,
  last_error TEXT,
  started_at TEXT,
  finished_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_jobs_due
  ON agent_jobs(status, next_attempt_at, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_agent_jobs_workspace
  ON agent_jobs(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS agent_tool_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  job_id INTEGER REFERENCES agent_jobs(id) ON DELETE SET NULL,
  run_id INTEGER REFERENCES agent_runs(id) ON DELETE SET NULL,
  tool_name TEXT NOT NULL,
  status TEXT NOT NULL,
  input_json TEXT NOT NULL DEFAULT '{}',
  output_json TEXT,
  error_code TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_tool_calls_job
  ON agent_tool_calls(workspace_id, job_id, created_at);

INSERT OR IGNORE INTO agent_schedules (
  workspace_id,
  agent_id,
  schedule_key,
  timezone,
  local_time,
  enabled
)
SELECT
  agents.workspace_id,
  agents.id,
  'daily_growth',
  'UTC',
  '08:00',
  1
FROM agents
WHERE agents.role = 'Growth Operator';
