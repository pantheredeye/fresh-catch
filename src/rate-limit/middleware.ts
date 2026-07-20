import { env } from "cloudflare:workers";
import { requestInfo } from "rwsdk/worker";
import { sha256Hex } from "@/utils/hash";
import { normalizeEmail } from "@/auth/login-codes";
import type { IdentityEndpoint, RateLimitEndpoint } from "./limits";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Check rate limit for a given endpoint using the RateLimitDO.
 * Returns the rate limit result after incrementing the counter.
 *
 * Without `identity`, this keys on client IP alone — fine for endpoints where one
 * IP genuinely maps to one actor.
 *
 * With `identity` (an email), it keys on BOTH:
 *   - `<endpoint>`   — tight bucket per identity, the real control
 *   - `<endpoint>Ip` — loose per-IP ceiling, an abuse backstop only
 *
 * WHY: keying auth solely on IP means everyone behind one NAT — market wifi, mobile
 * CGNAT, an office — shares a bucket, so a handful of legitimate logins locks out
 * everyone else on that IP. Login is OTP-email-only, so that is a lockout from the
 * only way in. Both buckets are incremented atomically: a request denied by the IP
 * ceiling must not burn a slot in the user's own bucket.
 *
 * The identity is hashed, so raw emails stay out of DO storage (same reason login
 * codes key on `emailHash`).
 *
 * Passing an identity for an endpoint with no `<endpoint>Ip` ceiling is a compile
 * error — see IdentityEndpoint in ./limits.
 */
export async function checkRateLimit(endpoint: RateLimitEndpoint): Promise<RateLimitResult>;
export async function checkRateLimit(
  endpoint: IdentityEndpoint,
  identity: string,
): Promise<RateLimitResult>;
export async function checkRateLimit(
  endpoint: RateLimitEndpoint,
  identity?: string,
): Promise<RateLimitResult> {
  const { request } = requestInfo;
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";

  const doId = env.RATE_LIMIT_DURABLE_OBJECT.idFromName("global");
  const stub = env.RATE_LIMIT_DURABLE_OBJECT.get(doId);

  if (identity === undefined) {
    return stub.increment(`${ip}:${endpoint}`, endpoint);
  }

  const identityHash = await sha256Hex(normalizeEmail(identity));
  return stub.incrementMulti([
    { key: `id:${identityHash}`, endpoint },
    { key: `ip:${ip}`, endpoint: `${endpoint}Ip` as RateLimitEndpoint },
  ]);
}
