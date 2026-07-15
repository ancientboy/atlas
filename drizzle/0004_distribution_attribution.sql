CREATE TABLE IF NOT EXISTS marketing_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  anonymous_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  path TEXT NOT NULL,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_marketing_events_created ON marketing_events(created_at, event_name);
CREATE INDEX IF NOT EXISTS idx_marketing_events_campaign ON marketing_events(utm_campaign, utm_source, created_at);

CREATE TABLE IF NOT EXISTS platform_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_account_id TEXT,
  account_label TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  scopes_json TEXT NOT NULL DEFAULT '[]',
  credential_reference TEXT,
  expires_at TEXT,
  last_sync_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, provider, external_account_id)
);

CREATE TABLE IF NOT EXISTS publication_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  asset_id INTEGER NOT NULL REFERENCES campaign_assets(id) ON DELETE CASCADE,
  connection_id INTEGER REFERENCES platform_connections(id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued',
  scheduled_for TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 4,
  next_attempt_at TEXT,
  external_post_id TEXT,
  published_url TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_publication_jobs_due ON publication_jobs(status, next_attempt_at, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_publication_jobs_workspace ON publication_jobs(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS campaign_metric_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  asset_id INTEGER NOT NULL REFERENCES campaign_assets(id) ON DELETE CASCADE,
  snapshot_date TEXT NOT NULL,
  source TEXT NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  engagements INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(asset_id, snapshot_date, source)
);

CREATE TABLE IF NOT EXISTS daily_growth_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  snapshot_date TEXT NOT NULL,
  visits INTEGER NOT NULL DEFAULT 0,
  signups INTEGER NOT NULL DEFAULT 0,
  paid INTEGER NOT NULL DEFAULT 0,
  attributed_visits INTEGER NOT NULL DEFAULT 0,
  attributed_signups INTEGER NOT NULL DEFAULT 0,
  attributed_paid INTEGER NOT NULL DEFAULT 0,
  reflection_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_growth_workspace ON daily_growth_snapshots(workspace_id, snapshot_date);
