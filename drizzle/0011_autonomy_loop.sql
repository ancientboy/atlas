ALTER TABLE opportunities ADD COLUMN autonomy_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE opportunities ADD COLUMN auto_created_campaign_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_opportunities_autonomy
  ON opportunities(workspace_id, status, autonomy_score);
