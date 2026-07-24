-- Google Search Console uses the existing encrypted workspace connection vault.
-- This index keeps provider-scoped sync lookups isolated and bounded.
CREATE INDEX IF NOT EXISTS idx_platform_connections_workspace_provider
  ON platform_connections(workspace_id, provider, status, updated_at DESC);
