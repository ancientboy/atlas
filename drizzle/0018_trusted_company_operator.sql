-- Atlas V3: visible company context, recurring company routines,
-- action-level trust, and founder correction learning.
CREATE TABLE IF NOT EXISTS company_routines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  routine_key TEXT NOT NULL,
  name TEXT NOT NULL,
  instruction TEXT NOT NULL,
  playbook_key TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'schedule',
  cadence_minutes INTEGER NOT NULL DEFAULT 1440,
  event_type TEXT,
  trust_level TEXT NOT NULL DEFAULT 'recommend',
  status TEXT NOT NULL DEFAULT 'active',
  next_run_at TEXT,
  last_run_at TEXT,
  last_status TEXT,
  last_summary TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, routine_key)
);
CREATE INDEX IF NOT EXISTS idx_company_routines_due
  ON company_routines(workspace_id, status, trigger_type, next_run_at);

CREATE TABLE IF NOT EXISTS company_routine_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  routine_id INTEGER NOT NULL REFERENCES company_routines(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  status TEXT NOT NULL,
  input_json TEXT NOT NULL DEFAULT '{}',
  output_json TEXT NOT NULL DEFAULT '{}',
  summary TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_company_routine_runs_recent
  ON company_routine_runs(workspace_id, routine_id, started_at DESC);

CREATE TABLE IF NOT EXISTS action_trust_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  trust_level TEXT NOT NULL DEFAULT 'recommend',
  max_risk_level INTEGER NOT NULL DEFAULT 1,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, action_type)
);

CREATE TABLE IF NOT EXISTS founder_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id TEXT,
  feedback_type TEXT NOT NULL,
  reason TEXT,
  original_json TEXT NOT NULL DEFAULT '{}',
  corrected_json TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_founder_feedback_target
  ON founder_feedback(workspace_id, target_type, target_id, created_at DESC);

CREATE TABLE IF NOT EXISTS company_behavior_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  rule_text TEXT NOT NULL,
  source_feedback_id INTEGER REFERENCES founder_feedback(id) ON DELETE SET NULL,
  confidence INTEGER NOT NULL DEFAULT 80,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_company_behavior_rules_active
  ON company_behavior_rules(workspace_id, status, category, updated_at DESC);
