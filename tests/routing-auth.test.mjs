import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { chatGPTSignInPathFor, safeRelativeReturnPath } from "../lib/auth-paths.ts";
import { analysisProgress, analysisStage, onboardingCanSubmit, onboardingDestination, workspaceDestination, workspaceErrorMessage } from "../lib/route-state.ts";

test("public home stays the full Atlas website and uses in-site auth routes", async () => {
  const home = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(home, /Atlas workspace preview/);
  assert.match(home, /One AI employee/);
  assert.match(home, /你的第一位 AI 员工/);
  assert.match(home, /const loginUrl = "\/login"/);
  assert.doesNotMatch(home, /app\.lumeword\.com/);
});

test("return_to is sanitized before Sites sign-in redirects", () => {
  assert.equal(safeRelativeReturnPath("/app?tab=today#top"), "/app?tab=today#top");
  assert.equal(safeRelativeReturnPath("https://evil.example/app"), "/");
  assert.equal(safeRelativeReturnPath("//evil.example/app"), "/");
  assert.equal(safeRelativeReturnPath("/signin-with-chatgpt?return_to=/app"), "/");
  assert.equal(chatGPTSignInPathFor("//evil.example"), "/signin-with-chatgpt?return_to=%2F");
});

test("login route handles authenticated and unauthenticated destinations", async () => {
  const loginPage = await readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8");
  assert.match(loginPage, /getChatGPTUser/);
  assert.match(loginPage, /redirect\(user \? "\/app" : chatGPTSignInPath\(returnTo\)\)/);
});

test("app and onboarding are protected by Sites ChatGPT auth", async () => {
  const [appPage, onboardingPage, auth, authPaths] = await Promise.all([
    readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/onboarding/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/chatgpt-auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/auth-paths.ts", import.meta.url), "utf8"),
  ]);
  assert.match(appPage, /requireChatGPTUser\("\/app"\)/);
  assert.match(onboardingPage, /requireChatGPTUser\(returnTo\)/);
  assert.match(onboardingPage, /newProduct = params\.new === "1"/);
  assert.match(authPaths, /signin-with-chatgpt/);
  assert.match(authPaths, /signout-with-chatgpt/);
  assert.match(auth, /oai-authenticated-user-email/);
});

test("completed/running/failed onboarding states route or allow retry correctly", () => {
  assert.equal(onboardingDestination({ product: { analysisStatus: "completed" } }), "/app");
  assert.equal(onboardingDestination({ product: { analysisStatus: "running" } }), null);
  assert.equal(onboardingCanSubmit("running"), false);
  assert.equal(onboardingCanSubmit("pending"), false);
  assert.equal(onboardingCanSubmit("failed"), true);
  assert.equal(onboardingCanSubmit(undefined), true);
});

test("analysis progress maps real backend stages and never claims completion early", () => {
  assert.equal(analysisStage("Fetching public website"), "fetching");
  assert.equal(analysisStage("Rendering product website"), "rendering");
  assert.equal(analysisStage("Analyzing product with LLM"), "analyzing");
  assert.equal(analysisStage("Saving workspace"), "saving");
  assert.deepEqual(["starting", "fetching", "rendering", "analyzing", "saving"].map(analysisProgress), [8, 22, 42, 70, 92]);
});

test("workspace routes incomplete products and exposes retryable safe errors", () => {
  assert.equal(workspaceDestination({ product: { analysisStatus: "completed" } }), null);
  assert.equal(workspaceDestination({ product: { analysisStatus: "running" } }), "/onboarding");
  assert.equal(workspaceDestination({ product: null }), "/onboarding");
  assert.match(workspaceErrorMessage("en"), /Retry|retry/);
  assert.match(workspaceErrorMessage("zh"), /重试/);
});

test("workspace failure UI has an alert and Retry button", async () => {
  const dashboard = await readFile(new URL("../components/atlas-dashboard.tsx", import.meta.url), "utf8");
  assert.match(dashboard, /role="alert"/);
  assert.match(dashboard, /Retry/);
  assert.match(dashboard, /loadError/);
});

