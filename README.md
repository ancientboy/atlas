# Project Atlas — Growth Operator

Project Atlas V2 is a local-first **Growth Operator** prototype for AI founders. It changes the primary experience from a research-management dashboard into a proactive digital employee report:

`Observe → Analyze → Plan → Execute → Measure → Reflect`

The app defaults to Chinese and has a true Chinese/English interface switch. Historic V1 research tables remain in the database; V2 adds a separate runtime model and API.

## What is working now

- **Today / 今日汇报**: yesterday's completed work, today's prioritized plan, approvals, discoveries, and key metrics.
- **Approval Queue / 审批队列**: Level 2 actions have evidence and prepared payloads; approve, reject, or defer persists to D1.
- **Activity / 执行记录**: auditable agent run history with input, output, tools, and result.
- **Opportunities / 增长机会**: discovered topics, keyword movement, and competitor signals; save or ignore persists to D1.
- **Memory / 公司记忆**: decisions and learned preferences with source, confidence, and verification time.
- **Agents / 数字员工**: Growth Operator and Campaign Agent profiles with a daily continuous growth loop.
- **Connections / 连接**: mock connections showing the future observe/execute boundary.
- **Official publishing / 官方发布**: approval-gated, idempotent publishing adapters for WordPress, X, LinkedIn, and Reddit. Xiaohongshu stays manual unless an approved account API is available.
- **Attribution & reflection / 归因与复盘**: stable UTM links, privacy-minimized first-party events, daily growth snapshots, and an on-demand Reflection Agent run.

## Architecture

```text
app/page.tsx
  └── components/atlas-dashboard.tsx (V2 bilingual UI + approval drawer)
app/api/atlas-v2/route.ts
  └── authenticated workspace API, onboarding, approvals, and product analysis mutations
lib/atlas-runtime.ts
  └── auth parsing, SSRF-safe URL/DNS checks, streaming limits, LLM output validation
lib/atlas-workspace-runtime.ts
  └── per-workspace Growth Operator Agent and Product Analysis Task/Run creation
lib/atlas-v2-data.ts
  └── typed demo seed and UI contracts
db/schema.ts
  └── legacy V1 research tables + V2 runtime tables
```

V2 database entities are workspace-scoped and include `users`, `workspaces`, `workspace_members`, `products`, `agents`, `agent_tasks`, `agent_runs`, `agent_decisions`, `approvals`, `memories`, `observation_sources`, `observation_runs`, `observations`, `insights`, `opportunities`, `connections`, `metrics`, and `agent_rate_limits`.

Atlas application credentials are server-only. Configure the OAuth Client ID/Secret variables and the 32-byte `CONNECTION_ENCRYPTION_KEY` documented in `.env.example`. Each user connects their own X, LinkedIn, Reddit, or WordPress account from the Workspace Connections page. Access and refresh tokens are encrypted per Workspace in D1; the browser receives only account labels, expiry/readiness metadata, and never tokens or passwords. WordPress defaults to creating drafts. Every automatic publish still requires an approved campaign asset and is protected by a stable idempotency key, bounded retries, and a stored public receipt.

Atlas now has a durable background Growth Runtime. It stores one schedule per Growth Operator, enqueues a daily job with a Workspace/date idempotency key, leases the job to one worker, retries failures with bounded exponential backoff, and exposes runtime health in Today. The UI still exposes a safe manual refresh. Daily snapshots are upserted and daily action creation is idempotent.

The Growth Operator uses an evidence-ranked Decision Engine. Every daily run reads first-party metrics, recent observations, open opportunities, completed work, and approval blockers; writes a durable `agent_decisions` record; and produces a bilingual Founder Daily Brief containing yesterday's results, discoveries, today's plan, risk, confidence, and the Next Best Action. The core planner is deterministic and auditable so an unavailable LLM cannot prevent the daily operating loop from completing.

The Observation Engine runs as its own durable Agent job. It automatically watches the public product website, discovers a public GitHub repository from product context when available, stores source cursors and content fingerprints, deduplicates unchanged snapshots, records source health and retry state, and derives traceable Insights. A newly detected GitHub release can become a review-gated growth Opportunity; no external content is published by the observer. PostHog can be connected per Workspace with an encrypted Query Read personal API key; Atlas synchronizes bounded daily visitor, signup, and paid-event aggregates every six hours and exposes source freshness without storing raw PostHog events or person data.

The server-only `POST /api/runtime/tick` endpoint advances due jobs. Call it from a trusted scheduler with `Authorization: Bearer <ATLAS_RUNTIME_SECRET>`; the secret must contain at least 32 random characters. Sites owns the application deployment and D1 binding, while the scheduler only invokes this HTTPS endpoint. Opening the workspace no longer runs the daily Agent loop.

