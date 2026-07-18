ALTER TABLE workspaces ADD COLUMN autonomy_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE workspaces ADD COLUMN autonomy_updated_at TEXT;

CREATE INDEX IF NOT EXISTS idx_workspaces_autonomy_enabled
  ON workspaces(autonomy_enabled);
