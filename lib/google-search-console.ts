import { decryptConnectionSecret, encryptConnectionSecret, type ConnectionSecret } from "./connection-vault.ts";

type Db = D1Database;
type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SITES_URL = "https://www.googleapis.com/webmasters/v3/sites";
const GOOGLE_SEARCH_ANALYTICS = "https://www.googleapis.com/webmasters/v3/sites";

export type SearchConsoleProperty = { siteUrl: string; permissionLevel: string };
export type SearchConsoleQuery = { query: string; clicks: number; impressions: number; ctr: number; position: number };

export function isVerifiedHttpsProperty(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname.length > 0 && url.username === "" && url.password === "" && !url.search && !url.hash; } catch { return false; }
}

async function googleJson(url: string, init: RequestInit, fetcher: Fetcher) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15_000);
  try { const response = await fetcher(url, { ...init, signal: controller.signal }); const text = await response.text(); if (!response.ok) throw new Error(`Google Search Console request failed (${response.status}).`); if (text.length > 1_000_000) throw new Error("Google Search Console response is too large."); return JSON.parse(text) as Record<string, unknown>; } finally { clearTimeout(timer); }
}

export async function refreshGoogleAccessToken(secret: ConnectionSecret, env: Record<string, string | undefined>, fetcher: Fetcher = fetch) {
  if (!secret.refreshToken) return secret;
  if (!secret.expiresAt || Date.parse(secret.expiresAt) > Date.now() + 60_000) return secret;
  const clientId = env.GOOGLE_CLIENT_ID?.trim(); const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Google Search Console OAuth application is not configured.");
  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: secret.refreshToken, client_id: clientId, client_secret: clientSecret });
  const payload = await googleJson(GOOGLE_TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body }, fetcher);
  const accessToken = String(payload.access_token ?? ""); if (!accessToken) throw new Error("Google token refresh returned no access token.");
  const expiresIn = Number(payload.expires_in ?? 0);
  return { ...secret, accessToken, expiresAt: expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : secret.expiresAt };
}

export async function listSearchConsoleProperties(secret: ConnectionSecret, env: Record<string, string | undefined>, fetcher: Fetcher = fetch) {
  const current = await refreshGoogleAccessToken(secret, env, fetcher);
  const payload = await googleJson(GOOGLE_SITES_URL, { headers: { authorization: `Bearer ${current.accessToken}` } }, fetcher);
  const entries = Array.isArray(payload.siteEntry) ? payload.siteEntry as Array<Record<string, unknown>> : [];
  return { secret: current, properties: entries.map((item) => ({ siteUrl: String(item.siteUrl ?? ""), permissionLevel: String(item.permissionLevel ?? "") })).filter((item) => isVerifiedHttpsProperty(item.siteUrl) && /owner|full/i.test(item.permissionLevel)) };
}

