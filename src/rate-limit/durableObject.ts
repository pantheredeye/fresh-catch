import { DurableObject } from "cloudflare:workers";
import {
  DEFAULT_LIMIT,
  ENDPOINT_LIMITS,
  MAX_WINDOW_MS,
  type RateLimitEndpoint,
} from "./limits";

// How often to sweep dead keys. Without this, storage grows forever: one key per
// (IP, endpoint) and — now that identity buckets exist — one per (email, endpoint).
const SWEEP_INTERVAL_MS = 60 * 60 * 1000;

function limitFor(endpoint: RateLimitEndpoint) {
  const limit = ENDPOINT_LIMITS[endpoint];
  if (limit) return limit;
  // Unreachable via the typed middleware. Loud rather than silent, because the
  // fallback is tight enough to lock shared-NAT users out of the only login path.
  console.error(
    `[rate-limit] no limit configured for "${endpoint}" — falling back to DEFAULT_LIMIT`,
  );
  return DEFAULT_LIMIT;
}

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

  async increment(key: string, endpoint: RateLimitEndpoint): Promise<RateLimitResponse> {
    const { maxRequests, windowMs } = limitFor(endpoint);
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
    entries: { key: string; endpoint: RateLimitEndpoint }[],
  ): Promise<RateLimitResponse> {
    const now = Date.now();
    const resolved = [];

    for (const { key, endpoint } of entries) {
      const { maxRequests, windowMs } = limitFor(endpoint);
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
   * `maxAgeMs` exists so tests can exercise the deletion path without waiting out
   * a 15-minute window; production always uses the default.
   *
   * Returns how many keys were removed and how many remain.
   */
  async sweepNow(
    maxAgeMs?: number | null,
  ): Promise<{ removed: number; remaining: number }> {
    // Defensive: a missing arg arrives as null over RPC, and `Date.now() - null`
    // is `Date.now()` — which would treat every live bucket as expired and hand
    // the whole world a fresh quota. Only trust a real, non-negative number.
    const age =
      typeof maxAgeMs === "number" && Number.isFinite(maxAgeMs) && maxAgeMs >= 0
        ? maxAgeMs
        : MAX_WINDOW_MS;
    const cutoff = Date.now() - age;
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
}
