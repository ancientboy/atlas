import assert from "node:assert/strict";
import test from "node:test";
import { readProductWebsite } from "../lib/website-reader.ts";

const publicResolver = async () => ["93.184.216.34"];

test("website reader returns direct public HTML without using the renderer", async () => {
  const calls = [];
  const result = await readProductWebsite("https://example.com", {}, async (url) => {
    calls.push(url);
    return new Response("<html><head><title>Example</title><meta name=\"description\" content=\"A product\"></head><body>Useful public product content</body></html>", { headers: { "content-type": "text/html" } });
  }, publicResolver);
  assert.equal(result.source, "direct");
  assert.equal(result.title, "Example");
  assert.match(result.body, /Useful public product content/);
  assert.equal(calls.length, 1);
});

test("website reader falls back to mature rendered Markdown extraction", async () => {
  const calls = [];
  const result = await readProductWebsite("https://example.com", {}, async (url) => {
    calls.push(url);
    if (calls.length === 1) return new Response("blocked", { status: 403, headers: { "content-type": "text/html" } });
    return new Response("Title: Rendered Product\n\nURL Source: https://example.com/\n\nMarkdown Content:\n# Rendered Product\nA JavaScript-rendered product page.");
  }, publicResolver);
  assert.equal(result.source, "reader");
  assert.equal(result.title, "Rendered Product");
  assert.match(result.body, /JavaScript-rendered product page/);
  assert.equal(calls[1], "https://r.jina.ai/https://example.com/");
});

test("private and metadata targets are blocked before any website request", async () => {
  let called = false;
  await assert.rejects(() => readProductWebsite("http://127.0.0.1", {}, async () => { called = true; return new Response("no"); }, publicResolver), /Private|metadata/);
  assert.equal(called, false);
});

test("reader responses remain size limited", async () => {
  await assert.rejects(
    () => readProductWebsite("https://example.com", {}, async (_url, init) => {
      if (init?.headers?.accept === "text/markdown") return new Response("x", { headers: { "content-length": "800000" } });
      return new Response("blocked", { status: 403, headers: { "content-type": "text/html" } });
    }, publicResolver),
    /exceeds the allowed size/,
  );
});

test("a direct response body that never finishes times out and uses the reader", async () => {
  let calls = 0;
  const result = await readProductWebsite("https://example.com", { ATLAS_DIRECT_FETCH_TIMEOUT_MS: "5" }, async (_url, init) => {
    calls += 1;
    if (calls === 2) return new Response("Title: Reader fallback\n\nMarkdown Content:\nRecovered product content");
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("<html><body>partial"));
        init.signal.addEventListener("abort", () => controller.error(new Error("aborted")));
      },
    });
    return new Response(body, { headers: { "content-type": "text/html" } });
  }, publicResolver);
  assert.equal(result.source, "reader");
  assert.equal(calls, 2);
});

test("the rendered reader response body is also covered by a hard timeout", async () => {
  await assert.rejects(
    () => readProductWebsite("https://example.com", { ATLAS_READER_TIMEOUT_MS: "5" }, async (_url, init) => {
      if (init?.headers?.accept !== "text/markdown") return new Response("blocked", { status: 403, headers: { "content-type": "text/html" } });
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("Title: partial"));
          init.signal.addEventListener("abort", () => controller.error(new Error("aborted")));
        },
      });
      return new Response(body);
    }, publicResolver),
    /aborted/,
  );
});
