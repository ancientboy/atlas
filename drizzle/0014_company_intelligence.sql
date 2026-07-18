CREATE TABLE IF NOT EXISTS company_intelligence_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  snapshot_date TEXT NOT NULL,
  goal_id INTEGER REFERENCES company_goals(id) ON DELETE SET NULL,
  metric_name TEXT,
  metric_value REAL,
  previous_value REAL,
  metric_delta REAL,
  health_score INTEGER NOT NULL DEFAULT 50,
  evidence_json TEXT NOT NULL DEFAULT '[]',
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_company_intelligence_workspace
  ON company_intelligence_snapshots(workspace_id, snapshot_date DESC);
