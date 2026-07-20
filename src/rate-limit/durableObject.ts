import { DurableObject } from "cloudflare:workers";

// Configurable limits per endpoint.
//
// Auth endpoints use TWO buckets (see rate-limit/middleware.ts):
//   - a tight per-identity (email) bucket, which is the real control
//   - a loose per-IP ceiling named `<endpoint>Ip`, which is only an abuse backstop
//
// The IP ceilings are deliberately generous. Login is OTP-email-only, so a bucket
// that bites shared NAT (market wifi, mobile CGNAT) locks real customers out of the
// only way in — many people behind one IP is normal, not suspicious. Per-identity
// limits are what bound harm (email bombing a given inbox); IP only stops a crude
// single-host flood, and a botnet routes around it anyway.
const ENDPOINT_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  otpSend: { maxRequests: 3, windowMs: 15 * 60 * 1000 },        // 3 per 15min PER EMAIL
  otpSendIp: { maxRequests: 100, windowMs: 15 * 60 * 1000 },    // per-IP ceiling
  otpVerify: { maxRequests: 10, windowMs: 15 * 60 * 1000 },     // 10 per 15min PER EMAIL
  otpVerifyIp: { maxRequests: 200, windowMs: 15 * 60 * 1000 },  // per-IP ceiling
  // GET /login + /join/invite page loads. Cheap requests; the expensive side effect
  // (sending mail) is bounded by otpSend. Purely a crude-flood backstop.
  login: { maxRequests: 300, windowMs: 15 * 60 * 1000 },
  chatCreate: { maxRequests: 15, windowMs: 10 * 60 * 1000 },    // 15 new conversations per 10min per IP
  chatEmail: { maxRequests: 20, windowMs: 15 * 60 * 1000 },     // 20 email saves per 15min per IP
};

const DEFAULT_LIMIT = { maxRequests: 20, windowMs: 15 * 60 * 1000 };

// Longest window any endpoint uses — a key untouched for longer than this is dead.
const MAX_WINDOW_MS = Math.max(
  DEFAULT_LIMIT.windowMs,
  ...Object.values(ENDPOINT_LIMITS).map((l) => l.windowMs),
);

// How often to sweep dead keys. Without this, storage grows forever: one key per
// (IP, endpoint) and — now that identity buckets exist — one per (email, endpoint).
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;

interface RateLimitResponse {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export class RateLimitDurableObject extends DurableObject {
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  // Remove timestamps outside the sliding window
  private pruneTimestamps(timestamps: number[], windowMs: number): number[] {
    const cutoff = Date.now() - windowMs;
    return timestamps.filter((t) => t > cutoff);
  }

  async check(key: string, endpoint: string): Promise<RateLimitResponse> {
    const { maxRequests, windowMs } = ENDPOINT_LIMITS[endpoint] ?? DEFAULT_LIMIT;
    const storageKey = `ts:${key}:${endpoint}`;

    const raw = await this.ctx.storage.get<number[]>(storageKey);
    const timestamps = raw ? this.pruneTimestamps(raw, windowMs) : [];

    if (timestamps.length >= maxRequests) {
      const oldestInWindow = timestamps[0];
      const retryAfterMs = oldestInWindow + windowMs - Date.now();
      return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, retryAfterMs) };
    }

