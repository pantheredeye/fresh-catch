import { randomToken, timingSafeEqual } from "@/lib/tokens";
import { sign } from "./session";

/** Generate a base64url CSRF token, embedded in the signed session payload at login. */
export function generateCsrfToken(): string {
  return randomToken();
}

/**
 * Validate a submitted CSRF token against the one embedded in the session.
 * The session token lives inside the signed, HttpOnly session cookie, so a
 * page can only echo the correct value back if it was server-rendered with
 * an active session — a cross-site attacker can't read or guess it.
 */
export function requireCsrf(
  sessionToken: string | null | undefined,
  submittedToken: string | null | undefined,
): boolean {
  if (!sessionToken || !submittedToken) return false;
  return timingSafeEqual(sessionToken, submittedToken);
}

/**
 * R4: CSRF for anonymous (session-less) POSTs — the customer request form and
 * reply box. Deterministic HMAC of the device token under `SESSION_SECRET`,
 * so a page can only echo the correct value back if it was server-rendered
 * for that device's own httpOnly cookie; there's no server-side session to
 * stash a random token in.
 */
export function createDeviceCsrfToken(deviceToken: string, secret: string): Promise<string> {
  return sign(deviceToken, secret);
}

export async function verifyDeviceCsrfToken(
  deviceToken: string,
  secret: string,
  submittedToken: string | null | undefined,
): Promise<boolean> {
  if (!submittedToken) return false;
  const expected = await createDeviceCsrfToken(deviceToken, secret);
  return timingSafeEqual(expected, submittedToken);
}
