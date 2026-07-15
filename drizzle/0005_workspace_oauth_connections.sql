ALTER TABLE platform_connections ADD COLUMN credential_ciphertext TEXT;
ALTER TABLE platform_connections ADD COLUMN refresh_ciphertext TEXT;
ALTER TABLE platform_connections ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS oauth_connection_states (
  state TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  code_verifier TEXT,
  return_to TEXT NOT NULL DEFAULT '/app?view=connections',
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_oauth_connection_states_expiry ON oauth_connection_states(expires_at);
