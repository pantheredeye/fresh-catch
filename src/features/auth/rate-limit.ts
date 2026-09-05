import { db } from "@/lib/db";
import { sha256Hex } from "@/lib/hash";
import { normalizeEmail } from "./login-codes";
import { ENDPOINT_LIMITS, type IdentityEndpoint, type RateLimitEndpoint } from "./rate-limit-limits";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

interface BucketState {
  count: number;
  windowStart: number;
  expired: boolean;
}

async function readBucket(key: string, windowMs: number, now: number): Promise<BucketState> {
  const record = await db.rateLimitBucket.findUnique({ where: { id: key } });
  if (!record || now - record.windowStart.getTime() >= windowMs) {
    return { count: 0, windowStart: now, expired: true };
  }
  return { count: record.count, windowStart: record.windowStart.getTime(), expired: false };
}

async function writeBucket(key: string, count: number, windowStart: number): Promise<void> {
  await db.rateLimitBucket.upsert({
    where: { id: key },
    create: { id: key, count, windowStart: new Date(windowStart) },
    update: { count, windowStart: new Date(windowStart) },
  });
}

/**
 * Check rate limit for a given endpoint, keyed on the caller's IP alone.
 *
 * With `identity` (an email), this additionally keys on a tight per-identity
 * bucket (the real control) alongside a loose per-IP ceiling named
 * `<endpoint>Ip` (an abuse backstop only) — ported from v1's #26 fix
 * (main, rate-limit/middleware.ts). Keying auth solely on IP means everyone
 * behind one NAT (market wifi, mobile CGNAT, an office) shares a bucket, so a
 * handful of legitimate logins locks out everyone else on that IP.
 *
 * v2 has no Durable Objects, so this is backed by D1 fixed-window counters
 * instead of the old RateLimitDurableObject's sliding-window + atomic
 * incrementMulti. The identity+IP check-then-write below is not atomic across
 * concurrent requests — at this app's single-vendor scale, the worst case is
 * a handful of extra requests slipping through a shared window, an accepted
 * tradeoff against needing a DO.
 *
 * Passing an identity for an endpoint with no `<endpoint>Ip` ceiling is a
 * compile error — see IdentityEndpoint in ./rate-limit-limits.
 */
export async function checkRateLimit(
  ip: string,
  endpoint: RateLimitEndpoint,
): Promise<RateLimitResult>;
export async function checkRateLimit(
  ip: string,
  endpoint: IdentityEndpoint,
  identity: string,
): Promise<RateLimitResult>;
export async function checkRateLimit(
  ip: string,
  endpoint: RateLimitEndpoint,
  identity?: string,
): Promise<RateLimitResult> {
  const now = Date.now();

  if (identity === undefined) {
    const { maxRequests, windowMs } = ENDPOINT_LIMITS[endpoint];
    const key = `ip:${ip}:${endpoint}`;
    const bucket = await readBucket(key, windowMs, now);

    if (!bucket.expired && bucket.count >= maxRequests) {
      return { allowed: false, remaining: 0, retryAfterMs: bucket.windowStart + windowMs - now };
    }

    const next = bucket.expired ? 1 : bucket.count + 1;
    await writeBucket(key, next, bucket.expired ? now : bucket.windowStart);
    return { allowed: true, remaining: maxRequests - next, retryAfterMs: 0 };
  }

  const identityHash = await sha256Hex(normalizeEmail(identity));
  const ipEndpoint = `${endpoint}Ip` as RateLimitEndpoint;
  const idLimit = ENDPOINT_LIMITS[endpoint];
  const ipLimit = ENDPOINT_LIMITS[ipEndpoint];
  const idKey = `id:${identityHash}:${endpoint}`;
  const ipKey = `ip:${ip}:${ipEndpoint}`;

  const idBucket = await readBucket(idKey, idLimit.windowMs, now);
  const ipBucket = await readBucket(ipKey, ipLimit.windowMs, now);

  const idBlocked = !idBucket.expired && idBucket.count >= idLimit.maxRequests;
  const ipBlocked = !ipBucket.expired && ipBucket.count >= ipLimit.maxRequests;

  if (idBlocked || ipBlocked) {
    // Neither bucket is written — a denial must not burn a slot in the
    // identity's own bucket just because the IP ceiling tripped.
    const retryAfterMs = Math.max(
      idBlocked ? idBucket.windowStart + idLimit.windowMs - now : 0,
      ipBlocked ? ipBucket.windowStart + ipLimit.windowMs - now : 0,
    );
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  const idNext = idBucket.expired ? 1 : idBucket.count + 1;
  const ipNext = ipBucket.expired ? 1 : ipBucket.count + 1;
  await writeBucket(idKey, idNext, idBucket.expired ? now : idBucket.windowStart);
  await writeBucket(ipKey, ipNext, ipBucket.expired ? now : ipBucket.windowStart);

  return {
    allowed: true,
    remaining: Math.min(idLimit.maxRequests - idNext, ipLimit.maxRequests - ipNext),
    retryAfterMs: 0,
  };
}
