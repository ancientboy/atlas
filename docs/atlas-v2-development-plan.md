# Atlas V2 — AI Founder Operator development plan

Atlas V2 evolves the existing product incrementally. It keeps the current
workspace, authentication, product intelligence, campaign, approval,
publishing, tracking, and memory capabilities while connecting them through a
real operator runtime.

## Current architecture

- **Runtime:** Next.js 16 + React 19, built with Vinext/Vite for ChatGPT Sites.
- **Persistence:** Sites-managed Cloudflare D1, with Drizzle schema declarations
  and packaged SQL migrations.
- **Application API:** authenticated workspace operations are currently
  concentrated in `app/api/atlas-v2/route.ts`.
- **LLM:** server-only OpenAI-compatible provider abstraction with an OpenAI
  fallback, output validation, response limits, and endpoint SSRF protection.
- **Identity:** trusted Sites identity, email magic links, and Google OAuth all
  resolve to the same `users` and `workspace_members` records.
- **Execution:** product analysis and campaign generation create real
  `agent_tasks`, `agent_runs`, approvals, assets, publishing receipts, and
  growth snapshots.

## Reusable capabilities

- Workspace membership checks and workspace-scoped V2 entities.
- Product Website Reader and Product Analysis Agent.
- Growth Operator and Campaign Agent records.
- Task, run, approval, opportunity, memory, campaign, and publishing models.
- Official connection vault and approval-gated publishing adapters.
- First-party UTM/event tracking and daily growth reflection rules.
- Today, Product Intelligence, Campaigns, Activity, Memory, Agents, and
  Connections interfaces.

## Gaps found in V1

1. The daily reflection runs when the workspace API is opened. It is idempotent
   per day, but it is not an independent background Agent Runtime.
2. `agents` describe a role, schedule, and tools, but there is no durable job
   lease, retry state, or scheduler health record.
3. Product analysis and campaign creation are real, but the common
   observe/analyze/plan/execute/measure/learn lifecycle is not yet represented
   as a reusable runtime contract.
4. Observations exist, but only product website analysis writes a normalized
   observation. There is no recurring connector ingestion pipeline yet.
5. Growth reflection is deterministic and useful as a safe baseline, but it
   does not yet rank evidence-backed actions with a model or measure experiment
   outcomes over time.
6. The legacy `/api/dashboard` route and the old research tables are global,
   auto-seeded prototype data. They must not be used as multi-tenant V2 data
   until they become workspace-scoped or are retired.

## Target operating loop

```text
Sources -> Observations -> Insights -> Opportunities -> Next Best Action
        -> Tasks -> Approval -> Tool execution -> Outcome metrics
        -> Reflection -> Verified memory -> next cycle
```

Every external action must be attributable to a workspace, agent, task, job,
tool, evidence set, approval decision, and measurable outcome.

## Incremental delivery plan

### Sprint 1 — Architecture and boundaries

- Document the existing architecture and prototype boundaries.
- Identify reusable modules and remove runtime dependence on demo data.
- Define the V2 operating loop and acceptance criteria.

**Exit:** the team can distinguish real capabilities from seeds/mocks and has a
small, ordered implementation plan.

### Sprint 2 — Agent Runtime foundation

- Add durable agent schedules and jobs.
- Add idempotency keys, leases, bounded retries, safe errors, and runtime health.
- Move daily reflection out of page-load execution.
- Add a server-only signed runtime tick endpoint.
- Surface last run, next schedule, and failure state in Today.

**Exit:** a Growth Operator cycle can run without a user opening Atlas, and two
concurrent scheduler calls cannot perform the same daily job twice.

### Sprint 3 — Growth Operator planner

**Status:** first evidence-driven planning slice implemented.

- Reads product goals, first-party metrics, observations, opportunities,
  approvals, and completed work.
- Writes one auditable daily decision per Workspace with evidence, confidence,
  risk, expected impact, and priority score.
- Produces localized Chinese and English Founder Daily Brief content.
- Converts the highest-ranked action into an idempotent daily Agent task and
  long-term growth memory.

- Define a typed Agent and Tool interface.
- Build an evidence bundle from product memory, recent observations, metrics,
  active experiments, and campaign outcomes.
- Rank Next Best Actions by impact, confidence, effort, risk, and freshness.
- Route actions through autonomy levels and approvals.

**Exit:** every proposed action has evidence and a reason; Atlas produces one
prioritized daily plan rather than disconnected suggestions.

### Sprint 4 — Observation Engine

**Status:** first recurring observation slice and PostHog metric ingestion implemented.

- Durable source registry, cursors, content fingerprints, source health, runs,
  and normalized Insights.
- Product website change observer with the existing DNS/SSRF protections.
- Public GitHub repository observer with bounded metadata reads and release
  detection.
- Six-hour Observation Runtime job, idempotent scheduling, retries, and a
  manual scan control in Today.
- Observation -> Insight -> Opportunity is active for evidence-backed release
  signals.

- Add connector cursors, source health, freshness, and normalized observations.
- PostHog now syncs daily unique visitors, signup events, and paid events into
  the Workspace metric stream with encrypted credentials, runtime retries, and
  visible freshness. GA4 and Search Console remain future connectors.
- Start with the product website, GitHub, Hacker News, and one authenticated
  analytics source. Add Reddit/Product Hunt only through policy-compliant APIs.
- Derive insights and opportunities without duplicating existing signals.

**Exit:** recurring external changes become traceable Observation -> Insight ->
Opportunity records.

### Sprint 5 — Execution and automation

- Generalize approved campaign publishing into the Tool Runtime.
- Add scheduled execution, retries, receipts, and recovery.
- Keep high-risk community actions approval-gated and preserve manual receipts
  where official APIs are unavailable.

**Exit:** at least one Level 2 task completes end-to-end through an official
provider with an auditable receipt.

### Sprint 6 — Measure and learn

- Connect campaigns, assets, publications, experiments, and conversion events.
- Add experiment evaluation windows and outcome states.
- Write lessons to Memory with source, confidence, and verification time.
- Let verified lessons alter the next planning cycle.

**Exit:** Atlas can explain what worked, what failed, and how that changed the
next action.

## First production workflow

The first complete workflow is “help Atlas acquire its first users”:

1. Observe AI founder problems and Atlas distribution performance.
2. Create evidence-backed opportunities for X, Reddit, Indie Hackers, Product
   Hunt, and owned content.
3. Select one Next Best Action and one measurable experiment.
4. Generate channel-specific content and request approval.
5. Publish through an official connection or record a manual receipt.
6. Measure visits, signups, and conversions through Atlas tracking.
7. Reflect after the evaluation window and store the verified lesson.

## Product guardrails

- Do not create additional decorative Agent personas before Growth Operator is
  dependable.
- Do not expose model chain-of-thought; store evidence and concise decision
  summaries instead.
- Do not use unofficial browser automation for account actions.
- Do not let low-confidence or high-risk actions bypass approval.
- Do not generate a new plan when source data is stale without clearly saying
  that measurement or freshness is the bottleneck.
