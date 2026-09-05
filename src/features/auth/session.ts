export const SESSION_COOKIE_NAME = "session";
// Browsers cap Max-Age at 400 days regardless of what's sent — using that as
// the "persistent" ceiling rather than picking an arbitrary shorter value.
export const SESSION_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

export interface SessionPayload {
  userId: string;
  email: string;
  isAdmin: boolean;
  csrfToken: string;
  iat: number;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function sign(payloadB64: string, secret: string): Promise<string> {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return base64UrlEncode(new Uint8Array(sig));
}

/**
 * Signed-cookie session (v2 has no Durable Objects for session storage — see
 * CLAUDE.md "Removed in the rebuild"). The whole session lives in the cookie
 * as `<payload>.<hmac>`; the server never stores session state, it just
 * verifies the signature on each request. Good enough at this app's scale;
 * revocation-before-expiry (e.g. "log out everywhere") isn't supported.
 */
export async function createSessionValue(
  payload: Omit<SessionPayload, "iat">,
  secret: string,
): Promise<string> {
  const full: SessionPayload = { ...payload, iat: Date.now() };
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(full)));
  const sig = await sign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

export async function parseSessionValue(
  value: string | undefined | null,
  secret: string,
): Promise<SessionPayload | null> {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot === -1) return null;
  const payloadB64 = value.slice(0, dot);
  const sig = value.slice(dot + 1);

  const expectedSig = await sign(payloadB64, secret);
  if (!timingSafeEqual(sig, expectedSig)) return null;

  try {
    const json = new TextDecoder().decode(base64UrlDecode(payloadB64));
    const parsed = JSON.parse(json);
    if (
      typeof parsed?.userId === "string" &&
      typeof parsed?.email === "string" &&
      typeof parsed?.isAdmin === "boolean" &&
      typeof parsed?.csrfToken === "string" &&
      typeof parsed?.iat === "number"
    ) {
      return parsed as SessionPayload;
    }
    return null;
  } catch {
    return null;
  }
}
