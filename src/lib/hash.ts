/**
 * SHA-256 hex digest. Used to keep raw identifiers (emails) out of storage —
 * login codes and rate-limit buckets key on the hash, not the raw email.
 */
export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
