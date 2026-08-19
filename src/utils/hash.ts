/**
 * SHA-256 hex digest. Used to keep raw identifiers (emails) out of long-lived
 * storage — login codes key on the hash, and so do per-identity rate limits.
 */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
