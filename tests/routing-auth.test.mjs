import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("public home stays the full Atlas website and uses in-site auth routes", async () => {
  const home = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(home, /Atlas workspace preview/);
  assert.match(home, /One AI employee/);
  assert.match(home, /你的第一位 AI 员工/);
  assert.match(home, /const loginUrl = "\/login"/);
  assert.doesNotMatch(home, /app\.lumeword\.com/);
});

test("app and onboarding are protected by Sites ChatGPT auth", async () => {
  const [appPage, onboardingPage, loginPage, auth] = await Promise.all([
    readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/onboarding/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/chatgpt-auth.ts", import.meta.url), "utf8"),
  ]);
  assert.match(appPage, /requireChatGPTUser\("\/app"\)/);
  assert.match(onboardingPage, /requireChatGPTUser\("\/onboarding"\)/);
  assert.match(loginPage, /chatGPTSignInPath/);
  assert.match(auth, /\/signin-with-chatgpt/);
  assert.match(auth, /\/signout-with-chatgpt/);
  assert.match(auth, /oai-authenticated-user-email/);
});

test("workspace redirects incomplete products to onboarding and onboarding posts to atlas v2", async () => {
  const [dashboard, onboarding] = await Promise.all([
    readFile(new URL("../components/atlas-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/atlas-onboarding.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(dashboard, /router\.replace\("\/onboarding"\)/);
  assert.match(dashboard, /payload\.product\.analysisStatus !== "completed"/);
  assert.match(onboarding, /fetch\("\/api\/atlas-v2"/);
  assert.match(onboarding, /action: "onboard"/);
  assert.match(onboarding, /router\.replace\("\/app"\)/);
});
