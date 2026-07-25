-- Atlas Company Brain: verified facts, reusable operating knowledge, decisions,
-- experiments and lessons. Every company-owned record remains workspace-scoped.
CREATE TABLE IF NOT EXISTS company_facts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  fact_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  value_json TEXT NOT NULL,
  source TEXT NOT NULL,
  evidence_json TEXT NOT NULL DEFAULT '[]',
  confidence INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'active',
  valid_from TEXT,
  valid_until TEXT,
  last_verified_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, fact_type, subject)
);
CREATE INDEX IF NOT EXISTS idx_company_facts_context
  ON company_facts(workspace_id, status, fact_type, last_verified_at DESC);

CREATE TABLE IF NOT EXISTS knowledge_packs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL DEFAULT 'atlas',
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE CASCADE,
  pack_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  industry TEXT,
  stage TEXT,
  channel TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(scope, workspace_id, pack_key)
);
CREATE INDEX IF NOT EXISTS idx_knowledge_packs_match
  ON knowledge_packs(scope, status, industry, stage, channel);

CREATE TABLE IF NOT EXISTS knowledge_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pack_id INTEGER NOT NULL REFERENCES knowledge_packs(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags_json TEXT NOT NULL DEFAULT '[]',
  source TEXT NOT NULL,
  confidence INTEGER NOT NULL DEFAULT 70,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_knowledge_entries_pack
  ON knowledge_entries(pack_id, status, entry_type, updated_at DESC);

CREATE TABLE IF NOT EXISTS decision_journal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  cycle_id INTEGER REFERENCES runtime_cycles(id) ON DELETE SET NULL,
  goal_id INTEGER REFERENCES company_goals(id) ON DELETE SET NULL,
  opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE SET NULL,
  decision_type TEXT NOT NULL,
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  alternatives_json TEXT NOT NULL DEFAULT '[]',
  evidence_json TEXT NOT NULL DEFAULT '[]',
  context_json TEXT NOT NULL DEFAULT '{}',
  score INTEGER NOT NULL,
  confidence INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_decision_journal_workspace
  ON decision_journal(workspace_id, decision_type, created_at DESC);

CREATE TABLE IF NOT EXISTS growth_experiments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  plan_id INTEGER REFERENCES company_plans(id) ON DELETE SET NULL,
  decision_id INTEGER REFERENCES decision_journal(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  strategy_key TEXT NOT NULL,
  channel TEXT,
  primary_metric TEXT NOT NULL,
  baseline_value REAL,
  target_value REAL,
  evaluation_starts_at TEXT,
  evaluation_ends_at TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_growth_experiments_learning
  ON growth_experiments(workspace_id, strategy_key, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS experiment_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  experiment_id INTEGER NOT NULL REFERENCES growth_experiments(id) ON DELETE CASCADE,
  metric_value REAL,
  outcome TEXT NOT NULL,
  confidence INTEGER NOT NULL DEFAULT 50,
  summary TEXT NOT NULL,
  evidence_json TEXT NOT NULL DEFAULT '[]',
  measured_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS strategy_lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  strategy_key TEXT NOT NULL,
  lesson_type TEXT NOT NULL,
  statement TEXT NOT NULL,
  evidence_json TEXT NOT NULL DEFAULT '[]',
  confidence INTEGER NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'active',
  last_applied_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, strategy_key, lesson_type)
);
CREATE INDEX IF NOT EXISTS idx_strategy_lessons_planner
  ON strategy_lessons(workspace_id, status, strategy_key, confidence DESC);
