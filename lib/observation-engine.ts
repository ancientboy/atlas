import { readLimitedText, validatePublicUrl } from "./atlas-runtime.ts";
import { readProductWebsite, type WebsiteSnapshot } from "./website-reader.ts";

type ObservationEnv = Record<string, string | undefined>;
type Fetcher = typeof fetch;

type ObservationSource = {
  id: number;
  workspaceId: string;
  sourceKey: string;
  sourceType: "website" | "github";
  name: string;
  targetUrl: string;
  status: string;
  cadenceMinutes: number;
  cursorJson: string;
  contentHash: string | null;
  consecutiveFailures: number;
};

type GithubSnapshot = {
  repositoryUrl: string;
  fullName: string;
  description: string;
  stars: number;
  forks: number;
  openIssues: number;
  pushedAt: string | null;
  updatedAt: string;
  defaultBranch: string;
  latestRelease: { tag: string; name: string; publishedAt: string; url: string } | null;
};

type NormalizedObservation = {
  title: string;
  content: string;
  url: string;
  confidence: number;
  cursor: Record<string, unknown>;
  raw: Record<string, unknown>;
};

export type ObservationScanResult = {
  sources: number;
  checked: number;
  changed: number;
  insights: number;
  errors: number;
};

const githubBodyLimit = 300_000;
const githubTimeoutMs = 10_000;

function parseJson<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map((item) => item.toString(16).padStart(2, "0")).join("");
}

export async function observationFingerprint(sourceKey: string, value: unknown) {
  return digest(`${sourceKey}:${JSON.stringify(value)}`);
}

export function normalizeGithubRepositoryUrl(input: string) {
  const url = validatePublicUrl(input);
  if (!['github.com', 'www.github.com'].includes(url.hostname.toLowerCase())) throw new Error("Only public GitHub repository URLs are supported.");
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2 || !/^[A-Za-z0-9_.-]+$/.test(parts[0]) || !/^[A-Za-z0-9_.-]+(?:\.git)?$/.test(parts[1])) throw new Error("Invalid public GitHub repository URL.");
  const repository = parts[1].replace(/\.git$/i, "");
  return `https://github.com/${parts[0]}/${repository}`;
}

export function discoverGithubRepository(value: string) {
  const match = value.match(/https?:\/\/(?:www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?/i);
  if (!match) return null;
  try { return normalizeGithubRepositoryUrl(match[0]); } catch { return null; }
}

async function fetchGithubJson(url: string, fetcher: Fetcher, allowNotFound = false) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), githubTimeoutMs);
  try {
    const response = await fetcher(url, { signal: controller.signal, headers: { accept: "application/vnd.github+json", "user-agent": "AtlasObservationEngine/1.0" } });
    if (allowNotFound && response.status === 404) return null;
    if (!response.ok) throw new Error("GitHub observation request failed.");
    return JSON.parse(await readLimitedText(response, githubBodyLimit)) as Record<string, unknown>;
  } finally {
    clearTimeout(timeout);
  }
}

