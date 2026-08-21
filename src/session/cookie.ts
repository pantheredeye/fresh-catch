/**
 * Session cookie serializer: SameSite=Lax.
 *
 * Lax withholds the cookie on every cross-site subresource request and every cross-site
 * non-GET request — exactly the CSRF surface. It only relaxes cross-site top-level GET
 * navigations, which is required for cookieless returns from Stripe (Connect onboarding,
 * checkout success/cancel) to land back in the existing session instead of silently minting
 * a new one under the same cookie name.
 *
 * CSRF posture is unchanged: all mutations are POST server actions, guarded by the Origin-check
 * middleware (src/worker.tsx), rwsdk's own action Origin check, and per-action CSRF tokens.
 * A cross-site POST carries no cookie at all under Lax, so it's unauthenticated before any of
 * those checks even run.
 *
 * WARNING: no state-changing GET routes. Under Lax, a cross-site top-level GET carries the
 * cookie — a state-changing GET would be forgeable from any external page.
 *
 * `maxAge` defaults to persistent (10y) when omitted, so every call site is persistent unless
 * it explicitly opts out — previously only the login call site passed `maxAge: true`, so every
 * other `sessions.save` silently emitted a session-only cookie (logged out on browser close).
 */
export const createSessionCookie = ({
  name,
  sessionId,
  maxAge = true,
}: {
  name: string;
  sessionId: string;
  maxAge?: number | true;
}) => {
  const isViteDev =
    typeof import.meta.env !== "undefined" && import.meta.env.DEV;
  return `${name}=${sessionId}; Path=/; HttpOnly; ${isViteDev ? "" : "Secure; "}SameSite=Lax; Max-Age=${
    maxAge === true ? 10 * 365 * 24 * 60 * 60 : maxAge
  }`;
};