## Account sign-in

Atlas supports three identities that converge on the same `users` row and Workspace membership: trusted ChatGPT Sites identity, email magic links delivered by Resend, and Google OAuth. First successful email or Google authentication creates the account automatically. Existing users are matched by normalized verified email so changing sign-in method does not create another product Workspace. Sessions use random opaque tokens; only SHA-256 hashes are stored in D1, cookies are `HttpOnly`, `Secure`, and `SameSite=Lax`, and email/OAuth challenges expire after 15 minutes.

Configure `ATLAS_APP_URL`, `RESEND_API_KEY`, `AUTH_EMAIL_FROM`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` as server-only Sites environment variables. The Google Web OAuth redirect URI must exactly match `https://atlas.lumeword.com/api/auth/google/callback`.

## Start locally

This project is pinned to Node 22.21.1 in `.nvmrc`.

```bash
cd /Users/leo/Documents/Project-Atlas
nvm use
npm install
npm run dev
```

Open `http://localhost:3000`. Development demo data is only written when `ATLAS_DEV_DEMO=1` is explicitly enabled outside production.


## Cloudflare deployment configuration

Product Analysis fetches are fail-closed unless a trusted DNS-over-HTTPS resolver is configured. For Cloudflare deployments, set server-only environment variables/secrets similar to:

```bash
# Optional OpenAI-compatible custom provider. If all three are set, Atlas uses this provider.
LLM_BASE_URL=https://provider.example.com/v1
LLM_API_KEY=...
LLM_MODEL=provider-model-name
LLM_ALLOWED_HOSTS=provider.example.com

# OpenAI fallback when the custom LLM_* triplet is not configured.
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini

# Required for public product-page fetches and custom LLM endpoint DNS checks.
ATLAS_DNS_RESOLVER=https://cloudflare-dns.com/dns-query
```

All LLM keys are read only on the server. They must not be sent to the browser, logged, or included in client-facing errors. `LLM_BASE_URL` must use HTTPS, must not include credentials, and is rejected when it points at localhost, private/reserved IP ranges, or metadata hosts. Set `LLM_ALLOWED_HOSTS` as a comma-separated allowlist so a misconfigured base URL cannot send a provider key to an unexpected host. Some OpenAI-compatible providers do not support `response_format`; Atlas retries custom-provider 400 responses without that field and still validates the returned JSON with the existing Product Analysis schema.

`ATLAS_DNS_RESOLVER` must be a DNS-over-HTTPS JSON endpoint compatible with Cloudflare's format. Atlas sends `GET` requests with `Accept: application/dns-json` and query parameters `name=<hostname>&type=A` and `name=<hostname>&type=AAAA`, then reads `Answer[]` records where `type` is `1` (A) or `28` (AAAA). DNS failures, malformed responses, hostnames with no A/AAAA records, and private/reserved resolved addresses are rejected before any page fetch or custom LLM request.

ChatGPT login continues to trust only Sites identity headers (`oai-authenticated-user-*`). Public self-serve registration uses verified email magic links or verified Google email identity; Atlas never stores user passwords.

## Verification

```bash
npm run db:generate
npm run build
npm test
```

## Intentional prototype boundaries

This V2 slice includes workspace isolation, onboarding, and a reusable Website Reader used by Product Analysis and recurring observations. The reader validates the target with trusted DoH/IP checks, attempts a bounded direct HTML fetch, then falls back to Jina Reader's rendered Markdown extraction for blocked or JavaScript-heavy public pages. If both methods fail, onboarding can still use user-provided product context. Private, reserved, metadata, credential-bearing, and non-web targets remain blocked before retrieval. The Observation Engine currently supports public product websites, automatically discovered public GitHub repositories, and first-party Atlas Tracking signals; authenticated analytics and market/community connectors remain incomplete. Atlas does not alter a live landing page, and the repository does not provision an external cron service automatically. Official publishing adapters and encrypted per-Workspace connections exist, while Level 3 actions remain manual by design.

## Recommended next implementation steps

1. Configure a trusted scheduler to call `/api/runtime/tick` and monitor runtime health.
2. Add GA4 or Search Console as the next authenticated measurement connector.
3. Add policy-compliant Hacker News, Product Hunt, and Reddit observation adapters.
4. Add LLM-assisted Insight enrichment on top of the deterministic evidence and safety layer.
5. Link Experiment outcomes and verified lessons back into Memory and future decisions.
