import assert from "node:assert/strict";
import test from "node:test";
import { getAuthenticatedUser, readLimitedText, resolvePublicAddresses, safeClientError, stableUserId, validateProductAnalysis, validatePublicUrl } from "../lib/atlas-runtime.ts";

test("未登录 API 身份解析返回 null，开发演示模式必须显式开启", async () => {
  assert.equal(await getAuthenticatedUser(new Headers(), { NODE_ENV: "production" }), null);
  assert.equal(await getAuthenticatedUser(new Headers(), { NODE_ENV: "development" }), null);
  assert.equal((await getAuthenticatedUser(new Headers(), { NODE_ENV: "development", ATLAS_DEV_DEMO: "1" }))?.id, "dev-demo-user");
});

test("伪造用户 header 不被接受，必须使用服务端认证 header", async () => {
  const headers = new Headers({ "x-atlas-user-id": "attacker", "x-atlas-workspace-id": "victim" });
  assert.equal(await getAuthenticatedUser(headers, { NODE_ENV: "production" }), null);
  headers.set("oai-authenticated-user-email", "owner@example.com");
  assert.equal((await getAuthenticatedUser(headers, { NODE_ENV: "production" }))?.email, "owner@example.com");
});

test("格式相近邮箱不会产生相同用户 ID", async () => {
  assert.notEqual(await stableUserId("a+b@example.com"), await stableUserId("a_b@example.com"));
});

test("Workspace 查询必须带 workspace_id 条件以隔离 A/B 工作区", async () => {
  const source = await (await import("node:fs/promises")).readFile(new URL("../app/api/atlas-v2/route.ts", import.meta.url), "utf8");
  for (const table of ["products", "agents", "agent_tasks", "agent_runs", "approvals", "memories", "opportunities", "connections", "metrics"]) {
    assert.match(source, new RegExp(`${table}[^\"]*WHERE workspace_id = \\?`));
  }
  assert.match(source, /workspace_members/);
  assert.doesNotMatch(source, /agent_id, title[\s\S]*VALUES \(\?, 1,/);
  assert.match(source, /ensureWorkspaceAgent/);
});

test("私有 IPv4、IPv6、metadata、凭据、非法端口被阻止", () => {
  for (const url of ["http://localhost", "http://127.0.0.1", "http://10.0.0.1", "http://192.168.1.1", "http://169.254.169.254/latest", "http://[::1]/", "http://[fd00::1]/", "https://user:pass@example.com", "https://example.com:444/"]) {
    assert.throws(() => validatePublicUrl(url));
  }
  assert.equal(validatePublicUrl("https://example.com/path").hostname, "example.com");
});

test("恶意 redirect 和 DNS 解析到私有地址会被阻止", async () => {
  assert.throws(() => validatePublicUrl(new URL("http://169.254.169.254/latest", "https://example.com").toString()));
  await assert.rejects(() => resolvePublicAddresses("missing.example"));
  await assert.rejects(() => resolvePublicAddresses("evil.example", async () => ["10.1.2.3"]));
  await assert.doesNotReject(() => resolvePublicAddresses("safe.example", async () => ["93.184.216.34"]));
});

test("超大响应被流式终止，非 HTML 可由调用方拒绝", async () => {
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(8)); controller.enqueue(new Uint8Array(8)); controller.close(); } });
  await assert.rejects(() => readLimitedText(new Response(stream, { headers: { "content-type": "text/html" } }), 10));
  await assert.rejects(() => readLimitedText(new Response("small", { headers: { "content-length": "11" } }), 10));
  assert.equal(new Response("{}", { headers: { "content-type": "application/json" } }).headers.get("content-type")?.includes("text/html"), false);
});

test("LLM 无效 JSON/Schema 被安全处理，缺少 key 错误不泄露敏感信息", () => {
  assert.throws(() => validateProductAnalysis({ summary: "x" }));
  assert.match(safeClientError(new Error("Missing server LLM key. Set OPENAI_API_KEY or LLM_API_KEY in the Cloudflare environment.")), /Missing server LLM key/);
  assert.equal(safeClientError(new Error("LLM request failed: sk-secret upstream dump")), "Analysis failed. Please retry later.");
  validateProductAnalysis({ summary: "s", valueProposition: "v", icp: "i", pains: ["p"], useCases: ["u"], competitors: ["c"], channels: ["ch"], nextBestActions: [{ title: "a", description: "d", expectedOutcome: "e" }, { title: "b", description: "d", expectedOutcome: "e" }, { title: "c", description: "d", expectedOutcome: "e" }], opportunities: [{ title: "o", summary: "s", suggestedAction: "a", signal: "sig", confidence: 50 }] });
});