test("completed onboarding opens the Product Intelligence report and dashboard exposes it in navigation", async () => {
  const [onboarding, dashboard] = await Promise.all([
    readFile(new URL("../components/atlas-onboarding.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/atlas-dashboard.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(onboarding, /\/app\?view=product-intelligence/);
  assert.match(onboarding, /product: \{ \.\.\.product, locale \}/);
  assert.match(dashboard, /id: "product-intelligence"/);
  assert.match(dashboard, /function ProductIntelligence/);
  assert.match(dashboard, /analysis\.translation/);
});

test("multiple products use isolated workspaces with a sidebar switcher and add-product flow", async () => {
  const [route, onboarding, dashboard] = await Promise.all([
    readFile(new URL("../app/api/atlas-v2/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/atlas-onboarding.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/atlas-dashboard.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(route, /action === "create_workspace"/);
  assert.match(route, /action === "delete_workspace"/);
  assert.match(route, /Only the workspace owner can delete/);
  assert.match(route, /DELETE FROM products WHERE workspace_id = \?/);
  assert.match(route, /crypto\.randomUUID/);
  assert.match(route, /INSERT INTO workspace_members/);
  assert.match(route, /listUserWorkspaces/);
  assert.match(onboarding, /newProductFlow/);
  assert.match(onboarding, /action: "create_workspace"/);
  assert.match(dashboard, /workspace-switcher/);
  assert.match(dashboard, /atlas-workspace-id/);
  assert.match(dashboard, /\/onboarding\?new=1/);
  assert.match(dashboard, /delete-workspace/);
  assert.match(dashboard, /window\.confirm/);
  assert.match(onboarding, /window\.location\.replace\(`\/app\?view=product-intelligence/);
});

test("Growth Campaign Agent turns workspace opportunities into approval-gated channel assets", async () => {
  const [route, dashboard, migration, validation] = await Promise.all([
    readFile(new URL("../app/api/atlas-v2/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/atlas-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0003_growth_campaign_agent.sql", import.meta.url), "utf8"),
    readFile(new URL("../scripts/validate-artifact.sh", import.meta.url), "utf8"),
  ]);
  assert.match(route, /action === "create_campaign"/);
  assert.match(route, /generateGrowthCampaignWithLlm/);
  assert.match(route, /campaign_asset_publish/);
  assert.match(route, /WHERE id = \? AND workspace_id = \?/);
  assert.match(route, /status = 'approved'/);
  assert.match(dashboard, /id: "campaigns"/);
  assert.match(dashboard, /function CampaignComposer/);
  assert.match(dashboard, /mark_campaign_asset_published/);
  assert.match(dashboard, /update_campaign_metrics/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS campaigns/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS campaign_assets/);
  assert.match(validation, /0003_growth_campaign_agent\.sql/);
});

test("Content Studio supports platform previews, safe editing, regeneration, and manual publishing", async () => {
  const [route, dashboard, styles] = await Promise.all([
    readFile(new URL("../app/api/atlas-v2/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/atlas-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);
  assert.match(route, /action === "update_campaign_asset"/);
  assert.match(route, /action === "regenerate_campaign_asset"/);
  assert.match(route, /status = 'pending_approval'/);
  assert.match(route, /status = 'pending', approved_by = NULL/);
  assert.match(dashboard, /function ContentStudioAsset/);
  assert.match(dashboard, /function PlatformPreview/);
  assert.match(dashboard, /Export Markdown/);
  assert.match(dashboard, /Confirm published/);
  assert.match(dashboard, /This provider is configured/);
  assert.match(styles, /\.x-preview/);
  assert.match(styles, /\.linkedin-preview/);
  assert.match(styles, /\.blog-preview/);
});

test("GEO distribution channels, attribution storage, and publishing queue are packaged safely", async () => {
  const [channels, dashboard, route, trackingRoute, migration, validation] = await Promise.all([
    readFile(new URL("../lib/campaign-channels.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/atlas-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/atlas-v2/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/track/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0004_distribution_attribution.sql", import.meta.url), "utf8"),
    readFile(new URL("../scripts/validate-artifact.sh", import.meta.url), "utf8"),
  ]);
  for (const channel of ["reddit", "quora", "youtube", "product_hunt", "github", "newsletter", "xiaohongshu"]) assert.match(channels, new RegExp(`${channel}:`));
  assert.match(channels, /mode: "manual"/);
  assert.match(dashboard, /never mass-mentions users or posts repetitive replies/);
  assert.match(route, /filter\(isCampaignChannel\)/);
  assert.match(route, /DELETE FROM publication_jobs WHERE workspace_id/);
  assert.match(trackingRoute, /sec-fetch-site/);
  assert.match(trackingRoute, /marketing_events/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS publication_jobs/);
  assert.match(migration, /idempotency_key TEXT NOT NULL UNIQUE/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS daily_growth_snapshots/);
  assert.match(validation, /0004_distribution_attribution\.sql/);
});

test("approved assets can enter idempotent official publishing and daily reflection", async () => {
  const [route, dashboard, publishing] = await Promise.all([
    readFile(new URL("../app/api/atlas-v2/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/atlas-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/publishing.ts", import.meta.url), "utf8"),
  ]);
  assert.match(route, /action === "publish_campaign_asset"/);
  assert.match(route, /INSERT OR IGNORE INTO publication_jobs/);
  assert.match(route, /attempt_count = attempt_count \+ 1/);
  assert.match(route, /action === "run_daily_reflection"/);
  assert.match(route, /daily_growth_snapshots/);
  assert.match(dashboard, /Publish with Atlas/);
  assert.match(dashboard, /Run today's reflection/);
  assert.match(publishing, /api\.x\.com\/2\/tweets/);
  assert.match(publishing, /api\.linkedin\.com\/v2\/ugcPosts/);
  assert.match(publishing, /oauth\.reddit\.com\/api\/submit/);
  assert.match(publishing, /wp-json\/wp\/v2\/posts/);
});
