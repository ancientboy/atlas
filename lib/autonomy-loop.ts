import type { CampaignChannel } from "./campaign-channels.ts";

type Db = D1Database;

const nowText = () => new Date().toISOString();

export function scoreAutonomyOpportunity(input: { confidence: number; signal?: string | null; summary?: string | null }) {
  const signal = `${input.signal ?? ""} ${input.summary ?? ""}`.toLowerCase();
  let score = Math.max(0, Math.min(100, Math.round(input.confidence)));
  if (/github|release|repository|website|positioning|product/.test(signal)) score += 8;
  if (/launch|campaign|content|distribution|growth/.test(signal)) score += 6;
  return Math.max(0, Math.min(100, score));
}

export function selectAutonomyChannels(score: number): CampaignChannel[] {
  if (score >= 90) return ["blog", "x", "linkedin"];
  if (score >= 80) return ["blog", "x"];
  return ["blog"];
}

export async function promoteInsightsToOpportunities(db: Db, workspaceId: string) {
  const insights = await db.prepare("SELECT id, title, summary, confidence, evidence_json AS evidenceJson, created_at AS createdAt FROM insights WHERE workspace_id = ? AND status = 'new' AND confidence >= 70 ORDER BY confidence DESC, id DESC LIMIT 8").bind(workspaceId).all<{ id: number; title: string; summary: string; confidence: number; evidenceJson: string; createdAt: string }>();
  let promoted = 0;
  for (const insight of insights.results) {
    const score = scoreAutonomyOpportunity({ confidence: insight.confidence, signal: insight.title, summary: insight.summary });
    const inserted = await db.prepare("INSERT INTO opportunities (workspace_id, title, source, observed_at, confidence, summary, suggested_action, status, signal, autonomy_score) SELECT ?, ?, 'Observation Engine', ?, ?, ?, ?, 'new', 'Observation insight', ? WHERE NOT EXISTS (SELECT 1 FROM opportunities WHERE workspace_id = ? AND title = ?)")
      .bind(workspaceId, insight.title, insight.createdAt, insight.confidence, insight.summary, "Prepare a small approval-gated growth campaign based on this observed signal.", score, workspaceId, insight.title)
      .run();
    if ((inserted.meta?.changes ?? 0) > 0) promoted += 1;
    await db.prepare("UPDATE insights SET status = 'promoted' WHERE id = ? AND workspace_id = ?").bind(insight.id, workspaceId).run();
  }
  return { promoted };
}

