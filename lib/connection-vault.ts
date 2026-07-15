export type ConnectionSecret = { accessToken: string; refreshToken?: string; tokenType?: string; expiresAt?: string; siteUrl?: string; username?: string; applicationPassword?: string; authorUrn?: string; subreddit?: string };

function bytesToBase64(bytes: Uint8Array) { let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary); }
function base64ToBytes(value: string) { const binary = atob(value); return Uint8Array.from(binary, (char) => char.charCodeAt(0)); }
async function keyFromEnv(secret?: string) {
  if (!secret) throw new Error("Connection vault is not configured.");
  const raw = base64ToBytes(secret);
  if (raw.byteLength !== 32) throw new Error("Connection vault is not configured.");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptConnectionSecret(value: ConnectionSecret, masterKey?: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await keyFromEnv(masterKey), encoded);
  return `v1.${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(ciphertext))}`;
}

export async function decryptConnectionSecret(value: string, masterKey?: string): Promise<ConnectionSecret> {
  const [version, iv, ciphertext] = value.split(".");
  if (version !== "v1" || !iv || !ciphertext) throw new Error("Connection credential is invalid.");
  try {
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(iv) }, await keyFromEnv(masterKey), base64ToBytes(ciphertext));
    const parsed = JSON.parse(new TextDecoder().decode(plaintext)) as ConnectionSecret;
    if (!parsed || typeof parsed !== "object") throw new Error();
    return parsed;
  } catch { throw new Error("Connection credential is invalid."); }
}

export function redactConnectionSecret(value: ConnectionSecret) {
  return { expiresAt: value.expiresAt ?? null, hasRefreshToken: Boolean(value.refreshToken), siteUrl: value.siteUrl ?? null, username: value.username ?? null, authorUrn: value.authorUrn ?? null, subreddit: value.subreddit ?? null };
}
