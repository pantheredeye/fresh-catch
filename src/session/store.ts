import { defineDurableSession } from "rwsdk/auth";
import type { Session } from "./durableObject";
import { createSessionCookie } from "./cookie";

export let sessions: ReturnType<typeof createSessionStore>;

const createSessionStore = (env: Env) =>
  defineDurableSession({
    sessionDurableObject: env.SESSION_DURABLE_OBJECT,
    createCookie: createSessionCookie,
  });

export const setupSessionStore = (env: Env) => {
  sessions = createSessionStore(env);
  return sessions;
};

/**
 * Rotate session: revoke old session and create new one with same user data.
 * Prevents session fixation attacks by issuing a fresh session ID.
 */
export async function rotateSession(
  request: Request,
  responseHeaders: Headers,
  sessionData?: {
    userId?: string | null;
    currentOrganizationId?: string | null;
    role?: string | null;
    csrfToken?: string;
  },
  saveOptions?: { maxAge?: number | true },
): Promise<void> {
  // Load current session to preserve data not explicitly provided
  let dataToPreserve = sessionData;
  const currentSession = await resilientDO(
    () => sessions.load(request) as Promise<Session | null>,
    "rotateSession.load",
  );

  if (!dataToPreserve) {
    if (!currentSession) {
      return; // No existing session, nothing to rotate
    }
    dataToPreserve = {
      userId: currentSession.userId,
      currentOrganizationId: currentSession.currentOrganizationId,
      role: currentSession.role,
      csrfToken: currentSession.csrfToken,
    };
  } else if (!dataToPreserve.csrfToken && currentSession?.csrfToken) {
    // Preserve CSRF token from current session when not explicitly provided
    dataToPreserve = { ...dataToPreserve, csrfToken: currentSession.csrfToken };
  }

  // Revoke old session (invalidates old session ID)
  await resilientDO(() => sessions.remove(request, responseHeaders), "rotateSession.remove");

  // Create new session with fresh ID, preserving user data
  await resilientDO(() => sessions.save(responseHeaders, {
    userId: dataToPreserve.userId ?? null,
    currentOrganizationId: dataToPreserve.currentOrganizationId ?? null,
    role: dataToPreserve.role ?? null,
    ...(dataToPreserve.csrfToken ? { csrfToken: dataToPreserve.csrfToken } : {}),
  }, saveOptions), "rotateSession.save");
}

/**
 * Retry a DO operation once on failure (handles DO eviction after idle).
 * Logs the error and retries; if both attempts fail, throws.
 */
export async function resilientDO<T>(op: () => Promise<T>, label = "session"): Promise<T> {
  try {
    return await op();
  } catch (err) {
    console.warn(`[${label}] DO operation failed, retrying once:`, err);
    try {
      return await op();
    } catch (retryErr) {
      console.error(`[${label}] DO operation failed after retry:`, retryErr);
      throw retryErr;
    }
  }
}

/**
 * Validate a submitted CSRF token against the session token.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function validateCsrfToken(
  sessionToken: string,
  submittedToken: string,
): boolean {
  if (sessionToken.length !== submittedToken.length) return false;

  const encoder = new TextEncoder();
  const a = encoder.encode(sessionToken);
  const b = encoder.encode(submittedToken);

  // Constant-time comparison: always checks all bytes
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a[i] ^ b[i];
  }
  return mismatch === 0;
}
