ALTER TABLE agent_schedules ADD COLUMN cadence_minutes INTEGER;
ALTER TABLE agent_schedules ADD COLUMN next_run_at TEXT;

ALTER TABLE observations ADD COLUMN source_id INTEGER;
ALTER TABLE observations ADD COLUMN fingerprint TEXT;
ALTER TABLE observations ADD COLUMN title TEXT;
ALTER TABLE observations ADD COLUMN url TEXT;
ALTER TABLE observations ADD COLUMN confidence INTEGER NOT NULL DEFAULT 60;

CREATE UNIQUE INDEX IF NOT EXISTS idx_observations_fingerprint
  ON observations(workspace_id, fingerprint)
  WHERE fingerprint IS NOT NULL;

CREATE TABLE IF NOT EXISTS observation_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_key TEXT NOT NULL,
  source_type TEXT NOT NULL,
  name TEXT NOT NULL,
  target_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  cadence_minutes INTEGER NOT NULL DEFAULT 1440,
  cursor_json TEXT NOT NULL DEFAULT '{}',
  content_hash TEXT,
  last_checked_at TEXT,
  last_changed_at TEXT,
  last_status TEXT,
  last_error TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  next_run_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, source_key)
);

CREATE INDEX IF NOT EXISTS idx_observation_sources_due
  ON observation_sources(status, next_run_at, workspace_id);

CREATE TABLE IF NOT EXISTS observation_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_id INTEGER NOT NULL REFERENCES observation_sources(id) ON DELETE CASCADE,
  job_id INTEGER REFERENCES agent_jobs(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  cursor_before_json TEXT NOT NULL DEFAULT '{}',
  cursor_after_json TEXT,
  items_seen INTEGER NOT NULL DEFAULT 0,
  items_created INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_observation_runs_source
  ON observation_runs(workspace_id, source_id, started_at DESC);

CREATE TABLE IF NOT EXISTS insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_id INTEGER REFERENCES observation_sources(id) ON DELETE SET NULL,
  observation_id INTEGER REFERENCES observations(id) ON DELETE SET NULL,
  fingerprint TEXT NOT NULL,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  confidence INTEGER NOT NULL,
  evidence_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_insights_workspace
  ON insights(workspace_id, status, created_at DESC);

INSERT OR IGNORE INTO agent_schedules (
  workspace_id,
  agent_id,
  schedule_key,
  timezone,
  local_time,
  enabled,
  cadence_minutes,
  next_run_at
)
SELECT
  agents.workspace_id,
  agents.id,
  'observation_scan',
  'UTC',
  '00:00',
  1,
  360,
  CURRENT_TIMESTAMP
FROM agents
WHERE agents.role = 'Growth Operator';
