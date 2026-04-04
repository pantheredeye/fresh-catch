import { defineDurableSession } from "rwsdk/auth";
import type { Session } from "./durableObject";

export let sessions: ReturnType<typeof createSessionStore>;

const createSessionStore = (env: Env) =>
  defineDurableSession({
    sessionDurableObject: env.SESSION_DURABLE_OBJECT,
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
  },
  saveOptions?: { maxAge?: number | true },
): Promise<void> {
  // Load current session data if not provided
  let dataToPreserve = sessionData;
  if (!dataToPreserve) {
    const currentSession = await sessions.load(request) as Session | null;
    if (!currentSession) {
      return; // No existing session, nothing to rotate
    }
    dataToPreserve = {
      userId: currentSession.userId,
      currentOrganizationId: currentSession.currentOrganizationId,
      role: currentSession.role,
    };
  }

  // Revoke old session (invalidates old session ID)
  await sessions.remove(request, responseHeaders);

  // Create new session with fresh ID, preserving user data
  await sessions.save(responseHeaders, {
    userId: dataToPreserve.userId ?? null,
    currentOrganizationId: dataToPreserve.currentOrganizationId ?? null,
    role: dataToPreserve.role ?? null,
    ...(dataToPreserve.challenge !== undefined ? { challenge: dataToPreserve.challenge } : {}),
  }, saveOptions);
}
