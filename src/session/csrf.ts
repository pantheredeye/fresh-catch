import { requestInfo } from "rwsdk/worker";
import { validateCsrfToken } from "./store";

/**
 * Validate a submitted CSRF token against the session token.
 * Throws if invalid — call at the start of any mutating server function.
 *
 * Throws a plain Error, never a Response: a thrown Response inside an RSC
 * server action breaks the action stream client-side (whitescreen), while an
 * Error rejects the action promise and surfaces in the caller's try/catch.
 */
export function requireCsrf(submittedToken: string | undefined): void {
  const { ctx } = requestInfo;
  const sessionToken = ctx.session?.csrfToken;
  if (!sessionToken || !submittedToken || !validateCsrfToken(sessionToken, submittedToken)) {
    throw new Error("Your session expired. Please refresh the page and try again.");
  }
}

/** Generate a base64url CSRF token (same shape the session DO produces). */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
