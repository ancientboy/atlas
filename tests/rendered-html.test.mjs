import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Atlas product shell and durable data model are present", async () => {
  const [dashboard, layout, schema, hosting] = await Promise.all([
    readFile(new URL("../components/atlas-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /Project Atlas/);
  assert.match(layout, /Growth Operator/);
  assert.match(dashboard, /审批队列/);
  assert.match(dashboard, /Atlas 已经开始工作/);
  assert.match(dashboard, /ApprovalDrawer/);
  assert.match(dashboard, /\/api\/atlas-v2/);
  assert.match(schema, /agentTasks/);
  assert.match(schema, /approvals/);
  assert.match(schema, /memories/);
  assert.equal(JSON.parse(hosting).d1, "DB");
  assert.doesNotMatch(layout, /codex-preview|Starter Project/);
});

test("workspace account menu keeps profile, identities, sessions, and sign-out together", async () => {
  const [dashboard, accountMenu, accountApi] = await Promise.all([
    readFile(new URL("../components/atlas-dashboard.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/account-menu.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/account/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(dashboard, /<AccountMenu/);
  assert.doesNotMatch(dashboard, /className="v2-user-menu"/);
  assert.match(accountMenu, /账户设置/);
  assert.match(accountMenu, /登录方式与安全/);
  assert.match(accountMenu, /action="\/api\/auth\/logout"/);
  assert.match(accountMenu, /revoke_other_sessions/);
  assert.match(accountMenu, /createPortal/);
  assert.match(accountMenu, /document\.body/);
  assert.match(accountApi, /getAuthenticatedUser/);
  assert.match(accountApi, /atlas_auth_identities/);
  assert.match(accountApi, /token_hash <> \?/);
});
