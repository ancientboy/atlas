import { normalizePublishedUrl } from "./campaign-tracking.ts";
import type { CampaignChannel } from "./campaign-channels.ts";
import { decryptConnectionSecret } from "./connection-vault.ts";
import { isPublishableChannel, publishCampaignAsset } from "./publishing.ts";
import { safeClientError } from "./atlas-runtime.ts";

type Env = Record<string, string | undefined>;
const nowText = () => new Date().toISOString();

function parse<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

export async function enqueueApprovedAssetPublication(db: D1Database, workspaceId: string, assetId: number, scheduledFor?: string | null) {
  const asset = await db.prepare("SELECT id, channel, status FROM campaign_assets WHERE id = ? AND workspace_id = ?").bind(assetId, workspaceId).first<{ id: number; channel: CampaignChannel; status: string }>();
  if (!asset || asset.status !== "approved" || !isPublishableChannel(asset.channel)) return { queued: false };
  const key = `${workspaceId}:${asset.id}:${asset.channel}`;
  const schedule = scheduledFor ?? nowText();
  const inserted = await db.prepare("INSERT OR IGNORE INTO publication_jobs (workspace_id, asset_id, idempotency_key, status, scheduled_for, created_at, updated_at) VALUES (?, ?, ?, 'queued', ?, ?, ?)")
    .bind(workspaceId, asset.id, key, schedule, nowText(), nowText())
    .run();
  return { queued: (inserted.meta?.changes ?? 0) > 0 };
}

