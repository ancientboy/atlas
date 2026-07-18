CREATE TABLE IF NOT EXISTS agent_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  run_id INTEGER REFERENCES agent_runs(id) ON DELETE SET NULL,
  decision_date TEXT NOT NULL,
  decision_type TEXT NOT NULL,
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  evidence_json TEXT NOT NULL DEFAULT '[]',
  expected_impact TEXT NOT NULL,
  priority_score INTEGER NOT NULL,
  confidence INTEGER NOT NULL,
  risk_level INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'proposed',
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, decision_type, decision_date)
);

CREATE INDEX IF NOT EXISTS idx_agent_decisions_workspace_date
  ON agent_decisions(workspace_id, decision_date DESC, priority_score DESC);