export function buildSearchConsoleRequest(siteUrl: string, startDate: string, endDate: string) {
  if (!isVerifiedHttpsProperty(siteUrl)) throw new Error("Select a verified HTTPS Search Console property.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) throw new Error("Search Console date range is invalid.");
  return { url: `${GOOGLE_SEARCH_ANALYTICS}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`, body: { startDate, endDate, dimensions: ["query"], rowLimit: 25, dataState: "final" } };
}

export function parseSearchConsoleQueries(value: unknown): SearchConsoleQuery[] {
  const rows = Array.isArray((value as { rows?: unknown })?.rows) ? (value as { rows: unknown[] }).rows : [];
  return rows.flatMap((row) => { if (!row || typeof row !== "object") return []; const item = row as Record<string, unknown>; const query = Array.isArray(item.keys) ? String(item.keys[0] ?? "").trim() : ""; const impressions = Math.max(0, Math.floor(Number(item.impressions) || 0)); if (!query || !impressions) return []; return [{ query, clicks: Math.max(0, Math.floor(Number(item.clicks) || 0)), impressions, ctr: Math.max(0, Number(item.ctr) || 0), position: Math.max(0, Number(item.position) || 0) }]; });
}

export function searchConsoleOpportunity(query: SearchConsoleQuery) { return query.impressions >= 20 && query.position > 3 && query.position <= 20 && query.ctr < 0.08; }
const fingerprint = (workspaceId: string, query: string) => `${workspaceId}:gsc:${query.toLowerCase().normalize("NFKC").replace(/\s+/g, " ").slice(0, 180)}`;

export async function syncGoogleSearchConsoleConnection(db: Db, workspaceId: string, masterKey: string | undefined, env: Record<string, string | undefined>, options: { connectionId?: number; now?: Date; fetcher?: Fetcher } = {}) {
  const now = options.now ?? new Date(); const fetcher = options.fetcher ?? fetch;
  const connection = await db.prepare("SELECT id, external_account_id AS externalAccountId, credential_ciphertext AS credentialCiphertext, metadata_json AS metadataJson FROM platform_connections WHERE workspace_id = ? AND provider = 'google_search_console' AND status = 'connected' AND (? IS NULL OR id = ?) ORDER BY updated_at DESC LIMIT 1").bind(workspaceId, options.connectionId ?? null, options.connectionId ?? null).first<{ id: number; externalAccountId: string; credentialCiphertext: string; metadataJson: string }>();
  if (!connection?.credentialCiphertext) throw new Error("Google Search Console is not connected.");
  const metadata = JSON.parse(connection.metadataJson || "{}") as { siteUrl?: string }; if (!metadata.siteUrl || !isVerifiedHttpsProperty(metadata.siteUrl)) throw new Error("Select a verified HTTPS Search Console property before syncing.");
  const startDate = new Date(now.getTime() - 28 * 86_400_000).toISOString().slice(0, 10); const endDate = new Date(now.getTime() - 3 * 86_400_000).toISOString().slice(0, 10);
  let secret = await decryptConnectionSecret(connection.credentialCiphertext, masterKey);
  try {
    secret = await refreshGoogleAccessToken(secret, env, fetcher);
    const request = buildSearchConsoleRequest(metadata.siteUrl, startDate, endDate);
    const payload = await googleJson(request.url, { method: "POST", headers: { authorization: `Bearer ${secret.accessToken}`, "content-type": "application/json" }, body: JSON.stringify(request.body) }, fetcher);
    const queries = parseSearchConsoleQueries(payload); const createdAt = now.toISOString(); let opportunities = 0;
    for (const query of queries.filter(searchConsoleOpportunity)) {
      const key = fingerprint(workspaceId, query.query); const evidence = JSON.stringify([{ source: "Google Search Console", siteUrl: metadata.siteUrl, query: query.query, clicks: query.clicks, impressions: query.impressions, ctr: Math.round(query.ctr * 10_000) / 100, position: Math.round(query.position * 10) / 10, period: `${startDate}..${endDate}` }]);
      await db.batch([
        db.prepare("INSERT OR IGNORE INTO observations (workspace_id, source_type, source_name, content, raw_data, observed_at, processed, fingerprint, title, confidence) VALUES (?, 'google_search_console', 'Google Search Console', ?, ?, ?, 0, ?, ?, 82)").bind(workspaceId, `Search demand exists for “${query.query}”, but its CTR is ${(query.ctr * 100).toFixed(1)}% at average position ${query.position.toFixed(1)}.`, evidence, createdAt, key, `SEO opportunity: ${query.query}`),
        db.prepare("INSERT INTO insights (workspace_id, fingerprint, insight_type, title, summary, confidence, evidence_json, status) VALUES (?, ?, 'seo_content_gap', ?, ?, 82, ?, 'new') ON CONFLICT(workspace_id, fingerprint) DO UPDATE SET summary = excluded.summary, confidence = MAX(insights.confidence, excluded.confidence), evidence_json = excluded.evidence_json, status = 'new'").bind(workspaceId, key, `SEO opportunity: ${query.query}`, `Improve or create content for “${query.query}”: ${query.impressions} impressions, ${(query.ctr * 100).toFixed(1)}% CTR, average position ${query.position.toFixed(1)}.`, evidence),
      ]); opportunities += 1;
    }
    const encrypted = await encryptConnectionSecret(secret, masterKey);
    await db.batch([
      db.prepare("UPDATE platform_connections SET credential_ciphertext = ?, last_sync_at = ?, metadata_json = ?, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(encrypted, createdAt, JSON.stringify({ ...metadata, lastStatus: "completed", lastError: null, lastQueryCount: queries.length, lastOpportunityCount: opportunities, lastSyncedPeriod: `${startDate}..${endDate}` }), createdAt, connection.id, workspaceId),
      db.prepare("INSERT INTO agent_tool_calls (workspace_id, job_id, run_id, tool_name, status, input_json, output_json, started_at, finished_at) VALUES (?, NULL, NULL, 'GoogleSearchConsoleTool', 'completed', ?, ?, ?, ?)").bind(workspaceId, JSON.stringify({ connectionId: connection.id, siteUrl: metadata.siteUrl, startDate, endDate }), JSON.stringify({ queryCount: queries.length, opportunityCount: opportunities }), createdAt, createdAt),
    ]);
    return { connectionId: connection.id, siteUrl: metadata.siteUrl, queries: queries.length, opportunities, startDate, endDate };
  } catch (error) {
    const safe = "Google Search Console insights could not be refreshed. Atlas will retry safely.";
    await db.batch([db.prepare("UPDATE platform_connections SET metadata_json = ?, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(JSON.stringify({ ...metadata, lastStatus: "failed", lastError: safe }), now.toISOString(), connection.id, workspaceId), db.prepare("INSERT INTO agent_tool_calls (workspace_id, job_id, run_id, tool_name, status, input_json, error_code, started_at, finished_at) VALUES (?, NULL, NULL, 'GoogleSearchConsoleTool', 'failed', ?, 'google_search_console_sync_failed', ?, ?)").bind(workspaceId, JSON.stringify({ connectionId: connection.id }), now.toISOString(), now.toISOString())]);
    throw error instanceof Error ? new Error(safe) : new Error(safe);
  }
}
