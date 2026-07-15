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
- **Agents / 数字员工**: Growth Operator and Reflection Agent profiles.
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

V2 database entities are workspace-scoped and include `users`, `workspaces`, `workspace_members`, `products`, `agents`, `agent_tasks`, `agent_runs`, `approvals`, `memories`, `observations`, `opportunities`, `connections`, `metrics`, and `agent_rate_limits`.

Atlas application credentials are server-only. Configure the OAuth Client ID/Secret variables and the 32-byte `CONNECTION_ENCRYPTION_KEY` documented in `.env.example`. Each user connects their own X, LinkedIn, Reddit, or WordPress account from the Workspace Connections page. Access and refresh tokens are encrypted per Workspace in D1; the browser receives only account labels, expiry/readiness metadata, and never tokens or passwords. WordPress defaults to creating drafts. Every automatic publish still requires an approved campaign asset and is protected by a stable idempotency key, bounded retries, and a stored public receipt.

Sites can invoke `run_daily_reflection` after analytics synchronization. The current UI also exposes a safe “run today’s reflection” action. A platform scheduler may call the same action once per workspace; the daily snapshot upsert makes repeated runs safe.

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

Authentication in this private Alpha depends on trusted Sites identity headers (`oai-authenticated-user-*`) being injected by the hosting layer. This PR does not implement public self-serve registration.

## Verification

```bash
npm run db:generate
npm run build
npm test
```

## Intentional prototype boundaries

This V2 slice includes workspace isolation, onboarding, and a reusable Website Reader used by the Product Analysis Agent. The reader validates the target with trusted DoH/IP checks, attempts a bounded direct HTML fetch, then falls back to Jina Reader's rendered Markdown extraction for blocked or JavaScript-heavy public pages. If both methods fail, onboarding can still use user-provided product context. Private, reserved, metadata, credential-bearing, and non-web targets remain blocked before retrieval. Other connectors are still mocked: Atlas does **not** yet publish to social networks, alter a live landing page, run a cron scheduler, or perform real external actions. Level 3 actions remain manual by design.

## Recommended next implementation steps

1. Add one authenticated observation connector (for example PostHog or Search Console).
2. Add a scheduled job that writes normalized observations to D1.
3. Convert the Growth Operator's task planner from seed data to rules / model-backed planning.
4. Add one real Level 2 executor (draft → approval → publish) with audit logs and rollback.
5. Replace the private Alpha Sites identity-header dependency with a public registration and account-management flow when the product is ready for self-serve users.
