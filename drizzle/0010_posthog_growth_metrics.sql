CREATE TABLE IF NOT EXISTS analytics_sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  connection_id INTEGER REFERENCES platform_connections(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  metric_date TEXT NOT NULL,
  status TEXT NOT NULL,
  visits INTEGER NOT NULL DEFAULT 0,
  signups INTEGER NOT NULL DEFAULT 0,
  paid INTEGER NOT NULL DEFAULT 0,
  error_code TEXT,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_analytics_sync_runs_workspace
  ON analytics_sync_runs(workspace_id, provider, started_at DESC);

INSERT OR IGNORE INTO agent_schedules (
  workspace_id, agent_id, schedule_key, timezone, local_time, enabled,
  cadence_minutes, next_run_at
)
SELECT
  agents.workspace_id, agents.id, 'analytics_sync', 'UTC', '00:00', 1,
  360, CURRENT_TIMESTAMP
FROM agents
WHERE agents.role = 'Growth Operator'
  AND EXISTS (
    SELECT 1 FROM platform_connections
    WHERE platform_connections.workspace_id = agents.workspace_id
      AND platform_connections.provider = 'posthog'
      AND platform_connections.status = 'connected'
  );
