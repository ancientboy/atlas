import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { chatGPTSignInPathFor, safeRelativeReturnPath } from "../lib/auth-paths.ts";
import { onboardingCanSubmit, onboardingDestination, workspaceDestination, workspaceErrorMessage } from "../lib/route-state.ts";

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
  assert.match(onboardingPage, /requireChatGPTUser\("\/onboarding"\)/);
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
