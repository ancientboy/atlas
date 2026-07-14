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

## Architecture

```text
app/page.tsx
  └── components/atlas-dashboard.tsx (V2 bilingual UI + approval drawer)
app/api/atlas-v2/route.ts
  └── Cloudflare D1 read / seed / approval & opportunity mutations
lib/atlas-v2-data.ts
  └── typed demo seed and UI contracts
db/schema.ts
  └── legacy V1 research tables + V2 runtime tables
```

V2 database entities: `agents`, `agent_tasks`, `agent_runs`, `approvals`, `memories`, `observations`, `opportunities`, `connections`, and `metrics`.

## Start locally

This project is pinned to Node 22.21.1 in `.nvmrc`.

```bash
cd /Users/leo/Documents/Project-Atlas
nvm use
npm install
npm run dev
```

Open `http://localhost:3000`. The local Cloudflare D1 database seeds V2 demo data on the first `GET /api/atlas-v2`.


## Cloudflare deployment configuration

Product Analysis fetches are fail-closed unless a trusted DNS-over-HTTPS resolver is configured. For Cloudflare deployments, set server-only environment variables/secrets similar to:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
ATLAS_DNS_RESOLVER=https://cloudflare-dns.com/dns-query
```

`ATLAS_DNS_RESOLVER` must be a DNS-over-HTTPS JSON endpoint compatible with Cloudflare's format. Atlas sends `GET` requests with `Accept: application/dns-json` and query parameters `name=<hostname>&type=A` and `name=<hostname>&type=AAAA`, then reads `Answer[]` records where `type` is `1` (A) or `28` (AAAA). DNS failures, malformed responses, and hostnames with no A/AAAA records are rejected before any page fetch.

Authentication in this private Alpha depends on trusted Sites identity headers (`oai-authenticated-user-*`) being injected by the hosting layer. This PR does not implement public self-serve registration.

## Verification

```bash
npm run db:generate
npm run build
npm test
```

## Intentional prototype boundaries

This first V2 slice uses simulated observation data and mock connections. It does **not** yet scrape websites, publish to social networks, alter a live landing page, run a cron scheduler, or perform a real external action. Level 3 actions remain manual by design. The D1 model and approval flow are in place so those integrations can be added safely next.

## Recommended next implementation steps

1. Add one authenticated observation connector (for example PostHog or Search Console).
2. Add a scheduled job that writes normalized observations to D1.
3. Convert the Growth Operator's task planner from seed data to rules / model-backed planning.
4. Add one real Level 2 executor (draft → approval → publish) with audit logs and rollback.
5. Add sign-in and workspace isolation before connecting customer data.
