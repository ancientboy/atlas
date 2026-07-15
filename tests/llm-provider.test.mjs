import assert from "node:assert/strict";
import test from "node:test";
import { analyzeProductWithLlm, llmChatCompletionsEndpoint, parseLlmResponse, resolveLlmProvider } from "../lib/llm-provider.ts";
import { safeClientError } from "../lib/atlas-runtime.ts";

const validAnalysis = {
  summary: "A useful product",
  valueProposition: "Users get a clear outcome",
  icp: "AI founders",
  pains: ["Distribution is hard"],
  useCases: ["Find channels"],
  competitors: ["Spreadsheets"],
  channels: ["SEO"],
  nextBestActions: [
    { title: "Map audience", description: "Find communities", expectedOutcome: "Better targeting" },
    { title: "Rewrite hero", description: "Clarify promise", expectedOutcome: "Higher conversion" },
    { title: "Draft campaign", description: "Create launch content", expectedOutcome: "More signups" },
  ],
  opportunities: [{ title: "Founder story", summary: "Founder-led posts are resonating", suggestedAction: "Publish a story", signal: "content", confidence: 82 }],
};

const product = { name: "Atlas", url: "https://example.com" };
const page = { title: "Atlas", description: "Growth", body: "Public page text" };
const resolver = async () => ["93.184.216.34"];

test("custom OpenAI-compatible provider config is selected when LLM triplet is present", () => {
  const config = resolveLlmProvider({ LLM_BASE_URL: "https://llm.example.com/v1", LLM_API_KEY: "custom-key", LLM_MODEL: "custom-model", LLM_ALLOWED_HOSTS: "llm.example.com" });
  assert.equal(config.isCustom, true);
  assert.equal(config.endpoint, "https://llm.example.com/v1/chat/completions");
  assert.equal(config.model, "custom-model");
});

test("OpenAI official endpoint is used as default fallback", () => {
  const config = resolveLlmProvider({ OPENAI_API_KEY: "openai-key", OPENAI_MODEL: "gpt-4o-mini" });
  assert.equal(config.isCustom, false);
  assert.equal(config.endpoint, "https://api.openai.com/v1/chat/completions");
  assert.equal(config.model, "gpt-4o-mini");
});

test("non-HTTPS, credentials, private addresses, and disallowed hosts are blocked", () => {
  assert.throws(() => llmChatCompletionsEndpoint("http://llm.example.com/v1"), /HTTPS/);
  assert.throws(() => llmChatCompletionsEndpoint("https://user:pass@llm.example.com/v1"), /credentials/);
  assert.throws(() => llmChatCompletionsEndpoint("https://127.0.0.1/v1"), /Private|metadata/);
  assert.throws(() => llmChatCompletionsEndpoint("https://metadata.google.internal/v1"), /Private|metadata/);
  assert.throws(() => llmChatCompletionsEndpoint("https://evil.example.com/v1", "llm.example.com"), /not allowed/);
});

test("custom provider retries without response_format when unsupported and validates JSON", async () => {
  const calls = [];
  const result = await analyzeProductWithLlm(product, page, { LLM_BASE_URL: "https://llm.example.com/v1", LLM_API_KEY: "secret-key", LLM_MODEL: "custom-model" }, async (url, init) => {
    calls.push(JSON.parse(init.body));
    if (calls.length === 1) return new Response("unsupported", { status: 400 });
    return Response.json({ choices: [{ message: { content: JSON.stringify(validAnalysis) } }] });
  }, resolver);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].response_format, { type: "json_object" });
  assert.equal(calls[1].response_format, undefined);
  assert.equal(result.summary, validAnalysis.summary);
});