export async function createAutonomousCampaigns(db: Db, workspaceId: string) {
  const opportunities = await db.prepare("SELECT id, title, summary, suggested_action AS suggestedAction, autonomy_score AS autonomyScore, signal FROM opportunities WHERE workspace_id = ? AND status IN ('new', 'saved') AND autonomy_score >= 80 AND auto_created_campaign_id IS NULL ORDER BY autonomy_score DESC, confidence DESC, id DESC LIMIT 3").bind(workspaceId).all<{ id: number; title: string; summary: string; suggestedAction: string; autonomyScore: number; signal: string }>();
  const agent = await db.prepare("SELECT id FROM agents WHERE workspace_id = ? AND role = 'Campaign Agent' ORDER BY id LIMIT 1").bind(workspaceId).first<{ id: number }>();
  const fallbackAgent = await db.prepare("SELECT id FROM agents WHERE workspace_id = ? ORDER BY id LIMIT 1").bind(workspaceId).first<{ id: number }>();
  const agentId = agent?.id ?? fallbackAgent?.id;
  if (!agentId) return { campaigns: 0 };
  let campaigns = 0;
  for (const opportunity of opportunities.results) {
    const channels = selectAutonomyChannels(opportunity.autonomyScore);
    const createdAt = nowText();
    const campaign = await db.prepare("INSERT INTO campaigns (workspace_id, opportunity_id, name, objective, audience, core_message, offer, cta, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'waiting_approval', ?, ?) RETURNING id")
      .bind(workspaceId, opportunity.id, `Autonomy campaign: ${opportunity.title}`.slice(0, 180), opportunity.suggestedAction, "AI founders and solo builders", opportunity.summary, "Show Atlas as the first AI employee for founder-led growth.", "Try Atlas on your product URL", createdAt, createdAt)
      .first<{ id: number }>();
    if (!campaign) continue;
    const task = await db.prepare("INSERT INTO agent_tasks (workspace_id, agent_id, title, description, task_type, priority, risk_level, status, requires_approval, expected_outcome, estimated_minutes, evidence, created_at) VALUES (?, ?, ?, ?, 'autonomous_growth_campaign', 1, 2, 'waiting_approval', 1, ?, 20, ?, ?) RETURNING id")
      .bind(workspaceId, agentId, `Approve campaign for ${opportunity.title}`.slice(0, 180), opportunity.summary, "Create measurable approved content from a qualified observation.", JSON.stringify([opportunity.signal, `Autonomy score ${opportunity.autonomyScore}`]), createdAt)
      .first<{ id: number }>();
    for (const channel of channels) {
      const title = `${opportunity.title} · ${channel}`;
      const content = `Atlas observed this signal: ${opportunity.summary}\n\nRecommended angle: ${opportunity.suggestedAction}\n\nPositioning: Atlas is the first AI employee for founders who need growth work to continue every day.`;
      const payload = JSON.stringify({ channel, title, content, cta: "Try Atlas on your product URL" });
      const approval = await db.prepare("INSERT INTO approvals (workspace_id, task_id, action_type, title, reason, payload, risk_level, status, created_at) VALUES (?, ?, 'campaign_asset_publish', ?, ?, ?, 2, 'pending', ?) RETURNING id")
        .bind(workspaceId, task?.id ?? 0, `Approve ${channel} campaign asset`, "Atlas prepared this from a qualified observed signal. Publishing still requires approval.", payload, createdAt)
        .first<{ id: number }>();
      await db.prepare("INSERT INTO campaign_assets (workspace_id, campaign_id, approval_id, channel, title, content, cta, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_approval', ?, ?)")
        .bind(workspaceId, campaign.id, approval?.id ?? null, channel, title, content, "Try Atlas on your product URL", createdAt, createdAt)
        .run();
    }
    await db.prepare("UPDATE opportunities SET status = 'saved', auto_created_campaign_id = ? WHERE id = ? AND workspace_id = ?").bind(campaign.id, opportunity.id, workspaceId).run();
    campaigns += 1;
  }
  return { campaigns };
}

export async function runWorkspaceAutonomyLoop(db: Db, workspaceId: string) {
  const workspace = await db.prepare("SELECT autonomy_enabled AS autonomyEnabled FROM workspaces WHERE id = ?").bind(workspaceId).first<{ autonomyEnabled: number }>();
  if (!workspace || workspace.autonomyEnabled === 0) return { skipped: true, promoted: 0, campaigns: 0 };
  const promoted = await promoteInsightsToOpportunities(db, workspaceId);
  const campaigns = await createAutonomousCampaigns(db, workspaceId);
  return { skipped: false, promoted: promoted.promoted, campaigns: campaigns.campaigns };
}

export async function setWorkspaceAutonomy(db: Db, workspaceId: string, enabled: boolean) {
  const updatedAt = nowText();
  await db.batch([
    db.prepare("UPDATE workspaces SET autonomy_enabled = ?, autonomy_updated_at = ? WHERE id = ?").bind(enabled ? 1 : 0, updatedAt, workspaceId),
    db.prepare("UPDATE agent_schedules SET enabled = ? WHERE workspace_id = ?").bind(enabled ? 1 : 0, workspaceId),
    ...(enabled ? [] : [
      db.prepare("UPDATE agent_jobs SET status = 'cancelled', updated_at = ? WHERE workspace_id = ? AND status IN ('queued', 'retrying')").bind(updatedAt, workspaceId),
      db.prepare("UPDATE publication_jobs SET status = 'cancelled', updated_at = ? WHERE workspace_id = ? AND status IN ('queued', 'retrying')").bind(updatedAt, workspaceId),
    ]),
  ]);
}