    return {
      allowed: true,
      remaining: maxRequests - timestamps.length,
      retryAfterMs: 0,
    };
  }

  async increment(key: string, endpoint: string): Promise<RateLimitResponse> {
    const { maxRequests, windowMs } = ENDPOINT_LIMITS[endpoint] ?? DEFAULT_LIMIT;
    const storageKey = `ts:${key}:${endpoint}`;

    const raw = await this.ctx.storage.get<number[]>(storageKey);
    const timestamps = raw ? this.pruneTimestamps(raw, windowMs) : [];

    if (timestamps.length >= maxRequests) {
      const oldestInWindow = timestamps[0];
      const retryAfterMs = oldestInWindow + windowMs - Date.now();
      return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, retryAfterMs) };
    }

    timestamps.push(Date.now());
    await this.ctx.storage.put<number[]>(storageKey, timestamps);
    await this.ensureSweepScheduled();

    return {
      allowed: true,
      remaining: maxRequests - timestamps.length,
      retryAfterMs: 0,
    };
  }

  /**
   * All-or-nothing increment across several buckets.
   *
   * Auth flows check a tight per-email bucket AND a loose per-IP ceiling. Doing that
   * as two separate increment() calls would consume a slot in the first bucket even
   * when the second one denies, so a blocked request would still burn the user's
   * quota. The DO is single-threaded, so checking everything before writing anything
   * makes the pair atomic.
   *
   * Returns the blocking bucket's result if any bucket is over limit (the one with
   * the longest wait), otherwise the tightest remaining count.
   */
  async incrementMulti(
    entries: { key: string; endpoint: string }[],
  ): Promise<RateLimitResponse> {
    const now = Date.now();
    const resolved = [];

    for (const { key, endpoint } of entries) {
      const { maxRequests, windowMs } = ENDPOINT_LIMITS[endpoint] ?? DEFAULT_LIMIT;
      const storageKey = `ts:${key}:${endpoint}`;
      const raw = await this.ctx.storage.get<number[]>(storageKey);
      const timestamps = raw ? this.pruneTimestamps(raw, windowMs) : [];
      resolved.push({ storageKey, timestamps, maxRequests, windowMs });
    }

    const blocked = resolved.filter((r) => r.timestamps.length >= r.maxRequests);
    if (blocked.length > 0) {
      const retryAfterMs = Math.max(
        ...blocked.map((r) => r.timestamps[0] + r.windowMs - now),
      );
      return { allowed: false, remaining: 0, retryAfterMs: Math.max(0, retryAfterMs) };
    }

    for (const r of resolved) {
      r.timestamps.push(now);
      await this.ctx.storage.put<number[]>(r.storageKey, r.timestamps);
    }
    await this.ensureSweepScheduled();

    return {
      allowed: true,
      remaining: Math.min(...resolved.map((r) => r.maxRequests - r.timestamps.length)),
      retryAfterMs: 0,
    };
  }

  private async ensureSweepScheduled(): Promise<void> {
    const existing = await this.ctx.storage.getAlarm();
    if (existing === null) {
      await this.ctx.storage.setAlarm(Date.now() + SWEEP_INTERVAL_MS);
    }
  }

  async alarm(): Promise<void> {
    await this.sweepNow();
  }

  /**
   * Drop keys whose most recent hit is older than the longest window — they can
   * never affect a decision again, so they are pure storage growth. Keys still
   * inside their window must survive untouched: wiping a live bucket would
   * silently hand every caller a fresh quota.
   *
   * Returns how many keys were removed and how many remain (for tests).
   */
  async sweepNow(): Promise<{ removed: number; remaining: number }> {
    const cutoff = Date.now() - MAX_WINDOW_MS;
    const all = await this.ctx.storage.list<number[]>({ prefix: "ts:" });

    const dead: string[] = [];
    for (const [storageKey, timestamps] of all) {
      const newest = Array.isArray(timestamps) ? timestamps[timestamps.length - 1] : undefined;
      if (newest === undefined || newest <= cutoff) dead.push(storageKey);
    }

    if (dead.length > 0) await this.ctx.storage.delete(dead);

    const remaining = all.size - dead.length;
    // Keep sweeping only while there is something left to sweep.
    if (remaining > 0) {
      await this.ctx.storage.setAlarm(Date.now() + SWEEP_INTERVAL_MS);
    }
    return { removed: dead.length, remaining };
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const key = url.searchParams.get("key");
    const endpoint = url.searchParams.get("endpoint");

    if (!action || !key || !endpoint) {
      return Response.json({ error: "Missing action, key, or endpoint" }, { status: 400 });
    }

    if (action === "check") {
      const result = await this.check(key, endpoint);
      return Response.json(result);
    }

    if (action === "increment") {
      const result = await this.increment(key, endpoint);
      return Response.json(result);
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  }
}