export async function runDuePublicationJobs(db: D1Database, env: Env, workspaceId?: string, limit = 10) {
  const now = nowText();
  const scope = workspaceId ? " AND j.workspace_id = ?" : "";
  const jobs = workspaceId
    ? await db.prepare(`SELECT j.id, j.workspace_id AS workspaceId, j.asset_id AS assetId, j.attempt_count AS attemptCount, j.max_attempts AS maxAttempts FROM publication_jobs j INNER JOIN workspaces w ON w.id = j.workspace_id WHERE w.autonomy_enabled != 0 AND j.status IN ('queued', 'retrying') AND (j.scheduled_for IS NULL OR datetime(j.scheduled_for) <= datetime(?)) AND (j.next_attempt_at IS NULL OR datetime(j.next_attempt_at) <= datetime(?))${scope} ORDER BY j.id LIMIT ?`).bind(now, now, workspaceId, limit).all<{ id: number; workspaceId: string; assetId: number; attemptCount: number; maxAttempts: number }>()
    : await db.prepare("SELECT j.id, j.workspace_id AS workspaceId, j.asset_id AS assetId, j.attempt_count AS attemptCount, j.max_attempts AS maxAttempts FROM publication_jobs j INNER JOIN workspaces w ON w.id = j.workspace_id WHERE w.autonomy_enabled != 0 AND j.status IN ('queued', 'retrying') AND (j.scheduled_for IS NULL OR datetime(j.scheduled_for) <= datetime(?)) AND (j.next_attempt_at IS NULL OR datetime(j.next_attempt_at) <= datetime(?)) ORDER BY j.id LIMIT ?").bind(now, now, limit).all<{ id: number; workspaceId: string; assetId: number; attemptCount: number; maxAttempts: number }>();
  let published = 0;
  let retrying = 0;
  let failed = 0;
  for (const job of jobs.results) {
    await db.prepare("UPDATE publication_jobs SET status = 'processing', attempt_count = attempt_count + 1, last_error = NULL, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(nowText(), job.id, job.workspaceId).run();
    try {
      const asset = await db.prepare("SELECT id, channel, title, content, cta, status FROM campaign_assets WHERE id = ? AND workspace_id = ?").bind(job.assetId, job.workspaceId).first<{ id: number; channel: CampaignChannel; title: string; content: string; cta: string; status: string }>();
      if (!asset || asset.status !== "approved" || !isPublishableChannel(asset.channel)) throw new Error("Approved publishable campaign asset was not found.");
      const provider = asset.channel === "blog" ? "wordpress" : asset.channel;
      const connection = await db.prepare("SELECT credential_ciphertext AS credentialCiphertext, metadata_json AS metadataJson FROM platform_connections WHERE workspace_id = ? AND provider = ? AND status = 'connected' ORDER BY updated_at DESC LIMIT 1").bind(job.workspaceId, provider).first<{ credentialCiphertext: string; metadataJson: string }>();
      if (!connection?.credentialCiphertext) throw new Error("Workspace provider connection is not configured.");
      const secret = await decryptConnectionSecret(connection.credentialCiphertext, env.CONNECTION_ENCRYPTION_KEY);
      const metadata = parse<{ subreddit?: string }>(connection.metadataJson, {});
      const publishingEnv: Env = asset.channel === "blog"
        ? { WORDPRESS_BASE_URL: secret.siteUrl, WORDPRESS_USERNAME: secret.username, WORDPRESS_APP_PASSWORD: secret.applicationPassword, WORDPRESS_PUBLISH_STATUS: env.WORDPRESS_PUBLISH_STATUS }
        : asset.channel === "x"
          ? { X_ACCESS_TOKEN: secret.accessToken }
          : asset.channel === "linkedin"
            ? { LINKEDIN_ACCESS_TOKEN: secret.accessToken, LINKEDIN_AUTHOR_URN: secret.authorUrn }
            : { REDDIT_ACCESS_TOKEN: secret.accessToken, REDDIT_SUBREDDIT: metadata.subreddit, REDDIT_USER_AGENT: env.REDDIT_USER_AGENT };
      const receipt = await publishCampaignAsset(asset, publishingEnv);
      const publishedUrl = normalizePublishedUrl(receipt.publishedUrl);
      const finished = nowText();
      await db.batch([
        db.prepare("UPDATE publication_jobs SET status = 'published', external_post_id = ?, published_url = ?, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(receipt.externalPostId, publishedUrl, finished, job.id, job.workspaceId),
        db.prepare("UPDATE campaign_assets SET status = 'published', published_url = ?, published_at = ?, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(publishedUrl, finished, finished, asset.id, job.workspaceId),
        db.prepare("UPDATE campaigns SET status = 'active', updated_at = ? WHERE id = (SELECT campaign_id FROM campaign_assets WHERE id = ? AND workspace_id = ?) AND workspace_id = ?").bind(finished, asset.id, job.workspaceId, job.workspaceId),
        db.prepare("INSERT INTO agent_tool_calls (workspace_id, tool_name, status, input_json, output_json, started_at, finished_at) VALUES (?, 'ExternalPublicationExecutor', 'completed', ?, ?, ?, ?)").bind(job.workspaceId, JSON.stringify({ jobId: job.id, assetId: asset.id, channel: asset.channel }), JSON.stringify({ provider, externalPostId: receipt.externalPostId, publishedUrl }), now, finished),
      ]);
      published += 1;
    } catch (error) {
      const nextAttemptAt = new Date(Date.now() + Math.min(60, 2 ** (job.attemptCount + 1)) * 60_000).toISOString();
      const exhausted = job.attemptCount + 1 >= job.maxAttempts;
      const safeError = safeClientError(error);
      await db.batch([
        db.prepare("UPDATE publication_jobs SET status = ?, next_attempt_at = ?, last_error = ?, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(exhausted ? "failed" : "retrying", exhausted ? null : nextAttemptAt, safeError, nowText(), job.id, job.workspaceId),
        db.prepare("INSERT INTO agent_tool_calls (workspace_id, tool_name, status, input_json, error_code, started_at, finished_at) VALUES (?, 'ExternalPublicationExecutor', ?, ?, 'external_publish_failed', ?, ?)").bind(job.workspaceId, exhausted ? "failed" : "retrying", JSON.stringify({ jobId: job.id, assetId: job.assetId }), now, nowText()),
      ]);
      if (exhausted) failed += 1;
      else retrying += 1;
    }
  }
  return { scanned: jobs.results.length, published, retrying, failed };
}
