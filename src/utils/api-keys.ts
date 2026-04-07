/**
 * API key generation and validation for external MCP access.
 * Uses Web Crypto API (available in Cloudflare Workers).
 * Raw key is shown once on generation — only the hash is stored.
 */

const KEY_PREFIX = "fc_key_";

async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomChars(length: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => chars[v % chars.length]).join("");
}

export async function generateApiKey(): Promise<{
  key: string;
  hash: string;
  prefix: string;
}> {
  const random = randomChars(32);
  const key = KEY_PREFIX + random;
  const hash = await sha256(key);
  const prefix = KEY_PREFIX + random.slice(0, 8) + "...";
  return { key, hash, prefix };
}

export async function validateApiKey(
  key: string,
  hash: string,
): Promise<boolean> {
  const keyHash = await sha256(key);
  return keyHash === hash;
}
