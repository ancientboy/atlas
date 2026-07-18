import { env } from "cloudflare:workers";
import { analyticsSyncJobType, dailyGrowthJobType, isRuntimeRequestAuthorized, observationScanJobType, runAgentRuntimeTick, type AgentJob } from "../../../../lib/agent-runtime";
import { runDailyGrowthReflection } from "../../../../lib/daily-growth-runtime";
import { runWorkspaceObservationScan } from "../../../../lib/observation-engine";
import { syncPostHogConnection } from "../../../../lib/posthog-analytics";
import { runWorkspaceAutonomyLoop } from "../../../../lib/autonomy-loop";
import { runDuePublicationJobs } from "../../../../lib/publication-runtime";
import { runDueCompanyRuntimeCycles } from "../../../../lib/company-runtime";

export const dynamic = "force-dynamic";

async function executeRuntimeJob(job: AgentJob) {
  if (job.jobType === analyticsSyncJobType) {
    const input = JSON.parse(job.inputJson) as { metricDate?: string };
    return syncPostHogConnection(env.DB, job.workspaceId, env.CONNECTION_ENCRYPTION_KEY, { date: input.metricDate });
  }
  if (job.jobType === observationScanJobType) {
    const observationScan = await runWorkspaceObservationScan(env.DB, job.workspaceId, env as unknown as Record<string, string | undefined>, { jobId: job.id });
    const autonomyLoop = await runWorkspaceAutonomyLoop(env.DB, job.workspaceId);
    return { ...observationScan, autonomyLoop };
  }
  if (job.jobType !== dailyGrowthJobType) throw new Error("Unsupported runtime job.");
  const input = JSON.parse(job.inputJson) as { localDate?: string };
  const result = await runDailyGrowthReflection(env.DB, job.workspaceId, { date: input.localDate });
  return { date: result.date, skipped: result.skipped, runId: result.runId ?? null, decisionId: result.decisionId ?? null };
}

export async function POST(request: Request) {
  const runtimeSecret = (env as unknown as Record<string, string | undefined>).ATLAS_RUNTIME_SECRET;
  if (!(await isRuntimeRequestAuthorized(request.headers, runtimeSecret))) {
    return Response.json({ error: "Runtime authorization failed." }, { status: 401 });
  }

  try {
    const companyRuntime = await runDueCompanyRuntimeCycles(env.DB);
    const result = await runAgentRuntimeTick(env.DB, executeRuntimeJob);
    const publications = await runDuePublicationJobs(env.DB, env as unknown as Record<string, string | undefined>);
    return Response.json({ ok: true, companyRuntime, ...result, publications });
  } catch {
    return Response.json({ error: "Runtime tick failed safely." }, { status: 500 });
  }
}

export function GET() {
  return Response.json({ error: "Method not allowed." }, { status: 405, headers: { Allow: "POST" } });
}
