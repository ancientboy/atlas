export type AuthenticatedUser = { id: string; email: string; name: string };
export type ProductAnalysis = { summary: string; valueProposition: string; icp: string; pains: string[]; useCases: string[]; competitors: string[]; channels: string[]; nextBestActions: { title: string; description: string; expectedOutcome: string }[]; opportunities: { title: string; summary: string; suggestedAction: string; signal: string; confidence: number }[] };

const privateRanges = [
  [0x00000000, 0x00ffffff], [0x0a000000, 0x0affffff], [0x7f000000, 0x7fffffff], [0xa9fe0000, 0xa9feffff], [0xac100000, 0xac1fffff], [0xc0000000, 0xc00000ff], [0xc0000200, 0xc00002ff], [0xc0a80000, 0xc0a8ffff], [0xc6120000, 0xc613ffff], [0xc6336400, 0xc63364ff], [0xcb007100, 0xcb0071ff], [0xe0000000, 0xffffffff],
];
const metadataHosts = new Set(["169.254.169.254", "metadata.google.internal", "metadata", "instance-data"]);
const authEmailHeader = "oai-authenticated-user-email";
const authNameHeader = "oai-authenticated-user-full-name";
const authEncodingHeader = "oai-authenticated-user-full-name-encoding";

export function getAuthenticatedUser(headers: Headers, env: Record<string, string | undefined>): AuthenticatedUser | null {
  const email = headers.get(authEmailHeader);
  if (email) {
    const encodedName = headers.get(authNameHeader);
    const name = encodedName && headers.get(authEncodingHeader) === "percent-encoded-utf-8" ? safeDecode(encodedName) ?? email : email;
    return { id: stableUserId(email), email, name };
  }
  if (env.ATLAS_DEV_DEMO === "1" && env.NODE_ENV !== "production") return { id: "dev-demo-user", email: "demo@lumeword.local", name: "Demo Founder" };
  return null;
}
export function stableUserId(email: string) { return `user_${email.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`; }
function safeDecode(value: string) { try { return decodeURIComponent(value); } catch { return null; } }

function ipv4ToInt(host: string) { const parts = host.split("."); if (parts.length !== 4) return null; let n = 0; for (const p of parts) { if (!/^\d+$/.test(p)) return null; const v = Number(p); if (v < 0 || v > 255) return null; n = (n << 8) + v; } return n >>> 0; }
export function isBlockedIp(hostname: string) { const host = hostname.toLowerCase().replace(/^\[|\]$/g, ""); const v4 = ipv4ToInt(host); if (v4 !== null) return privateRanges.some(([start, end]) => v4 >= start && v4 <= end); if (host === "::1" || host === "::" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("ff") || host.startsWith("2001:db8") || host.startsWith("2002:") || host.startsWith("::ffff:")) return true; return false; }
export function validatePublicUrl(input: string) { const url = new URL(input); if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only public http/https URLs are allowed."); if (url.username || url.password) throw new Error("URL credentials are not allowed."); if (url.port && !["80", "443"].includes(url.port)) throw new Error("Only ports 80 and 443 are allowed."); const host = url.hostname.toLowerCase(); if (["localhost", "0", "0.0.0.0"].includes(host) || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || metadataHosts.has(host) || isBlockedIp(host)) throw new Error("Private, reserved, and metadata addresses are not allowed."); return url; }
export async function resolvePublicAddresses(hostname: string, resolver?: (hostname: string) => Promise<string[]>) { if (!resolver) return [] as string[]; const addresses = await resolver(hostname); if (!addresses.length) throw new Error("Hostname did not resolve."); for (const address of addresses) if (isBlockedIp(address)) throw new Error("Hostname resolves to a private or reserved address."); return addresses; }
export async function readLimitedText(response: Response, limitBytes: number) { const length = response.headers.get("content-length"); if (length && Number(length) > limitBytes) throw new Error("Response body exceeds the allowed size."); if (!response.body) return ""; const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let total = 0; for (;;) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > limitBytes) { await reader.cancel(); throw new Error("Response body exceeds the allowed size."); } chunks.push(value); } return new TextDecoder().decode(concat(chunks, total)); }
function concat(chunks: Uint8Array[], total: number) { const out = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.byteLength; } return out; }
function validString(v: unknown, min = 1, max = 1200) { return typeof v === "string" && v.trim().length >= min && v.length <= max; }
function stringArray(v: unknown, min: number, max: number, itemMax = 300) { return Array.isArray(v) && v.length >= min && v.length <= max && v.every((x) => validString(x, 1, itemMax)); }
export function validateProductAnalysis(value: unknown): ProductAnalysis { const x = value as ProductAnalysis; if (!x || typeof x !== "object") throw new Error("Invalid analysis format."); if (!validString(x.summary) || !validString(x.valueProposition) || !validString(x.icp)) throw new Error("Invalid analysis strings."); if (!stringArray(x.pains, 1, 8) || !stringArray(x.useCases, 1, 8) || !stringArray(x.competitors, 1, 8) || !stringArray(x.channels, 1, 8)) throw new Error("Invalid analysis arrays."); if (!Array.isArray(x.nextBestActions) || x.nextBestActions.length !== 3 || !x.nextBestActions.every((a) => validString(a.title, 1, 160) && validString(a.description, 1, 500) && validString(a.expectedOutcome, 1, 240))) throw new Error("Invalid next best actions."); if (!Array.isArray(x.opportunities) || x.opportunities.length < 1 || x.opportunities.length > 3 || !x.opportunities.every((o) => validString(o.title, 1, 160) && validString(o.summary, 1, 500) && validString(o.suggestedAction, 1, 240) && validString(o.signal, 1, 80) && Number.isInteger(o.confidence) && o.confidence >= 0 && o.confidence <= 100)) throw new Error("Invalid opportunities."); return x; }
export function safeClientError(error: unknown) { const message = error instanceof Error ? error.message : "Request failed."; if (/LLM key|http\/https|credentials|ports 80 and 443|Private|metadata|HTML|exceeds|already running|rate limit|Invalid analysis/.test(message)) return message; return "Analysis failed. Please retry later."; }
export function rateLimitKey(userId: string, workspaceId: string) { const minute = Math.floor(Date.now() / 60000); return `${minute}:${userId}:${workspaceId}`; }
