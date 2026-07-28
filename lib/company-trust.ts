export const trustLevels = ["observe", "recommend", "prepare", "approval", "autopilot"] as const;
export type TrustLevel = typeof trustLevels[number];

export const defaultTrustPolicies = [
  { actionType: "analyze_signals", trustLevel: "autopilot", maxRiskLevel: 1, reason: "Reading and internal analysis are safe to run automatically." },
  { actionType: "create_company_action", trustLevel: "prepare", maxRiskLevel: 1, reason: "Atlas may prepare traceable internal work without publishing it." },
  { actionType: "prepare_campaign", trustLevel: "prepare", maxRiskLevel: 1, reason: "Atlas may create drafts; distribution remains separately controlled." },
  { actionType: "publish_content", trustLevel: "approval", maxRiskLevel: 2, reason: "Public content requires Founder approval." },
  { actionType: "contact_person", trustLevel: "approval", maxRiskLevel: 2, reason: "Person-directed communication requires Founder approval." },
  { actionType: "update_public_site", trustLevel: "approval", maxRiskLevel: 2, reason: "Public product changes require Founder approval." },
  { actionType: "incur_cost", trustLevel: "approval", maxRiskLevel: 3, reason: "Paid actions are never automatic by default." },
] as const;

type Db = D1Database;

export function normalizeTrustLevel(value: unknown): TrustLevel {
  return trustLevels.includes(value as TrustLevel) ? value as TrustLevel : "recommend";
}

export function trustLevelDecision(level: TrustLevel, riskLevel: number, maxRiskLevel: number) {
  if (riskLevel >= 3) return { decision: "block" as const, policyCode: "high_risk_blocked" };
  if (level === "observe" || level === "recommend") return { decision: "block" as const, policyCode: `trust_${level}` };
  if (level === "prepare") return { decision: riskLevel <= 1 ? "execute" as const : "require_approval" as const, policyCode: "trust_prepare" };
  if (level === "approval") return { decision: "require_approval" as const, policyCode: "trust_approval" };
  if (riskLevel > maxRiskLevel) return { decision: "require_approval" as const, policyCode: "trust_risk_limit" };
  return { decision: "execute" as const, policyCode: "trust_autopilot" };
}

export async function ensureActionTrustPolicies(db: Db, workspaceId: string, now = new Date()) {
  for (const policy of defaultTrustPolicies) {
    await db.prepare(
      "INSERT OR IGNORE INTO action_trust_policies (workspace_id, action_type, trust_level, max_risk_level, reason, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).bind(workspaceId, policy.actionType, policy.trustLevel, policy.maxRiskLevel, policy.reason, now.toISOString(), now.toISOString()).run();
  }
}

export async function getActionTrustPolicy(db: Db, workspaceId: string, actionType: string) {
  await ensureActionTrustPolicies(db, workspaceId);
  const row = await db.prepare(
    "SELECT action_type AS actionType, trust_level AS trustLevel, max_risk_level AS maxRiskLevel, reason FROM action_trust_policies WHERE workspace_id = ? AND action_type = ?",
  ).bind(workspaceId, actionType).first<{ actionType: string; trustLevel: string; maxRiskLevel: number; reason: string | null }>();
  return row ? { ...row, trustLevel: normalizeTrustLevel(row.trustLevel) } : {
    actionType,
    trustLevel: "recommend" as TrustLevel,
    maxRiskLevel: 1,
    reason: "New action types default to recommendation-only.",
  };
}

