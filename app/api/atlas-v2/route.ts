import { env } from "cloudflare:workers";
import { atlasV2Seed } from "../../../lib/atlas-v2-data";
import { createProductAnalysisRecords, ensureWorkspaceAgent } from "../../../lib/atlas-workspace-runtime";
import { getAuthenticatedUser, rateLimitKey, safeClientError, validatePublicUrl, type ProductAnalysis } from "../../../lib/atlas-runtime";
import { analyzeProductWithLlm } from "../../../lib/llm-provider";
import { readProductWebsite } from "../../../lib/website-reader";

export const dynamic = "force-dynamic";

const rateLimit = 5;
const staleAnalysisMs = 3 * 60 * 1000;
const nowText = () => new Date().toISOString();

type Workspace = { id: string; name: string };
type D1 = D1Database;

function parse<T>(value: unknown, fallback: T): T { if (typeof value !== "string") return fallback; try { return JSON.parse(value) as T; } catch { return fallback; } }
function workspaceIdFor(userId: string) { return `ws_${userId}`; }
async function ensureUserWorkspace(db: D1, user: { id: string; email: string; name: string }) {
  const workspaceId = workspaceIdFor(user.id);
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO users (id, email, name, locale) VALUES (?, ?, ?, 'zh')").bind(user.id, user.email, user.name),
    db.prepare("INSERT OR IGNORE INTO workspaces (id, name, created_by_user_id) VALUES (?, ?, ?)").bind(workspaceId, `${user.name}'s Workspace`, user.id),
    db.prepare("INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, 'owner')").bind(workspaceId, user.id),
  ]);
  await ensureWorkspaceAgent(db, workspaceId);
  return workspaceId;
}
async function getWorkspace(request: Request) {
  const user = await getAuthenticatedUser(request.headers, env as Record<string, string | undefined>);
  if (!user) throw new Response(JSON.stringify({ error: "Authentication required" }), { status: 401 });
  const db = env.DB;
  const defaultWorkspaceId = await ensureUserWorkspace(db, user);
  const requested = new URL(request.url).searchParams.get("workspaceId") || request.headers.get("x-atlas-workspace-id") || defaultWorkspaceId;
  const workspace = await db.prepare("SELECT w.id, w.name FROM workspaces w INNER JOIN workspace_members m ON m.workspace_id = w.id WHERE w.id = ? AND m.user_id = ?").bind(requested, user.id).first<Workspace>();
  if (!workspace) throw new Response(JSON.stringify({ error: "Workspace access denied" }), { status: 403 });
  return { user, workspaceId: workspace.id };
}
async function ensureDevSeed(db: D1, workspaceId: string) {
  if (env.ATLAS_DEV_DEMO !== "1" || env.NODE_ENV === "production") return;
  const count = await db.prepare("SELECT COUNT(*) AS count FROM agents WHERE workspace_id = ?").bind(workspaceId).first<{ count: number }>();
  if ((count?.count ?? 0) > 0) return;
  await db.batch([
    ...atlasV2Seed.agents.map((i) => db.prepare("INSERT INTO agents (workspace_id, name, role, description, status, autonomy_level, schedule, success_rate, current_task, tools) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(workspaceId, i.name, i.role, i.description, i.status, i.autonomyLevel, i.schedule, i.successRate, i.currentTask, JSON.stringify(i.tools))),
    ...atlasV2Seed.connections.map((i) => db.prepare("INSERT INTO connections (workspace_id, name, description, status, last_sync, category) VALUES (?, ?, ?, ?, ?, ?)").bind(workspaceId, i.name, i.description, i.status, i.lastSync, i.category)),
    db.prepare("INSERT INTO metrics (workspace_id, metric_date, visits, signups, paid, conversion, completed_tasks) VALUES (?, ?, 0, 0, 0, 0, 0)").bind(workspaceId, new Date().toISOString().slice(0, 10)),
  ]);
}
async function snapshot(workspaceId: string) { const db = env.DB; const [product, agents, tasks, approvals, runs, opportunities, memories, connections, metrics] = await Promise.all([
 db.prepare("SELECT id, name, url, description, growth_goal AS growthGoal, analysis_status AS analysisStatus, analysis_error AS analysisError, analysis_json AS analysisJson FROM products WHERE workspace_id = ? ORDER BY id DESC LIMIT 1").bind(workspaceId).first(),
 db.prepare("SELECT id, name, role, description, status, autonomy_level AS autonomyLevel, schedule, success_rate AS successRate, current_task AS currentTask, tools FROM agents WHERE workspace_id = ? ORDER BY id").bind(workspaceId).all(),
 db.prepare("SELECT id, agent_id AS agentId, title, description, task_type AS taskType, priority, risk_level AS riskLevel, status, requires_approval AS requiresApproval, expected_outcome AS expectedOutcome, estimated_minutes AS estimatedMinutes, evidence, created_at AS createdAt FROM agent_tasks WHERE workspace_id = ? ORDER BY priority, id DESC LIMIT 20").bind(workspaceId).all(),
 db.prepare("SELECT id, task_id AS taskId, action_type AS actionType, title, reason, payload, risk_level AS riskLevel, status, created_at AS createdAt FROM approvals WHERE workspace_id = ? ORDER BY id").bind(workspaceId).all(),
 db.prepare("SELECT id, agent_id AS agentId, task_id AS taskId, task, status, input, output, tools, started_at AS startedAt, finished_at AS finishedAt, result FROM agent_runs WHERE workspace_id = ? ORDER BY id DESC").bind(workspaceId).all(),
 db.prepare("SELECT id, title, source, observed_at AS observedAt, confidence, summary, suggested_action AS suggestedAction, status, signal FROM opportunities WHERE workspace_id = ? ORDER BY id DESC").bind(workspaceId).all(),
 db.prepare("SELECT id, memory_type AS type, title, content, source, confidence, status, last_verified_at AS verifiedAt FROM memories WHERE workspace_id = ? ORDER BY id DESC").bind(workspaceId).all(),
 db.prepare("SELECT id, name, description, status, last_sync AS lastSync, category FROM connections WHERE workspace_id = ? ORDER BY id").bind(workspaceId).all(),
 db.prepare("SELECT visits, signups, paid, conversion, completed_tasks AS completedTasks FROM metrics WHERE workspace_id = ? ORDER BY id DESC LIMIT 1").bind(workspaceId).first(),]); return { workspace: { id: workspaceId }, product: product ? { ...product, analysis: parse((product as { analysisJson?: string }).analysisJson, null) } : null, agents: agents.results.map((i) => ({...i, tools: parse(i.tools, [])})), tasks: tasks.results.map((i) => ({...i, requiresApproval: Boolean(i.requiresApproval), evidence: parse(i.evidence, [])})), approvals: approvals.results, runs: runs.results.map((i) => ({...i, tools: parse(i.tools, [])})), opportunities: opportunities.results, memories: memories.results, connections: connections.results, metrics: { ...(metrics ?? { visits: 0, signups: 0, paid: 0, conversion: 0, completedTasks: 0 }), yesterdayCompleted: (metrics as { completedTasks?: number } | null)?.completedTasks ?? 0 } }; }
async function listUserWorkspaces(db: D1, userId: string) { const rows = await db.prepare("SELECT w.id, w.name FROM workspaces w INNER JOIN workspace_members m ON m.workspace_id = w.id WHERE m.user_id = ? ORDER BY w.created_at, w.id").bind(userId).all<{ id: string; name: string }>(); return Promise.all(rows.results.map(async (workspace) => { const product = await db.prepare("SELECT name, url, analysis_status AS analysisStatus FROM products WHERE workspace_id = ? ORDER BY id DESC LIMIT 1").bind(workspace.id).first<{ name: string; url: string; analysisStatus: string }>(); return { ...workspace, productName: product?.name ?? null, productUrl: product?.url ?? null, analysisStatus: product?.analysisStatus ?? null }; })); }
async function workspacePayload(workspaceId: string, userId: string) { return { ...(await snapshot(workspaceId)), workspaces: await listUserWorkspaces(env.DB, userId) }; }
async function createProductWorkspace(db: D1, user: { id: string; name: string }, productName?: string) { const workspaceId = `ws_${crypto.randomUUID().replaceAll("-", "")}`; const name = `${productName?.trim() || user.name || "New product"} Workspace`; await db.batch([db.prepare("INSERT INTO workspaces (id, name, created_by_user_id) VALUES (?, ?, ?)").bind(workspaceId, name, user.id), db.prepare("INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, 'owner')").bind(workspaceId, user.id)]); await ensureWorkspaceAgent(db, workspaceId); return workspaceId; }
async function deleteProductWorkspace(db: D1, workspaceId: string, user: { id: string; name: string }) {
  const ownership = await db.prepare("SELECT w.id FROM workspaces w INNER JOIN workspace_members m ON m.workspace_id = w.id WHERE w.id = ? AND w.created_by_user_id = ? AND m.user_id = ? AND m.role = 'owner'").bind(workspaceId, user.id, user.id).first<{ id: string }>();
  if (!ownership) throw new Error("Only the workspace owner can delete this workspace.");
  const running = await db.prepare("SELECT id FROM products WHERE workspace_id = ? AND analysis_status = 'running' LIMIT 1").bind(workspaceId).first<{ id: number }>();
  if (running) throw new Error("Wait for the current analysis to finish or time out before deleting this workspace.");
  await db.batch([
    db.prepare("DELETE FROM agent_rate_limits WHERE workspace_id = ?").bind(workspaceId),
    db.prepare("DELETE FROM approvals WHERE workspace_id = ?").bind(workspaceId),
    db.prepare("DELETE FROM opportunities WHERE workspace_id = ?").bind(workspaceId),
    db.prepare("DELETE FROM memories WHERE workspace_id = ?").bind(workspaceId),
    db.prepare("DELETE FROM observations WHERE workspace_id = ?").bind(workspaceId),
    db.prepare("DELETE FROM connections WHERE workspace_id = ?").bind(workspaceId),
    db.prepare("DELETE FROM metrics WHERE workspace_id = ?").bind(workspaceId),
    db.prepare("DELETE FROM agent_runs WHERE workspace_id = ?").bind(workspaceId),
    db.prepare("DELETE FROM agent_tasks WHERE workspace_id = ?").bind(workspaceId),
    db.prepare("DELETE FROM products WHERE workspace_id = ?").bind(workspaceId),
    db.prepare("DELETE FROM agents WHERE workspace_id = ?").bind(workspaceId),
    db.prepare("DELETE FROM workspace_members WHERE workspace_id = ?").bind(workspaceId),
    db.prepare("DELETE FROM workspaces WHERE id = ? AND created_by_user_id = ?").bind(workspaceId, user.id),
  ]);
  let workspaces = await listUserWorkspaces(db, user.id);
  if (!workspaces.length) {
    await ensureUserWorkspace(db, user);
    workspaces = await listUserWorkspaces(db, user.id);
  }
  return { nextWorkspaceId: workspaces[0]?.id ?? null, workspaces };
}
async function enforceRateLimit(db: D1, userId: string, workspaceId: string) { const key = rateLimitKey(userId, workspaceId); const row = await db.prepare("SELECT count FROM agent_rate_limits WHERE key = ?").bind(key).first<{ count: number }>(); if ((row?.count ?? 0) >= rateLimit) throw new Error("Agent rate limit exceeded. Please try again later."); await db.prepare("INSERT INTO agent_rate_limits (key, user_id, workspace_id, count, window_start) VALUES (?, ?, ?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1").bind(key, userId, workspaceId, nowText()).run(); }
async function recoverStaleAnalysis(db: D1, workspaceId: string) { const cutoff = new Date(Date.now() - staleAnalysisMs).toISOString(); const stale = await db.prepare("SELECT id FROM products WHERE workspace_id = ? AND analysis_status = 'running' AND datetime(updated_at) < datetime(?) LIMIT 1").bind(workspaceId, cutoff).first<{ id: number }>(); if (!stale) return; const finished = nowText(); await db.batch([db.prepare("UPDATE products SET analysis_status = 'failed', analysis_error = 'Analysis timed out. Please retry.', updated_at = ? WHERE workspace_id = ? AND analysis_status = 'running' AND datetime(updated_at) < datetime(?)").bind(finished, workspaceId, cutoff), db.prepare("UPDATE agent_tasks SET status = 'failed', completed_at = ? WHERE workspace_id = ? AND task_type = 'product_analysis' AND status = 'running'").bind(finished, workspaceId), db.prepare("UPDATE agent_runs SET status = 'failed', output = 'Analysis timed out. Please retry.', finished_at = ?, result = 'Failed' WHERE workspace_id = ? AND task = 'Product Analysis Agent' AND status = 'running'").bind(finished, workspaceId)]); }
async function analyzeProduct(product: { name: string; url: string; description?: string; growthGoal?: string; locale?: "zh" | "en" }, page: { title: string; description: string; body: string }) { return analyzeProductWithLlm(product, page, env as Record<string, string | undefined>); }
async function runAnalysis(workspaceId: string, userId: string, input: { name: string; url: string; description?: string; growthGoal?: string; locale?: "zh" | "en" }) { const db = env.DB; await recoverStaleAnalysis(db, workspaceId); await enforceRateLimit(db, userId, workspaceId); const existing = await db.prepare("SELECT id FROM products WHERE workspace_id = ? AND url = ? AND analysis_status = 'running'").bind(workspaceId, input.url).first(); if (existing) throw new Error("A product analysis is already running for this URL."); const started = nowText(); let records; try { records = await createProductAnalysisRecords(db, workspaceId, input, started); } catch { throw new Error("Workspace initialization failed."); } const setStage = async (output: string) => { const updated = nowText(); await db.batch([db.prepare("UPDATE agent_runs SET output = ? WHERE id = ? AND workspace_id = ? AND status = 'running'").bind(output, records.runId, workspaceId), db.prepare("UPDATE products SET updated_at = ? WHERE id = ? AND workspace_id = ? AND analysis_status = 'running'").bind(updated, records.productId, workspaceId)]); }; try { let page; try { page = await readProductWebsite(input.url, env as Record<string, string | undefined>, fetch, undefined, async (stage) => setStage(stage === "fetching_reader" ? "Rendering product website" : "Fetching public website")); } catch (error) { validatePublicUrl(input.url); const supplied = [input.description?.trim(), input.growthGoal?.trim()].filter(Boolean).join("\n\n"); if (!supplied) { const safe = safeClientError(error); throw new Error(safe === "Analysis failed. Please retry later." ? "Product page fetch failed. Add a product introduction to continue without webpage content." : safe); } page = { finalUrl: input.url, title: input.name, description: input.description?.trim() || "User-provided product context", body: `User-provided onboarding context (webpage fetch unavailable):\n${supplied}`, source: "user" as const }; } await setStage("Analyzing product with LLM"); const analysis = await analyzeProduct(input, page); await setStage("Saving workspace"); try { await saveAnalysis(db, workspaceId, records.agentId, records.productId, records.taskId, records.runId, input, page, analysis); } catch { throw new Error("Workspace save failed."); } } catch (error) { const message = safeClientError(error); await db.batch([db.prepare("UPDATE products SET analysis_status = 'failed', analysis_error = ?, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(message, nowText(), records.productId, workspaceId), db.prepare("UPDATE agent_tasks SET status = 'failed', completed_at = ? WHERE id = ? AND workspace_id = ?").bind(nowText(), records.taskId, workspaceId), db.prepare("UPDATE agent_runs SET status = 'failed', output = ?, finished_at = ?, result = 'Failed' WHERE id = ? AND workspace_id = ?").bind(message, nowText(), records.runId, workspaceId)]); throw new Error(message); } }
async function saveAnalysis(db: D1, workspaceId: string, agentId: number, productId: number, taskId: number, runId: number, input: { name: string }, page: { finalUrl: string; title: string; description: string; body: string }, analysis: ProductAnalysis) { const finished = nowText(); await db.batch([db.prepare("UPDATE products SET url = ?, fetched_title = ?, fetched_description = ?, analysis_status = 'completed', analysis_json = ?, updated_at = ? WHERE id = ? AND workspace_id = ?").bind(page.finalUrl, page.title, page.description, JSON.stringify(analysis), finished, productId, workspaceId), db.prepare("INSERT INTO observations (workspace_id, source_type, source_name, content, raw_data, observed_at, processed) VALUES (?, 'website', ?, ?, ?, ?, 1)").bind(workspaceId, page.finalUrl, page.title || page.description || page.body.slice(0, 500), JSON.stringify({ ...page, body: page.body.slice(0, 12000) }), finished), db.prepare("INSERT INTO memories (workspace_id, memory_type, title, content, source, confidence, status, last_verified_at) VALUES (?, 'Product', ?, ?, ?, 88, 'validated', ?)").bind(workspaceId, `Product summary: ${input.name}`, `${analysis.summary}\n\nValue proposition: ${analysis.valueProposition}`, page.finalUrl, finished), db.prepare("INSERT INTO memories (workspace_id, memory_type, title, content, source, confidence, status, last_verified_at) VALUES (?, 'ICP', ?, ?, ?, 82, 'validated', ?)").bind(workspaceId, `ICP for ${input.name}`, analysis.icp, "Product Analysis Agent", finished), ...analysis.nextBestActions.map((a, idx) => db.prepare("INSERT INTO agent_tasks (workspace_id, agent_id, title, description, task_type, priority, risk_level, status, requires_approval, expected_outcome, estimated_minutes, evidence, created_at) VALUES (?, ?, ?, ?, 'next_best_action', ?, 1, 'queued', 0, ?, 30, ?, ?)").bind(workspaceId, agentId, a.title, a.description, idx+1, a.expectedOutcome, JSON.stringify(["Product Analysis Agent", page.finalUrl]), finished)), ...analysis.opportunities.map((o) => db.prepare("INSERT INTO opportunities (workspace_id, title, source, observed_at, confidence, summary, suggested_action, status, signal) VALUES (?, ?, 'Product Analysis Agent', ?, ?, ?, ?, 'new', ?)").bind(workspaceId, o.title, finished, o.confidence, o.summary, o.suggestedAction, o.signal)), db.prepare("UPDATE agent_tasks SET status = 'completed', completed_at = ? WHERE id = ? AND workspace_id = ?").bind(finished, taskId, workspaceId), db.prepare("UPDATE agent_runs SET status = 'completed', output = ?, finished_at = ?, result = 'Success · Workspace updated' WHERE id = ? AND workspace_id = ?").bind(`Generated ${analysis.nextBestActions.length} actions and ${analysis.opportunities.length} opportunities.`, finished, runId, workspaceId)]); }
export async function GET(request: Request) {
  try {
    const { user, workspaceId } = await getWorkspace(request);
    await ensureDevSeed(env.DB, workspaceId);
    await recoverStaleAnalysis(env.DB, workspaceId);
    return Response.json(await workspacePayload(workspaceId, user.id));
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: safeClientError(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { user, workspaceId } = await getWorkspace(request);
    const body = await request.json() as { action?: string; id?: number; productName?: string; product?: { name?: string; url?: string; description?: string; growthGoal?: string; locale?: "zh" | "en" } };
    const db = env.DB;
    if (body.action === "create_workspace") {
      const createdWorkspaceId = await createProductWorkspace(db, user, body.productName);
      return Response.json({ workspaceId: createdWorkspaceId, workspaces: await listUserWorkspaces(db, user.id) });
    }
    if (body.action === "delete_workspace") {
      const result = await deleteProductWorkspace(db, workspaceId, user);
      return Response.json({ deletedWorkspaceId: workspaceId, ...result });
    }
    if (body.action === "onboard") {
      if (!body.product?.name || !body.product?.url) return Response.json({ error: "Product name and URL are required." }, { status: 400 });
      try {
        await runAnalysis(workspaceId, user.id, { name: body.product.name, url: body.product.url, description: body.product.description, growthGoal: body.product.growthGoal, locale: body.product.locale === "en" ? "en" : "zh" });
        return Response.json(await workspacePayload(workspaceId, user.id));
      } catch (error) {
        return Response.json({ error: safeClientError(error) }, { status: 400 });
      }
    }
    if (!body.id || !["approve", "reject", "defer", "save_opportunity", "ignore_opportunity"].includes(body.action ?? "")) return Response.json({ error: "Invalid action" }, { status: 400 });
    if (body.action === "approve" || body.action === "reject" || body.action === "defer") {
      const status = body.action === "approve" ? "approved" : body.action === "reject" ? "rejected" : "deferred";
      const approval = await db.prepare("SELECT task_id AS taskId FROM approvals WHERE id = ? AND workspace_id = ?").bind(body.id, workspaceId).first<{ taskId: number }>();
      await db.batch([db.prepare("UPDATE approvals SET status = ?, approved_by = ?, approved_at = ? WHERE id = ? AND workspace_id = ?").bind(status, user.email, nowText(), body.id, workspaceId), ...(approval ? [db.prepare("UPDATE agent_tasks SET status = ? WHERE id = ? AND workspace_id = ?").bind(status === "approved" ? "approved" : status, approval.taskId, workspaceId)] : [])]);
    } else {
      await db.prepare("UPDATE opportunities SET status = ? WHERE id = ? AND workspace_id = ?").bind(body.action === "save_opportunity" ? "saved" : "ignored", body.id, workspaceId).run();
    }
    return Response.json(await workspacePayload(workspaceId, user.id));
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: safeClientError(error) }, { status: 500 });
  }
}
