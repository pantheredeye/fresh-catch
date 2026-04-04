import { requestInfo } from "rwsdk/worker";
import { validateCsrfToken } from "./store";

/**
 * Validate a submitted CSRF token against the session token.
 * Throws if invalid — call at the start of any mutating server function.
 * The thrown error message is generic to avoid leaking token info.
 */
export function requireCsrf(submittedToken: string | undefined): void {
  const { ctx } = requestInfo;
  const sessionToken = ctx.session?.csrfToken;
  if (!sessionToken || !submittedToken || !validateCsrfToken(sessionToken, submittedToken)) {
    throw new Response("Forbidden", { status: 403 });
  }
}
