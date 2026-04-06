import { DurableObject } from "cloudflare:workers";

// Configurable limits per endpoint
const ENDPOINT_LIMITS: Record<string, { maxRequests: number; windowMs: number }> = {
  otpSend: { maxRequests: 3, windowMs: 15 * 60 * 1000 },     // 3 per 15min
  otpVerify: { maxRequests: 10, windowMs: 15 * 60 * 1000 },   // 10 per 15min
};

const DEFAULT_LIMIT = { maxRequests: 20, windowMs: 15 * 60 * 1000 };

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

    return {
      allowed: true,
      remaining: maxRequests - timestamps.length,
      retryAfterMs: 0,
    };
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
