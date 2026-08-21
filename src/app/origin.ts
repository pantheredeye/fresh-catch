/**
 * True if a state-changing request is safe to process: same-origin, or an Origin-less
 * request (browser same-site navigation, or a non-browser client with no Origin header —
 * both allowed since SameSite=Lax cookies already withhold the cookie on cross-site non-GET
 * requests, so an Origin-less mutation is either same-site or unauthenticated).
 *
 * Callers must exempt GET/HEAD/OPTIONS themselves — this only checks the Origin header.
 */
export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return true;

  const expected = new URL(request.url).origin;
  return origin === expected;
}
