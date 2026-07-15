CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  opportunity_id INTEGER,
  name TEXT NOT NULL,
  objective TEXT NOT NULL,
  audience TEXT NOT NULL,
  core_message TEXT NOT NULL,
  offer TEXT NOT NULL,
  cta TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaign_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  approval_id INTEGER,
  channel TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  cta TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_approval',
  published_url TEXT,
  published_at TEXT,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campaigns_workspace ON campaigns(workspace_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_campaign_assets_workspace ON campaign_assets(workspace_id, campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_assets_approval ON campaign_assets(workspace_id, approval_id);
