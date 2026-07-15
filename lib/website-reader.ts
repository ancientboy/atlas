import { readLimitedText, resolveCloudflareDoh, resolvePublicAddresses, validatePublicUrl } from "./atlas-runtime.ts";

export type WebsiteSnapshot = {
  finalUrl: string;
  title: string;
  description: string;
  body: string;
  source: "direct" | "reader";
};

type ReaderEnv = Record<string, string | undefined>;
type Fetcher = typeof fetch;
type Resolver = (hostname: string) => Promise<string[]>;
export type WebsiteReadStage = "fetching_direct" | "fetching_reader";
type StageListener = (stage: WebsiteReadStage) => void | Promise<void>;

const directBodyLimit = 750_000;
const readerBodyLimit = 750_000;
const analysisTextLimit = 20_000;
const readerOrigin = "https://r.jina.ai/";
const directTimeoutMs = 8_000;
const readerTimeoutMs = 15_000;

function browserHeaders() {
  return {
    "user-agent": "Mozilla/5.0 (compatible; AtlasProductResearch/1.0; +https://atlas.lumeword.com)",
    accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.7",
    "accept-language": "en-US,en;q=0.8",
  };
}

function htmlSnapshot(url: URL, html: string): WebsiteSnapshot {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/\s+/g, " ").trim();
  const description = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)/i)?.[1] || "").trim();
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, analysisTextLimit);
  if (!body) throw new Error("Product page did not contain readable content.");
  return { finalUrl: url.toString(), title, description, body, source: "direct" };
}

function markdownSnapshot(url: URL, markdown: string): WebsiteSnapshot {
  const title = markdown.match(/^Title:\s*(.+)$/im)?.[1]?.trim() || "";
  const content = markdown.replace(/^Title:.*\n(?:URL Source:.*\n)?(?:Published Time:.*\n)?(?:Markdown Content:\s*\n)?/i, "").trim();
  if (!content) throw new Error("Website reader returned no readable content.");
  const description = content
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[#*_>`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
  return { finalUrl: url.toString(), title, description, body: content.slice(0, analysisTextLimit), source: "reader" };
}

async function fetchDirect(startUrl: URL, fetcher: Fetcher, resolver: Resolver, timeoutMs: number): Promise<WebsiteSnapshot> {
  let url = startUrl;
  for (let i = 0; i < 4; i += 1) {
    await resolvePublicAddresses(url.hostname, resolver);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetcher(url.toString(), { redirect: "manual", signal: controller.signal, headers: browserHeaders() });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) throw new Error("Redirect without Location header.");
        url = validatePublicUrl(new URL(location, url).toString());
        continue;
      }
      const type = response.headers.get("content-type") || "";
      if (!response.ok || !type.toLowerCase().includes("text/html")) throw new Error("URL must return a public HTML page.");
      return htmlSnapshot(url, await readLimitedText(response, directBodyLimit));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("Too many redirects.");
}

async function fetchWithReader(url: URL, fetcher: Fetcher, timeoutMs: number): Promise<WebsiteSnapshot> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(`${readerOrigin}${url.toString()}`, {
      redirect: "error",
      signal: controller.signal,
      headers: { accept: "text/markdown", "user-agent": "AtlasProductResearch/1.0" },
    });
    if (!response.ok) throw new Error("Website reader could not retrieve the product page.");
    return markdownSnapshot(url, await readLimitedText(response, readerBodyLimit));
  } finally {
    clearTimeout(timeout);
  }
}

export async function readProductWebsite(input: string, env: ReaderEnv, fetcher: Fetcher = fetch, resolver?: Resolver, onStage?: StageListener): Promise<WebsiteSnapshot> {
  const url = validatePublicUrl(input);
  const trustedResolver = resolver ?? (env.ATLAS_DNS_RESOLVER ? (hostname: string) => resolveCloudflareDoh(hostname, env.ATLAS_DNS_RESOLVER as string, fetcher) : undefined);
  if (!trustedResolver) throw new Error("Trusted DNS resolver is not configured.");
  await resolvePublicAddresses(url.hostname, trustedResolver);
  const directDeadline = positiveTimeout(env.ATLAS_DIRECT_FETCH_TIMEOUT_MS, directTimeoutMs);
  const readerDeadline = positiveTimeout(env.ATLAS_READER_TIMEOUT_MS, readerTimeoutMs);
  try {
    await onStage?.("fetching_direct");
    return await fetchDirect(url, fetcher, trustedResolver, directDeadline);
  } catch {
    await onStage?.("fetching_reader");
    return fetchWithReader(url, fetcher, readerDeadline);
  }
}

function positiveTimeout(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
