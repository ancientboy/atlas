CREATE TABLE IF NOT EXISTS atlas_auth_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_atlas_auth_sessions_user ON atlas_auth_sessions(user_id, expires_at);

CREATE TABLE IF NOT EXISTS atlas_auth_challenges (
  token_hash TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  email TEXT,
  return_to TEXT NOT NULL DEFAULT '/app',
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_atlas_auth_challenges_expiry ON atlas_auth_challenges(kind, expires_at);

CREATE TABLE IF NOT EXISTS atlas_auth_identities (
  provider TEXT NOT NULL,
  provider_subject TEXT NOT NULL,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_subject)
);

CREATE INDEX IF NOT EXISTS idx_atlas_auth_identities_user ON atlas_auth_identities(user_id);