test("custom provider falls back to required SSE streaming and still validates JSON", async () => {
  const calls = [];
  const json = JSON.stringify(validAnalysis);
  const split = Math.floor(json.length / 2);
  const stream = [
    `data: ${JSON.stringify({ choices: [{ delta: { content: json.slice(0, split) } }] })}`,
    `data: ${JSON.stringify({ choices: [{ delta: { content: json.slice(split) } }] })}`,
    "data: [DONE]",
    "",
  ].join("\n");
  const result = await analyzeProductWithLlm(product, page, { LLM_BASE_URL: "https://llm.example.com/v1", LLM_API_KEY: "secret-key", LLM_MODEL: "custom-model" }, async (_url, init) => {
    calls.push(JSON.parse(init.body));
    if (calls.length < 3) return Response.json({ detail: "Stream must be set to true" }, { status: 400 });
    return new Response(stream, { headers: { "content-type": "text/event-stream" } });
  }, resolver);
  assert.equal(calls.length, 3);
  assert.equal(calls[2].stream, true);
  assert.equal(calls[2].response_format, undefined);
  assert.equal(result.summary, validAnalysis.summary);
});

test("keys are not included in safe client errors", async () => {
  await assert.rejects(
    () => analyzeProductWithLlm(product, page, { OPENAI_API_KEY: "sk-super-secret", OPENAI_MODEL: "gpt-4o-mini" }, async () => new Response("sk-super-secret upstream", { status: 500 })),
    (error) => {
      const message = safeClientError(error);
      assert.equal(message.includes("sk-super-secret"), false);
      assert.equal(message, "LLM provider returned HTTP 500.");
      return true;
    },
  );
});

test("invalid JSON or invalid schema is rejected", () => {
  assert.throws(() => parseLlmResponse({ choices: [{ message: { content: "not-json" } }] }), /Invalid analysis format/);
  assert.throws(() => parseLlmResponse({ choices: [{ message: { content: JSON.stringify({ summary: "x" }) } }] }), /Invalid analysis/);
});

test("minor provider type differences are normalized before schema validation", () => {
  const providerAnalysis = structuredClone(validAnalysis);
  providerAnalysis.opportunities[0].confidence = "82%";
  const result = parseLlmResponse({ choices: [{ message: { content: JSON.stringify(providerAnalysis) } }] });
  assert.equal(result.opportunities[0].confidence, 82);
});

test("bilingual product intelligence is validated and language intent reaches the LLM", async () => {
  const bilingual = { ...structuredClone(validAnalysis), contentLanguage: "zh", translation: structuredClone(validAnalysis) };
  const parsed = parseLlmResponse({ choices: [{ message: { content: JSON.stringify(bilingual) } }] });
  assert.equal(parsed.contentLanguage, "zh");
  assert.equal(parsed.translation.summary, validAnalysis.summary);
  let requestBody;
  await analyzeProductWithLlm({ ...product, locale: "zh" }, page, { OPENAI_API_KEY: "openai-key", OPENAI_MODEL: "gpt-4o-mini" }, async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return Response.json({ choices: [{ message: { content: JSON.stringify(bilingual) } }] });
  });
  assert.match(requestBody.messages[1].content, /Simplified Chinese/);
  assert.match(requestBody.messages[1].content, /translation/);
});

test("LLM requests time out safely", async () => {
  await assert.rejects(
    () => analyzeProductWithLlm(product, page, { OPENAI_API_KEY: "openai-key", OPENAI_MODEL: "gpt-4o-mini", LLM_TIMEOUT_MS: "1" }, (_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new Error("aborted by signal")));
    })),
    /LLM request timed out/,
  );
});

test("LLM timeout covers an SSE response body that never finishes", async () => {
  await assert.rejects(
    () => analyzeProductWithLlm(product, page, { OPENAI_API_KEY: "openai-key", OPENAI_MODEL: "gpt-4o-mini", LLM_TIMEOUT_MS: "5" }, async (_url, init) => {
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"{"}}]}\n\n'));
          init.signal.addEventListener("abort", () => controller.error(new Error("aborted by signal")));
        },
      });
      return new Response(body, { headers: { "content-type": "text/event-stream" } });
    }),
    /LLM request timed out/,
  );
});

test("oversized LLM responses are rejected before JSON parsing", async () => {
  await assert.rejects(
    () => analyzeProductWithLlm(product, page, { OPENAI_API_KEY: "openai-key", OPENAI_MODEL: "gpt-4o-mini", LLM_RESPONSE_LIMIT_BYTES: "8" }, async () => Response.json({ choices: [{ message: { content: JSON.stringify(validAnalysis) } }] })),
    /LLM response body exceeds the allowed size/,
  );
});
