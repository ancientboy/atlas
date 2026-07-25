-- Complete the Company Brain operating loop: measurable experiments,
-- learned strategy weights, scheduler health, and unified company functions.
ALTER TABLE growth_experiments ADD COLUMN goal_id INTEGER REFERENCES company_goals(id) ON DELETE SET NULL;
ALTER TABLE growth_experiments ADD COLUMN attribution_model TEXT NOT NULL DEFAULT 'workspace_delta';
ALTER TABLE growth_experiments ADD COLUMN minimum_delta REAL NOT NULL DEFAULT 1;
ALTER TABLE growth_experiments ADD COLUMN success_threshold_pct REAL NOT NULL DEFAULT 5;
ALTER TABLE growth_experiments ADD COLUMN baseline_captured_at TEXT;
ALTER TABLE growth_experiments ADD COLUMN completed_at TEXT;

ALTER TABLE campaigns ADD COLUMN experiment_id INTEGER REFERENCES growth_experiments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_experiment
  ON campaigns(workspace_id, experiment_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_experiment_results_once
  ON experiment_results(workspace_id, experiment_id);

CREATE TABLE IF NOT EXISTS strategy_performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  strategy_key TEXT NOT NULL,
  experiments_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  weight REAL NOT NULL DEFAULT 1,
  suppressed_until TEXT,
  last_outcome TEXT,
  last_evaluated_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, strategy_key)
);
CREATE INDEX IF NOT EXISTS idx_strategy_performance_planner
  ON strategy_performance(workspace_id, weight DESC, suppressed_until);

CREATE TABLE IF NOT EXISTS company_function_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  function_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'observing',
  confidence INTEGER NOT NULL DEFAULT 50,
  summary TEXT NOT NULL,
  next_action TEXT NOT NULL,
  evidence_json TEXT NOT NULL DEFAULT '[]',
  metric_name TEXT,
  metric_value REAL,
  observed_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, function_key)
);
CREATE INDEX IF NOT EXISTS idx_company_functions_workspace
  ON company_function_snapshots(workspace_id, function_key, updated_at DESC);

CREATE TABLE IF NOT EXISTS runtime_heartbeats (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  next_expected_at TEXT,
  details_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
