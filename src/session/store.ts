import { defineDurableSession, MAX_SESSION_DURATION } from "rwsdk/auth";
import type { Session } from "./durableObject";

export let sessions: ReturnType<typeof createSessionStore>;

/**
 * Custom cookie serializer: SameSite=Strict for CSRF defense-in-depth.
 * The framework default is SameSite=Lax which allows top-level navigations
 * from external sites to carry the cookie. Strict blocks that.
 */
const createStrictCookie = ({
  name,
  sessionId,
  maxAge,
}: {
  name: string;
  sessionId: string;
  maxAge?: number | true;
}) => {
  const isViteDev =
    typeof import.meta.env !== "undefined" && import.meta.env.DEV;
  return `${name}=${sessionId}; Path=/; HttpOnly; ${isViteDev ? "" : "Secure; "}SameSite=Strict${
    maxAge != null
      ? `; Max-Age=${maxAge === true ? MAX_SESSION_DURATION / 1000 : maxAge}`
      : ""
  }`;
};

const createSessionStore = (env: Env) =>
  defineDurableSession({
    sessionDurableObject: env.SESSION_DURABLE_OBJECT,
    createCookie: createStrictCookie,
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
    challenge?: string | null;
    csrfToken?: string;
  },
  saveOptions?: { maxAge?: number | true },
): Promise<void> {
  // Load current session to preserve data not explicitly provided
  let dataToPreserve = sessionData;
  const currentSession = await sessions.load(request) as Session | null;

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
  await sessions.remove(request, responseHeaders);

  // Create new session with fresh ID, preserving user data
  await sessions.save(responseHeaders, {
    userId: dataToPreserve.userId ?? null,
    currentOrganizationId: dataToPreserve.currentOrganizationId ?? null,
    role: dataToPreserve.role ?? null,
    ...(dataToPreserve.challenge !== undefined ? { challenge: dataToPreserve.challenge } : {}),
    ...(dataToPreserve.csrfToken ? { csrfToken: dataToPreserve.csrfToken } : {}),
  }, saveOptions);
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
