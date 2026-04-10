import { defineDurableSession } from "rwsdk/auth";
import type { Session, OtpState } from "./durableObject";
import type { SessionDurableObject } from "./durableObject";

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
      ? `; Max-Age=${maxAge === true ? 10 * 365 * 24 * 60 * 60 : maxAge}`
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
    ...(dataToPreserve.challenge !== undefined ? { challenge: dataToPreserve.challenge } : {}),
    ...(dataToPreserve.csrfToken ? { csrfToken: dataToPreserve.csrfToken } : {}),
  }, saveOptions), "rotateSession.save");
}

/**
 * Get the DO stub for the current session from a request cookie.
 * Used to call custom DO methods (saveOtp, verifyOtp) that aren't
 * exposed through the rwsdk session store abstraction.
 */
function getSessionIdFromCookie(request: Request, cookieName = "session_id"): string | undefined {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return undefined;
  for (const cookie of cookieHeader.split(";")) {
    const trimmed = cookie.trim();
    const sep = trimmed.indexOf("=");
    if (sep === -1) continue;
    if (trimmed.slice(0, sep) === cookieName) {
      return trimmed.slice(sep + 1);
    }
  }
}

function unpackSessionId(packed: string): string | null {
  try {
    return atob(packed).split(":")[0];
  } catch {
    console.error("Session cookie corrupted: invalid base64 in session ID");
    return null;
  }
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

export function getSessionStub(request: Request, sessionEnv: Env): DurableObjectStub<SessionDurableObject> | null {
  const sessionId = getSessionIdFromCookie(request);
  if (!sessionId) return null;
  const unsignedId = unpackSessionId(sessionId);
  if (!unsignedId) return null;
  const doId = sessionEnv.SESSION_DURABLE_OBJECT.idFromName(unsignedId);
  return sessionEnv.SESSION_DURABLE_OBJECT.get(doId);
}

/**
 * Save OTP via session DO. Returns OTP state with generated code.
 */
export async function saveOtp(request: Request, sessionEnv: Env, email: string): Promise<OtpState | null> {
  const stub = getSessionStub(request, sessionEnv);
  if (!stub) return null;
  return stub.saveOtp(email);
}

/**
 * Verify OTP via session DO.
 */
export async function verifyOtpViaSession(
  request: Request,
  sessionEnv: Env,
  code: string,
): Promise<{ valid: boolean; email?: string; expired?: boolean; locked?: boolean } | null> {
  const stub = getSessionStub(request, sessionEnv);
  if (!stub) return null;
  return stub.verifyOtp(code);
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