export async function readGithubRepository(input: string, fetcher: Fetcher = fetch): Promise<GithubSnapshot> {
  const repositoryUrl = normalizeGithubRepositoryUrl(input);
  const [, owner, repository] = new URL(repositoryUrl).pathname.split("/");
  const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`;
  const [repo, release] = await Promise.all([fetchGithubJson(base, fetcher), fetchGithubJson(`${base}/releases/latest`, fetcher, true)]);
  if (!repo || typeof repo.full_name !== "string" || typeof repo.html_url !== "string") throw new Error("GitHub observation returned an invalid repository.");
  return {
    repositoryUrl: normalizeGithubRepositoryUrl(repo.html_url),
    fullName: repo.full_name,
    description: typeof repo.description === "string" ? repo.description.slice(0, 500) : "",
    stars: Number(repo.stargazers_count) || 0,
    forks: Number(repo.forks_count) || 0,
    openIssues: Number(repo.open_issues_count) || 0,
    pushedAt: typeof repo.pushed_at === "string" ? repo.pushed_at : null,
    updatedAt: typeof repo.updated_at === "string" ? repo.updated_at : new Date().toISOString(),
    defaultBranch: typeof repo.default_branch === "string" ? repo.default_branch : "main",
    latestRelease: release && typeof release.tag_name === "string" && typeof release.html_url === "string" ? {
      tag: release.tag_name,
      name: typeof release.name === "string" && release.name ? release.name.slice(0, 200) : release.tag_name,
      publishedAt: typeof release.published_at === "string" ? release.published_at : "",
      url: release.html_url,
    } : null,
  };
}

function websiteObservation(snapshot: WebsiteSnapshot): NormalizedObservation {
  return {
    title: snapshot.title || "Product website snapshot",
    content: snapshot.description || snapshot.body.slice(0, 500),
    url: snapshot.finalUrl,
    confidence: 82,
    cursor: { finalUrl: snapshot.finalUrl, title: snapshot.title, description: snapshot.description },
    raw: { ...snapshot, body: snapshot.body.slice(0, 20_000) },
  };
}

function githubObservation(snapshot: GithubSnapshot): NormalizedObservation {
  const release = snapshot.latestRelease ? ` Latest release: ${snapshot.latestRelease.name} (${snapshot.latestRelease.tag}).` : "";
  return {
    title: `${snapshot.fullName} repository signal`,
    content: `${snapshot.stars} stars, ${snapshot.forks} forks, ${snapshot.openIssues} open issues. Last push: ${snapshot.pushedAt || "unknown"}.${release}`,
    url: snapshot.repositoryUrl,
    confidence: 86,
    cursor: { stars: snapshot.stars, forks: snapshot.forks, openIssues: snapshot.openIssues, pushedAt: snapshot.pushedAt, releaseTag: snapshot.latestRelease?.tag ?? null },
    raw: snapshot as unknown as Record<string, unknown>,
  };
}

export function describeGithubChange(before: Record<string, unknown>, after: Record<string, unknown>) {
  const changes: string[] = [];
  const starDelta = Number(after.stars ?? 0) - Number(before.stars ?? 0);
  const forkDelta = Number(after.forks ?? 0) - Number(before.forks ?? 0);
  if (starDelta) changes.push(`${starDelta > 0 ? "+" : ""}${starDelta} stars`);
  if (forkDelta) changes.push(`${forkDelta > 0 ? "+" : ""}${forkDelta} forks`);
  if (after.releaseTag && after.releaseTag !== before.releaseTag) changes.push(`new release ${String(after.releaseTag)}`);
  if (after.pushedAt && after.pushedAt !== before.pushedAt) changes.push("new repository activity");
  return changes;
}

async function ensureObservationSources(db: D1Database, workspaceId: string) {
  const product = await db.prepare("SELECT url, description, analysis_json AS analysisJson FROM products WHERE workspace_id = ? AND analysis_status = 'completed' ORDER BY id DESC LIMIT 1").bind(workspaceId).first<{ url: string; description: string | null; analysisJson: string | null }>();
  if (!product) return;
  const websiteRaw = await db.prepare("SELECT raw_data AS rawData FROM observations WHERE workspace_id = ? AND source_type = 'website' ORDER BY id DESC LIMIT 1").bind(workspaceId).first<{ rawData: string | null }>();
  await db.prepare("INSERT INTO observation_sources (workspace_id, source_key, source_type, name, target_url, status, cadence_minutes, next_run_at) VALUES (?, 'product_website', 'website', 'Product website', ?, 'active', 1440, CURRENT_TIMESTAMP) ON CONFLICT(workspace_id, source_key) DO UPDATE SET target_url = excluded.target_url, status = 'active', updated_at = CURRENT_TIMESTAMP").bind(workspaceId, product.url).run();
  const repository = discoverGithubRepository([product.url, product.description, product.analysisJson, websiteRaw?.rawData].filter(Boolean).join("\n"));
  if (repository) {
    const name = new URL(repository).pathname.slice(1);
    await db.prepare("INSERT INTO observation_sources (workspace_id, source_key, source_type, name, target_url, status, cadence_minutes, next_run_at) VALUES (?, ?, 'github', ?, ?, 'active', 360, CURRENT_TIMESTAMP) ON CONFLICT(workspace_id, source_key) DO UPDATE SET target_url = excluded.target_url, status = 'active', updated_at = CURRENT_TIMESTAMP").bind(workspaceId, `github:${name.toLowerCase()}`, `GitHub · ${name}`, repository).run();
  }
}

async function observeSource(source: ObservationSource, env: ObservationEnv, fetcher: Fetcher) {
  if (source.sourceType === "website") return websiteObservation(await readProductWebsite(source.targetUrl, env, fetcher));
  if (source.sourceType === "github") return githubObservation(await readGithubRepository(source.targetUrl, fetcher));
  throw new Error("Unsupported observation source.");
}

async function saveInsight(db: D1Database, source: ObservationSource, observationId: number, observation: NormalizedObservation, fingerprint: string, previousCursor: Record<string, unknown>) {
  const changes = source.sourceType === "github" ? describeGithubChange(previousCursor, observation.cursor) : ["Product website content changed"];
  if (!changes.length) return { created: false, opportunity: false };
  const insightFingerprint = await digest(`insight:${fingerprint}`);
  const title = source.sourceType === "github" ? `${source.name} changed` : "Product website positioning changed";
  const summary = source.sourceType === "github" ? changes.join(" · ") : "Atlas detected a new public website snapshot. Product memory and positioning should be revalidated before the next campaign.";
  const result = await db.prepare("INSERT OR IGNORE INTO insights (workspace_id, source_id, observation_id, fingerprint, insight_type, title, summary, confidence, evidence_json, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')").bind(source.workspaceId, source.id, observationId, insightFingerprint, source.sourceType === "github" ? "repository_change" : "website_change", title, summary, observation.confidence, JSON.stringify([observation.url, ...changes])).run();
  const created = (result.meta?.changes ?? 0) > 0;
  let opportunity = false;
  const releaseTag = observation.cursor.releaseTag;
  if (created && source.sourceType === "github" && releaseTag && releaseTag !== previousCursor.releaseTag) {
    const opportunityTitle = `Turn ${String(releaseTag)} into a launch and changelog campaign`;
    const inserted = await db.prepare("INSERT INTO opportunities (workspace_id, title, source, observed_at, confidence, summary, suggested_action, status, signal) SELECT ?, ?, ?, ?, 84, ?, ?, 'new', 'GitHub release' WHERE NOT EXISTS (SELECT 1 FROM opportunities WHERE workspace_id = ? AND title = ?)").bind(source.workspaceId, opportunityTitle, source.name, new Date().toISOString(), summary, "Generate channel-specific release content and route every external post through approval.", source.workspaceId, opportunityTitle).run();
    opportunity = (inserted.meta?.changes ?? 0) > 0;
  }
  return { created, opportunity };
}

export async function runWorkspaceObservationScan(db: D1Database, workspaceId: string, env: ObservationEnv, options: { jobId?: number; now?: Date; fetcher?: Fetcher; force?: boolean } = {}): Promise<ObservationScanResult> {
  const now = options.now ?? new Date();
  const nowText = now.toISOString();
  const fetcher = options.fetcher ?? fetch;
  await ensureObservationSources(db, workspaceId);
  const dueCondition = options.force ? "" : " AND (next_run_at IS NULL OR datetime(next_run_at) <= datetime(?))";
  const sourceQuery = db.prepare(`SELECT id, workspace_id AS workspaceId, source_key AS sourceKey, source_type AS sourceType, name, target_url AS targetUrl, status, cadence_minutes AS cadenceMinutes, cursor_json AS cursorJson, content_hash AS contentHash, consecutive_failures AS consecutiveFailures FROM observation_sources WHERE workspace_id = ? AND status IN ('active', 'degraded')${dueCondition} ORDER BY id LIMIT 8`);
  const sources = options.force ? await sourceQuery.bind(workspaceId).all<ObservationSource>() : await sourceQuery.bind(workspaceId, nowText).all<ObservationSource>();
  const result: ObservationScanResult = { sources: sources.results.length, checked: 0, changed: 0, insights: 0, errors: 0 };

  for (const source of sources.results) {
    const previousCursor = parseJson<Record<string, unknown>>(source.cursorJson, {});
    const run = await db.prepare("INSERT INTO observation_runs (workspace_id, source_id, job_id, status, cursor_before_json, started_at) VALUES (?, ?, ?, 'running', ?, ?) RETURNING id").bind(workspaceId, source.id, options.jobId ?? null, JSON.stringify(previousCursor), nowText).first<{ id: number }>();
    try {
      const observation = await observeSource(source, env, fetcher);
      const fingerprint = await observationFingerprint(source.sourceKey, observation.raw);
      const changed = fingerprint !== source.contentHash;
      const nextRunAt = new Date(now.getTime() + source.cadenceMinutes * 60_000).toISOString();
      let created = 0;
      let insightCreated = false;
      if (changed) {
        const saved = await db.prepare("INSERT OR IGNORE INTO observations (workspace_id, source_type, source_name, content, raw_data, observed_at, processed, source_id, fingerprint, title, url, confidence) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?) RETURNING id").bind(workspaceId, source.sourceType, source.name, observation.content, JSON.stringify(observation.raw), nowText, source.id, fingerprint, observation.title, observation.url, observation.confidence).first<{ id: number }>();
        if (saved) {
          created = 1;
          result.changed += 1;
          if (source.contentHash) {
            const insight = await saveInsight(db, source, saved.id, observation, fingerprint, previousCursor);
            insightCreated = insight.created;
            if (insight.created) result.insights += 1;
          }
        }
      }
      await db.batch([
        db.prepare("UPDATE observation_sources SET cursor_json = ?, content_hash = ?, last_checked_at = ?, last_changed_at = CASE WHEN ? = 1 THEN ? ELSE last_changed_at END, last_status = ?, last_error = NULL, consecutive_failures = 0, next_run_at = ?, status = 'active', updated_at = ? WHERE id = ? AND workspace_id = ?").bind(JSON.stringify(observation.cursor), fingerprint, nowText, changed ? 1 : 0, nowText, changed ? "changed" : "unchanged", nextRunAt, nowText, source.id, workspaceId),
        db.prepare("UPDATE observation_runs SET status = 'completed', cursor_after_json = ?, items_seen = 1, items_created = ?, finished_at = ? WHERE id = ? AND workspace_id = ?").bind(JSON.stringify(observation.cursor), created, nowText, run?.id ?? 0, workspaceId),
        db.prepare("INSERT INTO agent_tool_calls (workspace_id, job_id, run_id, tool_name, status, input_json, output_json, started_at, finished_at) VALUES (?, ?, NULL, ?, 'completed', ?, ?, ?, ?)").bind(workspaceId, options.jobId ?? null, source.sourceType === "github" ? "GitHubObserverTool" : "WebsiteChangeObserverTool", JSON.stringify({ sourceId: source.id, target: source.targetUrl }), JSON.stringify({ changed, observationCreated: Boolean(created), insightCreated, fingerprint: fingerprint.slice(0, 12) }), nowText, nowText),
      ]);
      result.checked += 1;
    } catch {
      const failureCount = source.consecutiveFailures + 1;
      const nextRunAt = new Date(now.getTime() + Math.min(24 * 60, source.cadenceMinutes * 2 ** Math.min(4, failureCount)) * 60_000).toISOString();
      const safeError = "Observation source could not be refreshed. Atlas will retry safely.";
      await db.batch([
        db.prepare("UPDATE observation_sources SET status = ?, last_checked_at = ?, last_status = 'failed', last_error = ?, consecutive_failures = ?, next_run_at = ?, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(failureCount >= 3 ? "degraded" : "active", nowText, safeError, failureCount, nextRunAt, nowText, source.id, workspaceId),
        db.prepare("UPDATE observation_runs SET status = 'failed', error_code = 'source_refresh_failed', finished_at = ? WHERE id = ? AND workspace_id = ?").bind(nowText, run?.id ?? 0, workspaceId),
        db.prepare("INSERT INTO agent_tool_calls (workspace_id, job_id, run_id, tool_name, status, input_json, error_code, started_at, finished_at) VALUES (?, ?, NULL, ?, 'failed', ?, 'source_refresh_failed', ?, ?)").bind(workspaceId, options.jobId ?? null, source.sourceType === "github" ? "GitHubObserverTool" : "WebsiteChangeObserverTool", JSON.stringify({ sourceId: source.id, target: source.targetUrl }), nowText, nowText),
      ]);
      result.errors += 1;
    }
  }
  return result;
}
